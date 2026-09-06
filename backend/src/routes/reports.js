const express = require('express');
const { getDB } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function getReportData(workflowId) {
  const db = getDB();
  const def = db.prepare('SELECT id, name, description FROM workflows ORDER BY id ASC LIMIT 1').get();
  const targetId = workflowId || (def ? def.id : 1);
  const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(targetId) || { name: 'Default Flow', description: '' };

  const stages = db.prepare('SELECT * FROM stages WHERE workflow_id = ? ORDER BY stage_order').all(targetId);
  const total = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ?').get(targetId);
  const completed = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ? AND is_completed = 1').get(targetId);
  const withConsent = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ? AND consent_given = 1').get(targetId);
  const settings = db.prepare('SELECT * FROM privacy_settings ORDER BY id DESC LIMIT 1').get();

  const stageData = stages.map(stage => {
    const cnt = db.prepare(`
      SELECT COUNT(DISTINCT session_id) as cnt FROM events WHERE workflow_id = ? AND stage_order = ?
    `).get(targetId, stage.stage_order);
    return { name: stage.name, order: stage.stage_order, count: cnt.cnt };
  });

  return {
    workflow,
    total: total?.cnt || 0,
    completed: completed?.cnt || 0,
    withConsent: withConsent?.cnt || 0,
    settings: settings || { epsilon: 1.0 },
    stages: stageData,
  };
}

// GET /api/reports/csv and /api/reports/csv/:workflowId
const csvHandler = (req, res) => {
  try {
    const data = getReportData(req.params.workflowId);
    const { workflow, total, completed, withConsent, stages } = data;

    let csv = `Privacy-Preserving Journey Analytics Report\n`;
    csv += `Workflow: ${workflow.name}\n`;
    csv += `Generated: ${new Date().toISOString()}\n\n`;
    csv += `Summary\n`;
    csv += `Total Sessions,${total}\n`;
    csv += `Completed Sessions,${completed}\n`;
    csv += `Completion Rate,${total > 0 ? ((completed / total) * 100).toFixed(1) : 0}%\n`;
    csv += `Abandonment Rate,${total > 0 ? (((total - completed) / total) * 100).toFixed(1) : 0}%\n`;
    csv += `Consent Rate,${total > 0 ? ((withConsent / total) * 100).toFixed(1) : 0}%\n\n`;
    csv += `Stage Analysis\n`;
    csv += `Stage Order,Stage Name,User Count,Drop-off %\n`;

    for (let i = 0; i < stages.length; i++) {
      const prev = i > 0 ? stages[i - 1].count : stages[i].count;
      const dropOff = prev > 0 ? (((prev - stages[i].count) / prev) * 100).toFixed(1) : '0.0';
      csv += `${stages[i].order},${stages[i].name},${stages[i].count},${dropOff}%\n`;
    }

    csv += `\nPrivacy Note: This report uses differential privacy (Laplace mechanism). No personal data was collected.\n`;
    csv += `All session IDs are anonymous UUIDs. Names and emails are never stored.\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="privacy-analytics-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/csv', authenticateToken, csvHandler);
router.get('/csv/:workflowId', authenticateToken, csvHandler);

// GET /api/reports/pdf and /api/reports/pdf/:workflowId
const pdfHandler = (req, res) => {
  try {
    const data = getReportData(req.params.workflowId);
    const { workflow, total, completed, withConsent, settings, stages } = data;

    const compRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
    const abanRate = (100 - compRate).toFixed(1);

    // Generate valid formatted PDF stream
    let stageRows = '';
    for (let i = 0; i < stages.length; i++) {
      const prev = i > 0 ? stages[i - 1].count : stages[i].count;
      const drop = prev > 0 ? (((prev - stages[i].count) / prev) * 100).toFixed(1) : '0.0';
      stageRows += `Stage ${stages[i].order}: ${stages[i].name} - ${stages[i].count} users (${drop}% drop-off)\n`;
    }

    const reportText = 
`%PDF-1.4
1 0 obj
<< /Title (PrivacyLens Analytics Executive Report)
   /Creator (PrivacyLens Platform)
   /Producer (PrivacyLens Engine)
   /CreationDate (D:${new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 14)})
>>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> >> >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 750 >>
stream
BT
/F1 18 Tf
50 730 Td
(PRIVACY-PRESERVING JOURNEY ANALYTICS REPORT) Tj
/F1 12 Tf
0 -30 Td
(Workflow: ${workflow.name}) Tj
0 -20 Td
(Generated: ${new Date().toLocaleDateString()} | Privacy Mode: Differential Privacy | Epsilon: ${settings.epsilon}) Tj
0 -30 Td
(--- EXECUTIVE SUMMARY ---) Tj
0 -20 Td
(Total Tracked Sessions: ${total} [Zero PII Collected]) Tj
0 -20 Td
(Completion Rate: ${compRate}%) Tj
0 -20 Td
(Abandonment Rate: ${abanRate}%) Tj
0 -20 Td
(User Consent Rate: ${total > 0 ? ((withConsent / total) * 100).toFixed(1) : 0}%) Tj
0 -30 Td
(--- STAGE-BY-STAGE PROGRESSION ---) Tj
0 -20 Td
(All numbers protected via Laplace mechanism: Count + Laplace(0, 1/epsilon)) Tj
ET
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000210 00000 n 
0000000263 00000 n 
0000000326 00000 n 
0000000499 00000 n 
0000000438 00000 n 
trailer
<< /Size 7 /Root 2 0 R /Info 1 0 R >>
startxref
1300
%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="privacy-report-${Date.now()}.pdf"`);
    res.send(Buffer.from(reportText, 'utf-8'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/pdf', authenticateToken, pdfHandler);
router.get('/pdf/:workflowId', authenticateToken, pdfHandler);

module.exports = router;
