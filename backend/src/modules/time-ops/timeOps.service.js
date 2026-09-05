const repo = require('./timeOps.repository');
const db = require('../../db');
const { ValidationError, NotFoundError } = require('../../shared/errors');

function decorateAttendanceSchedule(att) {
  if (!att) return null;

  // An employee with no assigned schedule has nothing to be compared against — don't
  // silently borrow another schedule's hours (the old COALESCE(schedule_id, 1) fallback did).
  if (!att.schedule_id) {
    return { ...att, is_late: false, late_minutes: 0, overtime_hours: 0 };
  }

  const checkInDate = att.check_in ? new Date(att.check_in) : null;
  const graceMinutes = att.grace_period_minutes ?? 15;
  const overtimeBufferMinutes = att.overtime_buffer_minutes ?? 15;

  let isLate = false;
  let lateMinutes = 0;
  let overtimeHours = 0;

  if (checkInDate && att.scheduled_start) {
    const [startH, startM] = att.scheduled_start.split(':').map(Number);
    const schedStart = new Date(checkInDate);
    schedStart.setHours(startH, startM, 0, 0);

    const diffMs = checkInDate.getTime() - schedStart.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins >= graceMinutes) {
      isLate = true;
      lateMinutes = diffMins;
    }
  }

  if (att.check_out && att.scheduled_end && att.scheduled_start) {
    const checkOutDate = new Date(att.check_out);
    const [startH, startM] = att.scheduled_start.split(':').map(Number);
    const [endH, endM] = att.scheduled_end.split(':').map(Number);
    const schedEnd = new Date(checkInDate || checkOutDate);
    schedEnd.setHours(endH, endM, 0, 0);

    // Overnight/night shift: the shift's end time is numerically before its start time
    // (e.g. 22:00 -> 06:00), so the scheduled end actually falls on the next calendar day.
    const isOvernightShift = endH * 60 + endM <= startH * 60 + startM;
    if (isOvernightShift) {
      schedEnd.setDate(schedEnd.getDate() + 1);
    }

    const bufferedEnd = new Date(schedEnd.getTime() + overtimeBufferMinutes * 60000);
    if (checkOutDate > bufferedEnd) {
      overtimeHours = Number(((checkOutDate.getTime() - schedEnd.getTime()) / 3600000).toFixed(2));
    }
  }

  return {
    ...att,
    is_late: isLate,
    late_minutes: lateMinutes,
    overtime_hours: overtimeHours,
  };
}

// ───────────── Attendance ─────────────
async function listAttendances(filters) {
  const rows = await repo.findAttendances(filters);
  return rows.map(decorateAttendanceSchedule);
}

async function createAttendance(data) {
  const created = await repo.insertAttendance({
    employeeId: data.employee_id,
    checkIn: data.check_in,
  });
  return decorateAttendanceSchedule(created);
}

/**
 * Get open (active) attendance for an employee.
 */
async function getActiveAttendance(employeeId) {
  if (!employeeId) return null;
  const active = await repo.findOpenAttendance(employeeId);
  return decorateAttendanceSchedule(active);
}

/**
 * Check-in: creates a new open attendance record.
 * Rejects if the employee already has an open (unclosed) attendance.
 */
