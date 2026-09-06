const express = require('express');
const { getDB } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { applyLaplaceMechanism, computeAccuracy } = require('../utils/privacy');

const router = express.Router();

// GET /api/experiments
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const experiments = db.prepare(`
      SELECT * FROM dp_experiments ORDER BY created_at DESC LIMIT 20
    `).all();

    res.json({ experiments });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/experiments
router.post('/', authenticateToken, (req, res) => {
  const { experiment_name, description } = req.body;
  try {
    const db = getDB();
    const defaultWorkflow = db.prepare('SELECT id FROM workflows ORDER BY id ASC LIMIT 1').get();
    const workflowId = defaultWorkflow ? defaultWorkflow.id : 1;

    const settings = db.prepare('SELECT * FROM privacy_settings ORDER BY id DESC LIMIT 1').get();
    const eps = settings ? settings.epsilon : 1.0;

    const stages = db.prepare('SELECT * FROM stages WHERE workflow_id = ? ORDER BY stage_order').all(workflowId);

    const compStages = stages.map(stage => {
      const actual = db.prepare(`
        SELECT COUNT(DISTINCT session_id) as cnt FROM events WHERE workflow_id = ? AND stage_order = ?
      `).get(workflowId, stage.stage_order);

      const dp = applyLaplaceMechanism(actual.cnt, eps);
      const absErr = Math.abs(actual.cnt - dp.noisyCount);
      const relErr = actual.cnt > 0 ? parseFloat(((absErr / actual.cnt) * 100).toFixed(1)) : 0;

      db.prepare(`
        INSERT INTO dp_experiments (workflow_id, epsilon, stage_name, actual_count, noisy_count, noise_added)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(workflowId, eps, stage.name, actual.cnt, dp.noisyCount, dp.noiseAdded);

      return {
        stage_name: stage.name,
        stage_order: stage.stage_order,
        rawCount: actual.cnt,
        noisyCount: dp.noisyCount,
        absoluteError: absErr,
        relativeError: relErr,
      };
    });

    const rawCounts = compStages.map(s => s.rawCount);
    const noisyCounts = compStages.map(s => s.noisyCount);
    const acc = computeAccuracy(rawCounts, noisyCounts);

    res.json({
      experiment: {
        name: experiment_name,
        description,
        epsilon: eps,
        createdAt: new Date().toISOString(),
      },
      comparison: {
        epsilon: eps,
        stages: compStages,
        overallAccuracy: parseFloat(acc.accuracyPercent),
        meanAbsoluteError: parseFloat(acc.meanAbsoluteError),
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
