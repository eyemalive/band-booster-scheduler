// Shared helpers for Google Sheets cell limits and Apps Script web-app POSTs.
import { gzipSync, gunzipSync } from 'zlib';

export const CELL_CHUNK = 49000;
// Stay well under the POST size that makes script.google.com return an HTML
// error page instead of running doPost (seen at ~50k JSON, larger once
// form-urlencoded).
export const GS_PAYLOAD_CHUNK = 20000;
export const GZIP_SAVE_AFTER = 20000;
export const BACKEND_VERSION = 3;
export const BACKEND_SCRIPT_URL = 'https://github.com/eyemalive/band-booster-scheduler/blob/main/BandBoosterBackend.gs';

export function outdatedBackendMessage({ bytes, pingError, version } = {}) {
  const parts = [
    `The Google Apps Script web app is still an old version (need ${BACKEND_VERSION}` +
      (version ? `, live version ${version}` : ', live version unknown') +
      ').',
  ];
  if (bytes != null) {
    parts.push(`Your AppData JSON is valid (${bytes} characters).`);
  }
  parts.push('The old script can only write 50,000 characters to one cell, so this save cannot work until the web app is updated.');
  if (pingError) parts.push(`The live script replied: ${pingError}.`);
  parts.push(
    `Open ${BACKEND_SCRIPT_URL} , copy the file, paste it over the existing script (keep your existing API_KEY), then Deploy → Manage deployments → pencil on the existing web app → Version: New version → Deploy. Do not create a new deployment URL.`
  );
  return parts.join(' ');
}

export function chunkBlob(text, size = CELL_CHUNK) {
  const value = text == null ? '' : String(text);
  const n = Math.max(1, Math.ceil(value.length / size) || 1);
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push(value.substring(i * size, (i + 1) * size));
  }
  return rows;
}

export function payloadToString(payload) {
  if (payload === undefined || payload === null) return '';
  return typeof payload === 'string' ? payload : JSON.stringify(payload);
}

export function gzipBase64(text) {
  return gzipSync(Buffer.from(String(text), 'utf8')).toString('base64');
}

export function gunzipBase64(b64) {
  return gunzipSync(Buffer.from(String(b64), 'base64')).toString('utf8');
}

export function looksLikeHtml(text) {
  const s = String(text || '').replace(/^\uFEFF/, '').trimStart();
  return /^<!DOCTYPE html/i.test(s) || /^<html[\s>]/i.test(s) || /window\s*\[\s*['"]ppConfig['"]\s*\]/.test(s);
}

export function htmlErrorMessage() {
  return 'Apps Script returned an HTML error page instead of JSON. The sheet backend did not run — usually because the save POST was too large for Google to execute, or the web app is on an old version. Paste the latest BandBoosterBackend.gs (keep your existing API_KEY), then Deploy → Manage deployments → edit → New version → Deploy.';
}

export function buildSaveRequests(apiKey, tab, payload, payloadChunk = GS_PAYLOAD_CHUNK) {
  const raw = payloadToString(payload);
  const fieldsBase = { key: apiKey };
  if (tab) fieldsBase.tab = tab;

  if (raw.length > GZIP_SAVE_AFTER) {
    const gz = gzipBase64(raw);
    if (gz.length <= payloadChunk) {
      return [{ ...fieldsBase, action: 'save', payload: gz, encoding: 'gzip-b64' }];
    }
  }

  if (raw.length <= payloadChunk) {
    return [{ ...fieldsBase, action: 'save', payload: raw }];
  }

  const n = Math.max(1, Math.ceil(raw.length / payloadChunk));
  const reqs = [];
  for (let i = 0; i < n; i++) {
    reqs.push({
      ...fieldsBase,
      action: 'saveChunk',
      chunkIndex: String(i),
      chunkCount: String(n),
      payload: raw.substring(i * payloadChunk, (i + 1) * payloadChunk),
    });
  }
  return reqs;
}
