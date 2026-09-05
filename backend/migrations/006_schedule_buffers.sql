-- Configurable late-arrival grace period and post-shift overtime buffer, per schedule.
-- target_weekly_hours is used by 'flexible' schedules in place of fixed schedule_lines.
ALTER TABLE working_schedules
  ADD COLUMN IF NOT EXISTS grace_period_minutes INT NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS overtime_buffer_minutes INT NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS target_weekly_hours NUMERIC(6,2);
