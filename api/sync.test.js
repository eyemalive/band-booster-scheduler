import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, COOKIE_NAME } from './auth.js';
import handler from './sync.js';

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
    end() { return this; },
  };
  return res;
}

function req({ method = 'POST', body = {}, cookie, proto = 'https', query = {} } = {}) {
  return {
    method,
    body,
    query,
    headers: {
      cookie: cookie || '',
      'x-forwarded-proto': proto,
    },
  };
}

test('unauthenticated load is rejected', async () => {
  process.env.APPS_SCRIPT_URL = 'https://script.example/exec';
  process.env.API_KEY = 'key';
  const res = mockRes();
  await handler(req({ body: { action: 'load', tab: 'AppData' } }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.ok, false);
});

test('unauthenticated getPasswords is rejected', async () => {
  process.env.APPS_SCRIPT_URL = 'https://script.example/exec';
  process.env.API_KEY = 'key';
  const res = mockRes();
  await handler(req({ body: { action: 'getPasswords' } }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.ok, false);
});

test('unauthenticated diag is rejected', async () => {
  process.env.APPS_SCRIPT_URL = 'https://script.example/exec';
  process.env.API_KEY = 'key';
  const res = mockRes();
  await handler(req({ method: 'GET', query: { diag: '1' } }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.ok, false);
});

test('login sets httpOnly cookie and does not return passwords', async () => {
  process.env.APPS_SCRIPT_URL = 'https://script.example/exec';
  process.env.API_KEY = 'key';
  mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    async text() {
      return JSON.stringify({ ok: true, role: 'admin' });
    },
  }));
  const res = mockRes();
  await handler(req({ body: { action: 'login', password: 'secret' } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.role, 'admin');
  assert.equal(res.body.passwords, undefined);
  assert.match(res.headers['Set-Cookie'], new RegExp(`^${COOKIE_NAME}=`));
  assert.match(res.headers['Set-Cookie'], /HttpOnly/);
  mock.restoreAll();
});

test('AppPasswords tab cannot be loaded even when signed in', async () => {
  process.env.APPS_SCRIPT_URL = 'https://script.example/exec';
  process.env.API_KEY = 'key';
  const token = createSessionToken('admin', 'key');
  const res = mockRes();
  await handler(req({
    body: { action: 'load', tab: 'AppPasswords' },
    cookie: `${COOKIE_NAME}=${token}`,
  }), res);
  assert.equal(res.statusCode, 403);
});

test('non-admin cannot save passwords', async () => {
  process.env.APPS_SCRIPT_URL = 'https://script.example/exec';
  process.env.API_KEY = 'key';
  const token = createSessionToken('logistics', 'key');
  const res = mockRes();
  await handler(req({
    body: { action: 'savePasswords', payload: { logistics: 'newpass' } },
    cookie: `${COOKIE_NAME}=${token}`,
  }), res);
  assert.equal(res.statusCode, 403);
});

test('session returns role for valid cookie', async () => {
  process.env.APPS_SCRIPT_URL = 'https://script.example/exec';
  process.env.API_KEY = 'key';
  const token = createSessionToken('general', 'key');
  const res = mockRes();
  await handler(req({
    body: { action: 'session' },
    cookie: `${COOKIE_NAME}=${token}`,
  }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, role: 'general' });
});
