-- Add flex_buffer_minutes to working_schedules table for timing buffer rules
ALTER TABLE working_schedules
  ADD COLUMN IF NOT EXISTS flex_buffer_minutes INT NOT NULL DEFAULT 60;
