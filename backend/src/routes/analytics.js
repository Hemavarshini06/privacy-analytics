const express = require('express');
const { getDB } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { 
  applyLaplaceMechanism, 
  computeAccuracy, 
  checkFailureCases,
  getPrivacyLevel,
  calculateMAE,
  evaluateMultiEpsilon 
} = require('../utils/privacy');

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
    const totalEventsRow = db.prepare('SELECT COUNT(*) as cnt FROM events WHERE workflow_id = ?').get(workflowId);

    const totalCnt = total ? total.cnt : 0;
    const compCnt = completed ? completed.cnt : 0;
    const consentCnt = withConsent ? withConsent.cnt : 0;
    const totalEvents = totalEventsRow ? totalEventsRow.cnt : 0;

    const completionRate = totalCnt > 0 ? parseFloat(((compCnt / totalCnt) * 100).toFixed(1)) : 0;
    const abandonmentRate = parseFloat((100 - completionRate).toFixed(1));
    const consentRate = totalCnt > 0 ? parseFloat(((consentCnt / totalCnt) * 100).toFixed(1)) : 0;
    const privacyScore = Math.min(100, Math.round((1 / eps) * 30 + consentRate * 0.5 + 20));

    const warnings = checkFailureCases({
      totalSessions: totalCnt,
      consentRate: totalCnt > 0 ? consentCnt / totalCnt : 1.0,
      epsilon: eps,
    });

    res.json({
      totalUsers: totalCnt,
      totalSessions: totalCnt,
      uniqueUsers: totalCnt,
      totalEvents,
      completedUsers: compCnt,
      completedSessions: compCnt,
      abandonedUsers: totalCnt - compCnt,
      abandonedSessions: totalCnt - compCnt,
      consentingUsers: consentCnt,
      completionRate,
      abandonmentRate,
      consentRate,
      privacyScore,
      epsilon: eps,
      privacyMode: settings?.privacy_mode || 'differential_privacy',
      budgetUsed: settings?.privacy_budget_used || 0,
      totalBudget: settings?.privacy_budget_total || 10,
      budgetTotal: settings?.privacy_budget_total || 10,
      warnings: warnings.map(w => w.message),
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

    const stageData = stages.map((stage) => {
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
      if (idx === 0) {
        return { 
          ...stage, 
          droppedUsers: 0, 
          dropOffRate: 0, 
          abandonmentRate: 0 
        };
      }
      const prev = stageData[idx - 1].count;
      const dropped = Math.max(0, prev - stage.count);
      const rate = prev > 0 ? parseFloat(((dropped / prev) * 100).toFixed(1)) : 0;
      return {
        stage_id: stage.stage_id,
        stage_name: stage.stage_name,
        stage_order: stage.stage_order,
        droppedUsers: dropped,
        dropOffRate: rate,
        abandonmentRate: parseFloat((rate / 100).toFixed(4)),
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
    const activityDesc = db.prepare(`
      SELECT DATE(started_at) as date, 
             COUNT(*) as total,
             SUM(is_completed) as completed
      FROM sessions 
      WHERE workflow_id = ?
      GROUP BY DATE(started_at) 
      ORDER BY date DESC LIMIT 14
    `).all(workflowId);

    const activity = activityDesc.reverse();
    const dates = activity.map(a => a.date);
    const completions = activity.map(a => a.completed);
    const abandonments = activity.map(a => a.total - a.completed);
    const totals = activity.map(a => a.total);

    res.json({ dates, completions, abandonments, totals, activity });
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
    const consentRate = total > 0 ? parseFloat(((consented / total) * 100).toFixed(1)) : 0;

    res.json({
      consented,
      declined,
      total,
      consentRate,
      percentage: consentRate, // Supports AnalyticsPage.jsx consent.percentage
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

    const totalSessions = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ?').get(workflowId);
    const completedSessions = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ? AND is_completed = 1').get(workflowId);

    const rawTotal = totalSessions ? totalSessions.cnt : 0;
    const rawCompleted = completedSessions ? completedSessions.cnt : 0;
    const baseCompletionRate = rawTotal > 0 ? parseFloat((rawCompleted / rawTotal).toFixed(4)) : 0;

    const compStages = stages.map(stage => {
      const actual = db.prepare(`
        SELECT COUNT(DISTINCT session_id) as cnt FROM events WHERE workflow_id = ? AND stage_order = ?
      `).get(workflowId, stage.stage_order);
      const dp = applyLaplaceMechanism(actual.cnt, eps);
      const absErr = Math.abs(actual.cnt - dp.noisyCount);
      const relErr = actual.cnt > 0 ? parseFloat(((absErr / actual.cnt) * 100).toFixed(1)) : 0;
      const countDiff = dp.noisyCount - actual.cnt;

      return {
        stage_id: stage.id,
        stage_name: stage.name,
        stage_order: stage.stage_order,
        rawCount: actual.cnt,
        entered: actual.cnt,
        count: actual.cnt,
        noisyCount: dp.noisyCount,
        noisyEntered: dp.noisyCount,
        noiseAdded: parseFloat(dp.noiseAdded.toFixed(2)),
        countDiff,
        absoluteError: absErr,
        relativeError: relErr,
      };
    });

    const rawCounts = compStages.map(s => s.rawCount);
    const noisyCounts = compStages.map(s => s.noisyCount);
    const acc = computeAccuracy(rawCounts, noisyCounts);

    const firstStageNoisy = compStages.length > 0 ? compStages[0].noisyCount : rawTotal;
    const lastStageNoisy = compStages.length > 0 ? compStages[compStages.length - 1].noisyCount : rawCompleted;
    const dpCompletionRate = firstStageNoisy > 0 ? parseFloat((lastStageNoisy / firstStageNoisy).toFixed(4)) : baseCompletionRate;

    const baseline = {
      stages: compStages.map(s => ({
        stage_id: s.stage_id,
        stage_name: s.stage_name,
        stage_order: s.stage_order,
        entered: s.rawCount,
        count: s.rawCount,
      })),
      totalSessions: rawTotal,
      completedSessions: rawCompleted,
      completionRate: baseCompletionRate,
      completionRatePct: parseFloat((baseCompletionRate * 100).toFixed(2)),
    };

    const dpArray = compStages.map(s => ({
      stage_id: s.stage_id,
      stage_name: s.stage_name,
      stage_order: s.stage_order,
      noisyEntered: s.noisyCount,
      count: s.noisyCount,
      noiseAdded: s.noiseAdded,
      absoluteError: s.absoluteError,
      relativeError: s.relativeError,
    }));
    dpArray.completionRate = dpCompletionRate;
    dpArray.completionRatePct = parseFloat((dpCompletionRate * 100).toFixed(2));
    dpArray.stages = dpArray;

    const summary = {
      epsilon: eps,
      rawTotalSessions: rawTotal,
      rawCompletedSessions: rawCompleted,
      rawCompletionRate: parseFloat((baseCompletionRate * 100).toFixed(2)),
      dpCompletionRate: parseFloat((dpCompletionRate * 100).toFixed(2)),
      overallAccuracy: parseFloat(acc.accuracyPercent),
      meanAbsoluteError: parseFloat(acc.meanAbsoluteError),
      errorPercent: parseFloat(acc.errorPercent),
      maxDeviation: Math.max(...compStages.map(s => s.absoluteError), 0),
      privacyImpact: eps <= 0.5 ? 'Strong privacy guarantee with higher variance in low-volume stages' : 'Balanced privacy-utility tradeoff maintaining high conversion visibility',
    };

    res.json({
      epsilon: eps,
      errorPct: parseFloat(acc.errorPercent),
      accuracyPct: parseFloat(acc.accuracyPercent),
      overallAccuracy: parseFloat(acc.accuracyPercent),
      meanAbsoluteError: parseFloat(acc.meanAbsoluteError),
      errorPercent: parseFloat(acc.errorPercent),
      stages: compStages,
      baseline,
      dp: dpArray,
      summary,
    });
  } catch (err) {
    console.error('Comparison error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/accuracy-evaluation
// Evaluates Actual vs DP Analytics across multiple epsilons (0.1, 0.5, 1.0)
router.get('/accuracy-evaluation', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const workflowId = getActiveWorkflowId(db, req);
    const stages = db.prepare(`
      SELECT * FROM stages WHERE workflow_id = ? ORDER BY stage_order
    `).all(workflowId);

    if (stages.length === 0) {
      return res.json({ stages: [], evaluations: [], summary: {} });
    }

    const stageData = stages.map(stage => {
      const actual = db.prepare(`
        SELECT COUNT(DISTINCT session_id) as cnt FROM events WHERE workflow_id = ? AND stage_order = ?
      `).get(workflowId, stage.stage_order);
      return {
        stage_id: stage.id,
        stage_name: stage.name,
        stage_order: stage.stage_order,
        actualCount: actual ? actual.cnt : 0,
      };
    });

    const epsilons = [0.1, 0.5, 1.0];
    const actualCounts = stageData.map(s => s.actualCount);

    const evaluations = epsilons.map(eps => {
      const stageEstimates = stageData.map(s => {
        const dp = applyLaplaceMechanism(s.actualCount, eps);
        const absErr = Math.abs(s.actualCount - dp.noisyCount);
        const relErr = s.actualCount > 0 ? parseFloat(((absErr / s.actualCount) * 100).toFixed(1)) : 0;
        return {
          stage_id: s.stage_id,
          stage_name: s.stage_name,
          actualCount: s.actualCount,
          noisyCount: dp.noisyCount,
          absoluteError: absErr,
          relativeError: relErr,
        };
      });

      const noisyCounts = stageEstimates.map(s => s.noisyCount);
      const acc = computeAccuracy(actualCounts, noisyCounts);
      const theoreticalMAE = parseFloat((1.0 / eps).toFixed(2));

      return {
        epsilon: eps,
        privacyLevel: getPrivacyLevel(eps),
        theoreticalMAE,
        empiricalMAE: parseFloat(acc.meanAbsoluteError),
        accuracyPercent: parseFloat(acc.accuracyPercent),
        errorPercent: parseFloat(acc.errorPercent),
        stageEstimates,
      };
    });

    res.json({
      workflowId,
      stages: stageData,
      evaluations,
      evaluatedAt: new Date().toISOString(),
      testedEpsilons: epsilons,
    });
  } catch (err) {
    console.error('Accuracy evaluation error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/analytics/accuracy-evaluation/run
// Runs on-demand customized evaluation with customizable epsilons and iterations
router.post('/accuracy-evaluation/run', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const workflowId = getActiveWorkflowId(db, req);
    const { epsilons = [0.1, 0.5, 1.0], iterations = 10 } = req.body;

    const stages = db.prepare(`
      SELECT * FROM stages WHERE workflow_id = ? ORDER BY stage_order
    `).all(workflowId);

    const stageData = stages.map(stage => {
      const actual = db.prepare(`
        SELECT COUNT(DISTINCT session_id) as cnt FROM events WHERE workflow_id = ? AND stage_order = ?
      `).get(workflowId, stage.stage_order);
      return {
        stage_id: stage.id,
        stage_name: stage.name,
        stage_order: stage.stage_order,
        actualCount: actual ? actual.cnt : 0,
      };
    });

    const parsedEpsilons = (Array.isArray(epsilons) ? epsilons : [0.1, 0.5, 1.0])
      .map(e => parseFloat(e))
      .filter(e => !isNaN(e) && e > 0);

    const actualCounts = stageData.map(s => s.actualCount);

    const evaluations = parsedEpsilons.map(eps => {
      let iterMAEs = [];
      let lastRunEstimates = [];

      for (let i = 0; i < iterations; i++) {
        const currentEstimates = stageData.map(s => {
          const dp = applyLaplaceMechanism(s.actualCount, eps);
          const absErr = Math.abs(s.actualCount - dp.noisyCount);
          const relErr = s.actualCount > 0 ? parseFloat(((absErr / s.actualCount) * 100).toFixed(1)) : 0;
          return {
            stage_id: s.stage_id,
            stage_name: s.stage_name,
            actualCount: s.actualCount,
            noisyCount: dp.noisyCount,
            absoluteError: absErr,
            relativeError: relErr,
          };
        });

        const trialMAE = calculateMAE(actualCounts, currentEstimates.map(c => c.noisyCount));
        iterMAEs.push(trialMAE);
        if (i === iterations - 1) {
          lastRunEstimates = currentEstimates;
        }
      }

      const meanIterMAE = parseFloat(
        (iterMAEs.reduce((a, b) => a + b, 0) / iterMAEs.length).toFixed(2)
      );
      const acc = computeAccuracy(actualCounts, lastRunEstimates.map(s => s.noisyCount));

      return {
        epsilon: eps,
        privacyLevel: getPrivacyLevel(eps),
        theoreticalMAE: parseFloat((1.0 / eps).toFixed(2)),
        empiricalMAE: meanIterMAE,
        accuracyPercent: parseFloat(acc.accuracyPercent),
        errorPercent: parseFloat(acc.errorPercent),
        stageEstimates: lastRunEstimates,
        iterationsRun: iterations,
      };
    });

    res.json({
      workflowId,
      stages: stageData,
      evaluations,
      evaluatedAt: new Date().toISOString(),
      testedEpsilons: parsedEpsilons,
    });
  } catch (err) {
    console.error('Custom accuracy evaluation run error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;

