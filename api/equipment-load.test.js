import { test } from 'node:test';
import assert from 'node:assert/strict';
import EquipmentLoad from '../equipment-load.js';

test('default catalog matches the food / podium / colorguard load sheet', () => {
  const items = EquipmentLoad.defaultEquipment();
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const storage = new Set(items.map((i) => i.storageLocation));
  const load = new Set(items.map((i) => i.loadLocation));
  assert.ok(items.length >= 40);
  assert.ok(storage.has('percussion'));
  assert.ok(storage.has('large-garage'));
  assert.ok(storage.has('band-library'));
  assert.ok(storage.has('uniform-room'));
  assert.ok(storage.has('small-garage'));
  assert.ok(load.has('eagle-2'));
  assert.ok(load.has('golf-carts'));
  assert.ok(load.has('colorguard-trailer'));
  assert.ok(!load.has('eagle-1'));
  assert.equal(byId['water-wagons'].qty, 2);
  assert.equal(byId['water-wagons'].loadLocation, 'golf-carts');
  assert.equal(byId['water-wagons'].section, 'Food Services');
  assert.equal(byId['percussion-snack-tote'].loadLocation, 'eagle-2');
  assert.equal(byId['percussion-snack-tote'].storageLocation, 'percussion');
  assert.equal(byId['pa1-folding-podium'].qty, 2);
  assert.equal(byId['pa2-folding-podium'].qty, 1);
  assert.match(byId['pa1-scissor-lift'].section, /Podium Assembly 1/);
  assert.match(byId['pa2-scissor-lift'].section, /Podium Assembly 2/);
  assert.equal(byId['generator'].storageLocation, 'small-garage');
  assert.equal(byId['plume-cases'].storageLocation, 'uniform-room');
  assert.equal(byId['volunteer-cooler-water'].notes, 'Also Band Library');
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  items.forEach((i) => {
    assert.ok(i.id);
    assert.ok(i.name);
    assert.ok(i.qty >= 1);
    assert.ok(EquipmentLoad.STORAGE_LOCATIONS.some((s) => s.id === i.storageLocation));
    assert.ok(EquipmentLoad.LOAD_LOCATIONS.some((s) => s.id === i.loadLocation));
  });
});

test('ensureEquipment seeds defaults and drops unused truckPack', () => {
  const state = {};
  assert.equal(EquipmentLoad.ensureEquipment(state), true);
  assert.ok(Array.isArray(state.equipment));
  assert.ok(state.equipment.length);
  assert.equal(state.truckPack, undefined);

  const again = EquipmentLoad.ensureEquipment(state);
  assert.equal(again, false);
});

test('ensureEquipment migrates old category values', () => {
  const state = {
    equipment: [
      { id: 'snare', name: 'Snare drums', category: 'battery', qty: 16, notes: 'cases' },
      { id: 'props', name: 'Props', category: 'weird', qty: 0 },
    ],
  };
  assert.equal(EquipmentLoad.ensureEquipment(state), true);
  assert.equal(state.equipment[0].storageLocation, 'percussion');
  assert.equal(state.equipment[0].loadLocation, 'eagle-2');
  assert.equal(state.equipment[0].notes, 'cases');
  assert.equal(state.equipment[1].storageLocation, 'band-hall');
  assert.equal(state.equipment[1].loadLocation, 'eagle-1');
  assert.equal(state.equipment[1].qty, 1);
  assert.equal(state.equipment[1].category, undefined);
  assert.equal(EquipmentLoad.ensureEquipment(state), false);
});

test('ensureEquipment migrates truckPack instruments', () => {
  const state = {
    truckPack: {
      instruments: [
        { id: 'snare', name: 'Snare drums', category: 'battery', qty: 16, notes: 'cases' },
        { id: 'props', name: 'Props', category: 'weird', qty: 0 },
      ],
    },
  };
  EquipmentLoad.ensureEquipment(state);
  assert.equal(state.equipment.length, 2);
  assert.equal(state.equipment[0].notes, 'cases');
  assert.equal(state.equipment[0].storageLocation, 'percussion');
  assert.equal(state.equipment[1].storageLocation, 'band-hall');
  assert.equal(state.equipment[1].qty, 1);
  assert.equal(state.truckPack, undefined);
});

