import { test } from 'node:test';
import assert from 'node:assert/strict';
import TruckPack from '../truck-pack.js';

function packAndPlan() {
  const state = {};
  TruckPack.ensureTruckPack(state);
  const pack = state.truckPack;
  const plan = TruckPack.getPlan(pack);
  return { state, pack, plan };
}

test('default pack has Eagle 1, Eagle 2, two floors, drawers on one truck', () => {
  const pack = TruckPack.defaultTruckPack();
  assert.equal(pack.trucks.length, 2);
  assert.equal(pack.trucks[0].name, 'Eagle 1');
  assert.equal(pack.trucks[1].name, 'Eagle 2');
  pack.trucks.forEach((t) => {
    assert.ok(t.floors.some((f) => f.kind === 'open'), t.name + ' has open floor 1');
    assert.ok(t.floors.some((f) => f.kind === 'shelves'), t.name + ' has shelves');
  });
  const drawers = pack.trucks.flatMap((t) => t.floors.filter((f) => f.kind === 'drawers'));
  assert.equal(drawers.length, 1);
  assert.equal(drawers[0].drawers, 16);
  assert.ok(pack.instruments.some((i) => i.category === 'battery'));
  assert.ok(pack.instruments.some((i) => i.category === 'pit'));
  assert.ok(pack.instruments.some((i) => i.id === 'trombone' && i.prefer === 'drawer'));
  assert.ok(pack.instruments.some((i) => i.id === 'bari'));
  assert.ok(pack.instruments.some((i) => i.id === 'mellophone'));
  assert.ok(pack.instruments.some((i) => i.id === 'sousa'));
  assert.ok(pack.instruments.some((i) => i.id === 'bassclar'));
  assert.ok(pack.instruments.some((i) => i.id === 'barisax'));
});

test('ensureTruckPack fills empty logistics state and is idempotent', () => {
  const state = {};
  assert.equal(TruckPack.ensureTruckPack(state), true);
  assert.ok(state.truckPack.trucks.length >= 2);
  assert.equal(TruckPack.ensureTruckPack(state), false);
});

test('ensureTruckPack restores drawers if both trucks lose them', () => {
  const state = { truckPack: TruckPack.defaultTruckPack() };
  state.truckPack.trucks.forEach((t) => {
    t.floors = t.floors.filter((f) => f.kind !== 'drawers');
  });
  assert.equal(TruckPack.ensureTruckPack(state), true);
  assert.ok(state.truckPack.trucks.some((t) => t.floors.some((f) => f.kind === 'drawers')));
});

test('pieces expand by quantity', () => {
  const pack = TruckPack.defaultTruckPack();
  pack.instruments = [
    { id: 'bari', name: 'Baritones', category: 'wind', qty: 3, w: 1, d: 2, prefer: 'shelf' },
  ];
  const pieces = TruckPack.piecesFromInventory(pack);
  assert.equal(pieces.length, 3);
  assert.equal(pieces[0].id, 'bari#1');
  assert.equal(pieces[2].id, 'bari#3');
});

test('open-floor placement rejects overlap and out of bounds', () => {
  const { pack, plan } = packAndPlan();
  const floor = pack.trucks[0].floors.find((f) => f.kind === 'open');
  const a = { id: 'a#1', w: 4, d: 2, prefer: 'open' };
  const b = { id: 'b#1', w: 4, d: 2, prefer: 'open' };
  const p1 = { truckId: 'eagle1', floorId: floor.id, x: 0, y: 0 };
  assert.equal(TruckPack.canPlace(pack, plan, a, p1).ok, true);
  TruckPack.placePiece(plan, a.id, p1, a);
  assert.equal(TruckPack.canPlace(pack, plan, b, p1).ok, false);
  assert.equal(TruckPack.canPlace(pack, plan, a, { truckId: 'eagle1', floorId: floor.id, x: 3, y: 0 }).ok, false);
  assert.equal(TruckPack.canPlace(pack, plan, b, { truckId: 'eagle1', floorId: floor.id, x: 0, y: 2 }).ok, true);
});

