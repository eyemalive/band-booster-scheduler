// Equipment load-sheet model for Allen Band Booster logistics.
// Used by the web UI and by Node tests. No DOM here.

'use strict';

const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

const CATEGORIES = [
  { id: 'battery', label: 'Battery' },
  { id: 'pit', label: 'Front ensemble (pit)' },
  { id: 'wind', label: 'Winds' },
  { id: 'other', label: 'Other' },
];

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function defaultEquipment() {
  return [
    { id: 'snare', name: 'Snare drums', category: 'battery', qty: 16, notes: '' },
    { id: 'tenor', name: 'Tenors', category: 'battery', qty: 6, notes: '' },
    { id: 'bassdrum', name: 'Bass drums', category: 'battery', qty: 5, notes: '' },
    { id: 'cymbal', name: 'Cymbals', category: 'battery', qty: 8, notes: '' },

    { id: 'marimba', name: 'Marimbas', category: 'pit', qty: 4, notes: '' },
    { id: 'vibe', name: 'Vibraphones', category: 'pit', qty: 3, notes: '' },
    { id: 'xylo', name: 'Xylophone', category: 'pit', qty: 1, notes: '' },
    { id: 'bells', name: 'Bells / glockenspiel', category: 'pit', qty: 1, notes: '' },
    { id: 'timpani', name: 'Timpani cart', category: 'pit', qty: 1, notes: '' },
    { id: 'synth', name: 'Synthesizer racks', category: 'pit', qty: 2, notes: '' },
    { id: 'auxrack', name: 'Aux percussion racks', category: 'pit', qty: 2, notes: '' },
    { id: 'concertbd', name: 'Concert bass drum', category: 'pit', qty: 1, notes: '' },
    { id: 'chimes', name: 'Chimes', category: 'pit', qty: 1, notes: '' },
    { id: 'drumset', name: 'Drum set', category: 'pit', qty: 1, notes: '' },
    { id: 'sub', name: 'Subwoofers', category: 'pit', qty: 2, notes: '' },
    { id: 'mixer', name: 'Mixer / electronics', category: 'pit', qty: 1, notes: '' },
    { id: 'pitcart', name: 'Pit carts / field frames', category: 'pit', qty: 4, notes: '' },

    { id: 'bari', name: 'Baritones', category: 'wind', qty: 16, notes: '' },
    { id: 'mellophone', name: 'Mellophones', category: 'wind', qty: 16, notes: '' },
    { id: 'trombone', name: 'Trombones', category: 'wind', qty: 16, notes: '' },
    { id: 'sousa', name: 'Sousaphones', category: 'wind', qty: 12, notes: '' },
    { id: 'bassclar', name: 'Bass clarinets', category: 'wind', qty: 4, notes: '' },
    { id: 'barisax', name: 'Baritone saxophones', category: 'wind', qty: 4, notes: '' },

    { id: 'props', name: 'Props', category: 'other', qty: 1, notes: '' },
    { id: 'water', name: 'Water coolers', category: 'other', qty: 2, notes: '' },
    { id: 'tarps', name: 'Tarps / rain covers', category: 'other', qty: 2, notes: '' },
    { id: 'firstaid', name: 'First aid kit', category: 'other', qty: 1, notes: '' },
  ];
}

function knownCategory(id) {
  return CATEGORIES.some(function (c) { return c.id === id; }) ? id : 'other';
}

function normQty(v) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function normalizeItem(item, fallbackId) {
  const src = item || {};
  return {
    id: src.id || fallbackId,
    name: String(src.name || '').trim(),
    category: knownCategory(src.category),
    qty: normQty(src.qty),
    notes: String(src.notes || '').trim(),
  };
}

function itemFromInstrument(inst) {
  return normalizeItem({
    id: inst.id,
    name: inst.name,
    category: inst.category,
    qty: inst.qty,
    notes: inst.notes,
  }, inst.id);
}

function ensureMaps(sc) {
  if (!sc) return sc;
  if (!sc.equipmentLoaded || typeof sc.equipmentLoaded !== 'object') sc.equipmentLoaded = {};
  if (!sc.equipmentSkipped || typeof sc.equipmentSkipped !== 'object') sc.equipmentSkipped = {};
  if (!Array.isArray(sc.equipmentExtra)) sc.equipmentExtra = [];
  return sc;
}

function ensureEquipment(state) {
  if (!state || typeof state !== 'object') return false;
  let changed = false;
  if (!Array.isArray(state.equipment) || !state.equipment.length) {
    const fromPack = state.truckPack && Array.isArray(state.truckPack.instruments)
      ? state.truckPack.instruments
      : null;
    if (fromPack && fromPack.length) {
      state.equipment = fromPack.map(itemFromInstrument).filter(function (i) { return i.id && i.name; });
    } else {
      state.equipment = defaultEquipment();
    }
    changed = true;
  } else {
    state.equipment = state.equipment.map(function (item) { return normalizeItem(item, item && item.id); });
  }
  if (state.truckPack) {
    delete state.truckPack;
    changed = true;
  }
  return changed;
}

function catalog(state) {
  return (state && Array.isArray(state.equipment)) ? state.equipment : [];
}

