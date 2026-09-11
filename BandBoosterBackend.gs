// ════════════════════════════════════════════════════════════
//  BandBoosterBackend.gs
//  Google Apps Script backend for Band Booster Scheduler
//
//  SETUP:
//  1. Set API_KEY below to a secret passphrase (matches Vercel env var)
//  2. Deploy as Web App: Execute as Me, Access Anyone
//  3. Make sure your spreadsheet has these tabs:
//       AppData          ← logistics data (cell A1)
//       AppDataGeneral   ← general volunteer data (cell A1)
//       AppPasswords     ← role passwords (cell A1)
//       AppEvents        ← shared event registry [{id,name,date}] (cell A1, auto-created)
//       AppImportCategories ← shared CSV import category mapping [{id,text,role}] (cell A1, auto-created)
//
//  AppPasswords tab A1 must contain JSON like:
//  {"logistics":"yourpassword","general":"yourpassword","admin":"yourpassword"}
//  Passwords are hashed (sha256:…) on the next save. Existing plaintext values
//  still work until they are changed.
// ════════════════════════════════════════════════════════════

const API_KEY = 'YOUR_SECRET_KEY_HERE';  // ← change this
const HASH_PREFIX = 'sha256:';
const PASSWORD_ROLES = ['logistics', 'general', 'admin'];

const DATA_TABS = ['AppData', 'AppDataGeneral', 'AppEvents', 'AppImportCategories'];

function sha256Hex(str) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(str), Utilities.Charset.UTF_8);
  return raw.map(function (b) {
    const v = (b < 0) ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function hashPassword(plain) {
  return HASH_PREFIX + sha256Hex(plain);
}

function passwordMatches(stored, submitted) {
  if (!stored || !submitted) return false;
  const value = String(stored);
  if (value.indexOf(HASH_PREFIX) === 0) {
    return value === hashPassword(submitted);
  }
  return value === String(submitted);
}

function jsonOut(out, obj) {
  out.setContent(JSON.stringify(obj));
  return out;
}

function readPasswords(ss) {
  const pwSheet = ss.getSheetByName('AppPasswords');
  if (!pwSheet) return { error: 'AppPasswords tab not found.' };
  const raw = pwSheet.getRange('A1').getValue();
  let passwords = {};
  if (raw) {
    try { passwords = JSON.parse(raw); }
    catch (e) { return { error: 'AppPasswords A1 is not valid JSON.' }; }
  }
  return { sheet: pwSheet, passwords: passwords };
}

function roleStatus(passwords) {
  const roles = {};
  PASSWORD_ROLES.forEach(function (role) {
    roles[role] = !!(passwords && passwords[role]);
  });
  return roles;
}

function doPost(e) {
  const out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);

  try {
    const params  = e.parameter || {};
    const key     = params.key     || '';
    const action  = params.action  || '';
    const tabName = params.tab     || 'AppData';
    const payload = params.payload || '';

    // Auth check
    if (key !== API_KEY) {
      return jsonOut(out, { ok: false, error: 'Unauthorized' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── checkPassword (never returns stored secrets) ─────────
    if (action === 'checkPassword') {
      const got = readPasswords(ss);
      if (got.error) return jsonOut(out, { ok: false, error: got.error });
      let matched = null;
      const submitted = payload;
      Object.keys(got.passwords || {}).forEach(function (role) {
        if (!matched && passwordMatches(got.passwords[role], submitted)) matched = role;
      });
      if (!matched) return jsonOut(out, { ok: false, error: 'Incorrect password.' });
      return jsonOut(out, { ok: true, role: matched });
    }

    // ── passwordStatus (no secret values) ────────────────────
    if (action === 'passwordStatus') {
      const got = readPasswords(ss);
      if (got.error) return jsonOut(out, { ok: false, error: got.error });
      return jsonOut(out, { ok: true, roles: roleStatus(got.passwords) });
    }

    // ── getPasswords (legacy name; values are never returned) ─
    if (action === 'getPasswords') {
      const got = readPasswords(ss);
      if (got.error) return jsonOut(out, { ok: false, error: got.error });
      return jsonOut(out, { ok: true, roles: roleStatus(got.passwords) });
    }

    // ── savePasswords (merge + hash; blank keys are ignored) ─
    if (action === 'savePasswords') {
      const got = readPasswords(ss);
      if (got.error) return jsonOut(out, { ok: false, error: got.error });
      if (!payload) return jsonOut(out, { ok: false, error: 'No payload provided.' });
      let incoming;
      try { incoming = JSON.parse(payload); }
      catch (e) { return jsonOut(out, { ok: false, error: 'Payload is not valid JSON.' }); }
      if (!incoming || typeof incoming !== 'object') {
        return jsonOut(out, { ok: false, error: 'Payload is not valid JSON.' });
      }
      const updated = got.passwords || {};
      PASSWORD_ROLES.forEach(function (role) {
        if (typeof incoming[role] === 'string' && incoming[role].length) {
          updated[role] = incoming[role].indexOf(HASH_PREFIX) === 0
            ? incoming[role]
            : hashPassword(incoming[role]);
        }
      });
      got.sheet.getRange('A1').setValue(JSON.stringify(updated));
      return jsonOut(out, { ok: true });
    }

    // Tab whitelist — AppPasswords is not readable/writable via load/save
    if (!DATA_TABS.includes(tabName)) {
      return jsonOut(out, { ok: false, error: 'Invalid tab: ' + tabName });
    }

    let sheet = ss.getSheetByName(tabName);

    // Auto-create tab if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }

    // ── load ─────────────────────────────────────────────────
    if (action === 'load') {
      const raw = sheet.getRange('A1').getValue();
      let data = null;
      if (raw) {
        try { data = JSON.parse(raw); } catch (e) { data = null; }
      }
      return jsonOut(out, { ok: true, data: data });
    }

    // ── save ─────────────────────────────────────────────────
    if (action === 'save') {
      if (!payload) return jsonOut(out, { ok: false, error: 'No payload provided.' });
      try { JSON.parse(payload); }
      catch (e) { return jsonOut(out, { ok: false, error: 'Payload is not valid JSON.' }); }
      sheet.getRange('A1').setValue(payload);
      return jsonOut(out, { ok: true });
    }

    return jsonOut(out, { ok: false, error: 'Unknown action: ' + action });

  } catch (err) {
    return jsonOut(out, { ok: false, error: 'Script error: ' + err.message });
  }
}

// GET handler (for browser-based testing)
function doGet(e) {
  const out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);
  out.setContent(JSON.stringify({ ok: true, message: 'Band Booster Backend is running. Use POST requests.' }));
  return out;
}
