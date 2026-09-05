const { asyncHandler } = require('../../shared/asyncHandler');
const service = require('./payroll.service');
const {
  createStructureSchema,
  createRuleSchema,
  createPayrunDraftSchema,
  createPayrunSchema,
} = require('./payroll.validation');

// ───────────── Structures ─────────────
const listStructures = asyncHandler(async (_req, res) => {
  const structures = await service.listStructures();
  res.json(structures);
});

const getStructure = asyncHandler(async (req, res) => {
  const structure = await service.getStructure(parseInt(req.params.id, 10));
  res.json(structure);
});

const createStructure = asyncHandler(async (req, res) => {
  const data = createStructureSchema.parse(req.body);
  const structure = await service.createStructure(data);
  res.status(201).json(structure);
});

// ───────────── Rules ─────────────
const listRules = asyncHandler(async (req, res) => {
  const structureId = parseInt(req.query.structure_id, 10);
  if (!structureId) return res.status(400).json({ error: 'structure_id query param required' });
  const rules = await service.listRulesByStructure(structureId);
  res.json(rules);
});

const createRule = asyncHandler(async (req, res) => {
  const data = createRuleSchema.parse(req.body);
  const rule = await service.createRule(data);
  res.status(201).json(rule);
});

const updateRule = asyncHandler(async (req, res) => {
  const data = createRuleSchema.partial().parse(req.body);
  const rule = await service.updateRule(parseInt(req.params.id, 10), data);
  res.json(rule);
});

const deleteRule = asyncHandler(async (req, res) => {
  await service.deleteRule(parseInt(req.params.id, 10));
  res.status(204).end();
});

// ───────────── Payruns ─────────────
const listPayruns = asyncHandler(async (_req, res) => {
  const payruns = await service.listPayruns();
  res.json(payruns);
});

const getPayrun = asyncHandler(async (req, res) => {
  const payrun = await service.getPayrun(parseInt(req.params.id, 10));
  const payslips = await service.listPayslipsByPayrun(payrun.id);
  res.json({ ...payrun, payslips });
});
const listPayslipsByPayrun = asyncHandler(async (req, res) => {
  const payslips = await service.listPayslipsByPayrun(parseInt(req.params.id, 10));
  res.json(payslips);
});

const initDraft = asyncHandler(async (req, res) => {
  const data = createPayrunDraftSchema.parse(req.body);
  const result = await service.initDraft(
    data.structure_id,
    data.period_start,
    data.period_end,
    data.employee_type_filter
  );
  res.json(result);
});

const createPayrun = asyncHandler(async (req, res) => {
  const data = createPayrunSchema.parse(req.body);
  const result = await service.createPayrun(data, req.user.id);
  res.status(201).json(result);
});

const computePayrun = asyncHandler(async (req, res) => {
  const payrun = await service.transitionPayrun(parseInt(req.params.id, 10), 'computed');
  res.json(payrun);
});

const validatePayrun = asyncHandler(async (req, res) => {
  const payrun = await service.transitionPayrun(parseInt(req.params.id, 10), 'validated');
  res.json(payrun);
});

const markPaid = asyncHandler(async (req, res) => {
  const payrun = await service.transitionPayrun(parseInt(req.params.id, 10), 'paid');
  res.json(payrun);
});

// ───────────── Payslips ─────────────
const getPayslip = asyncHandler(async (req, res) => {
  const payslip = await service.getPayslipWithLines(parseInt(req.params.id, 10));
  res.json(payslip);
});

const explainPayslip = asyncHandler(async (req, res) => {
  const explanation = await service.explainPayslip(parseInt(req.params.id, 10));
  res.json(explanation);
});

