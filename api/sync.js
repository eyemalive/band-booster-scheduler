// Vercel serverless proxy — forwards authenticated requests to Google Apps Script.
// Login is checked here so the Apps Script API key never authorizes anonymous browser calls.

import {
  ALLOWED_ROLES,
  cookieHeader,
  createSessionToken,
  isSecureRequest,
  matchRole,
  roleStatus,
  sanitizePasswordUpdates,
  sessionFromRequest,
  tabAllowed,
} from './auth.js';

export const config = {
  api: {
    bodyParser: true,
  },
};

async function gsCall(url, apiKey, { action, payload, tab }) {
  const params = new URLSearchParams();
  params.append('action', action);
  params.append('key', apiKey);
  if (tab) params.append('tab', tab);
  if (payload !== undefined) {
    params.append('payload', typeof payload === 'string' ? payload : JSON.stringify(payload));
  }

  const gsRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    redirect: 'follow',
  });

  if (!gsRes.ok) {
    const text = await gsRes.text().catch(() => '');
    const err = new Error(`Apps Script returned HTTP ${gsRes.status}. Response: ${text.slice(0, 200)}`);
    err.status = 502;
    throw err;
  }

  const text = await gsRes.text();
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error(`Apps Script returned non-JSON: ${text.slice(0, 200)}`);
    err.status = 502;
    throw err;
  }
}

function json(res, status, body, extraHeaders = {}) {
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function setSessionCookie(req, res, role, secret) {
  const token = createSessionToken(role, secret);
  res.setHeader('Set-Cookie', cookieHeader(token, { secure: isSecureRequest(req) }));
}

function clearSessionCookie(req, res) {
  res.setHeader('Set-Cookie', cookieHeader('', { secure: isSecureRequest(req), clear: true }));
}

async function loginWithAppsScript(url, apiKey, password) {
  const checked = await gsCall(url, apiKey, { action: 'checkPassword', payload: password });
  if (checked && checked.ok && ALLOWED_ROLES.includes(checked.role)) {
    return checked.role;
  }
  if (checked && checked.error && /unknown action/i.test(checked.error)) {
    const data = await gsCall(url, apiKey, { action: 'getPasswords' });
    if (!data.ok) {
      const err = new Error(data.error || 'Failed to verify password');
      err.status = 502;
      throw err;
    }
    return matchRole(data.passwords || {}, password);
  }
  return null;
}

async function passwordStatusWithAppsScript(url, apiKey) {
  const status = await gsCall(url, apiKey, { action: 'passwordStatus' });
  if (status && status.ok && status.roles) return status.roles;
  if (status && status.error && /unknown action/i.test(status.error)) {
    const data = await gsCall(url, apiKey, { action: 'getPasswords' });
    if (!data.ok) {
      const err = new Error(data.error || 'Failed to load password status');
      err.status = 502;
      throw err;
    }
    return roleStatus(data.passwords || {});
  }
  if (status && status.ok === false) {
    const err = new Error(status.error || 'Failed to load password status');
    err.status = 502;
    throw err;
  }
  return roleStatus({});
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  const API_KEY = process.env.API_KEY;
  const SESSION_SECRET = process.env.SESSION_SECRET || API_KEY;

  let action, payload, tab, password;
  if (req.method === 'GET') {
    action = req.query.action || (req.query.diag ? 'diag' : '');
    payload = req.query.payload;
    tab = req.query.tab;
  } else {
    const body = req.body || {};
    action = body.action;
    payload = body.payload;
    tab = body.tab;
    password = body.password;
  }

  if (!action) return json(res, 400, { ok: false, error: 'No action specified.' });

  // Login is the only unauthenticated action. It never returns password values.
  if (action === 'login') {
    if (req.method !== 'POST') {
      return json(res, 405, { ok: false, error: 'Login must be POST.' });
    }
    if (!APPS_SCRIPT_URL || !API_KEY) {
      return json(res, 500, { ok: false, error: 'Server is not configured.' });
    }
    if (!password || typeof password !== 'string') {
      return json(res, 400, { ok: false, error: 'Password required.' });
    }
    try {
      const role = await loginWithAppsScript(APPS_SCRIPT_URL, API_KEY, password);
      if (!role) return json(res, 401, { ok: false, error: 'Incorrect password.' });
      setSessionCookie(req, res, role, SESSION_SECRET);
      return json(res, 200, { ok: true, role });
    } catch (err) {
      return json(res, err.status || 500, { ok: false, error: err.message });
    }
  }

  if (action === 'logout') {
    clearSessionCookie(req, res);
    return json(res, 200, { ok: true });
  }

  if (!APPS_SCRIPT_URL || !API_KEY) {
    return json(res, 500, { ok: false, error: 'Server is not configured.' });
  }

  const session = sessionFromRequest(req, SESSION_SECRET);

  if (action === 'session') {
    if (!session) return json(res, 200, { ok: false });
    return json(res, 200, { ok: true, role: session.role });
  }

  if (!session) {
    return json(res, 401, { ok: false, error: 'Not signed in.' });
  }

  const role = session.role;

  try {
    if (action === 'diag') {
      return json(res, 200, {
        ok: true,
        configured: true,
        hasUrl: true,
        hasKey: true,
      });
    }

    if (action === 'passwordStatus' || action === 'getPasswords') {
      if (role !== 'admin') return json(res, 403, { ok: false, error: 'Admin only.' });
      const roles = await passwordStatusWithAppsScript(APPS_SCRIPT_URL, API_KEY);
      return json(res, 200, { ok: true, roles });
    }

    if (action === 'savePasswords') {
      if (role !== 'admin') return json(res, 403, { ok: false, error: 'Admin only.' });
      const updates = sanitizePasswordUpdates(payload);
      if (!Object.keys(updates).length) {
        return json(res, 400, { ok: false, error: 'No password updates provided.' });
      }
      // Old Apps Script replaced A1 wholesale, so merge here when it still
      // returns stored secrets. New script merges and hashes on its own.
      let savePayload = updates;
      const current = await gsCall(APPS_SCRIPT_URL, API_KEY, { action: 'getPasswords' });
      if (current && current.ok && current.passwords && typeof current.passwords === 'object') {
        savePayload = { ...current.passwords, ...updates };
      }
      const data = await gsCall(APPS_SCRIPT_URL, API_KEY, { action: 'savePasswords', payload: savePayload });
      if (data.ok === false) return json(res, 502, data);
      return json(res, 200, { ok: true });
    }

    if (action === 'load' || action === 'save') {
      const tabName = tab || 'AppData';
      if (!tabAllowed(role, tabName)) {
        return json(res, 403, { ok: false, error: 'That data is not available through this API.' });
      }
      const data = await gsCall(APPS_SCRIPT_URL, API_KEY, { action, payload, tab: tabName });
      if (data.ok === false) return json(res, 502, data);
      return json(res, 200, data);
    }

    return json(res, 400, { ok: false, error: 'Unknown action.' });
  } catch (err) {
    return json(res, err.status || 500, { ok: false, error: `Proxy error: ${err.message}` });
  }
}