test('per-event loaded and skipped checks are independent', () => {
  const state = {};
  EquipmentLoad.ensureEquipment(state);
  const game = { id: 'g1' };
  const banquet = { id: 'e1' };
  const items = EquipmentLoad.eventItems(state, game);
  const wagons = items.find((i) => i.id === 'water-wagons');
  assert.ok(wagons);
  assert.equal(wagons.loaded, false);
  assert.equal(wagons.skipped, false);

  EquipmentLoad.toggleLoaded(game, 'water-wagons', true);
  EquipmentLoad.toggleSkipped(banquet, 'water-wagons', true);

  const gameItems = EquipmentLoad.eventItems(state, game);
  const banquetItems = EquipmentLoad.eventItems(state, banquet);
  assert.equal(gameItems.find((i) => i.id === 'water-wagons').loaded, true);
  assert.equal(gameItems.find((i) => i.id === 'water-wagons').skipped, false);
  assert.equal(banquetItems.find((i) => i.id === 'water-wagons').loaded, false);
  assert.equal(banquetItems.find((i) => i.id === 'water-wagons').skipped, true);
  assert.equal(EquipmentLoad.eventItems(state, game).find((i) => i.id === 'water-wagons').loaded, true);
});

test('skipping an item clears its loaded check', () => {
  const sc = {};
  EquipmentLoad.toggleLoaded(sc, 'snare', true);
  EquipmentLoad.toggleSkipped(sc, 'snare', true);
  assert.equal(sc.equipmentLoaded.snare, undefined);
  assert.equal(sc.equipmentSkipped.snare, true);
});

test('stats count needed vs loaded, ignoring skipped', () => {
  const state = { equipment: [
    { id: 'a', name: 'A', storageLocation: 'band-hall', loadLocation: 'eagle-1', qty: 1 },
    { id: 'b', name: 'B', storageLocation: 'band-hall', loadLocation: 'eagle-1', qty: 1 },
    { id: 'c', name: 'C', storageLocation: 'band-hall', loadLocation: 'eagle-1', qty: 1 },
  ] };
  const sc = {};
  EquipmentLoad.toggleLoaded(sc, 'a', true);
  EquipmentLoad.toggleSkipped(sc, 'c', true);
  const s = EquipmentLoad.stats(EquipmentLoad.eventItems(state, sc));
  assert.equal(s.needed, 2);
  assert.equal(s.loaded, 1);
  assert.equal(s.total, 3);
});

test('event extras appear only on that event', () => {
  const state = { equipment: [{ id: 'a', name: 'A', storageLocation: 'band-hall', loadLocation: 'eagle-1', qty: 1 }] };
  const game = {};
  const other = {};
  EquipmentLoad.addEventExtra(game, {
    name: 'Homecoming throne',
    storageLocation: 'band-hall',
    loadLocation: 'colorguard-trailer',
    qty: 1,
  }, 'x1');
  const gameIds = EquipmentLoad.eventItems(state, game).map((i) => i.id);
  const otherIds = EquipmentLoad.eventItems(state, other).map((i) => i.id);
  assert.deepEqual(gameIds.sort(), ['a', 'x1']);
  assert.deepEqual(otherIds, ['a']);
});

test('copyNeededFrom copies skip/extras but not loaded checks', () => {
  const from = {};
  EquipmentLoad.toggleSkipped(from, 'snare', true);
  EquipmentLoad.toggleLoaded(from, 'tenor', true);
  EquipmentLoad.addEventExtra(from, { name: 'Banner', storageLocation: 'band-hall', loadLocation: 'eagle-1' }, 'banner');
  const to = {};
  EquipmentLoad.toggleLoaded(to, 'snare', true);
  EquipmentLoad.copyNeededFrom(from, to);
  assert.equal(to.equipmentSkipped.snare, true);
  assert.equal(to.equipmentLoaded.tenor, undefined);
  assert.equal(to.equipmentLoaded.snare, undefined);
  assert.equal(to.equipmentExtra[0].id, 'banner');
});

test('removeCatalogItem drops the item and event checks', () => {
  const state = {
    equipment: [{ id: 'a', name: 'A', storageLocation: 'band-hall', loadLocation: 'eagle-1', qty: 1 }],
    schedules: [{ id: 's1', equipmentLoaded: { a: true }, equipmentSkipped: {} }],
  };
  EquipmentLoad.removeCatalogItem(state, 'a');
  assert.equal(state.equipment.length, 0);
  assert.equal(state.schedules[0].equipmentLoaded.a, undefined);
});

test('grouped orders load locations and omits empty ones', () => {
  const items = [
    { id: 'w', name: 'W', loadLocation: 'eagle-2' },
    { id: 'b', name: 'B', loadLocation: 'eagle-1' },
  ];
  const groups = EquipmentLoad.grouped(items, 'load');
  assert.deepEqual(groups.map((g) => g.id), ['eagle-1', 'eagle-2']);
});

