import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const studentUser = {
  id: '809e193f-25a4-4729-88cd-b5f0c8878954',
  student_id: '294001',
  role: 'student'
};
const studentToken = jwt.sign({
  sub: studentUser.id,
  role: studentUser.role,
  studentId: studentUser.student_id
}, JWT_SECRET, { expiresIn: '1h' });

async function testHoursAPI() {
  console.log('Testing Hours Values on Backend API & Database:');

  const testCases = [
    { value: 2, expectedValid: true },
    { value: 4, expectedValid: true },
    { value: 1.5, expectedValid: true },
    { value: 2.3, expectedValid: true },
    { value: 3.75, expectedValid: true },
    { value: 0.1, expectedValid: true },
    { value: 0, expectedValid: false },
    { value: 24, expectedValid: true },
    { value: 24.1, expectedValid: false }
  ];

  for (const tc of testCases) {
    // Generate a distinct date far in the past to avoid colliding with real dates
    const res = await fetch(`${BASE_URL}/student/daily-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        recordDate: '2025-01-01',
        topicsLearned: 'API Hours Verification',
        tasksCompleted: 'Tested hours value ' + tc.value,
        hoursSpent: tc.value,
        isDraft: true
      })
    });

    const body = await res.json().catch(() => ({}));

    if (tc.expectedValid) {
      if (res.status === 200 || res.status === 201) {
        console.log(`✔ Value ${tc.value} accepted with status ${res.status} (hours_spent in DB: ${body.record?.hours_spent})`);
      } else {
        console.error(`✘ Expected valid for ${tc.value}, got status ${res.status}:`, body);
        process.exit(1);
      }
    } else {
      if (res.status === 400) {
        console.log(`✔ Value ${tc.value} correctly rejected with 400 Bad Request: "${body.error}"`);
      } else {
        console.error(`✘ Expected 400 invalid for ${tc.value}, got status ${res.status}:`, body);
        process.exit(1);
      }
    }
  }

  // Also clean up or verify the test record for 2025-01-01
  const listRes = await fetch(`${BASE_URL}/student/daily-records`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const listBody = await listRes.json();
  const testRec = listBody.records?.find(r => r.record_date?.slice(0, 10) === '2025-01-01');
  if (testRec) {
    console.log(`✔ Final test record in DB: date=${testRec.record_date?.slice(0, 10)}, hours_spent=${testRec.hours_spent}, parsed=${Number(testRec.hours_spent)}`);
  }

  console.log('\nAll hours values verified successfully!');
}

testHoursAPI().catch(e => {
  console.error(e);
  process.exit(1);
});
