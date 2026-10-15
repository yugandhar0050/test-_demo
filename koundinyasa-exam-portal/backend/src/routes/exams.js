import {Router} from 'express';
import {query} from '../db.js';
import {requireAuth} from '../middleware/auth.js';

const r = Router();

r.get('/', requireAuth, async (req, res, next) => {
  try {
    const o = await query(
      "SELECT e.id, e.title, e.description, e.starts_at, e.ends_at, e.duration_minutes, e.total_marks, e.passing_marks, e.status, s.name AS subject FROM exams e LEFT JOIN subjects s ON s.id=e.subject_id WHERE e.status IN ('published','active','completed') AND e.deleted_at IS NULL ORDER BY e.starts_at"
    );
    res.json({ exams: o.rows });
  } catch (e) {
    next(e);
  }
});

r.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const o = await query(
      'SELECT id, title, description, instructions, starts_at, ends_at, duration_minutes, total_marks, passing_marks, status, subject_id FROM exams WHERE id=$1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!o.rowCount) return res.status(404).json({ error: 'Exam not found.' });
    const q = await query(
      'SELECT id, question_text, question_type, marks, negative_marks, options, display_order FROM questions WHERE exam_id=$1 AND is_active=true ORDER BY display_order',
      [req.params.id]
    );
    res.json({ exam: o.rows[0], questions: q.rows });
  } catch (e) {
    next(e);
  }
});

r.get('/:id/eligibility', requireAuth, async (req, res, next) => {
  try {
    const e = await query(
      "SELECT id, title, starts_at, ends_at, duration_minutes, total_marks, passing_marks, status FROM exams WHERE id=$1 AND deleted_at IS NULL",
      [req.params.id]
    );
    if (!e.rowCount) {
      return res.status(404).json({ eligible: false, error: 'Exam not found.' });
    }
    const x = e.rows[0];
    const now = new Date();
    const startsAt = new Date(x.starts_at);
    const endsAt = new Date(x.ends_at);

    // 1. Status check
    if (!['published', 'active'].includes(x.status)) {
      return res.json({
        eligible: false,
        reason: `Exam is currently ${x.status}.`,
        code: 'EXAM_NOT_ACTIVE',
        status: x.status,
        serverTime: now.toISOString()
      });
    }

    // 2. Active questions check
    const qc = await query(
      "SELECT count(*)::int AS count FROM questions WHERE exam_id=$1 AND is_active=true",
      [x.id]
    );
    if (!qc.rows[0]?.count) {
      return res.json({
        eligible: false,
        reason: 'This exam has no active questions yet. Please contact your administrator.',
        code: 'NO_QUESTIONS',
        serverTime: now.toISOString()
      });
    }

    // 3. Student-specific eligibility check from exam_eligibility table
    const el = await query(
      "SELECT allowed, reason FROM exam_eligibility WHERE exam_id=$1 AND student_id=$2",
      [x.id, req.user.sub]
    );
    if (el.rowCount && !el.rows[0].allowed) {
      return res.json({
        eligible: false,
        reason: el.rows[0].reason || 'You are not eligible to take this examination.',
        code: 'STUDENT_INELIGIBLE',
        serverTime: now.toISOString()
      });
    }

    // 4. Attempt check: check for existing active or submitted attempts
    const old = await query(
      "SELECT id, exam_id, status, started_at, expires_at FROM exam_attempts WHERE exam_id=$1 AND student_id=$2 ORDER BY attempt_number DESC LIMIT 1",
      [x.id, req.user.sub]
    );
    if (old.rowCount && old.rows[0].status === 'in_progress') {
      if (now < new Date(old.rows[0].expires_at)) {
        return res.json({
          eligible: true,
          canResume: true,
          attempt: old.rows[0],
          reason: 'You have an attempt in progress.',
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          serverTime: now.toISOString()
        });
      } else {
        return res.json({
          eligible: false,
          canResume: false,
          reason: 'Your exam attempt time has expired.',
          code: 'ATTEMPT_EXPIRED',
          serverTime: now.toISOString()
        });
      }
    }
    if (old.rowCount && old.rows[0].status !== 'in_progress') {
      return res.json({
        eligible: false,
        hasSubmitted: true,
        reason: 'An attempt has already been submitted for this exam.',
        code: 'ALREADY_SUBMITTED',
        serverTime: now.toISOString()
      });
    }

    // 5. Permitted window check for starting new attempt
    if (now < startsAt) {
      return res.json({
        eligible: false,
        windowState: 'upcoming',
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        serverTime: now.toISOString(),
        reason: `Exam has not started yet. Permitted window begins at ${startsAt.toLocaleString()}.`,
        code: 'WINDOW_UPCOMING'
      });
    }
    if (now > endsAt) {
      return res.json({
        eligible: false,
        windowState: 'ended',
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        serverTime: now.toISOString(),
        reason: `Exam window closed at ${endsAt.toLocaleString()}. Exam is outside its permitted window.`,
        code: 'WINDOW_ENDED'
      });
    }

    return res.json({
      eligible: true,
      canStart: true,
      windowState: 'open',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      serverTime: now.toISOString()
    });
  } catch (e) {
    next(e);
  }
});

