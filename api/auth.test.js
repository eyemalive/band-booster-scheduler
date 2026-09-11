import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  signToken, verifyToken, createSessionToken, parseCookies,
  passwordMatches, matchRole, roleStatus, sanitizePasswordUpdates,
  tabAllowed, cookieHeader, COOKIE_NAME, sha256Hex,
} from './auth.js';

const SECRET = 'test-secret-key';

test('sign and verify round-trip', () => {
  const token = createSessionToken('admin', SECRET);
  const payload = verifyToken(token, SECRET);
  assert.equal(payload.role, 'admin');
  assert.ok(payload.exp > Date.now() / 1000);
});

test('rejects tampered token', () => {
  const token = createSessionToken('admin', SECRET);
  const bad = token.slice(0, -2) + 'xx';
  assert.equal(verifyToken(bad, SECRET), null);
});

test('rejects wrong secret', () => {
  const token = createSessionToken('logistics', SECRET);
  assert.equal(verifyToken(token, 'other'), null);
});

test('rejects expired token', () => {
  const token = signToken({ role: 'admin', exp: 1 }, SECRET);
  assert.equal(verifyToken(token, SECRET), null);
});

test('rejects unknown role', () => {
  const token = signToken({ role: 'root', exp: Date.now() / 1000 + 3600 }, SECRET);
  assert.equal(verifyToken(token, SECRET), null);
});

test('parseCookies', () => {
  const cookies = parseCookies(`${COOKIE_NAME}=abc; other=1`);
  assert.equal(cookies[COOKIE_NAME], 'abc');
  assert.equal(cookies.other, '1');
});

test('cookieHeader sets HttpOnly session cookie', () => {
  const header = cookieHeader('tok', { secure: true });
  assert.match(header, new RegExp(`^${COOKIE_NAME}=tok;`));
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /Secure/);
  assert.doesNotMatch(header, /Max-Age/);
});

test('cookieHeader clear', () => {
  assert.match(cookieHeader('', { clear: true }), /Max-Age=0/);
});

test('passwordMatches plaintext and hashed', () => {
  assert.equal(passwordMatches('secret', 'secret'), true);
  assert.equal(passwordMatches('secret', 'nope'), false);
  const hashed = 'sha256:' + sha256Hex('secret');
  assert.equal(passwordMatches(hashed, 'secret'), true);
  assert.equal(passwordMatches(hashed, 'nope'), false);
});

test('matchRole first-match order', () => {
  const passwords = { logistics: 'same', general: 'same', admin: 'adminpw' };
  assert.equal(matchRole(passwords, 'same'), 'logistics');
  assert.equal(matchRole(passwords, 'adminpw'), 'admin');
  assert.equal(matchRole(passwords, 'missing'), null);
});

test('roleStatus never includes password values', () => {
  const status = roleStatus({ logistics: 'x', general: '', admin: 'sha256:abc' });
  assert.deepEqual(status, { logistics: true, general: false, admin: true });
  assert.equal(JSON.stringify(status).includes('sha256'), false);
});

test('sanitizePasswordUpdates only allows known roles with values', () => {
  const out = sanitizePasswordUpdates({ logistics: 'newpw', extra: 'no', admin: '', general: 'ok' });
  assert.deepEqual(out, { logistics: 'newpw', general: 'ok' });
});

test('tabAllowed blocks AppPasswords', () => {
  assert.equal(tabAllowed('admin', 'AppData'), true);
  assert.equal(tabAllowed('admin', 'AppPasswords'), false);
  assert.equal(tabAllowed('logistics', 'AppDataGeneral'), true);
});