test('shelf and drawer slots cannot double-book', () => {
  const { pack, plan } = packAndPlan();
  const shelfFloor = pack.trucks[0].floors.find((f) => f.kind === 'shelves');
  const shelf = shelfFloor.shelves[0];
  const piece = { id: 'snare#1', w: 1, d: 1, prefer: 'shelf' };
  const other = { id: 'snare#2', w: 1, d: 1, prefer: 'shelf' };
  const slot = { truckId: 'eagle1', floorId: shelfFloor.id, shelfId: shelf.id, slot: 0 };
  assert.equal(TruckPack.canPlace(pack, plan, piece, slot).ok, true);
  TruckPack.placePiece(plan, piece.id, slot);
  assert.equal(TruckPack.canPlace(pack, plan, other, slot).ok, false);

  const drawerFloor = pack.trucks[1].floors.find((f) => f.kind === 'drawers');
  const drawer = { truckId: 'eagle2', floorId: drawerFloor.id, slot: 0 };
  const tbone = { id: 'trombone#1', w: 1, d: 1, prefer: 'drawer' };
  assert.equal(TruckPack.canPlace(pack, plan, tbone, drawer).ok, true);
});

test('auto-pack puts trombones in drawers, pit on floor 1, battery on shelves', () => {
  const { pack, plan } = packAndPlan();
  const result = TruckPack.autoPack(pack, plan, { replace: true });
  assert.ok(result.placed > 0);
  assert.equal(result.remaining, 0, 'starter catalog should fit on two trucks');

  const pieces = TruckPack.piecesFromInventory(pack);
  const byId = Object.fromEntries(pieces.map((p) => [p.id, p]));
  const trombones = pieces.filter((p) => p.catalogId === 'trombone');
  assert.ok(trombones.length > 0);
  trombones.forEach((p) => {
    const pl = plan.placements[p.id];
    assert.ok(pl, 'trombone is placed');
    const floor = TruckPack.findFloor(pack, pl.truckId, pl.floorId);
    assert.equal(floor.kind, 'drawers');
  });

  const marimbas = pieces.filter((p) => p.catalogId === 'marimba');
  marimbas.forEach((p) => {
    const pl = plan.placements[p.id];
    assert.ok(pl, 'marimba is placed');
    const floor = TruckPack.findFloor(pack, pl.truckId, pl.floorId);
    assert.equal(floor.kind, 'open');
  });

  const snares = pieces.filter((p) => p.catalogId === 'snare');
  snares.forEach((p) => {
    const pl = plan.placements[p.id];
    assert.ok(pl, 'snare is placed');
    const floor = TruckPack.findFloor(pack, pl.truckId, pl.floorId);
    assert.equal(floor.kind, 'shelves');
  });

  // No two pieces share an open-floor cell.
  const cells = new Set();
  Object.entries(plan.placements).forEach(([pid, pl]) => {
    if (pl.x == null) return;
    TruckPack.cellsFor(byId[pid], pl).forEach((c) => {
      const key = pl.truckId + ':' + pl.floorId + ':' + c.x + ',' + c.y;
      assert.equal(cells.has(key), false, 'overlap at ' + key);
      cells.add(key);
    });
  });
});

test('reducing quantity drops extra placements', () => {
  const { pack, plan } = packAndPlan();
  const bari = pack.instruments.find((i) => i.id === 'bari');
  bari.qty = 2;
  TruckPack.placePiece(plan, 'bari#1', { truckId: 'eagle1', floorId: 'e1-f2', shelfId: 'e1-sh-df', slot: 0 });
  TruckPack.placePiece(plan, 'bari#2', { truckId: 'eagle1', floorId: 'e1-f2', shelfId: 'e1-sh-df', slot: 1 });
  TruckPack.placePiece(plan, 'bari#9', { truckId: 'eagle1', floorId: 'e1-f2', shelfId: 'e1-sh-df', slot: 2 });
  const removed = TruckPack.pruneInvalidPlacements(pack, plan);
  assert.ok(removed >= 1);
  assert.equal(plan.placements['bari#9'], undefined);
  assert.ok(plan.placements['bari#1']);
});

test('stats count placed vs remaining', () => {
  const { pack, plan } = packAndPlan();
  const pieces = TruckPack.piecesFromInventory(pack);
  let s = TruckPack.stats(pack, plan);
  assert.equal(s.total, pieces.length);
  assert.equal(s.placed, 0);
  TruckPack.autoPack(pack, plan, { replace: true });
  s = TruckPack.stats(pack, plan);
  assert.equal(s.placed + s.remaining, s.total);
  assert.ok(s.placed > 0);
});
