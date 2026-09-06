const express = require('express');
const { getDB } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { applyLaplaceMechanism, computeAccuracy, getPrivacyLevel, getBudgetWarning, checkFailureCases } = require('../utils/privacy');

const router = express.Router();

const getSettingsHandler = (req, res) => {
  try {
    const db = getDB();
    const settings = db.prepare('SELECT * FROM privacy_settings ORDER BY id DESC LIMIT 1').get() || {
      epsilon: 1.0,
      privacy_mode: 'standard',
      privacy_budget_used: 2.5,
      privacy_budget_total: 10.0
    };

    const formattedSettings = {
      ...settings,
      epsilon_value: settings.epsilon,
      retention_days: 90,
      noise_mechanism: 'laplace',
      privacyLevel: getPrivacyLevel(settings.epsilon),
      budgetWarning: getBudgetWarning(settings.privacy_budget_used, settings.privacy_budget_total),
    };

    res.json({
      settings: formattedSettings,
      ...formattedSettings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/', authenticateToken, getSettingsHandler);
router.get('/settings', authenticateToken, getSettingsHandler);

const updateSettingsHandler = (req, res) => {
  const epsilon = req.body.epsilon_value !== undefined ? req.body.epsilon_value : req.body.epsilon;
  const privacy_mode = req.body.privacy_mode;
  const privacy_budget_total = req.body.privacy_budget_total;

  try {
    const db = getDB();
    const existing = db.prepare('SELECT * FROM privacy_settings ORDER BY id DESC LIMIT 1').get();

    if (existing) {
      db.prepare(`
        UPDATE privacy_settings 
        SET epsilon = ?, privacy_mode = ?, privacy_budget_total = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        epsilon !== undefined ? parseFloat(epsilon) : existing.epsilon,
        privacy_mode || existing.privacy_mode,
        privacy_budget_total !== undefined ? parseFloat(privacy_budget_total) : existing.privacy_budget_total,
        existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO privacy_settings (epsilon, privacy_mode, privacy_budget_total) VALUES (?, ?, ?)
      `).run(epsilon !== undefined ? parseFloat(epsilon) : 1.0, privacy_mode || 'standard', privacy_budget_total !== undefined ? parseFloat(privacy_budget_total) : 10.0);
    }

    getSettingsHandler(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

router.put('/', authenticateToken, updateSettingsHandler);
router.put('/settings', authenticateToken, updateSettingsHandler);

// GET /api/privacy/budget
router.get('/budget', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const settings = db.prepare('SELECT * FROM privacy_settings ORDER BY id DESC LIMIT 1').get() || {
      epsilon: 1.0,
      privacy_budget_used: 2.5,
      privacy_budget_total: 10.0
    };
    const experiments = db.prepare('SELECT * FROM dp_experiments ORDER BY created_at DESC LIMIT 20').all();

    const queryLog = experiments.map(exp => ({
      id: exp.id,
      timestamp: exp.created_at,
      epsilon_spent: exp.epsilon,
      stage_name: exp.stage_name,
      noise_added: exp.noise_added,
      description: `DP count query on stage "${exp.stage_name}" (ε=${exp.epsilon})`,
    }));

    res.json({
      totalBudget: settings.privacy_budget_total,
      usedBudget: settings.privacy_budget_used,
      remainingBudget: Math.max(0, settings.privacy_budget_total - settings.privacy_budget_used),
      queryLog,
      settings,
      budgetWarning: getBudgetWarning(settings.privacy_budget_used, settings.privacy_budget_total),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/privacy/reset-budget
router.post('/reset-budget', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    db.prepare('UPDATE privacy_settings SET privacy_budget_used = 0').run();
    res.json({ message: 'Privacy budget reset to 0' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/privacy/simulate
router.post('/simulate', authenticateToken, (req, res) => {
  const { workflowId, epsilon = 1.0, iterations = 5 } = req.body;

  try {
    const db = getDB();
    const defaultWorkflow = db.prepare('SELECT id FROM workflows ORDER BY id ASC LIMIT 1').get();
    const targetWorkflowId = workflowId || (defaultWorkflow ? defaultWorkflow.id : 1);

    const stages = db.prepare(`
      SELECT * FROM stages WHERE workflow_id = ? ORDER BY stage_order
    `).all(targetWorkflowId);

    if (stages.length === 0) return res.status(400).json({ error: 'No stages found' });

    const eps = parseFloat(epsilon);

    const results = stages.map(stage => {
      const actual = db.prepare(`
        SELECT COUNT(DISTINCT session_id) as cnt FROM events WHERE workflow_id = ? AND stage_order = ?
      `).get(targetWorkflowId, stage.stage_order);

      const actualCount = actual.cnt;
      const runs = [];
      for (let i = 0; i < iterations; i++) {
        runs.push(applyLaplaceMechanism(actualCount, eps));
      }

      const avgNoisyCount = Math.round(runs.reduce((s, r) => s + r.noisyCount, 0) / runs.length);
      const avgNoise = runs.reduce((s, r) => s + Math.abs(r.noiseAdded), 0) / runs.length;

      db.prepare(`
        INSERT INTO dp_experiments (workflow_id, epsilon, stage_name, actual_count, noisy_count, noise_added)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(targetWorkflowId, eps, stage.name, actualCount, avgNoisyCount, avgNoise);

      return {
        stageName: stage.name,
        stageOrder: stage.stage_order,
        actualCount,
        noisyCount: avgNoisyCount,
        noiseAdded: parseFloat(avgNoise.toFixed(2)),
        runs: runs.map(r => r.noisyCount),
        epsilon: eps,
        scale: parseFloat((1 / eps).toFixed(3)),
        privacyLevel: getPrivacyLevel(eps),
      };
    });

    const actualCounts = results.map(r => r.actualCount);
    const noisyCounts = results.map(r => r.noisyCount);
    const accuracy = computeAccuracy(actualCounts, noisyCounts);

    const settings = db.prepare('SELECT * FROM privacy_settings ORDER BY id DESC LIMIT 1').get();
    if (settings) {
      const newBudget = Math.min(settings.privacy_budget_total, settings.privacy_budget_used + eps);
      db.prepare('UPDATE privacy_settings SET privacy_budget_used = ? WHERE id = ?').run(newBudget, settings.id);
    }

    const totalSessions = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ?').get(targetWorkflowId);
    const consentSessions = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ? AND consent_given = 1').get(targetWorkflowId);
    const warnings = checkFailureCases({
      totalSessions: totalSessions.cnt,
      consentRate: totalSessions.cnt > 0 ? consentSessions.cnt / totalSessions.cnt : 0,
      epsilon: eps,
    });

    res.json({
      results,
      accuracy,
      warnings,
      epsilon: eps,
      privacyLevel: getPrivacyLevel(eps),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
