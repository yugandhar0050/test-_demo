-- Migration 006: Performance Indexes
-- Verified btree indexes for query optimization across users, exams, attempts, results, and learning records.

CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_role_created ON users(role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_domain ON users(domain);

CREATE INDEX IF NOT EXISTS idx_exams_schedule ON exams(starts_at, ends_at, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_questions_exam_order ON questions(exam_id, display_order);

CREATE INDEX IF NOT EXISTS idx_attempts_student ON exam_attempts(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_answers_attempt ON student_answers(attempt_id);

CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_pending_created ON results(created_at DESC) WHERE result_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_proctor_events_attempt ON exam_proctor_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_proctor_events_created ON exam_proctor_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_topic_progress_topic ON student_topic_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_student_assigned_topics_topic ON student_assigned_topics(topic_id);

CREATE INDEX IF NOT EXISTS idx_daily_records_student_date ON daily_learning_records(student_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_learning_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_records_status ON daily_learning_records(status);

CREATE INDEX IF NOT EXISTS idx_daily_record_reviews_record ON daily_record_reviews(record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id, created_at DESC);