const getPayslipPdf = asyncHandler(async (req, res) => {
  const payslip = await service.getPayslipWithLines(parseInt(req.params.id, 10));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=payslip_${payslip.id}.pdf`);

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  // --- Header ---
  doc.fontSize(24).font('Helvetica-Bold').text('PeoplePay360', { align: 'left' });
  doc.fontSize(10).font('Helvetica').fillColor('gray')
    .text('123 Business Avenue, Suite 100', { align: 'left' })
    .text('City, State, 12345', { align: 'left' })
    .text('info@peoplepay360.com', { align: 'left' });

  doc.moveUp(4);
  doc.fontSize(20).fillColor('black').text('PAYSLIP', { align: 'right' });
  doc.fontSize(10).fillColor('gray').text(`ID: #${String(payslip.id).padStart(6, '0')}`, { align: 'right' });
  doc.text(`Status: ${payslip.status.toUpperCase()}`, { align: 'right' });
  doc.moveDown(3);

  // --- Employee Info ---
  doc.rect(50, 150, 495, 70).fillAndStroke('#f9fafb', '#e5e7eb');
  doc.fillColor('black').font('Helvetica-Bold').fontSize(11)
    .text('Employee Details', 65, 160);
  doc.font('Helvetica').fontSize(10)
    .text(`Name: ${payslip.employee_name || 'Employee #' + payslip.employee_id}`, 65, 175)
    .text(`Worked Days: ${payslip.worked_days}`, 65, 190)
    .text(`Contract ID: ${payslip.contract_id}`, 300, 175)
    .text(`Bank Account: ${payslip.bank_account || 'N/A'}`, 300, 190);
  doc.moveDown(4);

  // --- Breakdown Table ---
  const tableTop = 250;

  // Table Header
  doc.rect(50, tableTop, 495, 20).fillAndStroke('#374151', '#374151');
  doc.fillColor('white').font('Helvetica-Bold').fontSize(10)
    .text('Description', 60, tableTop + 5)
    .text('Category', 250, tableTop + 5)
    .text('Amount', 400, tableTop + 5, { align: 'right', width: 130 });

  // Table Rows
  let y = tableTop + 25;
  doc.fillColor('black').font('Helvetica');

  for (const line of payslip.lines || []) {
    doc.text(line.label, 60, y)
      .text(line.category, 250, y)
      .text(Number(line.value).toFixed(2), 400, y, { align: 'right', width: 130 });

    // Draw row bottom border
    doc.moveTo(50, y + 15).lineTo(545, y + 15).lineWidth(0.5).stroke('#e5e7eb');
    y += 20;
  }

  // --- Totals ---
  doc.moveDown(2);
  const totalsTop = y + 20;
  doc.rect(350, totalsTop, 195, 65).fillAndStroke('#f9fafb', '#e5e7eb');

  doc.font('Helvetica').fontSize(10)
    .text('Gross Total:', 365, totalsTop + 10)
    .text('Deductions:', 365, totalsTop + 25);

  doc.font('Helvetica-Bold')
    .text(Number(payslip.gross_total).toFixed(2), 450, totalsTop + 10, { align: 'right', width: 80 })
    .text(Number(payslip.gross_total - payslip.net_total).toFixed(2), 450, totalsTop + 25, { align: 'right', width: 80 });

  doc.moveTo(350, totalsTop + 40).lineTo(545, totalsTop + 40).lineWidth(1).stroke('#e5e7eb');

  doc.fontSize(12).text('Net Salary:', 365, totalsTop + 48);
  doc.text(Number(payslip.net_total).toFixed(2), 450, totalsTop + 48, { align: 'right', width: 80 });

  // --- Warning Block ---
  if (payslip.has_warning) {
    doc.moveDown(3);
    const warningY = doc.y;
    doc.rect(50, warningY, 495, 30).fillAndStroke('#fef2f2', '#fecaca');
    doc.fillColor('#dc2626').font('Helvetica-Bold').fontSize(10)
      .text(`⚠ WARNING: ${payslip.warning_reason}`, 60, warningY + 10);
  }

  // Footer
  doc.font('Helvetica').fontSize(8).fillColor('gray');
  doc.text('This is a computer-generated document. No signature is required.', 50, 750, { align: 'center', width: 495 });

  doc.end();
});

const sendPayslips = asyncHandler(async (req, res) => {
  const result = await service.sendPayslips(parseInt(req.params.id, 10), req.user?.id);
  res.json(result);
});

module.exports = {
  listStructures,
  getStructure,
  createStructure,
  listRules,
  createRule,
  updateRule,
  deleteRule,
  listPayruns,
  getPayrun,
  listPayslipsByPayrun,
  initDraft,
  createPayrun,
  computePayrun,
  validatePayrun,
  markPaid,
  getPayslip,
  explainPayslip,
  getPayslipPdf,
  sendPayslips,
};

