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
  const payslip = await service.getPayslipWithLines(parseInt(req.params.id, 10));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=payslip_${payslip.id}.pdf`);

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  // Header / Branding
  doc.fillColor('#1E40AF').fontSize(22).text('PeoplePay360', { align: 'left' });
  doc.fillColor('#4B5563').fontSize(10).text('Enterprise HR & Payroll Platform', { align: 'left' });
  doc.moveDown(0.5);

  doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // Payslip Metadata Table Header
  doc.fillColor('#111827').fontSize(16).text(`PAYSLIP STATEMENT`, { align: 'left' });
  doc.moveDown(0.5);

  doc.fillColor('#374151').fontSize(10);
  doc.text(`Payslip Reference #: PS-${String(payslip.id).padStart(5, '0')}`);
  doc.text(`Employee Name: ${payslip.employee_name || 'Employee #' + payslip.employee_id}`);
  doc.text(`Pay Period / Days Worked: ${payslip.worked_days} Days`);
  doc.text(`Disbursement Account: ${payslip.bank_account || 'NOT REGISTERED (WARNING)'}`);
  doc.moveDown();

  if (payslip.has_warning) {
    doc.rect(40, doc.y, 510, 25).fill('#FEF2F2').stroke('#FCA5A5');
    doc.fillColor('#991B1B').fontSize(9).text(`⚠ COMPLIANCE WARNING: ${payslip.warning_reason}`, 50, doc.y - 18);
    doc.moveDown(1.5);
  }

  // Earnings & Deductions Table
  doc.fillColor('#1F2937').fontSize(12).text('Salary Rule Breakdown', { underline: true });
  doc.moveDown(0.5);

  // Table header
  let y = doc.y;
  doc.rect(40, y, 510, 20).fill('#F3F4F6');
  doc.fillColor('#374151').fontSize(9);
  doc.text('Rule / Item', 50, y + 5);
  doc.text('Category', 280, y + 5);
  doc.text('Amount (INR)', 450, y + 5, { align: 'right' });

  y += 25;
  for (const line of payslip.lines || []) {
    const isDeduction = line.category === 'deduction';
    doc.fillColor('#111827').fontSize(9);
    doc.text(line.label, 50, y);
    doc.fillColor(isDeduction ? '#DC2626' : '#16A34A').text(line.category.toUpperCase(), 280, y);
    doc.fillColor('#111827').text(
      `${isDeduction ? '-' : ''}INR ${Number(line.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      450,
      y,
      { align: 'right' }
    );
    y += 18;
    doc.strokeColor('#F3F4F6').lineWidth(0.5).moveTo(40, y - 4).lineTo(550, y - 4).stroke();
  }

  y += 10;
  doc.strokeColor('#9CA3AF').lineWidth(1).moveTo(40, y).lineTo(550, y).stroke();
  y += 10;

  // Summary totals
  doc.fontSize(10).fillColor('#374151').text('Gross Total Earnings:', 300, y);
  doc.fontSize(10).fillColor('#111827').text(`INR ${Number(payslip.gross_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 450, y, { align: 'right' });
  y += 18;

  doc.fontSize(11).fillColor('#15803D').text('Net Salary Payable:', 300, y);
  doc.fontSize(11).fillColor('#15803D').text(`INR ${Number(payslip.net_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 450, y, { align: 'right' });

  doc.moveDown(4);
  doc.fillColor('#9CA3AF').fontSize(8).text('This is a system-generated payslip issued by PeoplePay360 ERP.', { align: 'center' });

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
  initDraft,
  createPayrun,
  computePayrun,
  validatePayrun,
  markPaid,
  getPayslip,
  getPayslipPdf,
  sendPayslips,
};

