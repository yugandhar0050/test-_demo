CREATE TABLE IF NOT EXISTS student_topic_progress (
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  is_completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_student_topic_progress_topic
  ON student_topic_progress(topic_id);
