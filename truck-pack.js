// Pure truck-pack model for Allen Band Booster logistics.
// Used by the web UI and by Node tests. No DOM here.

'use strict';

const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

  const CATEGORIES = [
    { id: 'battery', label: 'Battery' },
    { id: 'pit', label: 'Front ensemble (pit)' },
    { id: 'wind', label: 'Winds' },
  ];

  const PREFERS = [
    { id: 'open', label: 'Floor 1 — open deck' },
    { id: 'shelf', label: 'Floor 2 — shelves' },
    { id: 'drawer', label: 'Trombone drawers' },
  ];

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function defaultShelves(prefix) {
    return [
      { id: prefix + '-sh-df', name: 'Driver — front', side: 'driver', slots: 8 },
      { id: prefix + '-sh-dm', name: 'Driver — mid', side: 'driver', slots: 8 },
      { id: prefix + '-sh-dr', name: 'Driver — rear', side: 'driver', slots: 8 },
      { id: prefix + '-sh-pf', name: 'Passenger — front', side: 'passenger', slots: 8 },
      { id: prefix + '-sh-pm', name: 'Passenger — mid', side: 'passenger', slots: 8 },
      { id: prefix + '-sh-pr', name: 'Passenger — rear', side: 'passenger', slots: 8 },
    ];
  }

  function defaultInstruments() {
    return [
      // Battery — Floor 2 shelves
      { id: 'snare', name: 'Snare drums', category: 'battery', qty: 16, w: 1, d: 1, prefer: 'shelf', notes: '' },
      { id: 'tenor', name: 'Tenors', category: 'battery', qty: 6, w: 2, d: 2, prefer: 'shelf', notes: 'Quads / quints in cases' },
      { id: 'bassdrum', name: 'Bass drums', category: 'battery', qty: 5, w: 2, d: 2, prefer: 'shelf', notes: '' },
      { id: 'cymbal', name: 'Cymbals', category: 'battery', qty: 8, w: 1, d: 1, prefer: 'shelf', notes: '' },

      // Front ensemble — Floor 1 open deck
      { id: 'marimba', name: 'Marimbas', category: 'pit', qty: 4, w: 4, d: 2, prefer: 'open', notes: '' },
      { id: 'vibe', name: 'Vibraphones', category: 'pit', qty: 3, w: 3, d: 2, prefer: 'open', notes: '' },
      { id: 'xylo', name: 'Xylophone', category: 'pit', qty: 1, w: 2, d: 2, prefer: 'open', notes: '' },
      { id: 'bells', name: 'Bells / glockenspiel', category: 'pit', qty: 1, w: 2, d: 1, prefer: 'open', notes: '' },
      { id: 'timpani', name: 'Timpani cart', category: 'pit', qty: 1, w: 5, d: 2, prefer: 'open', notes: '' },
      { id: 'synth', name: 'Synthesizer racks', category: 'pit', qty: 2, w: 2, d: 2, prefer: 'open', notes: '' },
      { id: 'auxrack', name: 'Aux percussion racks', category: 'pit', qty: 2, w: 2, d: 2, prefer: 'open', notes: '' },
      { id: 'concertbd', name: 'Concert bass drum', category: 'pit', qty: 1, w: 2, d: 2, prefer: 'open', notes: '' },
      { id: 'chimes', name: 'Chimes', category: 'pit', qty: 1, w: 1, d: 2, prefer: 'open', notes: '' },
      { id: 'drumset', name: 'Drum set', category: 'pit', qty: 1, w: 3, d: 2, prefer: 'open', notes: '' },
      { id: 'sub', name: 'Subwoofers', category: 'pit', qty: 2, w: 2, d: 2, prefer: 'open', notes: '' },
      { id: 'mixer', name: 'Mixer / electronics', category: 'pit', qty: 1, w: 2, d: 2, prefer: 'open', notes: '' },
      { id: 'pitcart', name: 'Pit carts / field frames', category: 'pit', qty: 4, w: 3, d: 2, prefer: 'open', notes: '' },

      // Winds that ride the truck (not student-carried)
      { id: 'bari', name: 'Baritones', category: 'wind', qty: 16, w: 1, d: 2, prefer: 'shelf', notes: '' },
      { id: 'mellophone', name: 'Mellophones', category: 'wind', qty: 16, w: 1, d: 1, prefer: 'shelf', notes: '' },
      { id: 'trombone', name: 'Trombones', category: 'wind', qty: 16, w: 1, d: 1, prefer: 'drawer', notes: 'Pull-out drawers on one truck' },
      { id: 'sousa', name: 'Sousaphones', category: 'wind', qty: 12, w: 2, d: 2, prefer: 'shelf', notes: '' },
      { id: 'bassclar', name: 'Bass clarinets', category: 'wind', qty: 4, w: 1, d: 2, prefer: 'shelf', notes: '' },
      { id: 'barisax', name: 'Baritone saxophones', category: 'wind', qty: 4, w: 2, d: 2, prefer: 'shelf', notes: '' },
    ];
  }

  function defaultTruckPack() {
    return {
      _v: 1,
      instruments: defaultInstruments(),
      trucks: [
        {
          id: 'eagle1',
          name: 'Eagle 1',
          floors: [
            { id: 'e1-f1', name: 'Floor 1 — Front ensemble', kind: 'open', cols: 6, rows: 12 },
            { id: 'e1-f2', name: 'Floor 2 — Shelves', kind: 'shelves', shelves: defaultShelves('e1') },
          ],
        },
        {
          id: 'eagle2',
          name: 'Eagle 2',
          floors: [
            { id: 'e2-f1', name: 'Floor 1 — Front ensemble', kind: 'open', cols: 6, rows: 12 },
            { id: 'e2-f2', name: 'Floor 2 — Shelves', kind: 'shelves', shelves: defaultShelves('e2') },
            { id: 'e2-drawers', name: 'Trombone drawers', kind: 'drawers', drawers: 16 },
          ],
        },
      ],
      plans: [
        { id: 'season', name: 'Season load plan', date: '', placements: {} },
      ],
      activePlanId: 'season',
    };
  }

  function pieceId(catalogId, index) {
    return catalogId + '#' + index;
  }

  function parsePieceId(id) {
    const i = String(id || '').lastIndexOf('#');
    if (i <= 0) return { catalogId: id, index: 1 };
    return { catalogId: id.slice(0, i), index: parseInt(id.slice(i + 1), 10) || 1 };
  }

  function normInt(v, fallback, min) {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return fallback;
    return min != null ? Math.max(min, n) : n;
  }

  function piecesFromInventory(pack) {
    const out = [];
    (pack && pack.instruments ? pack.instruments : []).forEach(function (inst) {
      const qty = normInt(inst.qty, 0, 0);
      const w = normInt(inst.w, 1, 1);
      const d = normInt(inst.d, 1, 1);
      for (let i = 1; i <= qty; i++) {
        const label = qty === 1 ? inst.name : inst.name.replace(/s$/, '') + ' ' + i;
        out.push({
          id: pieceId(inst.id, i),
          catalogId: inst.id,
          name: qty === 1 ? inst.name : inst.name + ' ' + i,
          label: label,
          category: inst.category || 'wind',
          prefer: inst.prefer || 'shelf',
          w: w,
          d: d,
          notes: inst.notes || '',
          index: i,
          qty: qty,
        });
      }
    });
    return out;
  }

  function findTruck(pack, truckId) {
    return (pack.trucks || []).find(function (t) { return t.id === truckId; }) || null;
  }

  function findFloor(pack, truckId, floorId) {
    const truck = findTruck(pack, truckId);
    if (!truck) return null;
    return (truck.floors || []).find(function (f) { return f.id === floorId; }) || null;
  }

  function findShelf(floor, shelfId) {
    if (!floor || floor.kind !== 'shelves') return null;
    return (floor.shelves || []).find(function (s) { return s.id === shelfId; }) || null;
  }

  function getPlan(pack, planId) {
    const id = planId || (pack && pack.activePlanId);
    return (pack.plans || []).find(function (p) { return p.id === id; }) || (pack.plans || [])[0] || null;
  }

  function cellsFor(piece, placement) {
    const cells = [];
    if (!piece || !placement || placement.x == null || placement.y == null) return cells;
    const x = placement.x;
    const y = placement.y;
    for (let dy = 0; dy < piece.d; dy++) {
      for (let dx = 0; dx < piece.w; dx++) cells.push({ x: x + dx, y: y + dy });
    }
    return cells;
  }

  function occupiedOpen(pack, plan, truckId, floorId, ignorePieceId, extraPieces) {
    const set = new Set();
    const byId = {};
    piecesFromInventory(pack).forEach(function (p) { byId[p.id] = p; });
    (extraPieces || []).forEach(function (p) { if (p && p.id) byId[p.id] = p; });
    Object.keys(plan.placements || {}).forEach(function (pid) {
      if (pid === ignorePieceId) return;
      const pl = plan.placements[pid];
      if (!pl || pl.truckId !== truckId || pl.floorId !== floorId) return;
      if (pl.x == null) return;
      const piece = byId[pid] || { w: pl.w || 1, d: pl.d || 1 };
      cellsFor(piece, pl).forEach(function (c) { set.add(c.x + ',' + c.y); });
    });
    return set;
  }

  function slotTaken(plan, truckId, floorId, shelfId, slot, ignorePieceId) {
    return Object.keys(plan.placements || {}).some(function (pid) {
      if (pid === ignorePieceId) return false;
      const pl = plan.placements[pid];
      return pl
        && pl.truckId === truckId
        && pl.floorId === floorId
        && (shelfId ? pl.shelfId === shelfId : true)
        && pl.slot === slot
        && pl.x == null;
    });
  }

  function canPlace(pack, plan, piece, placement) {
    if (!pack || !plan || !piece || !placement) return { ok: false, reason: 'Missing data' };
    const floor = findFloor(pack, placement.truckId, placement.floorId);
    if (!floor) return { ok: false, reason: 'Unknown floor' };

    if (floor.kind === 'open') {
      const cols = normInt(floor.cols, 6, 1);
      const rows = normInt(floor.rows, 12, 1);
      const x = placement.x;
      const y = placement.y;
      if (!Number.isInteger(x) || !Number.isInteger(y)) return { ok: false, reason: 'Need a grid cell' };
      if (x < 0 || y < 0 || x + piece.w > cols || y + piece.d > rows) {
        return { ok: false, reason: 'Does not fit on this deck' };
      }
      const occ = occupiedOpen(pack, plan, placement.truckId, floor.id, piece.id, [piece]);
      for (let dy = 0; dy < piece.d; dy++) {
        for (let dx = 0; dx < piece.w; dx++) {
          if (occ.has((x + dx) + ',' + (y + dy))) return { ok: false, reason: 'Overlaps another instrument' };
        }
      }
      return { ok: true };
    }

    if (floor.kind === 'shelves') {
      const shelf = findShelf(floor, placement.shelfId);
      if (!shelf) return { ok: false, reason: 'Unknown shelf' };
      const slot = placement.slot;
      if (!Number.isInteger(slot) || slot < 0 || slot >= normInt(shelf.slots, 0, 0)) {
        return { ok: false, reason: 'Unknown shelf slot' };
      }
      if (slotTaken(plan, placement.truckId, floor.id, shelf.id, slot, piece.id)) {
        return { ok: false, reason: 'Slot already filled' };
      }
      return { ok: true };
    }

    if (floor.kind === 'drawers') {
      const slot = placement.slot;
      const n = normInt(floor.drawers, 0, 0);
      if (!Number.isInteger(slot) || slot < 0 || slot >= n) return { ok: false, reason: 'Unknown drawer' };
      if (slotTaken(plan, placement.truckId, floor.id, null, slot, piece.id)) {
        return { ok: false, reason: 'Drawer already filled' };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Unknown floor type' };
  }

  function placePiece(plan, pieceId, placement, piece) {
    plan.placements = plan.placements || {};
    const saved = Object.assign({}, placement);
    if (piece) {
      saved.w = piece.w;
      saved.d = piece.d;
    }
    plan.placements[pieceId] = saved;
    return plan;
  }

  function unplacePiece(plan, pieceId) {
    if (plan && plan.placements) delete plan.placements[pieceId];
    return plan;
  }

  function firstFitOpen(pack, plan, piece, truckId, floor) {
    const cols = normInt(floor.cols, 6, 1);
    const rows = normInt(floor.rows, 12, 1);
    for (let y = 0; y <= rows - piece.d; y++) {
      for (let x = 0; x <= cols - piece.w; x++) {
        const placement = { truckId: truckId, floorId: floor.id, x: x, y: y };
        if (canPlace(pack, plan, piece, placement).ok) return placement;
      }
    }
    return null;
  }

  function firstFitShelf(pack, plan, piece, truckId, floor) {
    const shelves = floor.shelves || [];
    for (let s = 0; s < shelves.length; s++) {
      const shelf = shelves[s];
      const n = normInt(shelf.slots, 0, 0);
      for (let slot = 0; slot < n; slot++) {
        const placement = { truckId: truckId, floorId: floor.id, shelfId: shelf.id, slot: slot };
        if (canPlace(pack, plan, piece, placement).ok) return placement;
      }
    }
    return null;
  }

  function firstFitDrawer(pack, plan, piece, truckId, floor) {
    const n = normInt(floor.drawers, 0, 0);
    for (let slot = 0; slot < n; slot++) {
      const placement = { truckId: truckId, floorId: floor.id, slot: slot };
      if (canPlace(pack, plan, piece, placement).ok) return placement;
    }
    return null;
  }

  function floorsOfKind(pack, kind) {
    const out = [];
    (pack.trucks || []).forEach(function (t) {
      (t.floors || []).forEach(function (f) {
        if (f.kind === kind) out.push({ truckId: t.id, floor: f });
      });
    });
    return out;
  }

  function preferKind(prefer) {
    if (prefer === 'open') return 'open';
    if (prefer === 'drawer') return 'drawers';
    return 'shelves';
  }

  function tryPlaceOnKind(pack, plan, piece, kind) {
    const floors = floorsOfKind(pack, kind);
    for (let i = 0; i < floors.length; i++) {
      const { truckId, floor } = floors[i];
      let placement = null;
      if (kind === 'open') placement = firstFitOpen(pack, plan, piece, truckId, floor);
      else if (kind === 'shelves') placement = firstFitShelf(pack, plan, piece, truckId, floor);
      else if (kind === 'drawers') placement = firstFitDrawer(pack, plan, piece, truckId, floor);
      if (placement) return placement;
    }
    return null;
  }

  function autoPack(pack, plan, options) {
    options = options || {};
    plan.placements = plan.placements || {};
    if (options.replace) plan.placements = {};
    const pieces = piecesFromInventory(pack);
    const unplaced = pieces.filter(function (p) { return !plan.placements[p.id]; });
    // Larger items first so pit frames claim deck space before small leftover pieces.
    unplaced.sort(function (a, b) {
      const area = (b.w * b.d) - (a.w * a.d);
      if (area) return area;
      return a.name.localeCompare(b.name);
    });
    const fallback = ['drawers', 'open', 'shelves'];
    let placed = 0;
    unplaced.forEach(function (piece) {
      const preferred = preferKind(piece.prefer);
      let placement = tryPlaceOnKind(pack, plan, piece, preferred);
      if (!placement) {
        for (let i = 0; i < fallback.length; i++) {
          if (fallback[i] === preferred) continue;
          placement = tryPlaceOnKind(pack, plan, piece, fallback[i]);
          if (placement) break;
        }
      }
      if (placement) {
        placePiece(plan, piece.id, placement, piece);
        placed++;
      }
    });
    return { placed: placed, remaining: unplaced.length - placed };
  }

  function pruneInvalidPlacements(pack, plan) {
    if (!plan || !plan.placements) return 0;
    const pieces = piecesFromInventory(pack);
    const byId = {};
    pieces.forEach(function (p) { byId[p.id] = p; });
    let removed = 0;
    Object.keys(plan.placements).forEach(function (pid) {
      const piece = byId[pid];
      const pl = plan.placements[pid];
      if (!piece || !pl || !canPlace(pack, plan, piece, pl).ok) {
        delete plan.placements[pid];
        removed++;
      }
    });
    return removed;
  }

  function pruneAllPlans(pack) {
    let n = 0;
    (pack.plans || []).forEach(function (plan) { n += pruneInvalidPlacements(pack, plan); });
    return n;
  }

  function stats(pack, plan) {
    const pieces = piecesFromInventory(pack);
    const placed = pieces.filter(function (p) { return plan && plan.placements && plan.placements[p.id]; });
    const byCat = { battery: { total: 0, placed: 0 }, pit: { total: 0, placed: 0 }, wind: { total: 0, placed: 0 } };
    pieces.forEach(function (p) {
      const bucket = byCat[p.category] || (byCat[p.category] = { total: 0, placed: 0 });
      bucket.total++;
      if (plan && plan.placements && plan.placements[p.id]) bucket.placed++;
    });
    return {
      total: pieces.length,
      placed: placed.length,
      remaining: pieces.length - placed.length,
      byCategory: byCat,
    };
  }

  function describePlacement(pack, placement) {
    if (!placement) return 'Unassigned';
    const truck = findTruck(pack, placement.truckId);
    const floor = findFloor(pack, placement.truckId, placement.floorId);
    const truckName = truck ? truck.name : 'Truck';
    if (!floor) return truckName;
    if (floor.kind === 'open') {
      return truckName + ' · ' + floor.name + ' · cell ' + String.fromCharCode(65 + (placement.x || 0)) + ((placement.y || 0) + 1);
    }
    if (floor.kind === 'shelves') {
      const shelf = findShelf(floor, placement.shelfId);
      const shelfName = shelf ? shelf.name : 'Shelf';
      return truckName + ' · ' + shelfName + ' · slot ' + ((placement.slot || 0) + 1);
    }
    if (floor.kind === 'drawers') {
      return truckName + ' · Drawer ' + ((placement.slot || 0) + 1);
    }
    return truckName + ' · ' + floor.name;
  }

  function newPlan(name, date, fromPlan) {
    return {
      id: 'plan_' + Math.random().toString(36).slice(2, 9),
      name: name || 'Load plan',
      date: date || '',
      placements: fromPlan && fromPlan.placements ? clone(fromPlan.placements) : {},
    };
  }

  function ensureArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function ensureTruckPack(state) {
    if (!state) return false;
    let changed = false;
    if (!state.truckPack || typeof state.truckPack !== 'object') {
      state.truckPack = defaultTruckPack();
      return true;
    }
    const pack = state.truckPack;
    if (!pack._v) { pack._v = 1; changed = true; }
    if (!Array.isArray(pack.instruments) || !pack.instruments.length) {
      pack.instruments = defaultInstruments();
      changed = true;
    }
    if (!Array.isArray(pack.trucks) || pack.trucks.length < 2) {
      pack.trucks = defaultTruckPack().trucks;
      changed = true;
    } else {
      pack.trucks.forEach(function (t, idx) {
        t.floors = ensureArray(t.floors);
        const hasOpen = t.floors.some(function (f) { return f.kind === 'open'; });
        const hasShelves = t.floors.some(function (f) { return f.kind === 'shelves'; });
        const prefix = t.id || ('t' + idx);
        if (!hasOpen) {
          t.floors.unshift({ id: prefix + '-f1', name: 'Floor 1 — Front ensemble', kind: 'open', cols: 6, rows: 12 });
          changed = true;
        }
        if (!hasShelves) {
          t.floors.push({ id: prefix + '-f2', name: 'Floor 2 — Shelves', kind: 'shelves', shelves: defaultShelves(prefix) });
          changed = true;
        }
      });
      const hasDrawers = pack.trucks.some(function (t) {
        return (t.floors || []).some(function (f) { return f.kind === 'drawers'; });
      });
      if (!hasDrawers) {
        const e2 = pack.trucks.find(function (t) { return t.id === 'eagle2'; }) || pack.trucks[1];
        e2.floors.push({ id: (e2.id || 'eagle2') + '-drawers', name: 'Trombone drawers', kind: 'drawers', drawers: 16 });
        changed = true;
      }
    }
    if (!Array.isArray(pack.plans) || !pack.plans.length) {
      pack.plans = [{ id: 'season', name: 'Season load plan', date: '', placements: {} }];
      pack.activePlanId = 'season';
      changed = true;
    }
    if (!pack.activePlanId || !pack.plans.some(function (p) { return p.id === pack.activePlanId; })) {
      pack.activePlanId = pack.plans[0].id;
      changed = true;
    }
    pack.plans.forEach(function (p) {
      if (!p.placements || typeof p.placements !== 'object') { p.placements = {}; changed = true; }
    });
    if (pruneAllPlans(pack)) changed = true;
    return changed;
  }

  const api = {
    CATEGORIES: CATEGORIES,
    PREFERS: PREFERS,
    defaultTruckPack: defaultTruckPack,
    defaultInstruments: defaultInstruments,
    ensureTruckPack: ensureTruckPack,
    pieceId: pieceId,
    parsePieceId: parsePieceId,
    piecesFromInventory: piecesFromInventory,
    findTruck: findTruck,
    findFloor: findFloor,
    findShelf: findShelf,
    getPlan: getPlan,
    cellsFor: cellsFor,
    occupiedOpen: occupiedOpen,
    canPlace: canPlace,
    placePiece: placePiece,
    unplacePiece: unplacePiece,
    autoPack: autoPack,
    pruneInvalidPlacements: pruneInvalidPlacements,
    pruneAllPlans: pruneAllPlans,
    stats: stats,
    describePlacement: describePlacement,
    newPlan: newPlan,
    floorsOfKind: floorsOfKind,
  };

root.TruckPack = api;

export default api;
export {
  CATEGORIES,
  PREFERS,
  defaultTruckPack,
  defaultInstruments,
  ensureTruckPack,
  pieceId,
  parsePieceId,
  piecesFromInventory,
  findTruck,
  findFloor,
  findShelf,
  getPlan,
  cellsFor,
  occupiedOpen,
  canPlace,
  placePiece,
  unplacePiece,
  autoPack,
  pruneInvalidPlacements,
  pruneAllPlans,
  stats,
  describePlacement,
  newPlan,
  floorsOfKind,
};
