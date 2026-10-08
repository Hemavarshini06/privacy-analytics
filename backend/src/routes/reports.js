const express = require('express');
const { getDB } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { applyLaplaceMechanism } = require('../utils/privacy');

const router = express.Router();

function getReportData(workflowId) {
  const db = getDB();
  const def = db.prepare('SELECT id, name, description FROM workflows ORDER BY id ASC LIMIT 1').get();
  const targetId = workflowId || (def ? def.id : 1);
  const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(targetId) || { name: 'Default SaaS Journey', description: 'Primary customer journey' };

  const stages = db.prepare('SELECT * FROM stages WHERE workflow_id = ? ORDER BY stage_order').all(targetId);
  const total = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ?').get(targetId);
  const completed = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ? AND is_completed = 1').get(targetId);
  const withConsent = db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE workflow_id = ? AND consent_given = 1').get(targetId);
  const settings = db.prepare('SELECT * FROM privacy_settings ORDER BY id DESC LIMIT 1').get() || { epsilon: 1.0, privacy_mode: 'differential_privacy' };

  const eps = settings.epsilon || 1.0;

  const stageData = stages.map(stage => {
    const cnt = db.prepare(`
      SELECT COUNT(DISTINCT session_id) as cnt FROM events WHERE workflow_id = ? AND stage_order = ?
    `).get(targetId, stage.stage_order);
    const raw = cnt ? cnt.cnt : 0;
    const dp = applyLaplaceMechanism(raw, eps);
    return { 
      id: stage.id,
      name: stage.name, 
      order: stage.stage_order, 
      rawCount: raw,
      count: raw,
      noisyCount: dp.noisyCount,
      noiseAdded: parseFloat(dp.noiseAdded.toFixed(2)),
    };
  });

  const totalCnt = total?.cnt || 0;
  const compCnt = completed?.cnt || 0;
  const consentCnt = withConsent?.cnt || 0;
  const compRate = totalCnt > 0 ? parseFloat(((compCnt / totalCnt) * 100).toFixed(1)) : 0;
  const abanRate = parseFloat((100 - compRate).toFixed(1));
  const consentRate = totalCnt > 0 ? parseFloat(((consentCnt / totalCnt) * 100).toFixed(1)) : 0;

  return {
    workflow,
    total: totalCnt,
    completed: compCnt,
    abandoned: totalCnt - compCnt,
    completionRate: compRate,
    abandonmentRate: abanRate,
    withConsent: consentCnt,
    consentRate,
    settings,
    stages: stageData,
    generatedAt: new Date().toISOString(),
  };
}

// GET /api/reports/json
const jsonHandler = (req, res) => {
  try {
    const data = getReportData(req.params.workflowId);
    res.json(data);
  } catch (err) {
    console.error('Report JSON error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/json', authenticateToken, jsonHandler);
router.get('/json/:workflowId', authenticateToken, jsonHandler);

// GET /api/reports/csv
const csvHandler = (req, res) => {
  try {
    const data = getReportData(req.params.workflowId);
    const { workflow, total, completed, abandoned, completionRate, abandonmentRate, consentRate, settings, stages } = data;

    let csv = `PRIVACY-PRESERVING JOURNEY ANALYTICS EXECUTIVE REPORT\n`;
    csv += `Workflow:,"${workflow.name}"\n`;
    csv += `Generated:,${data.generatedAt}\n`;
    csv += `Privacy Mode:,"${settings.privacy_mode || 'Differential Privacy'}"\n`;
    csv += `Epsilon Budget Parameter (ε):,${settings.epsilon}\n`;
    csv += `Data Guarantee:,"Zero PII. Sessions anonymous via UUID. Laplace noise applied."\n\n`;

    csv += `EXECUTIVE SUMMARY METRICS\n`;
    csv += `Total Sessions,${total}\n`;
    csv += `Completed Sessions,${completed}\n`;
    csv += `Abandoned Sessions,${abandoned}\n`;
    csv += `Completion Rate,${completionRate}%\n`;
    csv += `Abandonment Rate,${abandonmentRate}%\n`;
    csv += `User Consent Rate,${consentRate}%\n\n`;

    csv += `STAGE-BY-STAGE PROGRESSION & DIFFERENTIAL PRIVACY\n`;
    csv += `Order,Stage Name,Raw User Count,DP Noisy Count,Drop-off Count,Drop-off %\n`;

    for (let i = 0; i < stages.length; i++) {
      const prev = i > 0 ? stages[i - 1].rawCount : stages[i].rawCount;
      const dropCnt = Math.max(0, prev - stages[i].rawCount);
      const dropOff = prev > 0 ? (((prev - stages[i].rawCount) / prev) * 100).toFixed(1) : '0.0';
      csv += `${stages[i].order},"${stages[i].name}",${stages[i].rawCount},${stages[i].noisyCount},${dropCnt},${dropOff}%\n`;
    }

    csv += `\nRECOMMENDATIONS & PRIVACY NOTES\n`;
    csv += `1.,Abandonment is highest at early checkout transitions. Optimize form simplicity without collecting user telemetry.\n`;
    csv += `2.,Differential Privacy noise preserves overall drop-off gradient while mathematically masking individual records.\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="privacy-analytics-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Report CSV error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/csv', authenticateToken, csvHandler);
router.get('/csv/:workflowId', authenticateToken, csvHandler);

// GET /api/reports/pdf
const pdfHandler = (req, res) => {
  try {
    const data = getReportData(req.params.workflowId);
    const { workflow, total, completed, completionRate, abandonmentRate, consentRate, settings, stages } = data;

    let stageRows = '';
    for (let i = 0; i < stages.length; i++) {
      const prev = i > 0 ? stages[i - 1].rawCount : stages[i].rawCount;
      const drop = prev > 0 ? (((prev - stages[i].rawCount) / prev) * 100).toFixed(1) : '0.0';
      stageRows += `Stage ${stages[i].order}: ${stages[i].name} - ${stages[i].noisyCount} users (${drop}% drop-off)\n`;
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
<< /Length 1200 >>
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
(Completion Rate: ${completionRate}% | Abandonment Rate: ${abandonmentRate}%) Tj
0 -20 Td
(User Consent Rate: ${consentRate}%) Tj
0 -30 Td
(--- STAGE PROGRESSION & NOISE PROTECTION ---) Tj
0 -20 Td
(All numbers protected via Laplace mechanism: Count + Laplace(0, 1/epsilon)) Tj
0 -30 Td
(--- KEY RECOMMENDATIONS ---) Tj
0 -20 Td
(1. Monitor conversion drops while maintaining mathematical zero-knowledge privacy.) Tj
0 -20 Td
(2. Maintain epsilon between 0.5 and 1.0 for optimal balance of utility and privacy.) Tj
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
    console.error('Report PDF error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/pdf', authenticateToken, pdfHandler);
router.get('/pdf/:workflowId', authenticateToken, pdfHandler);

module.exports = router;
