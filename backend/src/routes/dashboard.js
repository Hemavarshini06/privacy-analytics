const express = require('express');
const { getDB } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const db = getDB();

    const totalSessions = db.prepare('SELECT COUNT(*) as cnt FROM sessions').get();
    const completed = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE is_completed = 1').get();
    const withConsent = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE consent_given = 1').get();
    const totalWorkflows = db.prepare('SELECT COUNT(*) as cnt FROM workflows').get();
    const settings = db.prepare('SELECT * FROM privacy_settings ORDER BY id DESC LIMIT 1').get();

    const completionRate = totalSessions.cnt > 0
      ? parseFloat((completed.cnt / totalSessions.cnt * 100).toFixed(1)) : 0;
    const abandonmentRate = 100 - completionRate;
    const consentRate = totalSessions.cnt > 0
      ? parseFloat((withConsent.cnt / totalSessions.cnt * 100).toFixed(1)) : 0;

    // Privacy score: based on epsilon and consent rate
    const epsilon = settings?.epsilon || 1.0;
    const privacyScore = Math.min(100, Math.round(
      (1 / epsilon) * 30 + consentRate * 0.5 + 20
    ));

    // Recent activity
    const recentSessions = db.prepare(`
      SELECT DATE(started_at) as date, COUNT(*) as count 
      FROM sessions 
      GROUP BY DATE(started_at) 
      ORDER BY date DESC LIMIT 7
    `).all();

    res.json({
      totalSessions: totalSessions.cnt,
      completedSessions: completed.cnt,
      abandonedSessions: totalSessions.cnt - completed.cnt,
      completionRate,
      abandonmentRate: parseFloat(abandonmentRate.toFixed(1)),
      consentRate,
      totalWorkflows: totalWorkflows.cnt,
      privacyScore,
      epsilon: settings?.epsilon || 1.0,
      privacyMode: settings?.privacy_mode || 'standard',
      budgetUsed: settings?.privacy_budget_used || 0,
      budgetTotal: settings?.privacy_budget_total || 10,
      recentActivity: recentSessions.reverse(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
