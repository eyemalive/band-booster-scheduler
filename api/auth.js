// Session tokens and password helpers for the /api/sync proxy.
import crypto from 'crypto';

export const COOKIE_NAME = 'bbs_auth';
export const TOKEN_TTL_SEC = 12 * 60 * 60;
export const ALLOWED_ROLES = ['logistics', 'general', 'admin'];
export const DATA_TABS = ['AppData', 'AppDataGeneral', 'AppEvents', 'AppImportCategories'];

export function signToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || !secret) return null;
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object') return null;
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    if (!ALLOWED_ROLES.includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(role, secret) {
  const now = Math.floor(Date.now() / 1000);
  return signToken({ role, iat: now, exp: now + TOKEN_TTL_SEC }, secret);
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try { out[k] = decodeURIComponent(v); }
    catch { out[k] = v; }
  }
  return out;
}

export function sessionFromRequest(req, secret) {
  const cookies = parseCookies(req.headers?.cookie);
  return verifyToken(cookies[COOKIE_NAME], secret);
}

export function cookieHeader(token, { secure = false, clear = false } = {}) {
  const parts = [
    `${COOKIE_NAME}=${clear ? '' : encodeURIComponent(token || '')}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  if (clear) parts.push('Max-Age=0');
  return parts.join('; ');
}

export function isSecureRequest(req) {
  const proto = req.headers?.['x-forwarded-proto'] || '';
  return String(proto).split(',')[0].trim() === 'https';
}

export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a ?? '')).digest();
  const hb = crypto.createHash('sha256').update(String(b ?? '')).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function sha256Hex(s) {
  return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
}

export function passwordMatches(stored, submitted) {
  if (!stored || !submitted) return false;
  const value = String(stored);
  if (value.startsWith('sha256:')) {
    return safeEqual(value, 'sha256:' + sha256Hex(submitted));
  }
  return safeEqual(value, submitted);
}

// Check every stored role (constant-ish work) and return the first match in
// object insertion order — same as the previous client-side loop.
export function matchRole(passwords, submitted) {
  if (!passwords || typeof passwords !== 'object') return null;
  let matched = null;
  for (const [role, stored] of Object.entries(passwords)) {
    if (passwordMatches(stored, submitted) && !matched) matched = role;
  }
  return matched;
}

export function roleStatus(passwords) {
  const roles = {};
  if (!passwords || typeof passwords !== 'object') return roles;
  for (const role of ALLOWED_ROLES) {
    roles[role] = !!(passwords[role] && String(passwords[role]).length);
  }
  return roles;
}

export function sanitizePasswordUpdates(payload) {
  const src = payload && typeof payload === 'object' ? payload : {};
  const out = {};
  for (const role of ALLOWED_ROLES) {
    const val = src[role];
    if (typeof val === 'string' && val.length) out[role] = val;
  }
  return out;
}

export function tabAllowed(_role, tab) {
  return DATA_TABS.includes(tab);
}
