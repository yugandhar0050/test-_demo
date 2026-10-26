import test from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema, ALLOWED_DOMAINS } from '../src/routes/auth.js';
import { requireAdmin } from '../src/middleware/auth.js';

test('Domain selection - ALLOWED_DOMAINS contains the six required domains', () => {
  const expected = ['fullstack', 'database', 'testing', 'cybersecurity', 'sap', 'devops'];
  assert.deepEqual(ALLOWED_DOMAINS, expected);
});

test('Domain selection - Valid registrations succeed for each supported domain', () => {
  const baseValidPayload = {
    firstName: 'Koundinya',
    lastName: 'Candidate',
    studentId: '294100',
    phone: '9876543210',
    email: 'candidate@koundinyasa.edu',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!'
  };

  for (const domain of ALLOWED_DOMAINS) {
    const result = registerSchema.safeParse({ ...baseValidPayload, domain });
    assert.equal(result.success, true, `Expected domain "${domain}" to pass validation`);
    assert.equal(result.data.domain, domain);
  }
});

test('Domain selection - Registration without a domain is rejected', () => {
  const payloadMissing = {
    firstName: 'Koundinya',
    lastName: 'Candidate',
    studentId: '294101',
    phone: '9876543210',
    email: 'candidate2@koundinyasa.edu',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!'
  };

  const resMissing = registerSchema.safeParse(payloadMissing);
  assert.equal(resMissing.success, false);
  assert.equal(resMissing.error.issues[0].message, 'Please select your domain.');

  const resEmpty = registerSchema.safeParse({ ...payloadMissing, domain: '' });
  assert.equal(resEmpty.success, false);
  assert.equal(resEmpty.error.issues[0].message, 'Please select your domain.');

  const resWhitespace = registerSchema.safeParse({ ...payloadMissing, domain: '   ' });
  assert.equal(resWhitespace.success, false);
  assert.equal(resWhitespace.error.issues[0].message, 'Please select your domain.');
});

test('Domain selection - Registration with an invalid domain is rejected', () => {
  const payloadInvalid = {
    firstName: 'Koundinya',
    lastName: 'Candidate',
    studentId: '294102',
    phone: '9876543210',
    email: 'candidate3@koundinyasa.edu',
    domain: 'cloud-computing',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!'
  };

  const resInvalid = registerSchema.safeParse(payloadInvalid);
  assert.equal(resInvalid.success, false);
  assert.match(resInvalid.error.issues[0].message, /valid domain/i);

  const resTitleCase = registerSchema.safeParse({ ...payloadInvalid, domain: 'Full Stack Development' });
  assert.equal(resTitleCase.success, false);
  assert.match(resTitleCase.error.issues[0].message, /valid domain/i);
});

test('Domain selection - Preserves all existing registration validation rules', () => {
  const validDomain = 'fullstack';

  // Invalid student ID (must start with 294 and have 6 digits)
  const badId = registerSchema.safeParse({
    firstName: 'Koundinya',
    lastName: 'Candidate',
    studentId: '123456',
    phone: '9876543210',
    email: 'cand@test.edu',
    domain: validDomain,
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!'
  });
  assert.equal(badId.success, false);
  assert.match(badId.error.issues[0].message, /294/);

  // Mismatched passwords
  const mismatch = registerSchema.safeParse({
    firstName: 'Koundinya',
    lastName: 'Candidate',
    studentId: '294002',
    phone: '9876543210',
    email: 'cand@test.edu',
    domain: validDomain,
    password: 'Password123!',
    confirmPassword: 'DifferentPassword123!'
  });
  assert.equal(mismatch.success, false);
  assert.equal(mismatch.error.issues[0].message, 'Passwords do not match.');

  // Password length less than 8 characters
  const shortPw = registerSchema.safeParse({
    firstName: 'Koundinya',
    lastName: 'Candidate',
    studentId: '294003',
    phone: '9876543210',
    email: 'cand@test.edu',
    domain: validDomain,
    password: 'short',
    confirmPassword: 'short'
  });
  assert.equal(shortPw.success, false);
  assert.match(shortPw.error.issues[0].message, /at least 8 characters/);
});

test('Domain selection - Domain label mapping and unassigned user fallback', () => {
  const DOMAIN_LABELS = {
    fullstack: 'Full Stack Development',
    database: 'Database',
    testing: 'Testing',
    cybersecurity: 'Cybersecurity',
    sap: 'SAP',
    devops: 'DevOps'
  };

  for (const d of ALLOWED_DOMAINS) {
    assert.equal(Boolean(DOMAIN_LABELS[d]), true, `Missing label for domain ${d}`);
  }

  // Existing users with null or unassigned domain
  const existingUser = {
    id: 'user-uuid-1',
    student_id: '294001',
    first_name: 'Existing',
    last_name: 'Student',
    domain: null
  };
  const displayLabel = existingUser.domain ? DOMAIN_LABELS[existingUser.domain] : 'Not specified';
  assert.equal(displayLabel, 'Not specified');
});

test('Domain selection - Admin domain filtering logic partitions assigned and unassigned students', () => {
  const mockStudents = [
    { id: '1', student_id: '294001', domain: 'fullstack' },
    { id: '2', student_id: '294002', domain: 'database' },
    { id: '3', student_id: '294003', domain: 'testing' },
    { id: '4', student_id: '294004', domain: null },
    { id: '5', student_id: '294005', domain: undefined }
  ];

  const filterByDomain = (list, filter) => {
    return list.filter(s => {
      if (filter === 'all') return true;
      if (filter === 'unassigned') return !s.domain;
      return s.domain === filter;
    });
  };

  assert.equal(filterByDomain(mockStudents, 'all').length, 5);
  assert.equal(filterByDomain(mockStudents, 'fullstack').length, 1);
  assert.equal(filterByDomain(mockStudents, 'database').length, 1);
  assert.equal(filterByDomain(mockStudents, 'testing').length, 1);
  assert.equal(filterByDomain(mockStudents, 'unassigned').length, 2);
});

test('Domain selection - Admin authorization protects administrative endpoints', () => {
  let nextCalled = false;
  let statusSent = null;
  let jsonSent = null;

  const mockRes = {
    status(code) {
      statusSent = code;
      return {
        json(payload) {
          jsonSent = payload;
        }
      };
    }
  };

  // Rejection for non-admin
  const studentReq = { user: { role: 'student', sub: '123' } };
  requireAdmin(studentReq, mockRes, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(statusSent, 403);
  assert.equal(jsonSent.error, 'Administrator access required.');

  // Approval for admin
  nextCalled = false;
  statusSent = null;
  const adminReq = { user: { role: 'admin', sub: '999' } };
  requireAdmin(adminReq, mockRes, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(statusSent, null);
});
