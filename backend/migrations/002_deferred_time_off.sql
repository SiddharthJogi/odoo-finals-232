-- Add Deferred Time Off fields to time_off_requests table
ALTER TABLE time_off_requests 
ADD COLUMN IF NOT EXISTS is_deferred BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deferred_to_date DATE,
ADD COLUMN IF NOT EXISTS responsible_id INT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS deferral_reason TEXT;
