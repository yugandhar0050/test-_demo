-- Migration 004: Add user professional/learning domain
ALTER TABLE users ADD COLUMN IF NOT EXISTS domain varchar(50);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_domain_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_domain_check
      CHECK (domain IS NULL OR domain IN ('fullstack', 'database', 'testing', 'cybersecurity', 'sap'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_domain ON users(domain);
