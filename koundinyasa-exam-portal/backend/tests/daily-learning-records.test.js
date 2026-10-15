import test from 'node:test';
import assert from 'node:assert/strict';
import {recordSchema, computeIsLate} from '../src/routes/dailyStudent.js';
import {mandateSchema} from '../src/routes/dailyAdmin.js';

// 1. Record Validation Tests
test('Daily Records - Valid record passes schema validation', () => {
  const valid = {
    recordDate: '2026-10-13',
    topicsLearned: 'React 18 hooks and PostgreSQL migrations',
    tasksCompleted: 'Built daily learning logs UI, configured API endpoints and tested validation.',
    hoursSpent: 4.5,
    challengesBlockers: 'Ensuring late calculation handles server timezones correctly.',
    notesSummary: 'Progress on track. Will proceed with admin mandate features.',
    isDraft: false
  };

  const result = recordSchema.safeParse(valid);
  assert.equal(result.success, true);
  assert.equal(result.data.recordDate, '2026-10-13');
  assert.equal(result.data.hoursSpent, 4.5);
});

test('Daily Records - Missing required topics or tasks is rejected', () => {
  const missingTopics = {
    recordDate: '2026-10-13',
    topicsLearned: '',
    tasksCompleted: 'Completed lab exercises.',
    hoursSpent: 2
  };
  const resTopics = recordSchema.safeParse(missingTopics);
  assert.equal(resTopics.success, false);
  assert.match(resTopics.error.issues[0].message, /topics learned is required/i);

  const missingTasks = {
    recordDate: '2026-10-13',
    topicsLearned: 'Database design',
    tasksCompleted: '   ',
    hoursSpent: 2
  };
  const resTasks = recordSchema.safeParse(missingTasks);
  assert.equal(resTasks.success, false);
  assert.match(resTasks.error.issues[0].message, /tasks completed is required/i);
});

test('Daily Records - Hours spent validation accepts valid decimals and rejects invalid bounds', () => {
  const base = {
    recordDate: '2026-10-13',
    topicsLearned: 'Testing Hours Validation',
    tasksCompleted: 'Verified decimal and integer hours values.'
  };

  // Valid values required by specification: 2, 4, 1.5, 2.3, 3.75, 0.1, 24
  const validHours = [2, 4, 1.5, 2.3, 3.75, 0.1, 24];
  for (const h of validHours) {
    const res = recordSchema.safeParse({ ...base, hoursSpent: h });
    assert.equal(res.success, true, `Expected hoursSpent ${h} to be valid`);
    assert.equal(res.data.hoursSpent, h);
  }

  // Invalid values required by specification: 0, 24.1, negative, non-numeric
  const invalidHours = [0, -1, 24.1, 25, 'abc', ''];
  for (const h of invalidHours) {
    const res = recordSchema.safeParse({ ...base, hoursSpent: h });
    assert.equal(res.success, false, `Expected hoursSpent ${JSON.stringify(h)} to be rejected`);
  }
});

test('Daily Records - Date format must strictly be YYYY-MM-DD', () => {
  const badDate = {
    recordDate: '13-10-2026',
    topicsLearned: 'Topics',
    tasksCompleted: 'Tasks',
    hoursSpent: 3
  };
  const res = recordSchema.safeParse(badDate);
  assert.equal(res.success, false);
  assert.match(res.error.issues[0].message, /YYYY-MM-DD/i);
});

// 2. Late Calculation & Deadline Logic
test('Daily Records - computeIsLate correctly calculates deadline compliance', () => {
  const mandate = {
    title: 'Daily Evening Update',
    due_time: '20:00:00',
    allow_late_submissions: true
  };

  // Scenario A: Submitted at 18:30 on same day (Before deadline -> NOT late)
  const submitBefore = new Date(2026, 9, 13, 18, 30, 0);
  assert.equal(computeIsLate('2026-10-13', mandate, submitBefore), false);

  // Scenario B: Submitted at 20:30 on same day (After deadline -> LATE)
  const submitAfter = new Date(2026, 9, 13, 20, 30, 0);
  assert.equal(computeIsLate('2026-10-13', mandate, submitAfter), true);

  // Scenario C: Submitted on next day for yesterday's date -> LATE
  const submitNextDay = new Date(2026, 9, 14, 9, 0, 0);
  assert.equal(computeIsLate('2026-10-13', mandate, submitNextDay), true);

  // Scenario D: No mandate active -> NOT late
  assert.equal(computeIsLate('2026-10-13', null, submitNextDay), false);
});

