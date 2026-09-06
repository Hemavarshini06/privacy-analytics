const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/analytics.db');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function getDB() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    
    // Provide a helper for transactions compatible with better-sqlite3
    db.transaction = (fn) => (...args) => {
      db.exec('BEGIN');
      try {
        const res = fn(...args);
        db.exec('COMMIT');
        return res;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    };
  }
  return db;
}

function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'analyst',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      stage_order INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      workflow_id INTEGER REFERENCES workflows(id),
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      is_completed INTEGER DEFAULT 0,
      consent_given INTEGER DEFAULT 1,
      last_stage_reached INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      workflow_id INTEGER NOT NULL REFERENCES workflows(id),
      stage_id INTEGER REFERENCES stages(id),
      stage_order INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS privacy_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      epsilon REAL NOT NULL DEFAULT 1.0,
      privacy_mode TEXT NOT NULL DEFAULT 'standard',
      privacy_budget_used REAL NOT NULL DEFAULT 0.0,
      privacy_budget_total REAL NOT NULL DEFAULT 10.0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT,
      rating INTEGER NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dp_experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id INTEGER REFERENCES workflows(id),
      epsilon REAL NOT NULL,
      stage_name TEXT NOT NULL,
      actual_count INTEGER NOT NULL,
      noisy_count REAL NOT NULL,
      noise_added REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default data if empty
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  const sessionCount = db.prepare('SELECT COUNT(*) as cnt FROM sessions').get();
  if (userCount.cnt === 0 || sessionCount.cnt === 0) {
    seedDefaultData(db);
  }

  console.log('✅ SQLite Database initialized successfully');
}

function seedDefaultData(db) {
  // Create default users
  const adminHash = bcrypt.hashSync('admin123', 10);
  const analystHash = bcrypt.hashSync('analyst123', 10);

  db.prepare(`
    INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)
  `).run('admin', 'admin@privacyanalytics.dev', adminHash, 'admin');

  db.prepare(`
    INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)
  `).run('analyst', 'analyst@privacyanalytics.dev', analystHash, 'analyst');

  // Create default privacy settings if not set
  const pCount = db.prepare('SELECT COUNT(*) as c FROM privacy_settings').get();
  if (pCount.c === 0) {
    db.prepare(`
      INSERT INTO privacy_settings (epsilon, privacy_mode, privacy_budget_used, privacy_budget_total) VALUES (?, ?, ?, ?)
    `).run(1.0, 'standard', 2.5, 10.0);
  }

  // Create or get sample workflow
  let workflow = db.prepare('SELECT id FROM workflows WHERE name = ?').get('E-Commerce Checkout Flow');
  let workflowId;
  if (!workflow) {
    const workflowResult = db.prepare(`
      INSERT INTO workflows (name, description, created_by) VALUES (?, ?, ?)
    `).run('E-Commerce Checkout Flow', 'Track user journey through checkout process without PII', 1);
    workflowId = workflowResult.lastInsertRowid;
  } else {
    workflowId = workflow.id;
  }

  const stages = [
    { name: 'Product View', description: 'User views a product', order: 1 },
    { name: 'Add to Cart', description: 'User adds product to cart', order: 2 },
    { name: 'Cart Review', description: 'User reviews cart contents', order: 3 },
    { name: 'Checkout Init', description: 'User initiates checkout', order: 4 },
    { name: 'Payment Info', description: 'User enters payment details', order: 5 },
    { name: 'Order Confirm', description: 'User confirms order', order: 6 },
  ];

  let existingStages = db.prepare('SELECT id, stage_order FROM stages WHERE workflow_id = ? ORDER BY stage_order').all(workflowId);
  const stageIds = [];
  if (existingStages.length === 0) {
    const insertStage = db.prepare(`
      INSERT INTO stages (workflow_id, name, description, stage_order) VALUES (?, ?, ?, ?)
    `);
    for (const stage of stages) {
      const result = insertStage.run(workflowId, stage.name, stage.description, stage.order);
      stageIds.push(result.lastInsertRowid);
    }
  } else {
    existingStages.forEach(s => stageIds.push(s.id));
  }

  // Generate synthetic sessions and events
  const { v4: uuidv4 } = require('uuid');
  const insertSession = db.prepare(`
    INSERT INTO sessions (id, workflow_id, started_at, completed_at, is_completed, consent_given, last_stage_reached)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEvent = db.prepare(`
    INSERT INTO events (session_id, workflow_id, stage_id, stage_order, event_type, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const dropOffRates = [0.05, 0.15, 0.20, 0.25, 0.30, 0.0];
  const totalSessions = 1000;

  const insertMany = db.transaction(() => {
    for (let i = 0; i < totalSessions; i++) {
      const sessionId = uuidv4();
      const startTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const consentGiven = Math.random() > 0.15 ? 1 : 0;

      let lastStage = 0;
      let completed = 0;
      const stagesToEnter = [];

      for (let s = 0; s < stages.length; s++) {
        const dropOff = Math.random() < dropOffRates[s];
        if (dropOff && s > 0) break;

        stagesToEnter.push(s);
        lastStage = s + 1;
        if (s === stages.length - 1) completed = 1;
      }

      // Insert session first to satisfy foreign key constraint
      const completedAt = completed ? new Date(startTime.getTime() + stages.length * 65000).toISOString() : null;
      insertSession.run(sessionId, workflowId, startTime.toISOString(), completedAt, completed, consentGiven, lastStage);

      // Insert events
      for (const s of stagesToEnter) {
        const eventTime = new Date(startTime.getTime() + s * 60000 + Math.random() * 30000);
        insertEvent.run(
          sessionId, workflowId, stageIds[s], s + 1,
          'stage_enter', eventTime.toISOString()
        );
      }
    }
  });

  insertMany();
  console.log(`✅ Seeded ${totalSessions} synthetic anonymous sessions`);
}

module.exports = { getDB, initDB };
