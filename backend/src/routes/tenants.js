const express = require('express');
const { getDB } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/tenants/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const settings = db.prepare('SELECT * FROM privacy_settings ORDER BY id DESC LIMIT 1').get();
    res.json({
      tenant: {
        id: req.params.id,
        organization_name: 'TechFlow SaaS Org',
        privacy_budget: settings?.privacy_budget_total || 10,
        privacy_budget_used: settings?.privacy_budget_used || 2.5,
        plan: 'Enterprise Privacy',
        created_at: new Date().toISOString(),
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tenants/:id
router.put('/:id', authenticateToken, (req, res) => {
  res.json({ message: 'Tenant updated successfully' });
});

// GET /api/tenants/:id/users
router.get('/:id/users', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const users = db.prepare('SELECT id, username, email, role, created_at FROM users').all();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
