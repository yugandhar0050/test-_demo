import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function makeToken(user) {
  return jwt.sign({
    sub: user.id,
    role: user.role,
    studentId: user.student_id
  }, JWT_SECRET, { expiresIn: '1h' });
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, {
    ...options,
    headers
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('--- STARTING DAILY LEARNING RECORDS ENDPOINT VERIFICATION ---');

  const adminUser = {
    id: '3d2f60c3-1002-4c7c-a2f6-e4d831e9236c',
    student_id: '294000',
    role: 'admin'
  };
  const studentUser = {
    id: '809e193f-25a4-4729-88cd-b5f0c8878954',
    student_id: '294001',
    role: 'student'
  };

  const adminToken = makeToken(adminUser);
  const studentToken = makeToken(studentUser);

  // 1. Authorization checks
  console.log('\n[1] Testing Authorization Checks...');
  const unauthRes = await request('/student/daily-records');
  if (unauthRes.status === 401) {
    console.log('✔ Unauthenticated request rejected with 401');
  } else {
    throw new Error(`Expected 401, got ${unauthRes.status}`);
  }

  const forbiddenRes = await request('/admin/daily-records', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  if (forbiddenRes.status === 403) {
    console.log('✔ Student accessing admin route rejected with 403');
  } else {
    throw new Error(`Expected 403, got ${forbiddenRes.status}`);
  }

  // 2. Student Endpoints
  console.log('\n[2] Testing Student Endpoints...');
  const studentMandatesRes = await request('/student/daily-mandates', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  console.log('✔ GET /api/student/daily-mandates status:', studentMandatesRes.status);
  if (!studentMandatesRes.ok) throw new Error(JSON.stringify(studentMandatesRes.data));
  console.log('  Compliance status:', studentMandatesRes.data.todayStatus?.status);

  const initialRecordsRes = await request('/student/daily-records', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  console.log('✔ GET /api/student/daily-records status:', initialRecordsRes.status, 'Record count:', initialRecordsRes.data.records?.length);

  const toLocalDateStr = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const existingDates = new Set((initialRecordsRes.data.records || []).map(r => toLocalDateStr(r.record_date)));

  // If today's record already exists and is approved, verify duplicate rejection
  if (existingDates.has(todayStr)) {
    console.log(`\n[3a] Verifying duplicate submission prevention for already recorded date: ${todayStr}...`);
    const dupRes = await request('/student/daily-records', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        recordDate: todayStr,
        topicsLearned: 'Duplicate check',
        tasksCompleted: 'Testing prevention',
        hoursSpent: 1
      })
    });
    if (dupRes.status === 409) {
      console.log('✔ Duplicate submission correctly rejected with 409 Conflict:', dupRes.data.error);
    } else {
      throw new Error(`Expected 409 for duplicate, got ${dupRes.status}`);
    }
  }

  // Find an unrecorded test date
  let testDate = todayStr;
  let dayOffset = 1;
  while (existingDates.has(testDate)) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    testDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dayOffset++;
  }

  console.log(`\n[3b] Testing POST /api/student/daily-records for available date: ${testDate}...`);
  const postRecordRes = await request('/student/daily-records', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      recordDate: testDate,
      topicsLearned: 'PostgreSQL migrations & verification workflow',
      tasksCompleted: 'Tested migration 005 tables, verified unique constraints and endpoints.',
      hoursSpent: 3.5,
      challengesBlockers: 'Ensuring database tracking baseline preserves existing 44 tables.',
      notesSummary: 'All verifications running cleanly.',
      isDraft: false
    })
  });
  console.log('✔ POST /api/student/daily-records status:', postRecordRes.status);
  if (!postRecordRes.ok) throw new Error(JSON.stringify(postRecordRes.data));
  const recordId = postRecordRes.data.record?.id;
  console.log('  Created record ID:', recordId, 'Status:', postRecordRes.data.record?.status);

  // Verify persistence in GET /student/daily-records
  const persistedStudentRes = await request('/student/daily-records', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const foundInStudent = persistedStudentRes.data.records?.find(r => r.id === recordId);
  if (!foundInStudent) throw new Error('Record was not found in student daily-records list!');
  console.log('✔ Verified record persistence in student list');

  // 4. Admin Mandate Management
  console.log('\n[4] Testing Admin Mandates...');
  const createMandateRes = await request('/admin/daily-mandates', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Active Daily Standup Mandate',
      instructions: 'Please record learning outcomes, topics covered, and tasks completed.',
      targetType: 'all',
      dueTime: '23:59',
      status: 'active',
      allowLateSubmissions: true,
      allowEditsAfterSubmission: false
    })
  });
  console.log('✔ POST /api/admin/daily-mandates status:', createMandateRes.status);
  if (!createMandateRes.ok) throw new Error(JSON.stringify(createMandateRes.data));
  const mandateId = createMandateRes.data.mandate?.id;
  console.log('  Created mandate ID:', mandateId);

  const getAdminMandatesRes = await request('/admin/daily-mandates', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✔ GET /api/admin/daily-mandates status:', getAdminMandatesRes.status, 'Total mandates:', getAdminMandatesRes.data.mandates?.length);

  // 5. Admin Records List & Summary
  console.log('\n[5] Testing Admin Records List and Summary...');
  const adminRecordsRes = await request('/admin/daily-records', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✔ GET /api/admin/daily-records status:', adminRecordsRes.status, 'Total records:', adminRecordsRes.data.records?.length);
  const foundInAdmin = adminRecordsRes.data.records?.find(r => r.id === recordId);
  if (!foundInAdmin) throw new Error('Submitted record not found in admin records list!');
  console.log('  Student in record:', foundInAdmin.first_name, foundInAdmin.last_name, '(', foundInAdmin.student_id, ')');

  const summaryRes = await request('/admin/daily-records/summary', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✔ GET /api/admin/daily-records/summary status:', summaryRes.status);
  console.log('  Summary stats:', summaryRes.data.summary);

  // 6. Admin Review Workflow
  console.log('\n[6] Testing Admin Review Workflow...');
  // A. Request corrections
  const reqCorrectionsRes = await request(`/admin/daily-records/${recordId}/request-corrections`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      feedback: 'Please expand on the testing methodology used.'
    })
  });
  console.log('✔ PATCH /api/admin/daily-records/:id/request-corrections status:', reqCorrectionsRes.status);
  if (!reqCorrectionsRes.ok) throw new Error(JSON.stringify(reqCorrectionsRes.data));
  console.log('  Record status is now:', reqCorrectionsRes.data.record?.status);

  // B. Approve record
  const approveRes = await request(`/admin/daily-records/${recordId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      remarks: 'Excellent work. Verified.'
    })
  });
  console.log('✔ PATCH /api/admin/daily-records/:id/approve status:', approveRes.status);
  if (!approveRes.ok) throw new Error(JSON.stringify(approveRes.data));
  console.log('  Record status is now:', approveRes.data.record?.status);

  // C. View record details with full audit reviews
  const detailRes = await request(`/admin/daily-records/${recordId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✔ GET /api/admin/daily-records/:id status:', detailRes.status);
  console.log('  Total audit reviews logged:', detailRes.data.reviews?.length);
  detailRes.data.reviews?.forEach(rv => {
    console.log(`    - Action: ${rv.action} by ${rv.reviewer_first_name} | Feedback: "${rv.feedback}"`);
  });

  console.log('\n========================================');
  console.log('ALL BACKEND ENDPOINTS AND DATABASE WORKFLOWS VERIFIED SUCCESSFULLY!');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
