const repo = require('./timeOps.repository');
const db = require('../../db');
const { ValidationError, NotFoundError } = require('../../shared/errors');

// ───────────── Attendance ─────────────
async function listAttendances(filters) {
  return repo.findAttendances(filters);
}

async function createAttendance(data) {
  return repo.insertAttendance({
    employeeId: data.employee_id,
    checkIn: data.check_in,
  });
}

/**
 * Get open (active) attendance for an employee.
 */
async function getActiveAttendance(employeeId) {
  if (!employeeId) return null;
  return repo.findOpenAttendance(employeeId);
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
  return repo.insertAttendance({ employeeId, checkIn: new Date().toISOString() });
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
  return repo.updateAttendanceCheckOut(open.id, new Date().toISOString());
}

async function correctAttendance(id, data, correctedBy) {
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

async function createTimeOffRequest(data) {
  if (new Date(data.end_date) < new Date(data.start_date)) {
    throw new ValidationError('End date cannot be before start date');
  }

  const type = await repo.findTimeOffTypeById(data.type_id);
  if (!type) throw new ValidationError('Invalid time off type');

  // If type requires allocation, verify sufficient balance exists
  if (type.requires_allocation) {
    const alloc = await repo.findAllocationForDeduction(data.employee_id, data.type_id);
    if (!alloc) {
      throw new ValidationError('No valid allocation found for this leave type');
    }
    const remaining = Number(alloc.allocated) - Number(alloc.taken);
    if (remaining < data.duration) {
      throw new ValidationError(`Insufficient leave balance: ${remaining} remaining, ${data.duration} requested`);
    }
  }

  return repo.insertTimeOffRequest(data);
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
  approveTimeOffRequest,
  refuseTimeOffRequest,
};
