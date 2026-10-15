import {Router} from 'express';
import {z} from 'zod';
import {query} from '../db.js';
import {requireAuth} from '../middleware/auth.js';

const r = Router();
r.use(requireAuth, (req, res, next) => {
  if (req.user?.role !== 'student') return res.status(403).json({error: 'Student access required.'});
  next();
});

export const recordSchema = z.object({
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Record date must be in YYYY-MM-DD format.'),
  topicsLearned: z.string().trim().min(1, 'Topics learned is required.').max(3000),
  tasksCompleted: z.string().trim().min(1, 'Tasks completed is required.').max(3000),
  hoursSpent: z.coerce.number().min(0.1, 'Hours spent must be at least 0.1 hours.').max(24, 'Hours spent cannot exceed 24.'),
  challengesBlockers: z.string().trim().max(3000).optional().nullable(),
  notesSummary: z.string().trim().max(3000).optional().nullable(),
  isDraft: z.boolean().optional().default(false)
});

export function computeIsLate(recordDateStr, mandate, now = new Date()) {
  if (!mandate) return false;
  const dueTime = String(mandate.due_time || '23:59:00').trim();
  const [hh, mm] = dueTime.split(':').map(x => parseInt(x, 10) || 0);
  
  // Build deadline in server local time
  const [year, month, day] = recordDateStr.split('-').map(Number);
  const deadline = new Date(year, month - 1, day, hh, mm, 59, 999);
  
  return now.getTime() > deadline.getTime();
}

// Helper to query active mandate applicable to student
export async function getApplicableMandate(studentId) {
  try {
    const studentRes = await query("SELECT id, domain FROM users WHERE id=$1", [studentId]);
    const student = studentRes.rows[0];
    const studentDomain = student?.domain || null;

    const mandateRes = await query(`
      SELECT * FROM daily_submission_mandates
      WHERE status = 'active'
        AND start_date <= CURRENT_DATE
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        AND (
          target_type = 'all'
          OR (target_type = 'domain' AND target_value = $1)
          OR (target_type = 'student' AND target_value = $2)
        )
      ORDER BY created_at DESC
      LIMIT 1
    `, [studentDomain, studentId]);

    return mandateRes.rows[0] || null;
  } catch (err) {
    if (err.code === '42P01' || err.code === '42703') return null;
    throw err;
  }
}

// Handler for viewing student's applicable mandate and today's status
const getMandatesHandler = async (req, res, next) => {
  try {
    try {
      const studentId = req.user.sub;
      const mandate = await getApplicableMandate(studentId);

      // Fetch today's local date YYYY-MM-DD
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      let todayRecord = null;
      try {
        const recordRes = await query(`
          SELECT * FROM daily_learning_records
          WHERE student_id = $1 AND record_date = $2
        `, [studentId, todayStr]);
        todayRecord = recordRes.rows[0] || null;
      } catch (e) {
        if (e.code !== '42P01') throw e;
      }

      let complianceStatus = 'none';
      let isOverdue = false;

      if (todayRecord) {
        complianceStatus = todayRecord.status; // 'submitted', 'approved', 'corrections_requested', 'draft'
      } else if (mandate) {
        const dueTime = String(mandate.due_time || '23:59:00').trim();
        const [hh, mm] = dueTime.split(':').map(x => parseInt(x, 10) || 0);
        const deadline = new Date(year, now.getMonth(), now.getDate(), hh, mm, 59, 999);
        
        if (now.getTime() > deadline.getTime()) {
          complianceStatus = 'overdue';
          isOverdue = true;
        } else {
          complianceStatus = 'pending';
        }
      }

      res.json({
        mandate,
        todayStatus: {
          date: todayStr,
          status: complianceStatus,
          isOverdue,
          record: todayRecord,
          deadline: mandate ? `${todayStr} ${mandate.due_time}` : null
        }
      });
    } catch (dbErr) {
      if (dbErr.code === '42P01') {
        return res.json({mandate: null, todayStatus: {status: 'none', record: null}, pendingMigration: true});
      }
      throw dbErr;
    }
  } catch (e) {
    next(e);
  }
};

r.get('/daily-mandates', getMandatesHandler);
r.get('/daily-records/mandates', getMandatesHandler);

