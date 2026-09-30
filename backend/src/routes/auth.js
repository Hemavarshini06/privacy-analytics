const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const db = getDB();

    // Auto-create demo alice account if requested
    if (email === 'alice@techflow.com' && password === 'password') {
      const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!existing) {
        const hash = bcrypt.hashSync('password', 10);
        db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)')
          .run('alice', 'alice@techflow.com', hash, 'admin');
      }
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Use admin@privacyanalytics.dev / admin123' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials. Check your password.' });
    }

    const tenantId = user.tenant_id || 1;
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, username: user.username, tenant_id: tenantId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tenant_id: tenantId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, username, email, password, organization_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const db = getDB();
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered. Please sign in.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const uname = username || name || email.split('@')[0];
    const ins = db.prepare(`
      INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)
    `).run(uname, email, hash, 'admin');

    const newUser = {
      id: ins.lastInsertRowid,
      username: uname,
      email,
      role: 'admin',
      tenant_id: 1,
    };

    const token = jwt.sign(newUser, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: newUser,
      message: 'Account created successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    res.json({ user });
  });
});

module.exports = router;