test('grouped can order by storage location', () => {
  const items = [
    { id: 'w', name: 'W', storageLocation: 'band-library' },
    { id: 'p', name: 'P', storageLocation: 'percussion' },
  ];
  const groups = EquipmentLoad.grouped(items, 'storage');
  assert.deepEqual(groups.map((g) => g.id), ['band-library', 'percussion']);
});

test('ensureEquipment replaces the starter instrument catalog', () => {
  const state = {
    equipment: [
      { id: 'snare', name: 'Snare drums', storageLocation: 'percussion', loadLocation: 'eagle-2', qty: 16 },
      { id: 'marimba', name: 'Marimbas', storageLocation: 'large-garage', loadLocation: 'eagle-1', qty: 4 },
      { id: 'bari', name: 'Baritones', storageLocation: 'band-library', loadLocation: 'eagle-2', qty: 16 },
      { id: 'water', name: 'Water coolers', storageLocation: 'large-garage', loadLocation: 'golf-carts', qty: 2 },
    ],
    schedules: [{ id: 's1', equipmentLoaded: { snare: true }, equipmentSkipped: {} }],
  };
  assert.equal(EquipmentLoad.ensureEquipment(state), true);
  assert.ok(state.equipment.find((i) => i.id === 'water-wagons'));
  assert.equal(state.equipment.find((i) => i.id === 'snare'), undefined);
  assert.equal(state.schedules[0].equipmentLoaded.snare, undefined);
  assert.equal(state.equipmentCatalogV, EquipmentLoad.EQUIPMENT_CATALOG_V);
  assert.equal(EquipmentLoad.ensureEquipment(state), false);
});

test('ensureEquipment keeps a custom catalog that is not the starter list', () => {
  const state = {
    equipment: [
      { id: 'custom-throne', name: 'Homecoming throne', storageLocation: 'band-hall', loadLocation: 'eagle-1', qty: 1 },
      { id: 'snare', name: 'Snare drums', storageLocation: 'percussion', loadLocation: 'eagle-2', qty: 16 },
    ],
  };
  EquipmentLoad.ensureEquipment(state);
  assert.equal(state.equipment.length, 2);
  assert.equal(state.equipment[0].id, 'custom-throne');
  assert.equal(state.equipment[1].id, 'snare');
  assert.equal(state.equipmentCatalogV, EquipmentLoad.EQUIPMENT_CATALOG_V);
});

test('ensureEquipment replaces a starter truckPack with the sheet catalog', () => {
  const state = {
    truckPack: {
      instruments: [
        { id: 'snare', name: 'Snare drums', category: 'battery', qty: 16 },
        { id: 'marimba', name: 'Marimbas', category: 'pit', qty: 4 },
        { id: 'bari', name: 'Baritones', category: 'wind', qty: 16 },
      ],
    },
  };
  EquipmentLoad.ensureEquipment(state);
  assert.ok(state.equipment.find((i) => i.id === 'water-wagons'));
  assert.equal(state.equipment.find((i) => i.id === 'snare'), undefined);
  assert.equal(state.truckPack, undefined);
});

test('sectioned groups items under first-seen section labels', () => {
  const sections = EquipmentLoad.sectioned([
    { id: 'a', name: 'A', section: 'Food Services' },
    { id: 'b', name: 'B', section: 'Podium Assembly 1 (Under Track Stadium Bleachers)' },
    { id: 'c', name: 'C', section: 'Food Services' },
    { id: 'd', name: 'D', section: '' },
  ]);
  assert.deepEqual(sections.map((s) => s.label), [
    'Food Services',
    'Podium Assembly 1 (Under Track Stadium Bleachers)',
    '',
  ]);
  assert.deepEqual(sections[0].items.map((i) => i.id), ['a', 'c']);
  assert.deepEqual(sections[2].items.map((i) => i.id), ['d']);
});

test('storage and load option lists match requested labels', () => {
  assert.deepEqual(EquipmentLoad.STORAGE_LOCATIONS.map((s) => s.label), [
    'Band Library',
    'Uniform Room',
    'Band Hall',
    'Percussion',
    'Large Garage (Door 33A)',
    'Small Garage (Door 30)',
  ]);
  assert.deepEqual(EquipmentLoad.LOAD_LOCATIONS.map((s) => s.label), [
    'Eagle 1',
    'Eagle 2',
    'Colorguard Trailer',
    'Golf Carts',
  ]);
});
