const service = require('../timeOps.service');

describe('timeOps.service - Timing Buffer & Flexible Schema', () => {
  it('should shift required shift end time forward when check-in is within flex timing buffer', () => {
    // Shift: 09:00 AM - 05:00 PM (8h shift)
    // Check-in: 10:00 AM (60 min late, within 60 min flex buffer)
    // Check-out: 07:00 PM (19:00) -> 9h worked total, 1h flex shifted end (18:00), 1h overtime (18:00 - 19:00)
    const checkIn = new Date(2026, 8, 6, 10, 0, 0);
    const checkOut = new Date(2026, 8, 6, 19, 0, 0);

    const mockAttendance = {
      id: 1,
      employee_id: 101,
      check_in: checkIn.toISOString(),
      check_out: checkOut.toISOString(),
      scheduled_start: '09:00:00',
      scheduled_end: '17:00:00',
      break_minutes: 0,
      grace_period_minutes: 15,
      overtime_buffer_minutes: 15,
      flex_buffer_minutes: 60,
      calendar_type: 'standard',
    };

    const decorated = service.decorateAttendanceSchedule(mockAttendance);

    expect(decorated.is_flex_buffered).toBe(true);
    expect(decorated.flex_offset_minutes).toBe(60);
    expect(decorated.is_late).toBe(false); // Covered by flex buffer
    expect(decorated.worked_hours).toBe(9.0);
    expect(decorated.is_overtime).toBe(true);
    expect(decorated.overtime_hours).toBe(1.0); // 1h overtime past 18:00 effective end
  });

  it('should evaluate flexible schedules against daily target hours without false late mark', () => {
    const mockFlexAttendance = {
      id: 2,
      employee_id: 102,
      check_in: '2026-09-06T08:30:00.000Z',
      check_out: '2026-09-06T18:00:00.000Z', // 9.5 hours
      scheduled_start: null,
      scheduled_end: null,
      calendar_type: 'flexible',
      target_weekly_hours: 40.0, // 8h target per day
    };

    const decorated = service.decorateAttendanceSchedule(mockFlexAttendance);

    expect(decorated.is_late).toBe(false);
    expect(decorated.worked_hours).toBe(9.5);
    expect(decorated.is_overtime).toBe(true);
    expect(decorated.overtime_hours).toBe(1.5); // 9.5h - 8.0h target = 1.5h overtime
  });
});