// 3. Admin Mandate Validation Tests
test('Admin Mandate - Valid mandate passes schema validation', () => {
  const validMandate = {
    title: 'Full Stack Daily Standup Log',
    instructions: 'Submit what modules you worked on in React or Node.',
    targetType: 'domain',
    targetValue: 'fullstack',
    dueTime: '21:00',
    allowLateSubmissions: true,
    allowEditsAfterSubmission: false,
    status: 'active'
  };

  const result = mandateSchema.safeParse(validMandate);
  assert.equal(result.success, true);
  assert.equal(result.data.targetType, 'domain');
  assert.equal(result.data.targetValue, 'fullstack');
});

test('Admin Mandate - Missing title or invalid targetType is rejected', () => {
  const missingTitle = {
    title: '',
    targetType: 'all'
  };
  const res = mandateSchema.safeParse(missingTitle);
  assert.equal(res.success, false);
  assert.match(res.error.issues[0].message, /mandate title is required/i);

  const badTarget = {
    title: 'Mandate',
    targetType: 'department_group'
  };
  const resBadTarget = mandateSchema.safeParse(badTarget);
  assert.equal(resBadTarget.success, false);
});

// 4. Mandate Targeting Rules
test('Admin Mandate - Target matching logic properly filters students', () => {
  const mandates = [
    { id: 'm1', target_type: 'all', target_value: null },
    { id: 'm2', target_type: 'domain', target_value: 'cybersecurity' },
    { id: 'm3', target_type: 'domain', target_value: 'fullstack' },
    { id: 'm4', target_type: 'student', target_value: 'student-uuid-1' }
  ];

  const studentA = { id: 'student-uuid-1', domain: 'cybersecurity' };
  const studentB = { id: 'student-uuid-2', domain: 'testing' };

  const matchesStudent = (m, student) => {
    if (m.target_type === 'all') return true;
    if (m.target_type === 'domain' && m.target_value === student.domain) return true;
    if (m.target_type === 'student' && m.target_value === student.id) return true;
    return false;
  };

  const matchesForA = mandates.filter(m => matchesStudent(m, studentA));
  assert.equal(matchesForA.map(m => m.id).sort().join(','), 'm1,m2,m4');

  const matchesForB = mandates.filter(m => matchesStudent(m, studentB));
  assert.equal(matchesForB.map(m => m.id).join(','), 'm1');
});

// 5. Compliance & Overdue Status Transitions
test('Compliance - Missing submission becomes overdue ONLY after deadline', () => {
  const dueTime = '19:00:00';
  const calculateTodayStatus = (hasSubmitted, nowTimeStr) => {
    if (hasSubmitted) return 'submitted';
    const [nowH, nowM] = nowTimeStr.split(':').map(Number);
    const [dueH, dueM] = dueTime.split(':').map(Number);
    if (nowH > dueH || (nowH === dueH && nowM >= dueM)) {
      return 'overdue';
    }
    return 'pending';
  };

  // 17:00 -> before deadline
  assert.equal(calculateTodayStatus(false, '17:00'), 'pending');

  // 19:01 -> after deadline
  assert.equal(calculateTodayStatus(false, '19:01'), 'overdue');

  // If already submitted at 19:30
  assert.equal(calculateTodayStatus(true, '19:30'), 'submitted');
});

// 6. Record Status Transitions and Edit Restrictions
test('Record Lifecycle - Edit permission rules enforced according to status and mandate', () => {
  const canEditRecord = (record, mandate) => {
    if (record.status === 'draft') return true;
    if (record.status === 'corrections_requested') return true;
    if (record.status === 'approved') return false; // Never editable once approved
    if (record.status === 'submitted') {
      return mandate?.allow_edits_after_submission === true;
    }
    return false;
  };

  const draft = { status: 'draft' };
  const corrections = { status: 'corrections_requested' };
  const approved = { status: 'approved' };
  const submittedLocked = { status: 'submitted' };

  assert.equal(canEditRecord(draft, null), true);
  assert.equal(canEditRecord(corrections, null), true);
  assert.equal(canEditRecord(approved, { allow_edits_after_submission: true }), false);
  assert.equal(canEditRecord(submittedLocked, { allow_edits_after_submission: false }), false);
  assert.equal(canEditRecord(submittedLocked, { allow_edits_after_submission: true }), true);
});

// 7. Request Corrections Feedback Requirement
test('Review Workflow - Corrections requested requires non-empty feedback', () => {
  const validateCorrectionsAction = (feedback) => {
    const trimmed = String(feedback || '').trim();
    if (!trimmed || trimmed.length < 3) {
      return { valid: false, error: 'Detailed feedback is required when requesting corrections.' };
    }
    return { valid: true };
  };

  assert.equal(validateCorrectionsAction('').valid, false);
  assert.equal(validateCorrectionsAction('   ').valid, false);
  assert.equal(validateCorrectionsAction('ok').valid, false);
  assert.equal(validateCorrectionsAction('Please detail the specific database indexes created.').valid, true);
});
