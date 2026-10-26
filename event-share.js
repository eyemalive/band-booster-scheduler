// Shared event catalog helpers. Logistics and General each store their own
// schedule shells; the AppEvents registry is the cross-mode list of ids.
// Used by the web UI and by Node tests. No DOM here.

'use strict';

const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

function addToCatalog(byId, item) {
  if (!item || !item.id) return;
  const prev = byId[item.id] || {};
  byId[item.id] = {
    id: item.id,
    name: item.name || prev.name || '',
    date: item.date || prev.date || '',
    eventType: item.eventType || prev.eventType,
    gameLocation: item.gameLocation !== undefined ? item.gameLocation : prev.gameLocation,
  };
}

export function catalogSharedEvents(events, logisticsSchedules, generalSchedules) {
  const byId = {};
  (events || []).forEach((e) => addToCatalog(byId, e));
  (logisticsSchedules || []).forEach((sc) => addToCatalog(byId, sc));
  (generalSchedules || []).forEach((sc) => addToCatalog(byId, sc));
  return Object.values(byId);
}

export function mergeEventsRegistry(events, catalog) {
  const byId = {};
  (events || []).forEach((e) => {
    if (e && e.id) byId[e.id] = { id: e.id, name: e.name, date: e.date };
  });
  let changed = false;
  (catalog || []).forEach((e) => {
    if (!e || !e.id) return;
    if (!byId[e.id]) {
      byId[e.id] = { id: e.id, name: e.name, date: e.date };
      changed = true;
    }
  });
  const next = Object.values(byId).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return { events: next, changed };
}

export function ensureSharedScheduleShells(data, mode, catalog, buildJobs) {
  if (!data) return { changed: false, added: [] };
  data.schedules = data.schedules || [];
  const added = [];
  let changed = false;
  (catalog || []).forEach((ev) => {
    if (!ev || !ev.id) return;
    const existing = data.schedules.find((s) => s.id === ev.id);
    if (!existing) {
      const eventType = ev.eventType || 'game';
      data.schedules.push({
        id: ev.id,
        name: ev.name,
        date: ev.date,
        eventType,
        gameLocation: ev.gameLocation,
        assignments: {},
        halftimeAssignments: {},
        jobs: typeof buildJobs === 'function' ? buildJobs(data, mode, eventType) : [],
        autoSaved: false,
        shared: true,
      });
      added.push(ev.id);
      changed = true;
    } else if (!existing.shared) {
      existing.shared = true;
      changed = true;
    }
  });
  if (changed) {
    data.schedules.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }
  return { changed, added };
}

const api = {
  catalogSharedEvents,
  mergeEventsRegistry,
  ensureSharedScheduleShells,
};

root.EventShare = api;

export default api;
