// Equipment load-sheet model for Allen Band Booster logistics.
// Used by the web UI and by Node tests. No DOM here.

'use strict';

const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

const STORAGE_LOCATIONS = [
  { id: 'band-library', label: 'Band Library' },
  { id: 'uniform-room', label: 'Uniform Room' },
  { id: 'band-hall', label: 'Band Hall' },
  { id: 'percussion', label: 'Percussion' },
  { id: 'large-garage', label: 'Large Garage (Door 33A)' },
  { id: 'small-garage', label: 'Small Garage (Door 30)' },
];

const LOAD_LOCATIONS = [
  { id: 'eagle-1', label: 'Eagle 1' },
  { id: 'eagle-2', label: 'Eagle 2' },
  { id: 'colorguard-trailer', label: 'Colorguard Trailer' },
  { id: 'golf-carts', label: 'Golf Carts' },
];

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function defaultEquipment() {
  return [
    { id: 'snare', name: 'Snare drums', storageLocation: 'percussion', loadLocation: 'eagle-2', qty: 16, notes: '' },
    { id: 'tenor', name: 'Tenors', storageLocation: 'percussion', loadLocation: 'eagle-2', qty: 6, notes: '' },
    { id: 'bassdrum', name: 'Bass drums', storageLocation: 'percussion', loadLocation: 'eagle-2', qty: 5, notes: '' },
    { id: 'cymbal', name: 'Cymbals', storageLocation: 'percussion', loadLocation: 'eagle-2', qty: 8, notes: '' },

    { id: 'marimba', name: 'Marimbas', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 4, notes: '' },
    { id: 'vibe', name: 'Vibraphones', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 3, notes: '' },
    { id: 'xylo', name: 'Xylophone', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 1, notes: '' },
    { id: 'bells', name: 'Bells / glockenspiel', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 1, notes: '' },
    { id: 'timpani', name: 'Timpani cart', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 1, notes: '' },
    { id: 'synth', name: 'Synthesizer racks', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 2, notes: '' },
    { id: 'auxrack', name: 'Aux percussion racks', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 2, notes: '' },
    { id: 'concertbd', name: 'Concert bass drum', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 1, notes: '' },
    { id: 'chimes', name: 'Chimes', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 1, notes: '' },
    { id: 'drumset', name: 'Drum set', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 1, notes: '' },
    { id: 'sub', name: 'Subwoofers', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 2, notes: '' },
    { id: 'mixer', name: 'Mixer / electronics', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 1, notes: '' },
    { id: 'pitcart', name: 'Pit carts / field frames', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 4, notes: '' },

    { id: 'bari', name: 'Baritones', storageLocation: 'band-library', loadLocation: 'eagle-2', qty: 16, notes: '' },
    { id: 'mellophone', name: 'Mellophones', storageLocation: 'band-library', loadLocation: 'eagle-2', qty: 16, notes: '' },
    { id: 'trombone', name: 'Trombones', storageLocation: 'band-library', loadLocation: 'eagle-2', qty: 16, notes: '' },
    { id: 'sousa', name: 'Sousaphones', storageLocation: 'band-library', loadLocation: 'eagle-2', qty: 12, notes: '' },
    { id: 'bassclar', name: 'Bass clarinets', storageLocation: 'band-library', loadLocation: 'eagle-2', qty: 4, notes: '' },
    { id: 'barisax', name: 'Baritone saxophones', storageLocation: 'band-library', loadLocation: 'eagle-2', qty: 4, notes: '' },

    { id: 'props', name: 'Props', storageLocation: 'band-hall', loadLocation: 'colorguard-trailer', qty: 1, notes: '' },
    { id: 'water', name: 'Water coolers', storageLocation: 'large-garage', loadLocation: 'golf-carts', qty: 2, notes: '' },
    { id: 'tarps', name: 'Tarps / rain covers', storageLocation: 'large-garage', loadLocation: 'golf-carts', qty: 2, notes: '' },
    { id: 'firstaid', name: 'First aid kit', storageLocation: 'band-hall', loadLocation: 'golf-carts', qty: 1, notes: '' },
  ];
}

function listHas(list, id) {
  return list.some(function (x) { return x.id === id; });
}

function migrateFromCategory(category) {
  const cat = String(category || '');
  if (cat === 'battery') return { storageLocation: 'percussion', loadLocation: 'eagle-2' };
  if (cat === 'pit') return { storageLocation: 'large-garage', loadLocation: 'eagle-1' };
  if (cat === 'wind') return { storageLocation: 'band-library', loadLocation: 'eagle-2' };
  return { storageLocation: 'band-hall', loadLocation: 'eagle-1' };
}

function resolveStorage(src) {
  if (listHas(STORAGE_LOCATIONS, src.storageLocation)) return src.storageLocation;
  return migrateFromCategory(src.category || src.storageLocation).storageLocation;
}

function resolveLoad(src) {
  if (listHas(LOAD_LOCATIONS, src.loadLocation)) return src.loadLocation;
  return migrateFromCategory(src.category || src.storageLocation).loadLocation;
}

function storageLabel(id) {
  const found = STORAGE_LOCATIONS.find(function (s) { return s.id === id; });
  return found ? found.label : 'Band Hall';
}

function loadLabel(id) {
  const found = LOAD_LOCATIONS.find(function (s) { return s.id === id; });
  return found ? found.label : 'Eagle 1';
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
    storageLocation: resolveStorage(src),
    loadLocation: resolveLoad(src),
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
    const next = state.equipment.map(function (item) { return normalizeItem(item, item && item.id); });
    if (JSON.stringify(state.equipment) !== JSON.stringify(next)) changed = true;
    state.equipment = next;
  }
  (state.schedules || []).forEach(function (sc) {
    if (!sc || !Array.isArray(sc.equipmentExtra) || !sc.equipmentExtra.length) return;
    const next = sc.equipmentExtra.map(function (item) { return normalizeItem(item, item && item.id); });
    if (JSON.stringify(sc.equipmentExtra) !== JSON.stringify(next)) {
      sc.equipmentExtra = next;
      changed = true;
    }
  });
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

function grouped(items, by) {
  const list = by === 'storage' ? STORAGE_LOCATIONS : LOAD_LOCATIONS;
  const key = by === 'storage' ? 'storageLocation' : 'loadLocation';
  const resolve = by === 'storage' ? resolveStorage : resolveLoad;
  const buckets = {};
  list.forEach(function (c) { buckets[c.id] = []; });
  (items || []).forEach(function (item) {
    const id = resolve(item);
    (buckets[id] = buckets[id] || []).push(item);
  });
  return list.map(function (c) {
    return { id: c.id, label: c.label, items: buckets[c.id] || [] };
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
  item.storageLocation = merged.storageLocation;
  item.loadLocation = merged.loadLocation;
  item.qty = merged.qty;
  item.notes = merged.notes;
  delete item.category;
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
  STORAGE_LOCATIONS: STORAGE_LOCATIONS,
  LOAD_LOCATIONS: LOAD_LOCATIONS,
  defaultEquipment: defaultEquipment,
  ensureEquipment: ensureEquipment,
  catalog: catalog,
  eventItems: eventItems,
  neededItems: neededItems,
  stats: stats,
  grouped: grouped,
  storageLabel: storageLabel,
  loadLabel: loadLabel,
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
  STORAGE_LOCATIONS,
  LOAD_LOCATIONS,
  defaultEquipment,
  ensureEquipment,
  catalog,
  eventItems,
  neededItems,
  stats,
  grouped,
  storageLabel,
  loadLabel,
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
