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

// Bump when the seeded catalog should replace the previous starter list.
const EQUIPMENT_CATALOG_V = 2;

const STARTER_INSTRUMENT_IDS = {
  snare: 1, tenor: 1, bassdrum: 1, cymbal: 1, marimba: 1, vibe: 1, xylo: 1, bells: 1,
  timpani: 1, synth: 1, auxrack: 1, concertbd: 1, chimes: 1, drumset: 1, sub: 1,
  mixer: 1, pitcart: 1, bari: 1, mellophone: 1, trombone: 1, sousa: 1, bassclar: 1,
  barisax: 1, props: 1, water: 1, tarps: 1, firstaid: 1,
};

function item(id, name, storageLocation, loadLocation, qty, section, notes) {
  return {
    id: id,
    name: name,
    storageLocation: storageLocation,
    loadLocation: loadLocation,
    qty: qty,
    section: section || '',
    notes: notes || '',
  };
}

function defaultEquipment() {
  const food = 'Food Services';
  const podium1 = 'Podium Assembly 1 (Under Track Stadium Bleachers)';
  const podium2 = 'Podium Assembly 2 (Under Track Stadium Bleachers)';
  const dualStorage = 'Also Band Library';
  return [
    item('water-wagons', 'Water Wagons filled with Ice', 'large-garage', 'golf-carts', 2, food),
    item('all-stanchions', 'All Stanchions', 'large-garage', 'golf-carts', 1, food),
    item('food-supply-cooler', 'Food Service "Supply Cooler"', 'large-garage', 'golf-carts', 1, food, 'Ice Scoop, Hose/Filter, Bleach/Rags'),
    item('volunteer-cooler-water', 'Large Volunteer Cooler with Ice and 3 cases Volunteer bottled water', 'large-garage', 'golf-carts', 1, food, dualStorage),
    item('volunteer-cooler-soda', 'Large Volunteer Cooler with Ice and Soda', 'large-garage', 'golf-carts', 1, food, dualStorage),
    item('directors-cooler', 'Small Directors Cooler with Ice and 14 Dasani Bottled Water', 'large-garage', 'golf-carts', 1, food, dualStorage),
    item('nurses-cooler', 'Small Nurses Cooler with Ice, Dasani Bottled Water and Gatorade', 'large-garage', 'golf-carts', 1, food, dualStorage),
    item('warm-water', 'Cases of "warm" water', 'band-library', 'golf-carts', 2, food),
    item('snacks-totes', 'Snacks Totes from Food Service', 'band-library', 'golf-carts', 4, food, 'Snacks for 615 students'),
    item('gluten-free-tote', 'Gluten Free Tote from Food Service', 'band-library', 'golf-carts', 1, food, 'Need Gluten Free for 2 servings'),
    item('trash-bags', 'Small Pack of Clear Trash Bags', 'band-library', 'golf-carts', 1, food),
    item('rope-reels', 'Reel of rope', 'large-garage', 'golf-carts', 3, food),

    item('percussion-snack-tote', 'Percussion Snack Tote', 'percussion', 'eagle-2', 1, food),

    item('pa1-scissor-lift', 'Black scissor-lift platform', 'large-garage', 'golf-carts', 1, podium1),
    item('pa1-scissor-ladder', 'Ladder for scissor-lift platform', 'large-garage', 'golf-carts', 1, podium1),
    item('pa1-safety-rails', 'Safety rails for scissor lift', 'large-garage', 'golf-carts', 2, podium1),
    item('pa1-folding-podium', 'Aluminum folding podium with safety rails', 'large-garage', 'golf-carts', 2, podium1),
    item('pa1-little-giant', 'Little Giant Ladder', 'large-garage', 'golf-carts', 1, podium1),
    item('pa1-cam-buckle', 'Cam-buckle tie down strap', 'large-garage', 'golf-carts', 1, podium1),
    item('pa1-anchor-speakers', 'Anchor Speakers - Stadium', 'large-garage', 'golf-carts', 4, podium1),
    item('pa1-gator-stands', 'Gator Stands (2 bags) - Stadium', 'large-garage', 'golf-carts', 4, podium1),

    item('pa2-scissor-lift', 'Black scissor-lift platform', 'large-garage', 'golf-carts', 1, podium2),
    item('pa2-scissor-ladder', 'Ladder for scissor-lift platform', 'large-garage', 'golf-carts', 1, podium2),
    item('pa2-safety-rails', 'Safety rails for scissor lift', 'large-garage', 'golf-carts', 2, podium2),
    item('pa2-folding-podium', 'Aluminum folding podium with safety rails', 'large-garage', 'golf-carts', 1, podium2),
    item('pa2-little-giant', 'Little Giant Ladder', 'large-garage', 'golf-carts', 1, podium2),
    item('pa2-cam-buckle', 'Cam-buckle tie down strap', 'large-garage', 'golf-carts', 1, podium2),
    item('pa2-speaker-mic-box', 'Speaker Mic Box', 'large-garage', 'golf-carts', 1, podium2),
    item('pa2-ubolts-pvc', 'Bucket with ubolts and PVC Pipe', 'large-garage', 'golf-carts', 1, podium2),

    item('generator', 'Generator', 'small-garage', 'colorguard-trailer', 1),
    item('chairs', 'Chairs', 'band-hall', 'colorguard-trailer', 4),
    item('stanchion-cart', 'Stanchion Cart', 'large-garage', 'colorguard-trailer', 1),
    item('hand-truck', 'Hand-truck w/Platform', 'large-garage', 'colorguard-trailer', 1),
    item('caution-tape', 'Rolls of Caution Tape', 'large-garage', 'colorguard-trailer', 2),
    item('plume-cases', 'Plume Cases', 'uniform-room', 'colorguard-trailer', 6),
    item('green-plume-bags', 'Large Green Plume Bags', 'uniform-room', 'colorguard-trailer', 2),
    item('z-racks', 'Z-Racks', 'uniform-room', 'colorguard-trailer', 2),
    item('hanger-crate', 'Crate of Hangers', 'uniform-room', 'colorguard-trailer', 1),
    item('drum-major-plumes', 'Drum Major Plumes', 'uniform-room', 'colorguard-trailer', 6),
    item('uniform-bag', 'Uniform Bag', 'uniform-room', 'colorguard-trailer', 1),
  ];
}

