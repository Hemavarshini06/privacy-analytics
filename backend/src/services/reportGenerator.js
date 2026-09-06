const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

/**
 * PDF Report Generator using pdfkit.
 * Streams the PDF directly to the Express response.
 */
const generatePDFReport = (data, res) => {
  const {
    tenantName = 'Unknown Organization',
    generatedAt = new Date(),
    kpis = {},
    funnelData = [],
    abandonmentAnalysis = {},
    privacySettings = {},
    experiments = [],
    comparisonData = {},
  } = data;

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Set PDF headers on response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="privacy-analytics-report-${Date.now()}.pdf"`
  );
  doc.pipe(res);

  // ── COLORS ──
  const PURPLE = '#7c3aed';
  const DARK = '#1e293b';
  const GRAY = '#64748b';
  const GREEN = '#10b981';
  const RED = '#ef4444';

  // ── HEADER ──
  doc.rect(0, 0, doc.page.width, 80).fill(PURPLE);
  doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
    .text('PrivacyLens Analytics Report', 50, 20);
  doc.fontSize(10).font('Helvetica')
    .text(`Organization: ${tenantName}`, 50, 48)
    .text(`Generated: ${new Date(generatedAt).toLocaleString()}`, 50, 62);

  doc.moveDown(3);
  doc.fillColor(DARK);

  // ── SECTION: KPI SUMMARY ──
  doc.fontSize(14).font('Helvetica-Bold').fillColor(PURPLE).text('1. Key Performance Indicators', 50, 100);
  doc.moveTo(50, 118).lineTo(545, 118).strokeColor(PURPLE).stroke();
  doc.moveDown(0.5);

  const kpiRows = [
    ['Total Events', kpis.totalEvents || 'N/A'],
    ['Consenting Users', kpis.consentingUsers || 'N/A'],
    ['Completion Rate', kpis.completionRate ? `${kpis.completionRate}%` : 'N/A'],
    ['Abandonment Rate', kpis.abandonmentRate ? `${kpis.abandonmentRate}%` : 'N/A'],
    ['Privacy Budget Used', kpis.budgetUsed ? `${kpis.budgetUsed} / ${kpis.totalBudget}` : 'N/A'],
  ];

  let yPos = 130;
  kpiRows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.rect(50, yPos - 3, 495, 20).fill('#f8fafc');
    }
    doc.fillColor(GRAY).font('Helvetica').fontSize(10).text(label, 60, yPos);
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(String(value), 300, yPos);
    yPos += 22;
  });

  // ── SECTION: FUNNEL ANALYSIS ──
  yPos += 15;
  doc.fontSize(14).font('Helvetica-Bold').fillColor(PURPLE).text('2. Funnel Analysis', 50, yPos);
  yPos += 20;
  doc.moveTo(50, yPos).lineTo(545, yPos).strokeColor(PURPLE).stroke();
  yPos += 10;

  if (funnelData.length > 0) {
    // Table header
    doc.rect(50, yPos, 495, 20).fill(PURPLE);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(9)
      .text('Stage', 60, yPos + 5)
      .text('Entered', 200, yPos + 5)
      .text('Completed', 290, yPos + 5)
      .text('Conversion %', 390, yPos + 5)
      .text('Abandoned', 470, yPos + 5);
    yPos += 22;

    funnelData.forEach((stage, i) => {
      if (i % 2 === 0) doc.rect(50, yPos - 2, 495, 18).fill('#f8fafc');
      const conv = stage.conversionRate ? `${Math.round(stage.conversionRate * 100)}%` : '0%';
      doc.fillColor(DARK).font('Helvetica').fontSize(9)
        .text(stage.stage_name || '', 60, yPos)
        .text(String(stage.entered || 0), 200, yPos)
        .text(String(stage.completed || 0), 290, yPos)
        .text(conv, 390, yPos)
        .text(String(stage.abandoned || 0), 470, yPos);
      yPos += 20;
    });
  } else {
    doc.fillColor(GRAY).fontSize(10).text('No funnel data available. Simulate events first.', 60, yPos);
    yPos += 20;
  }

  // ── SECTION: PRIVACY SETTINGS ──
  yPos += 15;
  if (yPos > 700) { doc.addPage(); yPos = 50; }

  doc.fontSize(14).font('Helvetica-Bold').fillColor(PURPLE).text('3. Privacy Configuration', 50, yPos);
  yPos += 20;
  doc.moveTo(50, yPos).lineTo(545, yPos).strokeColor(PURPLE).stroke();
  yPos += 10;

  const privacyRows = [
    ['Privacy Mode', privacySettings.privacy_mode || 'N/A'],
    ['Epsilon (ε)', String(privacySettings.epsilon_value || 'N/A')],
    ['Noise Mechanism', privacySettings.noise_mechanism || 'N/A'],
    ['Retention Policy', privacySettings.retention_days ? `${privacySettings.retention_days} days` : 'N/A'],
    ['Min Cohort Size', String(privacySettings.min_cohort_size || 'N/A')],
  ];

  privacyRows.forEach(([label, value], i) => {
    if (i % 2 === 0) doc.rect(50, yPos - 2, 495, 18).fill('#f8fafc');
    doc.fillColor(GRAY).font('Helvetica').fontSize(10).text(label, 60, yPos);
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(value, 300, yPos);
    yPos += 20;
  });

  // ── SECTION: COMPARISON ──
  yPos += 15;
  if (yPos > 650) { doc.addPage(); yPos = 50; }

  doc.fontSize(14).font('Helvetica-Bold').fillColor(PURPLE)
    .text('4. Baseline vs Differential Privacy Comparison', 50, yPos);
  yPos += 20;
  doc.moveTo(50, yPos).lineTo(545, yPos).strokeColor(PURPLE).stroke();
  yPos += 10;

  if (comparisonData.errorPct !== undefined) {
    doc.fillColor(DARK).font('Helvetica').fontSize(10)
      .text(`Error Percentage: ${comparisonData.errorPct}%`, 60, yPos); yPos += 18;
    doc.text(`Accuracy: ${comparisonData.accuracyPct}%`, 60, yPos); yPos += 18;
    doc.text(`Epsilon Used: ${comparisonData.epsilon}`, 60, yPos); yPos += 18;
  } else {
    doc.fillColor(GRAY).fontSize(10).text('No comparison data available.', 60, yPos);
    yPos += 18;
  }

  // ── SECTION: ABANDONMENT RECOMMENDATIONS ──
  yPos += 15;
  if (yPos > 650) { doc.addPage(); yPos = 50; }

  doc.fontSize(14).font('Helvetica-Bold').fillColor(PURPLE)
    .text('5. Abandonment Detection & Recommendations', 50, yPos);
  yPos += 20;
  doc.moveTo(50, yPos).lineTo(545, yPos).strokeColor(PURPLE).stroke();
  yPos += 10;

  const recs = abandonmentAnalysis.recommendations || [];
  if (recs.length > 0) {
    recs.forEach((rec, i) => {
      if (yPos > 720) { doc.addPage(); yPos = 50; }
      const color = rec.priority === 'critical' ? RED : rec.priority === 'high' ? '#f59e0b' : GRAY;
      doc.fillColor(color).font('Helvetica-Bold').fontSize(9)
        .text(`[${(rec.priority || 'info').toUpperCase()}] ${rec.stage}`, 60, yPos);
      yPos += 14;
      doc.fillColor(DARK).font('Helvetica').fontSize(9)
        .text(rec.message, 60, yPos, { width: 470, lineGap: 2 });
      yPos += doc.heightOfString(rec.message, { width: 470 }) + 10;
    });
  } else {
    doc.fillColor(GRAY).fontSize(10).text('No recommendations generated yet.', 60, yPos);
  }

  // ── FOOTER ──
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fillColor(GRAY).fontSize(8).font('Helvetica')
      .text(
        `PrivacyLens | ${tenantName} | Confidential | Page ${i + 1} of ${pages.count}`,
        50, doc.page.height - 30, { align: 'center', width: doc.page.width - 100 }
      );
  }

  doc.end();
};

/**
 * CSV Report Generator using json2csv.
 * Returns a CSV string.
 */
const generateCSVReport = (data) => {
  const { funnelData = [], kpis = {}, abandonmentAnalysis = {}, comparisonData = {} } = data;

  // Funnel data rows
  const funnelRows = funnelData.map((stage) => ({
    Section: 'Funnel',
    Stage: stage.stage_name || '',
    Order: stage.stage_order || '',
    Entered: stage.entered || 0,
    Completed: stage.completed || 0,
    Abandoned: stage.abandoned || 0,
    ConversionRate: stage.conversionRate ? `${Math.round(stage.conversionRate * 100)}%` : '0%',
    AbandonmentRate: stage.abandonmentRate ? `${Math.round(stage.abandonmentRate * 100)}%` : '0%',
    NoisyEntered: stage.noisyEntered || stage.entered || '',
    NoisyCompleted: stage.noisyCompleted || stage.completed || '',
  }));

  // KPI rows
  const kpiRows = [
    { Section: 'KPI', Metric: 'Total Events', Value: kpis.totalEvents || 0 },
    { Section: 'KPI', Metric: 'Consenting Users', Value: kpis.consentingUsers || 0 },
    { Section: 'KPI', Metric: 'Completion Rate', Value: `${kpis.completionRate || 0}%` },
    { Section: 'KPI', Metric: 'Abandonment Rate', Value: `${kpis.abandonmentRate || 0}%` },
    { Section: 'KPI', Metric: 'Privacy Budget Used', Value: kpis.budgetUsed || 0 },
  ];

  // Comparison row
  const compRows = comparisonData.errorPct !== undefined ? [{
    Section: 'Comparison',
    Mode: 'Differential Privacy',
    ErrorPct: `${comparisonData.errorPct}%`,
    AccuracyPct: `${comparisonData.accuracyPct}%`,
    Epsilon: comparisonData.epsilon,
  }] : [];

  try {
    const funnelParser = new Parser({
      fields: ['Section', 'Stage', 'Order', 'Entered', 'Completed', 'Abandoned',
               'ConversionRate', 'AbandonmentRate', 'NoisyEntered', 'NoisyCompleted'],
    });
    const kpiParser = new Parser({ fields: ['Section', 'Metric', 'Value'] });
    const compParser = new Parser({ fields: ['Section', 'Mode', 'ErrorPct', 'AccuracyPct', 'Epsilon'] });

    const parts = ['=== FUNNEL DATA ==='];
    if (funnelRows.length) parts.push(funnelParser.parse(funnelRows));
    parts.push('\n=== KPI SUMMARY ===');
    parts.push(kpiParser.parse(kpiRows));
    if (compRows.length) {
      parts.push('\n=== COMPARISON ===');
      parts.push(compParser.parse(compRows));
    }

    return parts.join('\n');
  } catch (err) {
    console.error('CSV generation error:', err);
    return 'Error generating CSV report';
  }
};

module.exports = { generatePDFReport, generateCSVReport };