async function checkIn(employeeId) {
  if (!employeeId) {
    throw new ValidationError('Employee ID is required for check-in');
  }
  const open = await repo.findOpenAttendance(employeeId);
  if (open) {
    throw new ValidationError('Employee already has an open attendance — check out first');
  }
  const created = await repo.insertAttendance({ employeeId, checkIn: new Date().toISOString() });
  const openWithSchedule = await repo.findOpenAttendance(employeeId);
  let decorated = decorateAttendanceSchedule(openWithSchedule || created);

  // Event-Driven Late Violation Check
  if (decorated && decorated.is_late) {
    // Flag the attendance record
    await repo.updateAttendance(decorated.id, { status: 'flagged' });
    decorated.status = 'flagged';

    // Count late violations for employee
    const lateCount = await repo.countLateAttendances(employeeId);

    // Every 3 late violations -> auto-deduct 0.5 day leave
    if (lateCount > 0 && lateCount % 3 === 0) {
      try {
        const types = await repo.findAllTimeOffTypes();
        const targetType = types.find((t) => t.requires_allocation) || types[0];

        if (targetType) {
          const today = new Date().toISOString().slice(0, 10);
          const client = await db.getClient();
          try {
            await client.query('BEGIN');
            
            // Check & deduct allocation if applicable
            const alloc = await repo.findAllocationForDeduction(employeeId, targetType.id);
            if (alloc) {
              await repo.deductAllocation(alloc.id, 0.5, client);
            }

            // Insert system-generated approved time_off_request
            const req = await repo.insertTimeOffRequest({
              employee_id: employeeId,
              type_id: targetType.id,
              start_date: today,
              end_date: today,
              duration: 0.5,
            });

            await repo.updateTimeOffRequestStatus(req.id, 'approved', null, client);

            // Create audit trail entry
            await repo.insertAuditLog({
              userId: null,
              action: 'auto_deduct',
              entity: 'time_off_requests',
              entityId: req.id,
              afterJson: { duration: 0.5, type_id: targetType.id, employee_id: employeeId },
              note: `Auto-deducted 0.5 days leave for 3 late attendance violations (Violation #${lateCount})`,
            }, client);

            await client.query('COMMIT');

            decorated.auto_deducted = true;
            decorated.penalty_message = `Auto-deducted 0.5 day leave for 3 late attendance violations (Violation #${lateCount})`;
          } catch (txErr) {
            await client.query('ROLLBACK');
            console.error('Auto leave deduction failed:', txErr);
          } finally {
            client.release();
          }
        }
      } catch (err) {
        console.error('Failed to process late attendance penalty:', err);
      }
    }
  }

  return decorated;
}

/**
 * Check-out: closes the employee's current open attendance record.
 */
async function checkOut(employeeId) {
  if (!employeeId) {
    throw new ValidationError('Employee ID is required for check-out');
  }
  const open = await repo.findOpenAttendance(employeeId);
  if (!open) {
    throw new ValidationError('No open attendance found — check in first');
  }
  const updated = await repo.updateAttendanceCheckOut(open.id, new Date().toISOString());
  return decorateAttendanceSchedule({ ...open, ...updated });
}

async function correctAttendance(id, data, correctedBy) {
  if (data.check_in && data.check_out && new Date(data.check_out) <= new Date(data.check_in)) {
    throw new ValidationError('Check-out must be after check-in');
  }
  const updated = await repo.updateAttendance(id, data, correctedBy);
  if (!updated) throw new NotFoundError('Attendance', id);
  return updated;
}

// ───────────── Time Off Types ─────────────
async function listTimeOffTypes() {
  return repo.findAllTimeOffTypes();
}

async function createTimeOffType(data) {
  return repo.insertTimeOffType(data);
}

// ───────────── Allocations ─────────────
async function listAllocations(filters) {
  return repo.findAllocations(filters);
}

async function createAllocation(data) {
  return repo.insertAllocation(data);
}

// ───────────── Time Off Requests ─────────────
async function listTimeOffRequests(filters) {
  return repo.findTimeOffRequests(filters);
}

async function listResponsibleUsers() {
  return repo.findResponsibleUsers();
}

