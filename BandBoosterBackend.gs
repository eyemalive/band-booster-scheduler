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
//
//  AppPasswords tab A1 must contain JSON like:
//  {"logistics":"yourpassword","general":"yourpassword","admin":"yourpassword"}
// ════════════════════════════════════════════════════════════

const API_KEY = 'YOUR_SECRET_KEY_HERE';  // ← change this

// Allowed sheet tab names (whitelist for security)
const ALLOWED_TABS = ['AppData', 'AppDataGeneral', 'AppPasswords'];

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
      out.setContent(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      return out;
    }

    // Tab whitelist
    if (!ALLOWED_TABS.includes(tabName)) {
      out.setContent(JSON.stringify({ ok: false, error: 'Invalid tab: ' + tabName }));
      return out;
    }

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let   sheet = ss.getSheetByName(tabName);

    // Auto-create tab if it doesn't exist (except AppPasswords — must be set up manually)
    if (!sheet) {
      if (tabName === 'AppPasswords') {
        out.setContent(JSON.stringify({ ok: false, error: 'AppPasswords tab not found. Create it and add password JSON to cell A1.' }));
        return out;
      }
      sheet = ss.insertSheet(tabName);
    }

    // ── getPasswords ─────────────────────────────────────────
    if (action === 'getPasswords') {
      const pwSheet = ss.getSheetByName('AppPasswords');
      if (!pwSheet) {
        out.setContent(JSON.stringify({ ok: false, error: 'AppPasswords tab not found.' }));
        return out;
      }
      const raw = pwSheet.getRange('A1').getValue();
      let passwords = {};
      if (raw) {
        try { passwords = JSON.parse(raw); }
        catch(e) { out.setContent(JSON.stringify({ ok: false, error: 'AppPasswords A1 is not valid JSON.' })); return out; }
      }
      out.setContent(JSON.stringify({ ok: true, passwords }));
      return out;
    }

    // ── savePasswords ────────────────────────────────────────
    if (action === 'savePasswords') {
      const pwSheet = ss.getSheetByName('AppPasswords');
      if (!pwSheet) {
        out.setContent(JSON.stringify({ ok: false, error: 'AppPasswords tab not found.' }));
        return out;
      }
      if (!payload) {
        out.setContent(JSON.stringify({ ok: false, error: 'No payload provided.' }));
        return out;
      }
      try { JSON.parse(payload); }
      catch(e) {
        out.setContent(JSON.stringify({ ok: false, error: 'Payload is not valid JSON.' }));
        return out;
      }
      pwSheet.getRange('A1').setValue(payload);
      out.setContent(JSON.stringify({ ok: true }));
      return out;
    }

    // ── load ─────────────────────────────────────────────────
    if (action === 'load') {
      const raw = sheet.getRange('A1').getValue();
      let data = null;
      if (raw) {
        try { data = JSON.parse(raw); } catch(e) { data = null; }
      }
      out.setContent(JSON.stringify({ ok: true, data }));
      return out;
    }

    // ── save ─────────────────────────────────────────────────
    if (action === 'save') {
      if (!payload) {
        out.setContent(JSON.stringify({ ok: false, error: 'No payload provided.' }));
        return out;
      }
      // Validate it's parseable JSON before saving
      try { JSON.parse(payload); }
      catch(e) {
        out.setContent(JSON.stringify({ ok: false, error: 'Payload is not valid JSON.' }));
        return out;
      }
      sheet.getRange('A1').setValue(payload);
      out.setContent(JSON.stringify({ ok: true }));
      return out;
    }

    out.setContent(JSON.stringify({ ok: false, error: 'Unknown action: ' + action }));
    return out;

  } catch(err) {
    out.setContent(JSON.stringify({ ok: false, error: 'Script error: ' + err.message }));
    return out;
  }
}

// GET handler (for browser-based testing)
function doGet(e) {
  const out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);
  out.setContent(JSON.stringify({ ok: true, message: 'Band Booster Backend is running. Use POST requests.' }));
  return out;
}
