const { z } = require('zod');

const criteria = z.enum(['overtime', 'project_completion', 'quality', 'attendance']);
const lineSchema = z.object({
  criterion: criteria,
  score: z.number().min(0).max(25),
  remarks: z.string().max(2000).optional().nullable(),
});

const reviewSchema = z.object({
  employee_id: z.number().int().positive(),
  period_start: z.string(),
  period_end: z.string(),
  project_name: z.string().max(160).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(['draft', 'submitted']).default('draft'),
  lines: z.array(lineSchema).min(1).max(4),
});

const payRuleSchema = z.object({
  name: z.string().min(1).max(120),
  point_value: z.number().min(0),
  minimum_points: z.number().min(0).max(100).default(0),
  maximum_payout: z.number().min(0).nullable().optional(),
  maximum_wage_percent: z.number().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});

module.exports = { reviewSchema, payRuleSchema };