function looksLikeStarterInstrumentCatalog(list) {
  if (!Array.isArray(list) || list.length < 3) return false;
  const ids = list.map(function (i) { return i && i.id; }).filter(Boolean);
  if (ids.indexOf('snare') < 0 || ids.indexOf('marimba') < 0 || ids.indexOf('bari') < 0) return false;
  for (let i = 0; i < ids.length; i++) {
    if (!STARTER_INSTRUMENT_IDS[ids[i]]) return false;
  }
  return true;
}

function applySheetCatalog(state) {
  const oldIds = (state.equipment || []).map(function (i) { return i && i.id; }).filter(Boolean);
  state.equipment = defaultEquipment();
  const keep = {};
  state.equipment.forEach(function (i) { keep[i.id] = true; });
  (state.schedules || []).forEach(function (sc) {
    ['equipmentLoaded', 'equipmentSkipped'].forEach(function (key) {
      if (!sc[key] || typeof sc[key] !== 'object') return;
      oldIds.forEach(function (id) {
        if (!keep[id]) delete sc[key][id];
      });
    });
  });
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
    section: String(src.section || '').trim(),
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
  const fromPack = state.truckPack && Array.isArray(state.truckPack.instruments)
    ? state.truckPack.instruments
    : null;
  if (!Array.isArray(state.equipment) || !state.equipment.length) {
    if (fromPack && fromPack.length && !looksLikeStarterInstrumentCatalog(fromPack)) {
      state.equipment = fromPack.map(itemFromInstrument).filter(function (i) { return i.id && i.name; });
    } else {
      state.equipment = defaultEquipment();
    }
    changed = true;
  } else if (state.equipmentCatalogV !== EQUIPMENT_CATALOG_V
      && looksLikeStarterInstrumentCatalog(state.equipment)) {
    applySheetCatalog(state);
    changed = true;
  } else {
    const next = state.equipment.map(function (item) { return normalizeItem(item, item && item.id); });
    if (JSON.stringify(state.equipment) !== JSON.stringify(next)) changed = true;
    state.equipment = next;
  }
  if (state.equipmentCatalogV !== EQUIPMENT_CATALOG_V) {
    state.equipmentCatalogV = EQUIPMENT_CATALOG_V;
    changed = true;
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

function sectioned(items) {
  const order = [];
  const buckets = {};
  (items || []).forEach(function (item) {
    const key = String((item && item.section) || '').trim();
    if (!buckets[key]) {
      buckets[key] = [];
      order.push(key);
    }
    buckets[key].push(item);
  });
  return order.map(function (key) {
    return { label: key, items: buckets[key] };
  });
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
  item.section = merged.section;
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
  EQUIPMENT_CATALOG_V: EQUIPMENT_CATALOG_V,
  defaultEquipment: defaultEquipment,
  ensureEquipment: ensureEquipment,
  catalog: catalog,
  eventItems: eventItems,
  neededItems: neededItems,
  stats: stats,
  grouped: grouped,
  sectioned: sectioned,
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
  EQUIPMENT_CATALOG_V,
  defaultEquipment,
  ensureEquipment,
  catalog,
  eventItems,
  neededItems,
  stats,
  grouped,
  sectioned,
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
