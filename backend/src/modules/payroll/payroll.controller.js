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

const getPayslipPdf = asyncHandler(async (req, res) => {
  // PDF generation placeholder — Dev 3 will implement with pdfkit
  const payslip = await service.getPayslipWithLines(parseInt(req.params.id, 10));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=payslip_${payslip.id}.pdf`);

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text('PeoplePay360 — Payslip', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Employee: ${payslip.employee_name}`);
  doc.text(`Payslip ID: ${payslip.id}`);
  doc.text(`Worked Days: ${payslip.worked_days}`);
  doc.moveDown();

  doc.fontSize(14).text('Breakdown:', { underline: true });
  doc.moveDown(0.5);
  for (const line of payslip.lines) {
    doc.fontSize(10).text(`${line.label} (${line.category}): ${Number(line.value).toFixed(2)}`);
  }
  doc.moveDown();
  doc.fontSize(12).text(`Gross: ${Number(payslip.gross_total).toFixed(2)}`);
  doc.text(`Net: ${Number(payslip.net_total).toFixed(2)}`);

  if (payslip.has_warning) {
    doc.moveDown();
    doc.fontSize(10).fillColor('red').text(`⚠ Warning: ${payslip.warning_reason}`);
  }

  doc.end();
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
  initDraft,
  createPayrun,
  computePayrun,
  validatePayrun,
  markPaid,
  getPayslip,
  getPayslipPdf,
};