r.post('/:id/start', requireAuth, async (req, res, next) => {
  try {
    const e = await query(
      "SELECT * FROM exams WHERE id=$1 AND status IN ('published','active') AND deleted_at IS NULL",
      [req.params.id]
    );
    if (!e.rowCount) {
      return res.status(404).json({ error: 'Exam is not available.' });
    }
    const x = e.rows[0];
    const now = new Date();
    const startsAt = new Date(x.starts_at);
    const endsAt = new Date(x.ends_at);

    // 1. Check student eligibility
    const el = await query(
      "SELECT allowed, reason FROM exam_eligibility WHERE exam_id=$1 AND student_id=$2",
      [x.id, req.user.sub]
    );
    if (el.rowCount && !el.rows[0].allowed) {
      return res.status(403).json({
        error: el.rows[0].reason || 'You are not eligible to take this examination.'
      });
    }

    // 2. Check active questions exist
    const qc = await query(
      "SELECT count(*)::int AS count FROM questions WHERE exam_id=$1 AND is_active=true",
      [x.id]
    );
    if (!qc.rows[0]?.count) {
      return res.status(400).json({
        error: 'This exam has no active questions yet. Please contact your administrator.'
      });
    }

    // 3. Check for existing attempts
    const old = await query(
      "SELECT id, exam_id, status, started_at, expires_at FROM exam_attempts WHERE exam_id=$1 AND student_id=$2 ORDER BY attempt_number DESC LIMIT 1",
      [x.id, req.user.sub]
    );
    if (old.rowCount && old.rows[0].status === 'in_progress') {
      if (now < new Date(old.rows[0].expires_at)) {
        return res.json({ attempt: old.rows[0], resumed: true });
      } else {
        return res.status(409).json({ error: 'Your exam attempt has expired.' });
      }
    }
    if (old.rowCount && old.rows[0].status !== 'in_progress') {
      return res.status(409).json({ error: 'An attempt has already been submitted.' });
    }

    // 4. Validate permitted window for new attempt
    if (now < startsAt) {
      return res.status(403).json({
        error: `Exam has not started yet. Permitted window begins at ${startsAt.toLocaleString()}.`
      });
    }
    if (now > endsAt) {
      return res.status(403).json({
        error: `Exam is outside its permitted window. Permitted window closed at ${endsAt.toLocaleString()}.`
      });
    }

    // 5. Create authorized attempt
    const a = await query(
      "INSERT INTO exam_attempts(exam_id, student_id, status, started_at, expires_at) VALUES($1, $2, 'in_progress', now(), LEAST(now() + ($3 || ' minutes')::interval, $4)) RETURNING id, exam_id, status, started_at, expires_at",
      [x.id, req.user.sub, String(x.duration_minutes), x.ends_at]
    );
    return res.status(201).json({ attempt: a.rows[0], resumed: false });
  } catch (e) {
    next(e);
  }
});

export default r;
