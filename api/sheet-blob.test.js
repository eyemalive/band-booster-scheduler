import { test } from 'node:test';
import assert from 'node:assert/strict';

const CELL_CHUNK = 49000;

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

function chunkBlob(text, size = CELL_CHUNK) {
  const value = text == null ? '' : String(text);
  const n = Math.max(1, Math.ceil(value.length / size) || 1);
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push(value.substring(i * size, (i + 1) * size));
  }
  return rows;
}

test('Google Sheets 50k cell limit requires chunking AppData JSON', () => {
  assert.equal(CELL_CHUNK, 49000);
  assert.ok(CELL_CHUNK < 50000);
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
