import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, pool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Use a dedicated test student UUID
const testStudent = {
  id: 'a0000000-0000-4000-8000-000000000001',
  student_id: '294991',
  email: 'test_student_exam_flow@example.com',
  role: 'student'
};

const token = jwt.sign(
  { sub: testStudent.id, role: testStudent.role, studentId: testStudent.student_id },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
};

describe('CRITICAL FIX: Exam Start Flow & Availability Validation', () => {
  let upcomingExamId;
  let endedExamId;
  let activeExamId;
  let noQuestionsExamId;
  let ineligibleExamId;

  before(async () => {
    // Clean up any stale test records from previous runs
    await query(`DELETE FROM results WHERE student_id = $1`, [testStudent.id]);
    await query(`DELETE FROM exam_proctor_events WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE student_id = $1)`, [testStudent.id]);
    await query(`DELETE FROM student_answers WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE student_id = $1)`, [testStudent.id]);
    await query(`DELETE FROM exam_attempts WHERE student_id = $1`, [testStudent.id]);
    await query(`DELETE FROM exam_eligibility WHERE student_id = $1`, [testStudent.id]);
    await query(`DELETE FROM questions WHERE created_by = $1`, [testStudent.id]);
    await query(`DELETE FROM exams WHERE created_by = $1`, [testStudent.id]);
    await query(`DELETE FROM users WHERE id = $1`, [testStudent.id]);

    // Ensure test student exists
    await query(
      `INSERT INTO users (id, student_id, first_name, last_name, phone, email, password_hash, role, status)
       VALUES ($1, $2, 'Flow', 'Tester', '9999900001', $3, 'hash', 'student', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [testStudent.id, testStudent.student_id, testStudent.email]
    );

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // 1. Upcoming exam (starts in 2 hours, ends in 4 hours)
    const upRes = await query(
      `INSERT INTO exams (title, description, starts_at, ends_at, duration_minutes, status, created_by)
       VALUES ('Test Upcoming Exam', 'Starts in future', $1, $2, 60, 'published', $3)
       RETURNING id`,
      [new Date(now + 2 * oneHour), new Date(now + 4 * oneHour), testStudent.id]
    );
    upcomingExamId = upRes.rows[0].id;
    await query(
      `INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, marks, created_by)
       VALUES ($1, 'Upcoming Q1', 'mcq', '["A","B"]'::jsonb, '"A"'::jsonb, 1, $2)`,
      [upcomingExamId, testStudent.id]
    );

    // 2. Ended exam (starts 4 hours ago, ended 2 hours ago)
    const endedRes = await query(
      `INSERT INTO exams (title, description, starts_at, ends_at, duration_minutes, status, created_by)
       VALUES ('Test Ended Exam', 'Ended in past', $1, $2, 60, 'published', $3)
       RETURNING id`,
      [new Date(now - 4 * oneHour), new Date(now - 2 * oneHour), testStudent.id]
    );
    endedExamId = endedRes.rows[0].id;
    await query(
      `INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, marks, created_by)
       VALUES ($1, 'Ended Q1', 'mcq', '["A","B"]'::jsonb, '"A"'::jsonb, 1, $2)`,
      [endedExamId, testStudent.id]
    );

    // 3. Exam with no questions (currently open window)
    const noQRes = await query(
      `INSERT INTO exams (title, description, starts_at, ends_at, duration_minutes, status, created_by)
       VALUES ('Test No Questions Exam', 'No Qs', $1, $2, 60, 'published', $3)
       RETURNING id`,
      [new Date(now - oneHour), new Date(now + oneHour), testStudent.id]
    );
    noQuestionsExamId = noQRes.rows[0].id;

    // 4. Ineligible student exam (open window, but student disallowed in exam_eligibility)
    const ineligRes = await query(
      `INSERT INTO exams (title, description, starts_at, ends_at, duration_minutes, status, created_by)
       VALUES ('Test Ineligible Exam', 'Restricted', $1, $2, 60, 'published', $3)
       RETURNING id`,
      [new Date(now - oneHour), new Date(now + oneHour), testStudent.id]
    );
    ineligibleExamId = ineligRes.rows[0].id;
    await query(
      `INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, marks, created_by)
       VALUES ($1, 'Ineligible Q1', 'mcq', '["A","B"]'::jsonb, '"A"'::jsonb, 1, $2)`,
      [ineligibleExamId, testStudent.id]
    );
    await query(
      `INSERT INTO exam_eligibility (exam_id, student_id, allowed, reason)
       VALUES ($1, $2, false, 'You have not completed prerequisite coursework.')`,
      [ineligibleExamId, testStudent.id]
    );

    // 5. Active, open exam with questions
    const actRes = await query(
      `INSERT INTO exams (title, description, starts_at, ends_at, duration_minutes, status, created_by)
       VALUES ('Test Active Open Exam', 'Valid window', $1, $2, 60, 'published', $3)
       RETURNING id`,
      [new Date(now - oneHour), new Date(now + 2 * oneHour), testStudent.id]
    );
    activeExamId = actRes.rows[0].id;
    await query(
      `INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, marks, created_by)
       VALUES ($1, 'Active Q1', 'mcq', '["True","False"]'::jsonb, '"True"'::jsonb, 2, $2)`,
      [activeExamId, testStudent.id]
    );
  });

  after(async () => {
    // Clean up created test exams and attempts
    const ids = [upcomingExamId, endedExamId, activeExamId, noQuestionsExamId, ineligibleExamId].filter(Boolean);
    if (ids.length) {
      await query(`DELETE FROM results WHERE exam_id = ANY($1::uuid[])`, [ids]);
      await query(`DELETE FROM exam_proctor_events WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id = ANY($1::uuid[]))`, [ids]);
      await query(`DELETE FROM student_answers WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id = ANY($1::uuid[]))`, [ids]);
      await query(`DELETE FROM exam_attempts WHERE exam_id = ANY($1::uuid[])`, [ids]);
      await query(`DELETE FROM exam_eligibility WHERE exam_id = ANY($1::uuid[])`, [ids]);
      await query(`DELETE FROM questions WHERE exam_id = ANY($1::uuid[])`, [ids]);
      await query(`DELETE FROM exams WHERE id = ANY($1::uuid[])`, [ids]);
    }
    await query(`DELETE FROM users WHERE id = $1`, [testStudent.id]);
    await pool.end();
  });

  test('1. Upcoming exam eligibility and start are blocked with explanation', async () => {
    const eligRes = await fetch(`${BASE_URL}/exams/${upcomingExamId}/eligibility`, { headers });
    const elig = await eligRes.json();
    assert.equal(elig.eligible, false);
    assert.equal(elig.windowState, 'upcoming');
    assert.match(elig.reason, /not started yet/i);

    const startRes = await fetch(`${BASE_URL}/exams/${upcomingExamId}/start`, { method: 'POST', headers });
    assert.equal(startRes.status, 403);
    const body = await startRes.json();
    assert.match(body.error, /not started yet/i);
  });

  test('2. Ended exam eligibility and start are blocked with permitted window message', async () => {
    const eligRes = await fetch(`${BASE_URL}/exams/${endedExamId}/eligibility`, { headers });
    const elig = await eligRes.json();
    assert.equal(elig.eligible, false);
    assert.equal(elig.windowState, 'ended');
    assert.match(elig.reason, /outside its permitted window/i);

    const startRes = await fetch(`${BASE_URL}/exams/${endedExamId}/start`, { method: 'POST', headers });
    assert.equal(startRes.status, 403);
    const body = await startRes.json();
    assert.match(body.error, /outside its permitted window/i);
  });

  test('3. Exam without questions cannot be started', async () => {
    const eligRes = await fetch(`${BASE_URL}/exams/${noQuestionsExamId}/eligibility`, { headers });
    const elig = await eligRes.json();
    assert.equal(elig.eligible, false);
    assert.equal(elig.code, 'NO_QUESTIONS');

    const startRes = await fetch(`${BASE_URL}/exams/${noQuestionsExamId}/start`, { method: 'POST', headers });
    assert.equal(startRes.status, 400);
    const body = await startRes.json();
    assert.match(body.error, /no active questions/i);
  });

  test('4. Ineligible student blocked according to exam_eligibility table', async () => {
    const eligRes = await fetch(`${BASE_URL}/exams/${ineligibleExamId}/eligibility`, { headers });
    const elig = await eligRes.json();
    assert.equal(elig.eligible, false);
    assert.equal(elig.code, 'STUDENT_INELIGIBLE');
    assert.match(elig.reason, /prerequisite/i);

    const startRes = await fetch(`${BASE_URL}/exams/${ineligibleExamId}/start`, { method: 'POST', headers });
    assert.equal(startRes.status, 403);
    const body = await startRes.json();
    assert.match(body.error, /prerequisite/i);
  });

  let createdAttemptId;
  test('5. Valid exam within permitted window starts successfully', async () => {
    const eligRes = await fetch(`${BASE_URL}/exams/${activeExamId}/eligibility`, { headers });
    const elig = await eligRes.json();
    assert.equal(elig.eligible, true);
    assert.equal(elig.windowState, 'open');

    const startRes = await fetch(`${BASE_URL}/exams/${activeExamId}/start`, { method: 'POST', headers });
    assert.equal(startRes.status, 201);
    const body = await startRes.json();
    assert.ok(body.attempt?.id);
    assert.equal(body.attempt.status, 'in_progress');
    assert.equal(body.resumed, false);
    createdAttemptId = body.attempt.id;
  });

  test('6. Repeated start call resumes in-progress attempt without creating duplicates', async () => {
    const startAgainRes = await fetch(`${BASE_URL}/exams/${activeExamId}/start`, { method: 'POST', headers });
    assert.equal(startAgainRes.status, 200);
    const body = await startAgainRes.json();
    assert.equal(body.attempt.id, createdAttemptId);
    assert.equal(body.resumed, true);

    // Verify DB count of attempts is exactly 1
    const countRes = await query(
      `SELECT count(*)::int as count FROM exam_attempts WHERE exam_id=$1 AND student_id=$2`,
      [activeExamId, testStudent.id]
    );
    assert.equal(countRes.rows[0].count, 1);
  });

  test('7. Attempt details and questions load cleanly via GET /attempts/:id', async () => {
    const attRes = await fetch(`${BASE_URL}/attempts/${createdAttemptId}`, { headers });
    assert.equal(attRes.status, 200);
    const body = await attRes.json();
    assert.equal(body.attempt.id, createdAttemptId);
    assert.ok(Array.isArray(body.questions));
    assert.equal(body.questions.length, 1);
    assert.equal(body.questions[0].question_text, 'Active Q1');
  });

  test('8. Submitting attempt marks it submitted and prevents further start/resume', async () => {
    const subRes = await fetch(`${BASE_URL}/attempts/${createdAttemptId}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
    assert.equal(subRes.status, 200);

    // Further start attempt is rejected with 409
    const startAfterRes = await fetch(`${BASE_URL}/exams/${activeExamId}/start`, { method: 'POST', headers });
    assert.equal(startAfterRes.status, 409);
    const body = await startAfterRes.json();
    assert.match(body.error, /already been submitted/i);

    // Eligibility reflects hasSubmitted
    const eligRes = await fetch(`${BASE_URL}/exams/${activeExamId}/eligibility`, { headers });
    const elig = await eligRes.json();
    assert.equal(elig.eligible, false);
    assert.equal(elig.hasSubmitted, true);
  });
});
