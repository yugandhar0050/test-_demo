CREATE TABLE IF NOT EXISTS student_assigned_topics (
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_student_assigned_topics_topic
  ON student_assigned_topics(topic_id);