function calculateWorkingDays(startDateStr, endDateStr) {
  let count = 0;
  const cur = new Date(startDateStr);
  const end = new Date(endDateStr);
  cur.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (cur <= end) {
    const dayOfWeek = cur.getDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

async function createTimeOffRequest(data) {
  if (new Date(data.end_date) < new Date(data.start_date)) {
    throw new ValidationError('End date cannot be before start date');
  }

  const type = await repo.findTimeOffTypeById(data.type_id);
  if (!type) throw new ValidationError('Invalid time off type');

  const calculatedWorkingDays = calculateWorkingDays(data.start_date, data.end_date);
  const duration = (data.duration && Number(data.duration) < 1) ? Number(data.duration) : calculatedWorkingDays;

  // Deferred Time Off check: check if a validated/paid payrun covers the start_date
  const validatedPayrun = await repo.findValidatedPayrunForDate(data.start_date);
  
  let isDeferred = false;
  let deferredToDate = null;
  let deferralReason = null;

  if (validatedPayrun) {
    isDeferred = true;
    // Next day after validated payrun period_end
    const endDateObj = new Date(validatedPayrun.period_end);
    endDateObj.setDate(endDateObj.getDate() + 1);
    deferredToDate = endDateObj.toISOString().slice(0, 10);
    
    deferralReason = `Submitted for a closed/validated pay period (${validatedPayrun.period_start} to ${validatedPayrun.period_end}). Deferred to next pay period starting ${deferredToDate} to avoid cancelling validated payslips.`;
  }

  // If type requires allocation, verify sufficient balance exists
  if (type.requires_allocation) {
    const alloc = await repo.findAllocationForDeduction(data.employee_id, data.type_id);
    if (!alloc) {
      throw new ValidationError('No valid allocation found for this leave type');
    }
    const remaining = Number(alloc.allocated) - Number(alloc.taken);
    if (remaining < duration) {
      throw new ValidationError(`Insufficient leave balance: ${remaining} remaining, ${duration} requested`);
    }
  }

  const created = await repo.insertTimeOffRequest({
    ...data,
    duration,
    is_deferred: isDeferred,
    deferred_to_date: deferredToDate,
    responsible_id: data.responsible_id || null,
    deferral_reason: deferralReason,
  });

  if (isDeferred) {
    await repo.insertAuditLog({
      userId: data.responsible_id || null,
      action: 'defer_time_off',
      entity: 'time_off_requests',
      entityId: created.id,
      afterJson: { is_deferred: true, deferred_to_date: deferredToDate, responsible_id: data.responsible_id },
      note: deferralReason,
    });
  }

  return created;
}

/**
 * Approve a time-off request.
 * If the leave type requires allocation, deducts balance transactionally.
 */
async function approveTimeOffRequest(requestId, approvedBy) {
  const request = await repo.findTimeOffRequestById(requestId);
  if (!request) throw new NotFoundError('TimeOffRequest', requestId);
  if (request.status !== 'draft') {
    throw new ValidationError(`Cannot approve request in status '${request.status}'`);
  }

  const type = await repo.findTimeOffTypeById(request.type_id);

  // Transactional: update request status + deduct allocation in one TX
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    if (type.requires_allocation) {
      const alloc = await repo.findAllocationForDeduction(request.employee_id, request.type_id);
      if (!alloc) {
        throw new ValidationError('No valid allocation found for this leave type');
      }
      const remaining = Number(alloc.allocated) - Number(alloc.taken);
      if (remaining < Number(request.duration)) {
        throw new ValidationError(`Insufficient leave balance: ${remaining} remaining, ${request.duration} requested`);
      }
      await repo.deductAllocation(alloc.id, request.duration, client);
    }

    const updated = await repo.updateTimeOffRequestStatus(requestId, 'approved', approvedBy, client);

    await repo.insertAuditLog({
      userId: approvedBy,
      action: 'approve',
      entity: 'time_off_requests',
      entityId: requestId,
      beforeJson: { status: request.status },
      afterJson: { status: 'approved' },
      note: `Approved time off request #${requestId} (${request.duration} ${type.unit})`,
    }, client);

    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Refuse a time-off request.
 * If it was previously approved and allocation was deducted, restores the balance.
 */
async function refuseTimeOffRequest(requestId, approvedBy) {
  const request = await repo.findTimeOffRequestById(requestId);
  if (!request) throw new NotFoundError('TimeOffRequest', requestId);
  if (request.status === 'refused') {
    throw new ValidationError('Request is already refused');
  }

  const type = await repo.findTimeOffTypeById(request.type_id);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // If previously approved and type requires allocation, restore balance
    if (request.status === 'approved' && type.requires_allocation) {
      const alloc = await repo.findAllocationForDeduction(request.employee_id, request.type_id);
      if (alloc) {
        await repo.restoreAllocation(alloc.id, request.duration, client);
      }
    }

    const updated = await repo.updateTimeOffRequestStatus(requestId, 'refused', approvedBy, client);

    await repo.insertAuditLog({
      userId: approvedBy,
      action: 'refuse',
      entity: 'time_off_requests',
      entityId: requestId,
      beforeJson: { status: request.status },
      afterJson: { status: 'refused' },
      note: `Refused time off request #${requestId}`,
    }, client);

    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listAttendances,
  createAttendance,
  getActiveAttendance,
  checkIn,
  checkOut,
  correctAttendance,
  listTimeOffTypes,
  createTimeOffType,
  listAllocations,
  createAllocation,
  listTimeOffRequests,
  createTimeOffRequest,
  listResponsibleUsers,
  approveTimeOffRequest,
  refuseTimeOffRequest,
};
