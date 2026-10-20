import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'crypto';
import {
  BACKEND_VERSION,
  CELL_CHUNK,
  GZIP_SAVE_AFTER,
  GS_PAYLOAD_CHUNK,
  buildSaveRequests,
  chunkBlob,
  gunzipBase64,
  gzipBase64,
  htmlErrorMessage,
  looksLikeHtml,
  outdatedBackendMessage,
} from './sheet-blob.js';

function parseFormEncoded(raw) {
  const out = {};
  String(raw || '').split('&').forEach((part) => {
    if (!part) return;
    const i = part.indexOf('=');
    let k = i < 0 ? part : part.substring(0, i);
    let v = i < 0 ? '' : part.substring(i + 1);
    try {
      k = decodeURIComponent(k.replace(/\+/g, ' '));
      v = decodeURIComponent(v.replace(/\+/g, ' '));
    } catch {}
    out[k] = v;
  });
  return out;
}

test('Google Sheets 50k cell limit requires chunking AppData JSON', () => {
  assert.equal(CELL_CHUNK, 49000);
  assert.ok(CELL_CHUNK < 50000);
  assert.equal(BACKEND_VERSION, 3);
});

test('chunks of a large JSON blob join back to the original', () => {
  const payload = JSON.stringify({
    notes: 'x'.repeat(60000),
    volunteers: [{ id: 'v1', fname: 'Alex', lname: 'Rivera' }],
    jobs: [{ id: 'j1', name: 'Gate entry', slots: 4 }],
  });
  assert.ok(payload.length > 50000, 'fixture should exceed a single Sheets cell');
  const chunks = chunkBlob(payload);
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every((c) => c.length <= CELL_CHUNK));
  assert.equal(chunks.join(''), payload);
  assert.deepEqual(JSON.parse(chunks.join('')), JSON.parse(payload));
});

test('form body recovers a payload longer than a truncated e.parameter value', () => {
  const payload = JSON.stringify({ hello: 'world', blob: 'x'.repeat(8000) });
  const body = new URLSearchParams({
    action: 'save',
    key: 'secret',
    tab: 'AppData',
    payload,
  }).toString();
  const form = parseFormEncoded(body);
  assert.equal(form.action, 'save');
  assert.equal(form.tab, 'AppData');
  assert.equal(form.payload, payload);
  assert.ok(form.payload.length > 8000);
});

test('gzip round-trip preserves JSON larger than a Sheets cell', () => {
  const payload = JSON.stringify({ notes: 'x'.repeat(60000) });
  assert.ok(payload.length > 50000);
  const gz = gzipBase64(payload);
  assert.ok(gz.length < GZIP_SAVE_AFTER);
  assert.equal(gunzipBase64(gz), payload);
});

test('buildSaveRequests gzips a 50k+ blob into one small POST', () => {
  const payload = { notes: 'x'.repeat(50129) };
  const reqs = buildSaveRequests('secret', 'AppData', payload);
  assert.equal(reqs.length, 1);
  assert.equal(reqs[0].action, 'save');
  assert.equal(reqs[0].encoding, 'gzip-b64');
  assert.equal(reqs[0].tab, 'AppData');
  assert.ok(reqs[0].payload.length <= GS_PAYLOAD_CHUNK);
  assert.deepEqual(JSON.parse(gunzipBase64(reqs[0].payload)), payload);
});

test('buildSaveRequests leaves small saves uncompressed for old backends', () => {
  const payload = { hello: 'world' };
  const reqs = buildSaveRequests('secret', 'AppData', payload);
  assert.equal(reqs.length, 1);
  assert.equal(reqs[0].action, 'save');
  assert.equal(reqs[0].encoding, undefined);
  assert.equal(reqs[0].payload, JSON.stringify(payload));
});

test('buildSaveRequests splits an incompressible blob into saveChunk POSTs', () => {
  const payload = randomBytes(80000).toString('base64');
  const reqs = buildSaveRequests('secret', 'AppData', payload, 1000);
  assert.ok(reqs.length > 1);
  assert.ok(reqs.every((r) => r.action === 'saveChunk'));
  assert.equal(reqs[0].chunkCount, String(reqs.length));
  const joined = reqs.map((r) => r.payload).join('');
  assert.equal(joined, payload);
});

test('outdated backend message says the JSON is valid and how to deploy', () => {
  const msg = outdatedBackendMessage({ bytes: 50119, pingError: 'Unknown action: ping' });
  assert.match(msg, /50119 characters/);
  assert.match(msg, /Unknown action: ping/);
  assert.match(msg, /BandBoosterBackend\.gs/);
  assert.match(msg, /New version/);
});

test('looksLikeHtml detects the Google ppConfig error page', () => {
  const html = `<!DOCTYPE html><html><head><script nonce="abc">window['ppConfig'] = {productName: '26981ed0d57bbad37e728ff58134270c', deleteIsEnforced:  false , sealIsEnforced:  false , heartbeatRa`;
  assert.equal(looksLikeHtml(html), true);
  assert.equal(looksLikeHtml('{"ok":true}'), false);
  assert.match(htmlErrorMessage(), /BandBoosterBackend\.gs/);
});
