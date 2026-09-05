const { asyncHandler } = require('../../shared/asyncHandler');
const service = require('./payroll.service');
const {
  createStructureSchema,
  updateStructureSchema,
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

const updateStructure = asyncHandler(async (req, res) => {
  const data = updateStructureSchema.parse(req.body);
  const structure = await service.updateStructure(parseInt(req.params.id, 10), data);
  res.json(structure);
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
  
  const { generatePayslipPdfBuffer } = require('./pdfGenerator');
  const pdfBuffer = await generatePayslipPdfBuffer(payslip);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=payslip_${payslip.id}.pdf`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.end(pdfBuffer);
});

const sendPayslips = asyncHandler(async (req, res) => {
  const result = await service.sendPayslips(parseInt(req.params.id, 10), req.user?.id);
  res.json(result);
});

module.exports = {
  listStructures,
  getStructure,
  createStructure,
  updateStructure,
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

