import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, COOKIE_NAME } from './auth.js';
import { gunzipBase64 } from './sheet-blob.js';
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

test('save of a 50k+ blob gzips the Apps Script payload', async () => {
  process.env.APPS_SCRIPT_URL = 'https://script.example/exec';
  process.env.API_KEY = 'key';
  const sent = [];
  mock.method(globalThis, 'fetch', async (_url, opts) => {
    const params = new URLSearchParams(opts.body);
    sent.push(params);
    if (params.get('action') === 'ping') {
      return { ok: true, async text() { return JSON.stringify({ ok: true, version: 3, cellChunk: 49000 }); } };
    }
    return { ok: true, async text() { return JSON.stringify({ ok: true, chunks: 2, version: 3 }); } };
  });
  const token = createSessionToken('logistics', 'key');
  const payload = { notes: 'x'.repeat(50129) };
  const res = mockRes();
  await handler(req({
    body: { action: 'save', tab: 'AppData', payload },
    cookie: `${COOKIE_NAME}=${token}`,
  }), res);
  assert.equal(res.statusCode, 200);
  const saveReq = sent.find((p) => p.get('action') === 'save');
  assert.ok(saveReq);
  assert.equal(saveReq.get('encoding'), 'gzip-b64');
  assert.deepEqual(JSON.parse(gunzipBase64(saveReq.get('payload'))), payload);
  mock.restoreAll();
});

test('HTML Apps Script response becomes a 502 with a deploy hint', async () => {
  process.env.APPS_SCRIPT_URL = 'https://script.example/exec';
  process.env.API_KEY = 'key';
  mock.method(globalThis, 'fetch', async (_url, opts) => {
    const params = new URLSearchParams(opts.body);
    if (params.get('action') === 'ping') {
      return { ok: true, async text() { return JSON.stringify({ ok: true, version: 3 }); } };
    }
    return {
      ok: true,
      async text() {
        return `<!DOCTYPE html><html><head><script nonce="abc">window['ppConfig'] = {productName: '26981ed0d57bbad37e728ff58134270c', sealIsEnforced: false}`;
      },
    };
  });
  const token = createSessionToken('logistics', 'key');
  const res = mockRes();
  await handler(req({
    body: { action: 'save', tab: 'AppData', payload: { notes: 'x'.repeat(50129) } },
    cookie: `${COOKIE_NAME}=${token}`,
  }), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, false);
  assert.match(res.body.error, /HTML error page/);
  assert.match(res.body.error, /archived/);
  assert.match(res.body.error, /Anyone/);
  mock.restoreAll();
});

test('large save reports a dead web app when ping returns HTML', async () => {
  process.env.APPS_SCRIPT_URL = 'https://script.example/exec';
  process.env.API_KEY = 'key';
  mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    async text() {
      return `<!DOCTYPE html><html><head><script>window['ppConfig'] = {sealIsEnforced: false}`;
    },
  }));
  const token = createSessionToken('logistics', 'key');
  const res = mockRes();
  await handler(req({
    body: { action: 'save', tab: 'AppData', payload: { notes: 'x'.repeat(50129) } },
    cookie: `${COOKIE_NAME}=${token}`,
  }), res);
  assert.equal(res.statusCode, 502);
  assert.match(res.body.error, /never ran the web app/);
  assert.match(res.body.error, /archived/);
  assert.doesNotMatch(res.body.error, /still an old version/);
  mock.restoreAll();
});

test('large save is blocked when Apps Script does not support ping', async () => {
  process.env.APPS_SCRIPT_URL = 'https://script.example/exec';
  process.env.API_KEY = 'key';
  mock.method(globalThis, 'fetch', async (_url, opts) => {
    const params = new URLSearchParams(opts.body);
    if (params.get('action') === 'ping') {
      return { ok: true, async text() { return JSON.stringify({ ok: false, error: 'Unknown action: ping' }); } };
    }
    throw new Error('save should not be forwarded to an old Apps Script');
  });
  const token = createSessionToken('logistics', 'key');
  const res = mockRes();
  await handler(req({
    body: { action: 'save', tab: 'AppData', payload: { notes: 'x'.repeat(50119) } },
    cookie: `${COOKIE_NAME}=${token}`,
  }), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, false);
  assert.match(res.body.error, /JSON is valid \(501\d+ characters\)/);
  assert.match(res.body.error, /Unknown action: ping/);
  assert.match(res.body.error, /New version/);
  assert.doesNotMatch(res.body.error, /Payload is not valid JSON/);
  mock.restoreAll();
});

test('diag reports Apps Script backend version from ping', async () => {
  process.env.APPS_SCRIPT_URL = 'https://script.example/exec';
  process.env.API_KEY = 'key';
  mock.method(globalThis, 'fetch', async (_url, opts) => {
    const params = new URLSearchParams(opts.body);
    assert.equal(params.get('action'), 'ping');
    return { ok: true, async text() { return JSON.stringify({ ok: true, version: 3, cellChunk: 49000 }); } };
  });
  const token = createSessionToken('logistics', 'key');
  const res = mockRes();
  await handler(req({
    body: { action: 'diag' },
    cookie: `${COOKIE_NAME}=${token}`,
  }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.backendVersion, 3);
  assert.equal(res.body.requiredBackendVersion, 3);
  mock.restoreAll();
});
