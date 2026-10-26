import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogSharedEvents,
  ensureSharedScheduleShells,
  mergeEventsRegistry,
} from '../event-share.js';

test('catalog includes registry events missing from General schedules', () => {
  const catalog = catalogSharedEvents(
    [{ id: 'e1', name: 'Friday Game', date: '2026-10-30' }],
    [{ id: 'e1', name: 'Friday Game', date: '2026-10-30', eventType: 'game', gameLocation: 'away', shared: true }],
    []
  );
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].id, 'e1');
  assert.equal(catalog[0].gameLocation, 'away');
});

test('catalog picks up a logistics-only schedule even if AppEvents is empty', () => {
  const catalog = catalogSharedEvents(
    [],
    [{ id: 'e2', name: 'Band Banquet', date: '2026-11-01', eventType: 'event', shared: true }],
    []
  );
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].eventType, 'event');
});

test('ensureSharedScheduleShells adds a General shell without touching existing assignments', () => {
  const general = {
    jobs: [{ id: 'gj1', name: 'Parking', slots: 4 }],
    schedules: [
      { id: 'keep', name: 'Keep me', date: '2026-10-01', assignments: { gj1: ['v1'] }, shared: true },
    ],
  };
  const catalog = catalogSharedEvents(
    [{ id: 'e1', name: 'Friday Game', date: '2026-10-30' }],
    [{ id: 'e1', name: 'Friday Game', date: '2026-10-30', eventType: 'game', gameLocation: 'home' }],
    general.schedules
  );
  const result = ensureSharedScheduleShells(general, 'general', catalog, (data) => (data.jobs || []).map((j) => ({ ...j })));
  assert.equal(result.changed, true);
  assert.deepEqual(result.added, ['e1']);
  const kept = general.schedules.find((s) => s.id === 'keep');
  assert.deepEqual(kept.assignments, { gj1: ['v1'] });
  const added = general.schedules.find((s) => s.id === 'e1');
  assert.equal(added.shared, true);
  assert.equal(added.eventType, 'game');
  assert.equal(added.gameLocation, 'home');
  assert.equal(added.jobs[0].name, 'Parking');
  assert.deepEqual(added.assignments, {});
});

test('ensureSharedScheduleShells is a no-op when General already has the event', () => {
  const general = {
    schedules: [{ id: 'e1', name: 'Friday Game', date: '2026-10-30', shared: true, assignments: { a: ['v'] } }],
  };
  const catalog = catalogSharedEvents([{ id: 'e1', name: 'Friday Game', date: '2026-10-30' }], [], general.schedules);
  const result = ensureSharedScheduleShells(general, 'general', catalog);
  assert.equal(result.changed, false);
  assert.deepEqual(general.schedules[0].assignments, { a: ['v'] });
});

test('mergeEventsRegistry adds logistics-only ids to AppEvents', () => {
  const catalog = catalogSharedEvents(
    [{ id: 'e1', name: 'A', date: '2026-10-01' }],
    [{ id: 'e2', name: 'B', date: '2026-10-02' }],
    []
  );
  const { events, changed } = mergeEventsRegistry([{ id: 'e1', name: 'A', date: '2026-10-01' }], catalog);
  assert.equal(changed, true);
  assert.deepEqual(events.map((e) => e.id), ['e1', 'e2']);
});
