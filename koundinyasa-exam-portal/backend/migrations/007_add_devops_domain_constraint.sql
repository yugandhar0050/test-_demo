-- Migration 007: Add 'devops' to users_domain_check constraint
-- Preserves NULL and all existing domains ('fullstack', 'database', 'testing', 'cybersecurity', 'sap')

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_domain_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_domain_check;
  END IF;

  ALTER TABLE users ADD CONSTRAINT users_domain_check
    CHECK (domain IS NULL OR domain IN (
      'fullstack',
      'database',
      'testing',
      'cybersecurity',
      'sap',
      'devops'
    ));
END $$;
