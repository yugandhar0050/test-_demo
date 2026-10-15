import test from 'node:test';import assert from 'node:assert/strict';
test('student ID format follows six digits beginning with 294',()=>{const r=/^294\d{3}$/;assert.equal(r.test('294001'),true);assert.equal(r.test('123001'),false);assert.equal(r.test('29401'),false)});
