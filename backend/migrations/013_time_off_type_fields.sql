-- Add extended fields to time_off_types table
ALTER TABLE time_off_types
  ADD COLUMN IF NOT EXISTS approval_type VARCHAR(30) NOT NULL DEFAULT 'manager',
  ADD COLUMN IF NOT EXISTS work_entry_type VARCHAR(50) NOT NULL DEFAULT 'leave',
  ADD COLUMN IF NOT EXISTS display_color VARCHAR(30) NOT NULL DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