function eventItems(state, sc) {
  ensureMaps(sc);
  const extras = (sc && sc.equipmentExtra) || [];
  const skipped = (sc && sc.equipmentSkipped) || {};
  const loaded = (sc && sc.equipmentLoaded) || {};
  const seen = {};
  const out = [];
  catalog(state).concat(extras).forEach(function (raw) {
    if (!raw || !raw.id || seen[raw.id]) return;
    seen[raw.id] = true;
    const item = normalizeItem(raw, raw.id);
    item.extra = extras.some(function (e) { return e && e.id === raw.id; });
    item.skipped = !!skipped[raw.id];
    item.loaded = !!loaded[raw.id];
    out.push(item);
  });
  return out;
}

function neededItems(items) {
  return (items || []).filter(function (i) { return !i.skipped; });
}

function stats(items) {
  const needed = neededItems(items);
  const loaded = needed.filter(function (i) { return i.loaded; });
  return { total: (items || []).length, needed: needed.length, loaded: loaded.length };
}

function grouped(items) {
  const byCat = {};
  CATEGORIES.forEach(function (c) { byCat[c.id] = []; });
  (items || []).forEach(function (item) {
    const cat = knownCategory(item.category);
    (byCat[cat] = byCat[cat] || []).push(item);
  });
  return CATEGORIES.map(function (c) {
    return { id: c.id, label: c.label, items: byCat[c.id] || [] };
  }).filter(function (g) { return g.items.length; });
}

function toggleLoaded(sc, id, value) {
  if (!sc || !id) return false;
  ensureMaps(sc);
  const next = value == null ? !sc.equipmentLoaded[id] : !!value;
  if (next) sc.equipmentLoaded[id] = true;
  else delete sc.equipmentLoaded[id];
  return next;
}

function toggleSkipped(sc, id, value) {
  if (!sc || !id) return false;
  ensureMaps(sc);
  const next = value == null ? !sc.equipmentSkipped[id] : !!value;
  if (next) {
    sc.equipmentSkipped[id] = true;
    delete sc.equipmentLoaded[id];
  } else {
    delete sc.equipmentSkipped[id];
  }
  return next;
}

function resetLoaded(sc) {
  if (!sc) return;
  sc.equipmentLoaded = {};
}

function copyNeededFrom(fromSc, toSc) {
  if (!toSc) return;
  ensureMaps(toSc);
  toSc.equipmentSkipped = clone((fromSc && fromSc.equipmentSkipped) || {});
  toSc.equipmentExtra = clone((fromSc && fromSc.equipmentExtra) || []);
  toSc.equipmentLoaded = {};
}

function addCatalogItem(state, item, id) {
  if (!state) return null;
  if (!Array.isArray(state.equipment)) state.equipment = [];
  const next = normalizeItem(item, id);
  if (!next.id || !next.name) return null;
  state.equipment.push(next);
  return next;
}

function editCatalogItem(state, id, fields) {
  if (!state || !Array.isArray(state.equipment)) return null;
  const item = state.equipment.find(function (i) { return i.id === id; });
  if (!item) return null;
  const merged = normalizeItem(Object.assign({}, item, fields || {}), id);
  item.name = merged.name;
  item.category = merged.category;
  item.qty = merged.qty;
  item.notes = merged.notes;
  return item;
}

function removeCatalogItem(state, id) {
  if (!state || !Array.isArray(state.equipment)) return;
  state.equipment = state.equipment.filter(function (i) { return i.id !== id; });
  (state.schedules || []).forEach(function (sc) {
    if (sc.equipmentLoaded) delete sc.equipmentLoaded[id];
    if (sc.equipmentSkipped) delete sc.equipmentSkipped[id];
  });
}

function addEventExtra(sc, item, id) {
  ensureMaps(sc);
  const next = normalizeItem(item, id);
  if (!next.id || !next.name) return null;
  sc.equipmentExtra.push(next);
  return next;
}

function removeEventExtra(sc, id) {
  if (!sc) return;
  ensureMaps(sc);
  sc.equipmentExtra = sc.equipmentExtra.filter(function (i) { return i.id !== id; });
  delete sc.equipmentLoaded[id];
  delete sc.equipmentSkipped[id];
}

const api = {
  CATEGORIES: CATEGORIES,
  defaultEquipment: defaultEquipment,
  ensureEquipment: ensureEquipment,
  catalog: catalog,
  eventItems: eventItems,
  neededItems: neededItems,
  stats: stats,
  grouped: grouped,
  toggleLoaded: toggleLoaded,
  toggleSkipped: toggleSkipped,
  resetLoaded: resetLoaded,
  copyNeededFrom: copyNeededFrom,
  addCatalogItem: addCatalogItem,
  editCatalogItem: editCatalogItem,
  removeCatalogItem: removeCatalogItem,
  addEventExtra: addEventExtra,
  removeEventExtra: removeEventExtra,
  normalizeItem: normalizeItem,
};

root.EquipmentLoad = api;

export default api;
export {
  CATEGORIES,
  defaultEquipment,
  ensureEquipment,
  catalog,
  eventItems,
  neededItems,
  stats,
  grouped,
  toggleLoaded,
  toggleSkipped,
  resetLoaded,
  copyNeededFrom,
  addCatalogItem,
  editCatalogItem,
  removeCatalogItem,
  addEventExtra,
  removeEventExtra,
  normalizeItem,
};
