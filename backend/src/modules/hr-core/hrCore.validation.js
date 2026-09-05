const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role_id: z.number().int().positive(),
  employee_id: z.number().int().positive(),
});

const updateRoleSchema = z.object({
  role_id: z.number().int().positive(),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
});

const createEmployeeSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email(),
  department_id: z.number().int().positive().optional(),
  manager_id: z.number().int().positive().optional(),
  job_position: z.string().max(120).optional(),
  schedule_id: z.number().int().positive().optional(),
  employee_type: z.enum(['full_time', 'contract', 'part_time']).default('full_time'),
  bank_account: z.string().min(1, 'Bank account is required').max(60),
  status: z.enum(['active', 'archived']).default('active'),
});

const provisionEmployeeSchema = createEmployeeSchema.extend({
  role_id: z.number().int().positive().optional(),
  password: z.string().min(8).optional(),
});

// department_id is deliberately excluded: department reassignment must go through the
// department-change-request approval flow, never a direct field update.
const updateEmployeeSchema = createEmployeeSchema.omit({ department_id: true }).partial();

const departmentChangeRequestSchema = z.object({
  department_id: z.number().int().positive(),
});

const reviewDepartmentChangeRequestSchema = z.object({
  note: z.string().max(500).optional(),
});

const contractShape = {
  employee_id: z.number().int().positive(),
  department_id: z.number().int().positive().optional(),
  job_position: z.string().max(120).optional(),
  wage: z.number().positive(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  structure_id: z.number().int().positive(),
  schedule_id: z.number().int().positive().optional(),
  status: z.enum(['active', 'expired', 'cancelled', 'archived']).default('active'),
  flexibility: z.enum(['flexible', 'rigid']).default('flexible'),
  joining_bonus: z.number().nonnegative().default(0),
};

const contractDateOrderRefinement = (data, ctx) => {
  if (data.end_date && data.start_date && data.end_date < data.start_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Contract end date must be on or after the start date',
      path: ['end_date'],
    });
  }
};

const createContractSchema = z.object(contractShape).superRefine(contractDateOrderRefinement);

const updateContractSchema = z.object(contractShape).partial().superRefine(contractDateOrderRefinement);

const updateContractStatusSchema = z.object({
  status: z.enum(['active', 'expired', 'cancelled', 'archived']),
});

const scheduleLineSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  break_minutes: z.number().int().min(0).default(0),
});

const scheduleShape = {
  name: z.string().min(1).max(120),
  calendar_type: z.enum(['standard', 'flexible', 'shift']).default('standard'),
  grace_period_minutes: z.number().int().min(0).max(240).default(15),
  overtime_buffer_minutes: z.number().int().min(0).max(240).default(15),
  // Only meaningful for calendar_type = 'flexible': a target weekly hours figure in place
  // of fixed per-day start/end times.
  target_weekly_hours: z.number().positive().max(168).optional(),
  lines: z.array(scheduleLineSchema).default([]),
};

// A 'flexible' schedule needs target_weekly_hours instead of fixed lines; standard/shift
// schedules need at least one line instead.
const scheduleShapeRefinement = (data, ctx) => {
  if (data.calendar_type === 'flexible') {
    if (!data.target_weekly_hours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'target_weekly_hours is required for a flexible schedule',
        path: ['target_weekly_hours'],
      });
    }
  } else if (!data.lines || data.lines.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one schedule line is required',
      path: ['lines'],
    });
  }
};

const createScheduleSchema = z.object(scheduleShape).superRefine(scheduleShapeRefinement);

const updateScheduleSchema = z.object(scheduleShape).partial().extend({
  lines: z.array(scheduleLineSchema).optional(),
});

const createDepartmentSchema = z.object({
  name: z.string().min(1).max(120),
  parent_id: z.number().int().positive().optional(),
});

module.exports = {
  loginSchema,
  createUserSchema,
  updateRoleSchema,
  changePasswordSchema,
  createEmployeeSchema,
  provisionEmployeeSchema,
  updateEmployeeSchema,
  departmentChangeRequestSchema,
  reviewDepartmentChangeRequestSchema,
  createContractSchema,
  updateContractSchema,
  updateContractStatusSchema,
  createScheduleSchema,
  updateScheduleSchema,
  createDepartmentSchema,
};
