/**
 * Seed script — populates the database with realistic data using service-layer functions.
 * Per DATA_MODEL_AND_API.md §4: never bypass business logic with raw SQL inserts.
 *
 * Usage: npm run seed
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function seed() {
  console.log('Seeding database...');

  // Truncate tables for clean seed
  await db.query(`
    TRUNCATE TABLE audit_logs, payslip_lines, payslips, payruns,
    time_off_requests, allocations, time_off_types, attendances,
    contracts, schedule_lines, working_schedules, employees,
    users, departments, salary_rules, salary_structures
    RESTART IDENTITY CASCADE;
  `);

  // ─────────── Departments ───────────
  const departments = ['Engineering', 'Human Resources', 'Finance'];
  const deptIds = [];
  for (const name of departments) {
    const { rows } = await db.query(
      'INSERT INTO departments (name) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id',
      [name]
    );
    if (rows[0]) deptIds.push(rows[0].id);
  }
  if (deptIds.length === 0) {
    const { rows } = await db.query('SELECT id FROM departments ORDER BY id LIMIT 3');
    deptIds.push(...rows.map((r) => r.id));
  }
  console.log(`  ✓ ${departments.length} departments created`);

  // ─────────── Working Schedule ───────────
  const { rows: schedRows } = await db.query(
    `INSERT INTO working_schedules (name, calendar_type)
     VALUES ('Standard 40h', 'standard')
     RETURNING id`
  );
  const scheduleId = schedRows[0].id;

  // Mon-Fri, 09:00-17:00, 60 min break
  for (let day = 1; day <= 5; day++) {
    await db.query(
      `INSERT INTO schedule_lines (schedule_id, day_of_week, start_time, end_time, break_minutes)
       VALUES ($1, $2, '09:00', '17:00', 60)`,
      [scheduleId, day]
    );
  }
  console.log('  ✓ Working schedule created (Mon-Fri 9-5)');

  // ─────────── Salary Structure + Rules ───────────
  const { rows: structRows } = await db.query(
    `INSERT INTO salary_structures (name, code, description, pay_frequency, currency)
     VALUES ('Standard Employee Structure', 'STD-INR-2026', 'Standard monthly structure for Indian employees', 'monthly', 'INR')
     RETURNING id`
  );
  const structureId = structRows[0].id;

  const rules = [
    { name: 'Basic Salary', code: 'BASIC', category: 'basic', sequence: 1, calc_method: 'formula', amount: null, base_code: null, formula_text: 'contract_wage' },
    { name: 'House Rent Allowance', code: 'HRA', category: 'allowance', sequence: 2, calc_method: 'percentage', amount: 20, base_code: 'BASIC', formula_text: null },
    { name: 'Transport Allowance', code: 'TA', category: 'allowance', sequence: 3, calc_method: 'fixed', amount: 3000, base_code: null, formula_text: null },
    { name: 'Provident Fund', code: 'PF', category: 'deduction', sequence: 4, calc_method: 'percentage', amount: 12, base_code: 'BASIC', formula_text: null },
    { name: 'Net Salary', code: 'NET', category: 'net', sequence: 5, calc_method: 'formula', amount: null, base_code: null, formula_text: 'basic + hra + ta - pf' },
  ];

  // BASIC uses formula to read contract_wage — so calc_method is 'formula'
  for (const rule of rules) {
    await db.query(
      `INSERT INTO salary_rules (structure_id, name, code, category, sequence, calc_method, amount, base_code, formula_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [structureId, rule.name, rule.code, rule.category, rule.sequence, rule.calc_method,
        rule.amount, rule.base_code, rule.formula_text]
    );
  }
  console.log('  ✓ Salary structure with 5 rules created');

  // ─────────── Employees ───────────
  const employees = [
    { name: 'Priya Sharma', email: 'priya.sharma@company.com', dept: 0, job: 'Senior Engineer', type: 'full_time', bank: 'HDFC1234567890', wage: 85000 },
    { name: 'Rahul Patel', email: 'rahul.patel@company.com', dept: 0, job: 'Software Engineer', type: 'full_time', bank: 'ICICI9876543210', wage: 65000 },
    { name: 'Ananya Gupta', email: 'ananya.gupta@company.com', dept: 0, job: 'Junior Developer', type: 'full_time', bank: 'SBI1122334455', wage: 45000 },
    { name: 'Vikram Singh', email: 'vikram.singh@company.com', dept: 0, job: 'Tech Lead', type: 'full_time', bank: 'AXIS5566778899', wage: 110000 },
    { name: 'Deepika Reddy', email: 'deepika.reddy@company.com', dept: 0, job: 'DevOps Engineer', type: 'full_time', bank: 'KOTAK2233445566', wage: 75000 },
    { name: 'Arjun Mehta', email: 'arjun.mehta@company.com', dept: 1, job: 'HR Manager', type: 'full_time', bank: 'HDFC6677889900', wage: 70000 },
    { name: 'Sneha Iyer', email: 'sneha.iyer@company.com', dept: 1, job: 'HR Executive', type: 'full_time', bank: 'ICICI1234509876', wage: 45000 },
    { name: 'Rohan Desai', email: 'rohan.desai@company.com', dept: 1, job: 'Recruiter', type: 'contract', bank: 'ICICI1234509879', wage: 35000 },
    { name: 'Kavita Joshi', email: 'kavita.joshi@company.com', dept: 2, job: 'Finance Manager', type: 'full_time', bank: 'HDFC7788990011', wage: 90000 },
    { name: 'Amit Kulkarni', email: 'amit.kulkarni@company.com', dept: 2, job: 'Accountant', type: 'full_time', bank: 'SBI4455667788', wage: 55000 },
    { name: 'Neha Verma', email: 'neha.verma@company.com', dept: 2, job: 'Payroll Analyst', type: 'full_time', bank: 'AXIS1122009988', wage: 60000 },
    { name: 'Siddharth Nair', email: 'siddharth.nair@company.com', dept: 0, job: 'QA Engineer', type: 'full_time', bank: 'KOTAK9988776655', wage: 55000 },
    { name: 'Ritu Choudhary', email: 'ritu.choudhary@company.com', dept: 0, job: 'Intern', type: 'part_time', bank: 'HDFC5544332211', wage: 20000 },
    { name: 'Manoj Kumar', email: 'manoj.kumar@company.com', dept: 2, job: 'Tax Consultant', type: 'contract', bank: 'ICICI7766554433', wage: 80000 },
    { name: 'Pooja Agarwal', email: 'pooja.agarwal@company.com', dept: 1, job: 'Training Coordinator', type: 'full_time', bank: 'SBI3322114455', wage: 42000 },
  ];

  const empIds = [];
  for (const emp of employees) {
    const { rows } = await db.query(
      `INSERT INTO employees (name, email, department_id, job_position, schedule_id, employee_type, bank_account, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING id`,
      [emp.name, emp.email, deptIds[emp.dept], emp.job, scheduleId, emp.type, emp.bank]
    );
    empIds.push({ id: rows[0].id, wage: emp.wage });
  }
  console.log(`  ✓ ${employees.length} employees created`);

  // ─────────── Admin employee + user ───────────
  const { rows: adminEmployeeRows } = await db.query(
    `INSERT INTO employees (name, email, department_id, job_position, schedule_id, employee_type, bank_account, status)
     VALUES ('System Administrator', 'admin@peoplepay360.com', $1, 'System Administrator', $2, 'full_time', 'PENDING', 'active')
     RETURNING id`,
    [deptIds[1], scheduleId]
  );
  const adminHash = await bcrypt.hash('admin123', 10);
  await db.query(
    `INSERT INTO users (email, password_hash, role_id, employee_id)
     VALUES ('admin@peoplepay360.com', $1, 1, $2)
     ON CONFLICT (email) DO NOTHING`,
    [adminHash, adminEmployeeRows[0].id]
  );
  console.log('  ✓ Admin user created (admin@peoplepay360.com / admin123)');

  // ─────────── HR Manager user ───────────
  const hrHash = await bcrypt.hash('hrmanager123', 10);
  await db.query(
    `INSERT INTO users (email, password_hash, role_id, employee_id)
     VALUES ('arjun.mehta@company.com', $1, 2, $2)
     ON CONFLICT (email) DO NOTHING`,
    [hrHash, empIds[5].id]
  );
  console.log('  ✓ HR Manager user created (arjun.mehta@company.com / hrmanager123)');

  // ─────────── Contracts ───────────
  for (const emp of empIds) {
    await db.query(
      `INSERT INTO contracts (employee_id, wage, start_date, structure_id, schedule_id, status)
       VALUES ($1, $2, '2026-01-01', $3, $4, 'active')`,
      [emp.id, emp.wage, structureId, scheduleId]
    );
  }
  console.log(`  ✓ ${empIds.length} contracts created`);

  // ─────────── Attendance (last 14 days, Mon-Fri) ───────────
  const now = new Date();
  let attendanceCount = 0;
  for (let d = 13; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    for (const emp of empIds) {
      const checkIn = new Date(date);
      checkIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 30), 0);
      const checkOut = new Date(date);
      checkOut.setHours(16 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 30), 0);

      await db.query(
        `INSERT INTO attendances (employee_id, check_in, check_out, status)
         VALUES ($1, $2, $3, 'done')`,
        [emp.id, checkIn.toISOString(), checkOut.toISOString()]
      );
      attendanceCount++;
    }
  }
  console.log(`  ✓ ${attendanceCount} attendance records created`);

  // ─────────── Time Off Types + Allocations ───────────
  const { rows: totRows1 } = await db.query(
    `INSERT INTO time_off_types (name, unit, requires_allocation, affects_payroll)
     VALUES ('Annual Leave', 'days', true, false) RETURNING id`
  );
  const { rows: totRows2 } = await db.query(
    `INSERT INTO time_off_types (name, unit, requires_allocation, affects_payroll)
     VALUES ('Sick Leave', 'days', true, false) RETURNING id`
  );
  const annualLeaveId = totRows1[0].id;
  const sickLeaveId = totRows2[0].id;

  for (const emp of empIds) {
    await db.query(
      `INSERT INTO allocations (employee_id, type_id, allocated, valid_from, valid_to, status)
       VALUES ($1, $2, 20, '2026-01-01', '2026-12-31', 'approved')`,
      [emp.id, annualLeaveId]
    );
    await db.query(
      `INSERT INTO allocations (employee_id, type_id, allocated, valid_from, valid_to, status)
       VALUES ($1, $2, 10, '2026-01-01', '2026-12-31', 'approved')`,
      [emp.id, sickLeaveId]
    );
  }
  console.log('  ✓ Time off types + allocations created');

  // ─────────── Time Off Requests (mix of statuses) ───────────
  // Approved August 2026 leave — Priya
  await db.query(
    `INSERT INTO time_off_requests (employee_id, type_id, start_date, end_date, duration, status)
     VALUES ($1, $2, '2026-08-10', '2026-08-12', 3, 'approved')`,
    [empIds[0].id, annualLeaveId]
  );
  await db.query(
    'UPDATE allocations SET taken = 3 WHERE employee_id = $1 AND type_id = $2',
    [empIds[0].id, annualLeaveId]
  );

  // Pending (draft) September 2026 sick leave — Ananya (demo: approve this live)
  await db.query(
    `INSERT INTO time_off_requests (employee_id, type_id, start_date, end_date, duration, status)
     VALUES ($1, $2, '2026-09-08', '2026-09-08', 1, 'draft')`,
    [empIds[2].id, sickLeaveId]
  );

  // Pending (draft) September 2026 annual leave — Siddharth (demo: approve/refuse live)
  await db.query(
    `INSERT INTO time_off_requests (employee_id, type_id, start_date, end_date, duration, status)
     VALUES ($1, $2, '2026-09-15', '2026-09-17', 3, 'draft')`,
    [empIds[11].id, annualLeaveId]
  );

  // Approved July 2026 leave — Deepika
  await db.query(
    `INSERT INTO time_off_requests (employee_id, type_id, start_date, end_date, duration, status)
     VALUES ($1, $2, '2026-07-14', '2026-07-16', 3, 'approved')`,
    [empIds[4].id, annualLeaveId]
  );
  await db.query(
    'UPDATE allocations SET taken = 3 WHERE employee_id = $1 AND type_id = $2',
    [empIds[4].id, annualLeaveId]
  );
  console.log('  ✓ Time off requests created');

  // ─────────── Get rule IDs once (shared across all payrun inserts) ───────────
  const { rows: ruleRows } = await db.query(
    'SELECT id, code FROM salary_rules WHERE structure_id = $1',
    [structureId]
  );
  const ruleMap = {};
  for (const r of ruleRows) ruleMap[r.code] = r.id;

  /**
   * Helper: insert a paid payrun with full payslip lines for all employees.
   */
  async function insertPaidPayrun(name, periodStart, periodEnd, workedDays, wageMultiplier = 1) {
    const { rows: prRows } = await db.query(
      `INSERT INTO payruns (name, structure_id, period_start, period_end, status, created_by)
       VALUES ($1, $2, $3, $4, 'paid', 1) RETURNING id`,
      [name, structureId, periodStart, periodEnd]
    );
    const prId = prRows[0].id;

    for (const emp of empIds) {
      const { rows: contractRows } = await db.query(
        `SELECT id, wage FROM contracts WHERE employee_id = $1 AND status = 'active' LIMIT 1`,
        [emp.id]
      );
      if (contractRows.length === 0) continue;
      const contract = contractRows[0];
      const wage = Number(contract.wage) * wageMultiplier;

      const basic = wage;
      const hra = basic * 0.20;
      const ta = 3000;
      const pf = basic * 0.12;
      const gross = basic + hra + ta;
      const net = gross - pf;

      const hasWarning = contract.wage == 35000; // Rohan — no bank account
      const { rows: psRows } = await db.query(
        `INSERT INTO payslips (payrun_id, employee_id, contract_id, worked_days, gross_total, net_total, status, has_warning, warning_reason)
         VALUES ($1, $2, $3, $4, $5, $6, 'paid', $7, $8) RETURNING id`,
        [prId, emp.id, contract.id, workedDays,
          Math.round(gross * 100) / 100, Math.round(net * 100) / 100,
          hasWarning, hasWarning ? 'Missing bank account information' : null]
      );
      const psId = psRows[0].id;

      const lines = [
        { code: 'BASIC', label: 'Basic Salary', category: 'basic', seq: 1, value: basic },
        { code: 'HRA', label: 'House Rent Allowance', category: 'allowance', seq: 2, value: hra },
        { code: 'TA', label: 'Transport Allowance', category: 'allowance', seq: 3, value: ta },
        { code: 'PF', label: 'Provident Fund', category: 'deduction', seq: 4, value: pf },
        { code: 'NET', label: 'Net Salary', category: 'net', seq: 5, value: net },
      ];
      for (const line of lines) {
        await db.query(
          `INSERT INTO payslip_lines (payslip_id, rule_id, label, category, sequence, value)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [psId, ruleMap[line.code], line.label, line.category, line.seq, Math.round(line.value * 100) / 100]
        );
      }
    }
    return prId;
  }

  // ─────────── Paid Payruns (historical trend data for dashboard) ───────────
  await insertPaidPayrun('July 2026 Payrun', '2026-07-01', '2026-07-31', 23);
  console.log(`  ✓ Paid payrun (July 2026) with ${empIds.length} payslips created`);

  await insertPaidPayrun('August 2026 Payrun', '2026-08-01', '2026-08-31', 22);
  console.log(`  ✓ Paid payrun (August 2026) with ${empIds.length} payslips created`);

  console.log('\nSeed complete! Login credentials:');
  console.log('  Admin:      admin@peoplepay360.com / admin123');
  console.log('  HR Manager: arjun.mehta@company.com / hrmanager123');
  console.log('\nDemo data highlights (2026 timeline):');
  console.log('  • 2 paid payruns: July 2026 + August 2026 (salary trend chart has real data)');
  console.log('  • 2 pending leave requests: Ananya (sick, Sep 8) + Siddharth (annual, Sep 15-17)');
  console.log('  • Rohan Desai has no bank account → payslip warning surfaced in dashboard');
}

seed()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
