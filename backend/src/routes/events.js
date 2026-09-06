const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { applyLaplaceMechanism } = require('../utils/privacy');

const router = express.Router();

// Helper to simulate events
function runSimulation(db, workflowId, sessionCount, dropOffProbability, consentPercentage, epsilon = 1.0) {
  const stages = db.prepare(`
    SELECT * FROM stages WHERE workflow_id = ? ORDER BY stage_order
  `).all(workflowId);

  if (stages.length === 0) return { error: 'No stages in workflow' };

  const insertSession = db.prepare(`
    INSERT INTO sessions (id, workflow_id, started_at, completed_at, is_completed, consent_given, last_stage_reached)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEvent = db.prepare(`
    INSERT INTO events (session_id, workflow_id, stage_id, stage_order, event_type, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const stageDropOffRate = 1 - Math.pow(1 - dropOffProbability, 1 / stages.length);
  const consentRate = consentPercentage / 100;

  let completedCount = 0;
  let consentingUsers = 0;
  let totalEvents = 0;
  const stageEnteredCounts = new Array(stages.length).fill(0);

  const generateAll = db.transaction(() => {
    for (let i = 0; i < sessionCount; i++) {
      const sessionId = uuidv4();
      const startTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const consentGiven = Math.random() < consentRate ? 1 : 0;
      if (consentGiven) consentingUsers++;

      let lastStage = 0;
      let completed = 0;
      const stagesToEnter = [];

      for (let s = 0; s < stages.length; s++) {
        if (s > 0 && Math.random() < stageDropOffRate) break;

        stagesToEnter.push(stages[s]);
        stageEnteredCounts[s]++;
        lastStage = stages[s].stage_order;
        if (s === stages.length - 1) completed = 1;
      }

      if (completed) completedCount++;
      const completedAt = completed ? new Date(startTime.getTime() + stages.length * 50000).toISOString() : null;
      insertSession.run(sessionId, workflowId, startTime.toISOString(), completedAt, completed, consentGiven, lastStage);

      for (let s = 0; s < stagesToEnter.length; s++) {
        const eventTime = new Date(startTime.getTime() + s * 45000 + Math.random() * 20000);
        insertEvent.run(
          sessionId, workflowId, stagesToEnter[s].id, stagesToEnter[s].stage_order,
          'stage_enter', eventTime.toISOString()
        );
        totalEvents++;
      }
    }
  });

  generateAll();

  const stagesSummary = stages.map((stg, i) => {
    const entered = stageEnteredCounts[i];
    const noisy = applyLaplaceMechanism(entered, epsilon);
    return {
      stage_id: stg.id,
      stage_name: stg.name,
      stage_order: stg.stage_order,
      entered,
      noisyEntered: noisy.noisyCount,
      noiseAdded: parseFloat(noisy.noiseAdded.toFixed(2)),
    };
  });

  return {
    eventsGenerated: totalEvents,
    summary: {
      total_users_simulated: sessionCount,
      consenting_users: consentingUsers,
      completion_rate: parseFloat(((completedCount / sessionCount) * 100).toFixed(1)),
      stages: stagesSummary,
    }
  };
}

// POST /api/events/simulate
router.post('/simulate', authenticateToken, (req, res) => {
  const { numUsers = 1000, dropOffProbability = 0.3, consentPercentage = 70, workflowId, epsilon = 1.0 } = req.body;

  try {
    const db = getDB();
    const defaultWorkflow = db.prepare('SELECT id FROM workflows ORDER BY id ASC LIMIT 1').get();
    const targetWorkflowId = workflowId || (defaultWorkflow ? defaultWorkflow.id : 1);

    const result = runSimulation(db, targetWorkflowId, parseInt(numUsers), parseFloat(dropOffProbability), parseFloat(consentPercentage), parseFloat(epsilon));
    if (result.error) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/events/generate (backward compatibility)
router.post('/generate', authenticateToken, (req, res) => {
  const { workflowId, sessionCount = 100, dropOffPercent = 30 } = req.body;
  try {
    const db = getDB();
    const defaultWorkflow = db.prepare('SELECT id FROM workflows ORDER BY id ASC LIMIT 1').get();
    const targetWorkflowId = workflowId || (defaultWorkflow ? defaultWorkflow.id : 1);

    const result = runSimulation(db, targetWorkflowId, parseInt(sessionCount), parseFloat(dropOffPercent) / 100, 85);
    res.json({
      message: 'Events generated successfully',
      sessionsGenerated: sessionCount,
      completedSessions: Math.round(sessionCount * (result.summary.completion_rate / 100)),
      completionRate: result.summary.completion_rate,
      eventsGenerated: result.eventsGenerated,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /api/events/summary
router.get('/summary', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const totalSessions = db.prepare('SELECT COUNT(*) as cnt FROM sessions').get();
    const totalEvents = db.prepare('SELECT COUNT(*) as cnt FROM events').get();
    const completed = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE is_completed = 1').get();

    res.json({
      totalSessions: totalSessions.cnt,
      totalEvents: totalEvents.cnt,
      completedSessions: completed.cnt,
      completionRate: totalSessions.cnt > 0 ? parseFloat((completed.cnt / totalSessions.cnt * 100).toFixed(1)) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/events/clear
router.delete('/clear', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    db.exec('DELETE FROM events; DELETE FROM sessions;');
    res.json({ message: 'All simulated events and sessions cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
