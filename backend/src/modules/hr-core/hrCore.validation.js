const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role_id: z.number().int().positive(),
  employee_id: z.number().int().positive().optional(),
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
  bank_account: z.string().max(60).optional(),
  status: z.enum(['active', 'archived']).default('active'),
});

const provisionEmployeeSchema = createEmployeeSchema.extend({
  role_id: z.number().int().positive().optional(),
});

const updateEmployeeSchema = createEmployeeSchema.partial();

const createContractSchema = z.object({
  employee_id: z.number().int().positive(),
  department_id: z.number().int().positive().optional(),
  job_position: z.string().max(120).optional(),
  wage: z.number().positive(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  structure_id: z.number().int().positive(),
  schedule_id: z.number().int().positive().optional(),
  status: z.enum(['active', 'expired', 'cancelled', 'archived']).default('active'),
});

const updateContractSchema = createContractSchema.partial();

const updateContractStatusSchema = z.object({
  status: z.enum(['active', 'expired', 'cancelled', 'archived']),
});

const createScheduleSchema = z.object({
  name: z.string().min(1).max(120),
  calendar_type: z.enum(['standard', 'flexible', 'shift']).default('standard'),
  lines: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    break_minutes: z.number().int().min(0).default(0),
  })).min(1),
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
  createContractSchema,
  updateContractSchema,
  updateContractStatusSchema,
  createScheduleSchema,
  createDepartmentSchema,
};
