const express = require('express');
const { getDB } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { applyLaplaceMechanism, computeAccuracy, checkFailureCases } = require('../utils/privacy');

const router = express.Router();

function getActiveWorkflowId(db, req) {
  if (req.params.workflowId) return req.params.workflowId;
  const def = db.prepare('SELECT id FROM workflows ORDER BY id ASC LIMIT 1').get();
  return def ? def.id : 1;
}

// GET /api/analytics/kpis
router.get('/kpis', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const workflowId = getActiveWorkflowId(db, req);
    const settings = db.prepare('SELECT * FROM privacy_settings ORDER BY id DESC LIMIT 1').get();
    const eps = settings ? settings.epsilon : 1.0;

    const total = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ?').get(workflowId);
    const completed = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ? AND is_completed = 1').get(workflowId);
    const withConsent = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ? AND consent_given = 1').get(workflowId);

    const totalCnt = total ? total.cnt : 0;
    const compCnt = completed ? completed.cnt : 0;
    const consentCnt = withConsent ? withConsent.cnt : 0;

    const completionRate = totalCnt > 0 ? parseFloat(((compCnt / totalCnt) * 100).toFixed(1)) : 0;
    const abandonmentRate = parseFloat((100 - completionRate).toFixed(1));
    const consentRate = totalCnt > 0 ? parseFloat(((consentCnt / totalCnt) * 100).toFixed(1)) : 0;
    const privacyScore = Math.min(100, Math.round((1 / eps) * 30 + consentRate * 0.5 + 20));

    res.json({
      totalUsers: totalCnt,
      totalSessions: totalCnt,
      completedUsers: compCnt,
      completedSessions: compCnt,
      abandonedUsers: totalCnt - compCnt,
      abandonedSessions: totalCnt - compCnt,
      completionRate,
      abandonmentRate,
      consentRate,
      privacyScore,
      epsilon: eps,
      privacyMode: settings?.privacy_mode || 'differential_privacy',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/funnel and /api/analytics/funnel/:workflowId
const getFunnelHandler = (req, res) => {
  try {
    const db = getDB();
    const workflowId = getActiveWorkflowId(db, req);
    const settings = db.prepare('SELECT * FROM privacy_settings ORDER BY id DESC LIMIT 1').get();
    const eps = parseFloat(req.query.epsilon || settings?.epsilon || 1.0);

    const stages = db.prepare(`
      SELECT * FROM stages WHERE workflow_id = ? ORDER BY stage_order
    `).all(workflowId);

    const totalSessions = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ?').get(workflowId);
    const consentCount = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ? AND consent_given = 1').get(workflowId);

    const funnelStages = stages.map(stage => {
      const actualCount = db.prepare(`
        SELECT COUNT(DISTINCT session_id) as cnt FROM events 
        WHERE workflow_id = ? AND stage_order = ?
      `).get(workflowId, stage.stage_order);

      const dpResult = applyLaplaceMechanism(actualCount.cnt, eps);
      return {
        stageId: stage.id,
        stage_id: stage.id,
        stageName: stage.name,
        stage_name: stage.name,
        stageOrder: stage.stage_order,
        stage_order: stage.stage_order,
        actualCount: actualCount.cnt,
        entered: actualCount.cnt,
        noisyCount: dpResult.noisyCount,
        noisyEntered: dpResult.noisyCount,
        noiseAdded: parseFloat(dpResult.noiseAdded.toFixed(2)),
        dropOff: 0,
        dropOffRate: 0,
      };
    });

    for (let i = 1; i < funnelStages.length; i++) {
      const prevActual = funnelStages[i - 1].actualCount;
      const currActual = funnelStages[i].actualCount;
      const drop = prevActual > 0 ? parseFloat(((prevActual - currActual) / prevActual * 100).toFixed(1)) : 0;
      funnelStages[i].dropOff = drop;
      funnelStages[i].dropOffRate = drop;
    }

    const totalCnt = totalSessions ? totalSessions.cnt : 0;
    const warnings = checkFailureCases({
      totalSessions: totalCnt,
      consentRate: totalCnt > 0 ? (consentCount?.cnt || 0) / totalCnt : 0,
      epsilon: eps,
    });

    res.json({
      stages: funnelStages,
      totalSessions: totalCnt,
      warnings,
      epsilon: eps,
      privacyMode: settings?.privacy_mode || 'differential_privacy',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
router.get('/funnel', authenticateToken, getFunnelHandler);
router.get('/funnel/:workflowId', authenticateToken, getFunnelHandler);

// GET /api/analytics/dropoff
router.get('/dropoff', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const workflowId = getActiveWorkflowId(db, req);
    const stages = db.prepare(`
      SELECT * FROM stages WHERE workflow_id = ? ORDER BY stage_order
    `).all(workflowId);

    const stageData = stages.map((stage, idx) => {
      const actual = db.prepare(`
        SELECT COUNT(DISTINCT session_id) as cnt FROM events WHERE workflow_id = ? AND stage_order = ?
      `).get(workflowId, stage.stage_order);
      return {
        stage_id: stage.id,
        stage_name: stage.name,
        stage_order: stage.stage_order,
        count: actual.cnt,
      };
    });

    const dropoff = stageData.map((stage, idx) => {
      if (idx === 0) return { ...stage, dropOffRate: 0, droppedUsers: 0 };
      const prev = stageData[idx - 1].count;
      const dropped = Math.max(0, prev - stage.count);
      const rate = prev > 0 ? parseFloat(((dropped / prev) * 100).toFixed(1)) : 0;
      return {
        stage_id: stage.stage_id,
        stage_name: stage.stage_name,
        stage_order: stage.stage_order,
        droppedUsers: dropped,
        dropOffRate: rate,
      };
    });

    res.json({ stages: dropoff });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/trend
router.get('/trend', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const workflowId = getActiveWorkflowId(db, req);
    const activity = db.prepare(`
      SELECT DATE(started_at) as date, 
             COUNT(*) as total,
             SUM(is_completed) as completed
      FROM sessions 
      WHERE workflow_id = ?
      GROUP BY DATE(started_at) 
      ORDER BY date ASC LIMIT 14
    `).all(workflowId);

    const dates = activity.map(a => a.date);
    const completions = activity.map(a => a.completed);
    const abandonments = activity.map(a => a.total - a.completed);

    res.json({ dates, completions, abandonments, activity });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/consent
router.get('/consent', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const workflowId = getActiveWorkflowId(db, req);
    const withConsent = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ? AND consent_given = 1').get(workflowId);
    const withoutConsent = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ? AND consent_given = 0').get(workflowId);

    const consented = withConsent ? withConsent.cnt : 0;
    const declined = withoutConsent ? withoutConsent.cnt : 0;
    const total = consented + declined;

    res.json({
      consented,
      declined,
      total,
      consentRate: total > 0 ? parseFloat(((consented / total) * 100).toFixed(1)) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/comparison
router.get('/comparison', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const workflowId = getActiveWorkflowId(db, req);
    const settings = db.prepare('SELECT * FROM privacy_settings ORDER BY id DESC LIMIT 1').get();
    const eps = settings ? settings.epsilon : 1.0;

    const stages = db.prepare(`
      SELECT * FROM stages WHERE workflow_id = ? ORDER BY stage_order
    `).all(workflowId);

    const compStages = stages.map(stage => {
      const actual = db.prepare(`
        SELECT COUNT(DISTINCT session_id) as cnt FROM events WHERE workflow_id = ? AND stage_order = ?
      `).get(workflowId, stage.stage_order);
      const dp = applyLaplaceMechanism(actual.cnt, eps);
      const absErr = Math.abs(actual.cnt - dp.noisyCount);
      const relErr = actual.cnt > 0 ? parseFloat(((absErr / actual.cnt) * 100).toFixed(1)) : 0;

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
      epsilon: eps,
      stages: compStages,
      overallAccuracy: parseFloat(acc.accuracyPercent),
      meanAbsoluteError: parseFloat(acc.meanAbsoluteError),
      errorPercent: parseFloat(acc.errorPercent),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
