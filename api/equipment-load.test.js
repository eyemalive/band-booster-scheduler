import { test } from 'node:test';
import assert from 'node:assert/strict';
import EquipmentLoad from '../equipment-load.js';

test('default catalog uses storage and load locations', () => {
  const items = EquipmentLoad.defaultEquipment();
  const storage = new Set(items.map((i) => i.storageLocation));
  const load = new Set(items.map((i) => i.loadLocation));
  assert.ok(storage.has('percussion'));
  assert.ok(storage.has('large-garage'));
  assert.ok(storage.has('band-library'));
  assert.ok(load.has('eagle-1'));
  assert.ok(load.has('eagle-2'));
  assert.ok(load.has('golf-carts'));
  assert.ok(items.length >= 10);
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
  const snare = items.find((i) => i.id === 'snare');
  assert.equal(snare.loaded, false);
  assert.equal(snare.skipped, false);

  EquipmentLoad.toggleLoaded(game, 'snare', true);
  EquipmentLoad.toggleSkipped(banquet, 'snare', true);

  const gameItems = EquipmentLoad.eventItems(state, game);
  const banquetItems = EquipmentLoad.eventItems(state, banquet);
  assert.equal(gameItems.find((i) => i.id === 'snare').loaded, true);
  assert.equal(gameItems.find((i) => i.id === 'snare').skipped, false);
  assert.equal(banquetItems.find((i) => i.id === 'snare').loaded, false);
  assert.equal(banquetItems.find((i) => i.id === 'snare').skipped, true);
  assert.equal(EquipmentLoad.eventItems(state, game).find((i) => i.id === 'snare').loaded, true);
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
