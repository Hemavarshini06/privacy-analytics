const express = require('express');
const { getDB } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/workflows
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const defaultWorkflow = db.prepare('SELECT * FROM workflows ORDER BY id ASC LIMIT 1').get();
    const workflowId = defaultWorkflow ? defaultWorkflow.id : 1;

    const rawStages = db.prepare(`
      SELECT id, workflow_id, name, description, stage_order, created_at 
      FROM stages 
      WHERE workflow_id = ? 
      ORDER BY stage_order ASC
    `).all(workflowId);

    const stages = rawStages.map(s => ({
      ...s,
      stage_id: s.id,
      stage_name: s.name,
    }));

    const workflows = db.prepare(`
      SELECT w.*, u.username as created_by_name,
             COUNT(DISTINCT s.id) as total_sessions,
             COUNT(DISTINCT st.id) as stage_count
      FROM workflows w
      LEFT JOIN users u ON w.created_by = u.id
      LEFT JOIN sessions s ON s.workflow_id = w.id
      LEFT JOIN stages st ON st.workflow_id = w.id
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `).all();

    res.json({
      stages,
      workflows,
      currentWorkflow: defaultWorkflow,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/workflows/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const stages = db.prepare(`
      SELECT *, id as stage_id, name as stage_name FROM stages WHERE workflow_id = ? ORDER BY stage_order
    `).all(req.params.id);

    res.json({ ...workflow, stages });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/workflows (supports creating workflow OR adding a stage)
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const defaultWorkflow = db.prepare('SELECT * FROM workflows ORDER BY id ASC LIMIT 1').get();
    const workflowId = defaultWorkflow ? defaultWorkflow.id : 1;

    // Check if adding a stage
    if (req.body.stage_name || (req.body.name && !req.body.stages)) {
      const stageName = req.body.stage_name || req.body.name;
      const description = req.body.description || '';
      
      const maxOrder = db.prepare('SELECT MAX(stage_order) as m FROM stages WHERE workflow_id = ?').get(workflowId);
      const stage_order = req.body.stage_order || ((maxOrder?.m || 0) + 1);

      const ins = db.prepare(`
        INSERT INTO stages (workflow_id, name, description, stage_order) VALUES (?, ?, ?, ?)
      `).run(workflowId, stageName, description, stage_order);

      const created = db.prepare('SELECT * FROM stages WHERE id = ?').get(ins.lastInsertRowid);
      return res.status(201).json({
        stage: { ...created, stage_id: created.id, stage_name: created.name }
      });
    }

    // Creating a whole new workflow
    const { name, description, stages } = req.body;
    const result = db.prepare(`
      INSERT INTO workflows (name, description, created_by) VALUES (?, ?, ?)
    `).run(name, description || '', req.user.id);

    const newWorkflowId = result.lastInsertRowid;
    if (stages && stages.length > 0) {
      const insertStage = db.prepare(`
        INSERT INTO stages (workflow_id, name, description, stage_order) VALUES (?, ?, ?, ?)
      `);
      stages.forEach((s, i) => {
        insertStage.run(newWorkflowId, s.name || s.stage_name, s.description || '', i + 1);
      });
    }

    const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(newWorkflowId);
    const stageList = db.prepare('SELECT *, id as stage_id, name as stage_name FROM stages WHERE workflow_id = ? ORDER BY stage_order').all(newWorkflowId);
    res.status(201).json({ ...workflow, stages: stageList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/workflows/reorder
router.post('/reorder', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const stageList = Array.isArray(req.body) ? req.body : (req.body.stages || []);

    const updateOrder = db.prepare('UPDATE stages SET stage_order = ? WHERE id = ?');
    for (const s of stageList) {
      const id = s.stage_id || s.id;
      const order = s.stage_order;
      if (id && order) {
        updateOrder.run(order, id);
      }
    }

    res.json({ message: 'Stages reordered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/workflows/:id
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const { name, stage_name, description } = req.body;

    // Check if updating stage
    const stage = db.prepare('SELECT * FROM stages WHERE id = ?').get(req.params.id);
    if (stage) {
      db.prepare('UPDATE stages SET name = ?, description = ? WHERE id = ?').run(
        stage_name || name || stage.name,
        description !== undefined ? description : stage.description,
        req.params.id
      );
      const updated = db.prepare('SELECT * FROM stages WHERE id = ?').get(req.params.id);
      return res.json({ stage: { ...updated, stage_id: updated.id, stage_name: updated.name } });
    }

    // Updating workflow
    db.prepare('UPDATE workflows SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(name || '', description || '', req.params.id);

    res.json({ message: 'Workflow updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/workflows/:id (deletes stage or workflow)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const stage = db.prepare('SELECT * FROM stages WHERE id = ?').get(req.params.id);
    if (stage) {
      db.prepare('DELETE FROM events WHERE stage_id = ?').run(req.params.id);
      db.prepare('DELETE FROM stages WHERE id = ?').run(req.params.id);
      return res.json({ message: 'Stage deleted successfully' });
    }

    db.prepare('DELETE FROM events WHERE workflow_id = ?').run(req.params.id);
    db.prepare('DELETE FROM stages WHERE workflow_id = ?').run(req.params.id);
    db.prepare('DELETE FROM sessions WHERE workflow_id = ?').run(req.params.id);
    db.prepare('DELETE FROM workflows WHERE id = ?').run(req.params.id);
    res.json({ message: 'Workflow deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
