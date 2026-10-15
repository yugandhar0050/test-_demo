-- Migration 005: Daily Learning Records and Admin Mandates

CREATE TABLE IF NOT EXISTS daily_submission_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(200) NOT NULL,
  instructions text,
  target_type varchar(20) NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'domain', 'student')),
  target_value varchar(80),
  frequency varchar(20) NOT NULL DEFAULT 'daily',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  due_time time NOT NULL DEFAULT '23:59:00',
  end_date date,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  allow_late_submissions boolean NOT NULL DEFAULT true,
  allow_edits_after_submission boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_mandates_status ON daily_submission_mandates(status, start_date);

CREATE TABLE IF NOT EXISTS daily_learning_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mandate_id uuid REFERENCES daily_submission_mandates(id) ON DELETE SET NULL,
  record_date date NOT NULL,
  topics_learned text NOT NULL,
  tasks_completed text NOT NULL,
  hours_spent numeric(4, 2) NOT NULL CHECK (hours_spent >= 0 AND hours_spent <= 24),
  challenges_blockers text,
  notes_summary text,
  status varchar(30) NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'corrections_requested')),
  submitted_at timestamptz,
  is_late boolean NOT NULL DEFAULT false,
  submission_count int NOT NULL DEFAULT 1,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (student_id, record_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_records_student_date ON daily_learning_records(student_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_records_status ON daily_learning_records(status);
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_learning_records(record_date DESC);

CREATE TABLE IF NOT EXISTS daily_record_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES daily_learning_records(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action varchar(30) NOT NULL CHECK (action IN ('approved', 'corrections_requested')),
  feedback text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_record_reviews_record ON daily_record_reviews(record_id, created_at DESC);
