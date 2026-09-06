const { z } = require('zod');

const createAttendanceSchema = z.object({
  employee_id: z.number().int().positive(),
  check_in: z.string().datetime(),
  check_out: z.string().datetime().optional(),
});

const checkInSchema = z.object({
  employee_id: z.number().int().positive().optional(),
});

const checkOutSchema = z.object({
  employee_id: z.number().int().positive().optional(),
});

const correctAttendanceSchema = z.object({
  check_in: z.string().datetime().optional(),
  check_out: z.string().datetime().optional(),
  status: z.enum(['done', 'corrected', 'flagged']).optional(),
});

const createTimeOffTypeSchema = z.object({
  name: z.string().min(1).max(120),
  unit: z.enum(['days', 'hours']).default('days'),
  requires_allocation: z.boolean().default(true),
  affects_payroll: z.boolean().default(false),
  approval_type: z.enum(['manager', 'officer', 'no_approval']).default('manager'),
  work_entry_type: z.string().default('leave'),
  display_color: z.string().default('blue'),
  notes: z.string().optional(),
  status: z.enum(['active', 'archived']).default('active'),
});

const updateTimeOffTypeSchema = createTimeOffTypeSchema.partial();

const createAllocationSchema = z.object({
  employee_id: z.number().int().positive(),
  type_id: z.number().int().positive(),
  allocated: z.number().positive(),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valid_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['approved', 'refused']).default('approved'),
});

const createTimeOffRequestSchema = z.object({
  employee_id: z.number().int().positive().optional(),
  type_id: z.number().int().positive(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.number().positive(),
  responsible_id: z.number().int().positive().optional(),
});

module.exports = {
  createAttendanceSchema,
  checkInSchema,
  checkOutSchema,
  correctAttendanceSchema,
  createTimeOffTypeSchema,
  updateTimeOffTypeSchema,
  createAllocationSchema,
  createTimeOffRequestSchema,
};
