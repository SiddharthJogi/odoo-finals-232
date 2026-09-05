const { z } = require('zod');

const createStructureSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().max(500).optional().nullable(),
  pay_frequency: z.enum(['monthly', 'biweekly', 'weekly']).default('monthly'),
  currency: z.string().length(3).default('INR'),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateStructureSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  code: z.string().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/).optional(),
  description: z.string().max(500).optional().nullable(),
  pay_frequency: z.enum(['monthly', 'biweekly', 'weekly']).optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const createRuleSchema = z.object({
  structure_id: z.number().int().positive(),
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(40),
  category: z.enum(['basic', 'allowance', 'deduction', 'gross', 'net']),
  sequence: z.number().int().min(0),
  calc_method: z.enum(['fixed', 'percentage', 'formula']),
  amount: z.number().optional(),
  base_code: z.string().max(40).optional(),
  formula_text: z.string().max(500).optional(),
  performance_based: z.boolean().nullable().optional(),
});

const createPayrunDraftSchema = z.object({
  structure_id: z.number().int().positive(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employee_type_filter: z.enum(['full_time', 'contract', 'part_time']).optional(),
});

const createPayrunSchema = z.object({
  name: z.string().min(1).max(120),
  structure_id: z.number().int().positive(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employee_ids: z.array(z.number().int().positive()).min(1),
  employee_type_filter: z.string().optional(),
});

module.exports = {
  createStructureSchema,
  updateStructureSchema,
  createRuleSchema,
  createPayrunDraftSchema,
  createPayrunSchema,
};
