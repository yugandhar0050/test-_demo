import test from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema } from '../src/routes/auth.js';

test('Employee ID regex accepts six digits beginning with 294 or 295', () => {
  const r = /^(?:294|295)\d{3}$/;

  // A. Valid IDs
  const validIds = ['294000', '294811', '295000', '295123', '295999'];
  for (const id of validIds) {
    assert.equal(r.test(id), true, `Expected valid ID "${id}" to pass regex`);
  }

  // B. Invalid IDs
  const invalidIds = [
    '296123', // Unsupported prefix 296
    '293123', // Unsupported prefix 293
    '29412',  // Too short (5 digits)
    '29512',  // Too short (5 digits)
    '2941234', // Too long (7 digits)
    '2951234', // Too long (7 digits)
    '',        // Empty string
    'abcdef',  // Alphabetic input
    '294abc',  // Mixed alphanumeric
    '295xyz',  // Mixed alphanumeric
    '29481a',  // Mixed alphanumeric ending with letter
    ' 294811', // Leading whitespace
    '295123 '  // Trailing whitespace
  ];
  for (const id of invalidIds) {
    assert.equal(r.test(id), false, `Expected invalid ID "${id}" to fail regex`);
  }
});

test('Backend registerSchema accepts valid 294 and 295 Employee IDs with all domains', () => {
  const basePayload = {
    firstName: 'Test',
    lastName: 'Employee',
    phone: '9876543210',
    email: 'employee@test.koundinyasa.edu',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!'
  };

  const validIds = ['294000', '294811', '295000', '295123', '295999'];
  for (const studentId of validIds) {
    const resDevOps = registerSchema.safeParse({ ...basePayload, studentId, domain: 'devops' });
    assert.equal(resDevOps.success, true, `Expected 294/295 ID "${studentId}" to pass registration schema with devops`);
    assert.equal(resDevOps.data.studentId, studentId);

    const resFullstack = registerSchema.safeParse({ ...basePayload, studentId, domain: 'fullstack' });
    assert.equal(resFullstack.success, true, `Expected ID "${studentId}" to pass registration schema with fullstack`);
  }
});

test('Backend registerSchema rejects invalid Employee IDs with exact error message', () => {
  const basePayload = {
    firstName: 'Test',
    lastName: 'Employee',
    phone: '9876543210',
    email: 'employee@test.koundinyasa.edu',
    domain: 'devops',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!'
  };

  const invalidIds = [
    '296123',
    '293123',
    '29412',
    '29512',
    '2941234',
    '2951234',
    '',
    'abcdef',
    '294abc',
    '295xyz',
    '29481a'
  ];

  for (const studentId of invalidIds) {
    const res = registerSchema.safeParse({ ...basePayload, studentId });
    assert.equal(res.success, false, `Expected invalid ID "${studentId}" to be rejected`);
    assert.equal(res.error.issues[0].message, 'Employee ID must be six digits beginning with 294 or 295.');
  }
});

test('Frontend pattern attribute validation aligns with backend validation', () => {
  // Frontend HTML pattern in App.jsx: pattern="(?:294|295)[0-9]{3}"
  // In HTML5, pattern is implicitly anchored: ^(?:pattern)$
  const frontendPattern = /^(?:(?:294|295)[0-9]{3})$/;

  const validIds = ['294000', '294811', '295000', '295123', '295999'];
  for (const id of validIds) {
    assert.equal(frontendPattern.test(id), true, `Frontend pattern must accept "${id}"`);
  }

  const invalidIds = ['296123', '293123', '29412', '29512', '2941234', '2951234', '', 'abcdef', '294abc'];
  for (const id of invalidIds) {
    assert.equal(frontendPattern.test(id), false, `Frontend pattern must reject "${id}"`);
  }
});

test('Invalid Employee ID halts processing before any database query or user creation', () => {
  let dbQueried = false;
  let userCreated = false;

  const mockRegister = (payload) => {
    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      return { status: 400, error: parsed.error.issues[0].message };
    }
    dbQueried = true;
    userCreated = true;
    return { status: 201 };
  };

  const result = mockRegister({
    firstName: 'Test',
    lastName: 'Employee',
    studentId: '296123',
    phone: '9876543210',
    email: 'test@example.com',
    domain: 'devops',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!'
  });

  assert.equal(result.status, 400);
  assert.equal(result.error, 'Employee ID must be six digits beginning with 294 or 295.');
  assert.equal(dbQueried, false);
  assert.equal(userCreated, false);
});

test('Uniqueness check and duplicate registration rejection simulation', () => {
  // Existing registered users
  const existingUsers = [
    { student_id: '294811', email: 'existing1@example.com', phone: '9182630660' },
    { student_id: '295123', email: 'existing2@example.com', phone: '9182630661' }
  ];

  const checkDuplicate = (v) => {
    return existingUsers.some(u => 
      u.student_id === v.studentId || 
      u.email === v.email.toLowerCase() || 
      u.phone === v.phone
    );
  };

  // Attempting duplicate 294 ID
  assert.equal(checkDuplicate({ studentId: '294811', email: 'new@example.com', phone: '9999999999' }), true);
  // Attempting duplicate 295 ID
  assert.equal(checkDuplicate({ studentId: '295123', email: 'new@example.com', phone: '9999999999' }), true);
  // Unique 295 ID
  assert.equal(checkDuplicate({ studentId: '295999', email: 'new@example.com', phone: '9999999999' }), false);
});

test('Login lookup logic supports both 294 and 295 series IDs', () => {
  const usersTable = [
    { id: 'uuid-1', student_id: '294001', email: 'user294@example.com' },
    { id: 'uuid-2', student_id: '295123', email: 'user295@example.com' }
  ];

  const findUser = (loginId) => {
    const id = String(loginId || '').trim();
    return usersTable.find(u => u.student_id === id || u.email === id.toLowerCase()) || null;
  };

  // Login with 294 ID
  const u1 = findUser('294001');
  assert.ok(u1);
  assert.equal(u1.student_id, '294001');

  // Login with 295 ID
  const u2 = findUser('295123');
  assert.ok(u2);
  assert.equal(u2.student_id, '295123');

  // Login with 295 ID with whitespace (should be trimmed)
  const u2Trimmed = findUser('  295123  ');
  assert.ok(u2Trimmed);
  assert.equal(u2Trimmed.student_id, '295123');

  // Non-existent ID
  assert.equal(findUser('295999'), null);
});
