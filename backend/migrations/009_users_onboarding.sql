-- Tracks whether a user has dismissed the first-login guided tour.
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_seen_at TIMESTAMPTZ;
