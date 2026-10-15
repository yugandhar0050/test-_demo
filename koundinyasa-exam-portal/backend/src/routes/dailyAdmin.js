import {Router} from 'express';
import {z} from 'zod';
import {query} from '../db.js';
import {requireAuth, requireAdmin} from '../middleware/auth.js';

const r = Router();
r.use(requireAuth, requireAdmin);

export const mandateSchema = z.object({
  title: z.string().trim().min(1, 'Mandate title is required.').max(200),
  instructions: z.string().trim().max(3000).optional().nullable(),
  targetType: z.enum(['all', 'domain', 'student']).default('all'),
  targetValue: z.string().trim().max(80).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD.').optional(),
  dueTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Due time must be HH:MM or HH:MM:SS format.').default('23:59:00'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD.').optional().nullable(),
  status: z.enum(['active', 'paused', 'ended']).default('active'),
  allowLateSubmissions: z.boolean().default(true),
  allowEditsAfterSubmission: z.boolean().default(false)
});

// 1. Overview compliance & metrics summary (put BEFORE /:id route)
r.get('/daily-records/summary', async (req, res, next) => {
  try {
    try {
      // 1. Total student accounts
      const totalStudentsRes = await query("SELECT count(*)::int AS count FROM users WHERE role='student'");
      const totalStudents = totalStudentsRes.rows[0]?.count || 0;

      // 2. Record counts by status
      const statusCountsRes = await query(`
        SELECT
          count(*)::int AS total_records,
          count(*) FILTER (WHERE status = 'submitted')::int AS awaiting_review,
          count(*) FILTER (WHERE status = 'approved')::int AS approved,
          count(*) FILTER (WHERE status = 'corrections_requested')::int AS corrections_requested,
          count(*) FILTER (WHERE status = 'draft')::int AS drafts
        FROM daily_learning_records
      `);
      const statusCounts = statusCountsRes.rows[0] || {
        total_records: 0,
        awaiting_review: 0,
        approved: 0,
        corrections_requested: 0,
        drafts: 0
      };

      // 3. Today's mandate compliance check
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const activeMandateRes = await query(`
        SELECT * FROM daily_submission_mandates
        WHERE status = 'active'
          AND start_date <= CURRENT_DATE
          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const mandate = activeMandateRes.rows[0] || null;

      let submittedToday = 0;
      let pendingToday = 0;
      let overdueToday = 0;

      if (mandate) {
        // Count how many students submitted for today
        const submittedTodayRes = await query(`
          SELECT count(DISTINCT student_id)::int AS count
          FROM daily_learning_records
          WHERE record_date = $1 AND status != 'draft'
        `, [todayStr]);
        submittedToday = submittedTodayRes.rows[0]?.count || 0;

        // Calculate if deadline passed
        const dueTime = String(mandate.due_time || '23:59:00').trim();
        const [hh, mm] = dueTime.split(':').map(x => parseInt(x, 10) || 0);
        const deadline = new Date(year, now.getMonth(), now.getDate(), hh, mm, 59, 999);
        const deadlinePassed = now.getTime() > deadline.getTime();

        const missing = Math.max(0, totalStudents - submittedToday);
        if (deadlinePassed) {
          overdueToday = missing;
          pendingToday = 0;
        } else {
          pendingToday = missing;
          overdueToday = 0;
        }
      }

      res.json({
        summary: {
          totalStudents,
          totalRecords: statusCounts.total_records,
          awaitingReview: statusCounts.awaiting_review,
          approved: statusCounts.approved,
          correctionsRequested: statusCounts.corrections_requested,
          drafts: statusCounts.drafts,
          submittedToday,
          pendingToday,
          overdueToday,
          hasActiveMandate: Boolean(mandate),
          mandateTitle: mandate?.title || null,
          mandateDueTime: mandate?.due_time || null
        }
      });
    } catch (dbErr) {
      if (dbErr.code === '42P01') {
        const totalStudentsRes = await query("SELECT count(*)::int AS count FROM users WHERE role='student'");
        return res.json({
          summary: {
            totalStudents: totalStudentsRes.rows[0]?.count || 0,
            totalRecords: 0,
            awaitingReview: 0,
            approved: 0,
            correctionsRequested: 0,
            drafts: 0,
            submittedToday: 0,
            pendingToday: 0,
            overdueToday: 0,
            hasActiveMandate: false,
            pendingMigration: true
          }
        });
      }
      throw dbErr;
    }
  } catch (e) {
    next(e);
  }
});

// 2. List and filter all daily learning records
r.get('/daily-records', async (req, res, next) => {
  try {
    const {
      search,
      domain,
      status,
      startDate,
      endDate,
      studentId
    } = req.query;

    let sql = `
      SELECT r.id, r.record_date, r.topics_learned, r.tasks_completed,
             r.hours_spent, r.challenges_blockers, r.notes_summary,
             r.status, r.submitted_at, r.is_late, r.submission_count,
             r.reviewed_at, r.feedback, r.created_at, r.updated_at,
             u.id AS student_uuid, u.student_id, u.first_name, u.last_name,
             u.email, u.phone, u.domain,
             rev.first_name AS reviewer_first_name, rev.last_name AS reviewer_last_name,
             m.title AS mandate_title
      FROM daily_learning_records r
      JOIN users u ON u.id = r.student_id
      LEFT JOIN users rev ON rev.id = r.reviewed_by
      LEFT JOIN daily_submission_mandates m ON m.id = r.mandate_id
      WHERE 1=1
    `;
    const params = [];

    if (search && String(search).trim()) {
      params.push(`%${String(search).trim()}%`);
      sql += ` AND (
        u.first_name ILIKE $${params.length}
        OR u.last_name ILIKE $${params.length}
        OR u.student_id ILIKE $${params.length}
        OR u.email ILIKE $${params.length}
        OR r.topics_learned ILIKE $${params.length}
        OR r.tasks_completed ILIKE $${params.length}
      )`;
    }

    if (domain && domain !== 'all') {
      if (domain === 'unassigned') {
        sql += ` AND (u.domain IS NULL OR u.domain = '')`;
      } else {
        params.push(domain);
        sql += ` AND u.domain = $${params.length}`;
      }
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND r.status = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      sql += ` AND r.record_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      sql += ` AND r.record_date <= $${params.length}`;
    }

    if (studentId) {
      params.push(studentId);
      sql += ` AND (u.id::text = $${params.length} OR u.student_id = $${params.length})`;
    }

    sql += ` ORDER BY r.record_date DESC, r.submitted_at DESC NULLS LAST, r.created_at DESC LIMIT 500`;

    try {
      const o = await query(sql, params);
      res.json({records: o.rows});
    } catch (dbErr) {
      if (dbErr.code === '42P01') {
        return res.json({records: [], pendingMigration: true});
      }
      throw dbErr;
    }
  } catch (e) {
    next(e);
  }
});

// 3. View record details with full submission & review history
r.get('/daily-records/:id', async (req, res, next) => {
  try {
    const recordRes = await query(`
      SELECT r.*,
             u.student_id, u.first_name, u.last_name, u.email, u.phone, u.domain,
             rev.first_name AS reviewer_first_name, rev.last_name AS reviewer_last_name,
             m.title AS mandate_title
      FROM daily_learning_records r
      JOIN users u ON u.id = r.student_id
      LEFT JOIN users rev ON rev.id = r.reviewed_by
      LEFT JOIN daily_submission_mandates m ON m.id = r.mandate_id
      WHERE r.id = $1
    `, [req.params.id]);

    if (!recordRes.rowCount) {
      return res.status(404).json({error: 'Daily record not found.'});
    }

    const reviewsRes = await query(`
      SELECT rv.id, rv.action, rv.feedback, rv.created_at,
             u.first_name AS reviewer_first_name, u.last_name AS reviewer_last_name
      FROM daily_record_reviews rv
      JOIN users u ON u.id = rv.reviewer_id
      WHERE rv.record_id = $1
      ORDER BY rv.created_at DESC
    `, [req.params.id]);

    res.json({
      record: recordRes.rows[0],
      reviews: reviewsRes.rows
    });
  } catch (e) {
    next(e);
  }
});

// 4. Approve record
r.patch('/daily-records/:id/approve', async (req, res, next) => {
  try {
    const remarks = String(req.body?.remarks || req.body?.feedback || '').trim() || null;
    const reviewerId = req.user.sub;

    const updated = await query(`
      UPDATE daily_learning_records
      SET status = 'approved',
          reviewed_by = $1,
          reviewed_at = now(),
          feedback = $2,
          updated_at = now()
      WHERE id = $3
      RETURNING *
    `, [reviewerId, remarks, req.params.id]);

    if (!updated.rowCount) {
      return res.status(404).json({error: 'Record not found.'});
    }

    await query(`
      INSERT INTO daily_record_reviews(record_id, reviewer_id, action, feedback)
      VALUES($1, $2, 'approved', $3)
    `, [req.params.id, reviewerId, remarks]);

    res.json({
      record: updated.rows[0],
      message: 'Learning record approved successfully.'
    });
  } catch (e) {
    next(e);
  }
});

// 5. Request corrections on a record (mandatory feedback)
r.patch('/daily-records/:id/request-corrections', async (req, res, next) => {
  try {
    const feedback = String(req.body?.feedback || '').trim();
    if (!feedback || feedback.length < 3) {
      return res.status(400).json({error: 'Detailed feedback is required when requesting corrections.'});
    }

    const reviewerId = req.user.sub;

    const updated = await query(`
      UPDATE daily_learning_records
      SET status = 'corrections_requested',
          reviewed_by = $1,
          reviewed_at = now(),
          feedback = $2,
          updated_at = now()
      WHERE id = $3
      RETURNING *
    `, [reviewerId, feedback, req.params.id]);

    if (!updated.rowCount) {
      return res.status(404).json({error: 'Record not found.'});
    }

    await query(`
      INSERT INTO daily_record_reviews(record_id, reviewer_id, action, feedback)
      VALUES($1, $2, 'corrections_requested', $3)
    `, [req.params.id, reviewerId, feedback]);

    res.json({
      record: updated.rows[0],
      message: 'Corrections requested. Feedback sent to student.'
    });
  } catch (e) {
    next(e);
  }
});

// 6. List all mandates
r.get('/daily-mandates', async (req, res, next) => {
  try {
    try {
      const o = await query(`
        SELECT m.*, u.first_name AS creator_first_name, u.last_name AS creator_last_name
        FROM daily_submission_mandates m
        LEFT JOIN users u ON u.id = m.created_by
        ORDER BY m.created_at DESC
      `);
      res.json({mandates: o.rows});
    } catch (dbErr) {
      if (dbErr.code === '42P01') {
        return res.json({mandates: [], pendingMigration: true});
      }
      throw dbErr;
    }
  } catch (e) {
    next(e);
  }
});

// 7. Create mandate
r.post('/daily-mandates', async (req, res, next) => {
  try {
    const parse = mandateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({error: parse.error.issues[0].message});
    }

    const v = parse.data;
    const now = new Date();
    const startDate = v.startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const insertRes = await query(`
      INSERT INTO daily_submission_mandates(
        title, instructions, target_type, target_value,
        start_date, due_time, end_date, status,
        allow_late_submissions, allow_edits_after_submission, created_by
      )
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      v.title,
      v.instructions || null,
      v.targetType,
      v.targetValue || null,
      startDate,
      v.dueTime,
      v.endDate || null,
      v.status,
      v.allowLateSubmissions,
      v.allowEditsAfterSubmission,
      req.user.sub
    ]);

    res.status(201).json({
      mandate: insertRes.rows[0],
      message: 'Submission mandate created.'
    });
  } catch (e) {
    next(e);
  }
});

// 8. Update mandate (pause, resume, end, edit)
r.patch('/daily-mandates/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    const existing = await query("SELECT * FROM daily_submission_mandates WHERE id=$1", [req.params.id]);
    if (!existing.rowCount) {
      return res.status(404).json({error: 'Mandate not found.'});
    }

    const m = existing.rows[0];
    const title = b.title !== undefined ? String(b.title).trim() : m.title;
    const instructions = b.instructions !== undefined ? (String(b.instructions).trim() || null) : m.instructions;
    const status = b.status !== undefined ? b.status : m.status;
    const dueTime = b.dueTime !== undefined ? b.dueTime : m.due_time;
    const endDate = b.endDate !== undefined ? (b.endDate || null) : m.end_date;
    const allowLateSubmissions = b.allowLateSubmissions !== undefined ? Boolean(b.allowLateSubmissions) : m.allow_late_submissions;
    const allowEditsAfterSubmission = b.allowEditsAfterSubmission !== undefined ? Boolean(b.allowEditsAfterSubmission) : m.allow_edits_after_submission;

    if (!title) return res.status(400).json({error: 'Title is required.'});
    if (!['active', 'paused', 'ended'].includes(status)) return res.status(400).json({error: 'Invalid mandate status.'});

    const updated = await query(`
      UPDATE daily_submission_mandates
      SET title = $1,
          instructions = $2,
          status = $3,
          due_time = $4,
          end_date = $5,
          allow_late_submissions = $6,
          allow_edits_after_submission = $7,
          updated_at = now()
      WHERE id = $8
      RETURNING *
    `, [
      title,
      instructions,
      status,
      dueTime,
      endDate,
      allowLateSubmissions,
      allowEditsAfterSubmission,
      req.params.id
    ]);

    res.json({mandate: updated.rows[0], message: 'Mandate updated.'});
  } catch (e) {
    next(e);
  }
});

// 9. Delete or archive mandate
r.delete('/daily-mandates/:id', async (req, res, next) => {
  try {
    const del = await query("UPDATE daily_submission_mandates SET status='ended', updated_at=now() WHERE id=$1 RETURNING id", [req.params.id]);
    if (!del.rowCount) {
      return res.status(404).json({error: 'Mandate not found.'});
    }
    res.json({success: true, message: 'Mandate ended.'});
  } catch (e) {
    next(e);
  }
});

export default r;