// 1. List my records
r.get('/daily-records', async (req, res, next) => {
  try {
    try {
      const o = await query(`
        SELECT r.id, r.record_date, r.topics_learned, r.tasks_completed,
               r.hours_spent, r.challenges_blockers, r.notes_summary,
               r.status, r.submitted_at, r.is_late, r.submission_count,
               r.reviewed_at, r.feedback, r.created_at, r.updated_at
        FROM daily_learning_records r
        WHERE r.student_id = $1
        ORDER BY r.record_date DESC, r.created_at DESC
      `, [req.user.sub]);
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

// 2. View my specific record details (with review history)
r.get('/daily-records/:id', async (req, res, next) => {
  try {
    try {
      const recordRes = await query(`
        SELECT r.*
        FROM daily_learning_records r
        WHERE r.id = $1 AND r.student_id = $2
      `, [req.params.id, req.user.sub]);

      if (!recordRes.rowCount) {
        return res.status(404).json({error: 'Learning record not found.'});
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
    } catch (dbErr) {
      if (dbErr.code === '42P01') {
        return res.status(404).json({error: 'Record not found (database table pending migration).'});
      }
      throw dbErr;
    }
  } catch (e) {
    next(e);
  }
});

// 3. Create draft or submit daily record
r.post('/daily-records', async (req, res, next) => {
  try {
    const parse = recordSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({error: parse.error.issues[0].message});
    }

    const {
      recordDate,
      topicsLearned,
      tasksCompleted,
      hoursSpent,
      challengesBlockers,
      notesSummary,
      isDraft
    } = parse.data;

    const studentId = req.user.sub;

    // Check future date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [rYear, rMonth, rDay] = recordDate.split('-').map(Number);
    const recDateObj = new Date(rYear, rMonth - 1, rDay);
    if (recDateObj.getTime() > today.getTime() + 86400000) {
      return res.status(400).json({error: 'Record date cannot be set to a future date.'});
    }

    // Check applicable mandate
    const mandate = await getApplicableMandate(studentId);
    const isLate = computeIsLate(recordDate, mandate, now);

    if (!isDraft && isLate && mandate && mandate.allow_late_submissions === false) {
      return res.status(400).json({
        error: 'The submission deadline for this date has expired and late submissions are disallowed by mandate policy.'
      });
    }

    // Check existing record for this date
    const existing = await query(`
      SELECT id, status FROM daily_learning_records
      WHERE student_id = $1 AND record_date = $2
    `, [studentId, recordDate]);

    if (existing.rowCount > 0) {
      const current = existing.rows[0];
      if (current.status === 'submitted' || current.status === 'approved') {
        return res.status(409).json({
          error: `A learning record for ${recordDate} has already been ${current.status}. Duplicate submissions for the same period are not permitted.`
        });
      }

      // If existing is draft or corrections_requested, update it
      const newStatus = isDraft ? 'draft' : 'submitted';
      const submittedAtVal = isDraft ? null : new Date();
      const incCount = (newStatus === 'submitted' && current.status !== 'submitted')
        ? (Number(current.submission_count) || 1) + 1
        : (Number(current.submission_count) || 1);

      const updated = await query(`
        UPDATE daily_learning_records
        SET topics_learned = $1,
            tasks_completed = $2,
            hours_spent = $3,
            challenges_blockers = $4,
            notes_summary = $5,
            status = $6,
            submitted_at = COALESCE($7, submitted_at),
            is_late = $8,
            mandate_id = $9,
            submission_count = $10,
            updated_at = now()
        WHERE id = $11 AND student_id = $12
        RETURNING *
      `, [
        topicsLearned,
        tasksCompleted,
        hoursSpent,
        challengesBlockers || null,
        notesSummary || null,
        newStatus,
        submittedAtVal,
        isLate,
        mandate?.id || null,
        incCount,
        current.id,
        studentId
      ]);

      return res.json({record: updated.rows[0], message: isDraft ? 'Draft saved.' : 'Record submitted for review.'});
    }

    // Insert new record
    const statusVal = isDraft ? 'draft' : 'submitted';
    const submittedAtVal = isDraft ? null : new Date();

    const insertRes = await query(`
      INSERT INTO daily_learning_records(
        student_id, mandate_id, record_date, topics_learned,
        tasks_completed, hours_spent, challenges_blockers, notes_summary,
        status, submitted_at, is_late, submission_count
      )
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)
      RETURNING *
    `, [
      studentId,
      mandate?.id || null,
      recordDate,
      topicsLearned,
      tasksCompleted,
      hoursSpent,
      challengesBlockers || null,
      notesSummary || null,
      statusVal,
      submittedAtVal,
      isLate
    ]);

    res.status(201).json({
      record: insertRes.rows[0],
      message: isDraft ? 'Draft saved.' : 'Record submitted for review.'
    });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({error: 'A record for this date already exists.'});
    }
    if (e.code === '42P01') {
      return res.status(503).json({error: 'Daily records database table is pending migration. Please apply migration 005.'});
    }
    next(e);
  }
});

// 4. Update existing record
r.put('/daily-records/:id', async (req, res, next) => {
  try {
    const parse = recordSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({error: parse.error.issues[0].message});
    }

    const {
      recordDate,
      topicsLearned,
      tasksCompleted,
      hoursSpent,
      challengesBlockers,
      notesSummary,
      isDraft
    } = parse.data;

    const studentId = req.user.sub;
    const recordRes = await query(`
      SELECT * FROM daily_learning_records WHERE id = $1 AND student_id = $2
    `, [req.params.id, studentId]);

    if (!recordRes.rowCount) {
      return res.status(404).json({error: 'Record not found.'});
    }

    const rec = recordRes.rows[0];

    if (rec.status === 'approved') {
      return res.status(400).json({error: 'Approved records cannot be edited.'});
    }

    const mandate = await getApplicableMandate(studentId);

    if (rec.status === 'submitted') {
      if (!mandate || mandate.allow_edits_after_submission !== true) {
        return res.status(400).json({
          error: 'Record is currently submitted and under review. Editing is locked unless corrections are requested.'
        });
      }
    }

    const now = new Date();
    const isLate = computeIsLate(recordDate, mandate, now);

    if (!isDraft && isLate && mandate && mandate.allow_late_submissions === false) {
      return res.status(400).json({
        error: 'The submission deadline for this date has expired and late submissions are disallowed.'
      });
    }

    // Check date collision if date changed
    if (rec.record_date !== recordDate) {
      const dup = await query(`
        SELECT id FROM daily_learning_records
        WHERE student_id = $1 AND record_date = $2 AND id != $3
      `, [studentId, recordDate, rec.id]);
      if (dup.rowCount) {
        return res.status(409).json({error: `Another record already exists for ${recordDate}.`});
      }
    }

    const newStatus = isDraft ? 'draft' : 'submitted';
    const submittedAtVal = isDraft ? rec.submitted_at : (rec.submitted_at || new Date());
    const incCount = (!isDraft && rec.status === 'corrections_requested') ? rec.submission_count + 1 : rec.submission_count;

    const updated = await query(`
      UPDATE daily_learning_records
      SET record_date = $1,
          topics_learned = $2,
          tasks_completed = $3,
          hours_spent = $4,
          challenges_blockers = $5,
          notes_summary = $6,
          status = $7,
          submitted_at = $8,
          is_late = $9,
          submission_count = $10,
          updated_at = now()
      WHERE id = $11 AND student_id = $12
      RETURNING *
    `, [
      recordDate,
      topicsLearned,
      tasksCompleted,
      hoursSpent,
      challengesBlockers || null,
      notesSummary || null,
      newStatus,
      submittedAtVal,
      isLate,
      incCount,
      rec.id,
      studentId
    ]);

    res.json({
      record: updated.rows[0],
      message: isDraft ? 'Draft updated.' : 'Record updated and submitted for review.'
    });
  } catch (e) {
    next(e);
  }
});

// 5. Explicitly submit / resubmit a record
r.post('/daily-records/:id/submit', async (req, res, next) => {
  try {
    const studentId = req.user.sub;
    const recordRes = await query(`
      SELECT * FROM daily_learning_records WHERE id = $1 AND student_id = $2
    `, [req.params.id, studentId]);

    if (!recordRes.rowCount) {
      return res.status(404).json({error: 'Record not found.'});
    }

    const rec = recordRes.rows[0];
    if (rec.status === 'approved') {
      return res.status(400).json({error: 'Approved records cannot be resubmitted.'});
    }
    if (rec.status === 'submitted') {
      return res.status(400).json({error: 'Record has already been submitted and is awaiting review.'});
    }

    const mandate = await getApplicableMandate(studentId);
    const isLate = computeIsLate(rec.record_date, mandate, new Date());

    if (isLate && mandate && mandate.allow_late_submissions === false) {
      return res.status(400).json({
        error: 'The submission deadline has passed and late submissions are disallowed by mandate policy.'
      });
    }

    const updated = await query(`
      UPDATE daily_learning_records
      SET status = 'submitted',
          submitted_at = now(),
          is_late = $1,
          submission_count = submission_count + 1,
          updated_at = now()
      WHERE id = $2 AND student_id = $3
      RETURNING *
    `, [isLate, rec.id, studentId]);

    res.json({
      record: updated.rows[0],
      message: rec.status === 'corrections_requested'
        ? 'Corrected record resubmitted successfully for review.'
        : 'Record submitted for review.'
    });
  } catch (e) {
    next(e);
  }
});

export default r;
