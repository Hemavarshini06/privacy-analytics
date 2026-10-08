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

    const baseFirst = compStages.length > 0 ? compStages[0].rawCount : 0;
    const baseLast = compStages.length > 0 ? compStages[compStages.length - 1].rawCount : 0;
    const baseCompletionRate = baseFirst > 0 ? parseFloat((baseLast / baseFirst).toFixed(4)) : 0;

    const dpFirst = compStages.length > 0 ? compStages[0].noisyCount : 0;
    const dpLast = compStages.length > 0 ? compStages[compStages.length - 1].noisyCount : 0;
    const dpCompletionRate = dpFirst > 0 ? parseFloat((dpLast / dpFirst).toFixed(4)) : baseCompletionRate;

    const baseline = {
      stages: compStages.map(s => ({
        stage_name: s.stage_name,
        stage_order: s.stage_order,
        entered: s.rawCount,
        count: s.rawCount,
      })),
      completionRate: baseCompletionRate,
    };

    const dpArray = compStages.map(s => ({
      stage_name: s.stage_name,
      stage_order: s.stage_order,
      noisyEntered: s.noisyCount,
      count: s.noisyCount,
      noiseAdded: s.noiseAdded || 0,
      absoluteError: s.absoluteError,
      relativeError: s.relativeError,
    }));
    dpArray.completionRate = dpCompletionRate;
    dpArray.stages = dpArray;

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
        baseline,
        dp: dpArray,
        errorPct: parseFloat(acc.errorPercent),
        accuracyPct: parseFloat(acc.accuracyPercent),
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
