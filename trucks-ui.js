// Truck loading planner UI. Relies on globals from index.html (AS, save, esc, uid, _mode)
// and window.TruckPack from truck-pack.js.

let _truckView = 'plan';
let _truckId = 'eagle1';
let _floorId = null;
let _selectedPieceId = null;
let _truckFilter = 'unassigned';
let _dragPieceId = null;
let _hoverOrigin = null;

function tp() {
  if (typeof TruckPack === 'undefined' || !AS()) return null;
  if (_mode && _mode !== 'logistics') return AS().truckPack || null;
  TruckPack.ensureTruckPack(AS());
  return AS().truckPack;
}

function tpPlan() {
  const pack = tp();
  return pack ? TruckPack.getPlan(pack) : null;
}

function tpSave(rerender) {
  const pack = tp();
  if (pack) TruckPack.pruneAllPlans(pack);
  save();
  if (rerender !== false) renderTrucks();
}

function ensureLogisticsTruckPack() {
  if (!AS() || _mode !== 'logistics' || typeof TruckPack === 'undefined') return;
  if (TruckPack.ensureTruckPack(AS())) save();
}

function showTruckView(view) {
  _truckView = view || 'plan';
  renderTrucks();
}

function renderTrucks() {
  const panel = document.getElementById('panel-trucks');
  if (!panel || !panel.classList.contains('active')) return;
  if (typeof TruckPack === 'undefined') { setTimeout(renderTrucks, 50); return; }
  const pack = tp();
  if (!pack) {
    const planEl = document.getElementById('trucks-view-plan');
    if (planEl) planEl.innerHTML = '<div class="card">Load planner is available in Logistics mode.</div>';
    return;
  }
  document.querySelectorAll('#truck-subnav .btn').forEach(function (btn) {
    btn.classList.toggle('primary', btn.getAttribute('data-view') === _truckView);
  });
  const views = ['plan', 'inventory', 'layout'];
  views.forEach(function (v) {
    const el = document.getElementById('trucks-view-' + v);
    if (el) el.style.display = _truckView === v ? '' : 'none';
  });
  if (_truckView === 'plan') renderTruckPlan();
  if (_truckView === 'inventory') renderTruckInventory();
  if (_truckView === 'layout') renderTruckLayout();
}

function catLabel(cat) {
  const found = (TruckPack.CATEGORIES || []).find(function (c) { return c.id === cat; });
  return found ? found.label : cat;
}

function preferLabel(pref) {
  const found = (TruckPack.PREFERS || []).find(function (p) { return p.id === pref; });
  return found ? found.label : pref;
}

function pieceById(pack, id) {
  return TruckPack.piecesFromInventory(pack).find(function (p) { return p.id === id; }) || null;
}

function currentFloor(pack) {
  const truck = TruckPack.findTruck(pack, _truckId) || pack.trucks[0];
  if (!truck) return { truck: null, floor: null };
  let floor = (truck.floors || []).find(function (f) { return f.id === _floorId; });
  if (!floor) floor = (truck.floors || [])[0];
  if (floor) _floorId = floor.id;
  if (truck) _truckId = truck.id;
  return { truck: truck, floor: floor };
}

function selectTruck(id) {
  _truckId = id;
  _floorId = null;
  _hoverOrigin = null;
  renderTruckPlan();
}

function selectFloor(id) {
  _floorId = id;
  _hoverOrigin = null;
  renderTruckPlan();
}

function selectLoadPlan(id) {
  const pack = tp();
  if (!pack) return;
  pack.activePlanId = id;
  tpSave();
}

function addLoadPlan(duplicate) {
  const pack = tp();
  const current = tpPlan();
  if (!pack || !current) return;
  const sc = (typeof activeSched === 'function') ? activeSched() : null;
  const name = prompt('Name this load plan', duplicate ? (current.name + ' copy') : (sc ? sc.name : 'Load plan'));
  if (name === null) return;
  const date = sc && sc.date ? sc.date : (current.date || '');
  const plan = TruckPack.newPlan(name.trim() || 'Load plan', date, duplicate ? current : null);
  pack.plans.push(plan);
  pack.activePlanId = plan.id;
  tpSave();
}

function renameLoadPlan() {
  const plan = tpPlan();
  if (!plan) return;
  const name = prompt('Rename load plan', plan.name);
  if (name === null || !name.trim()) return;
  plan.name = name.trim();
  tpSave();
}

function deleteLoadPlan() {
  const pack = tp();
  if (!pack || pack.plans.length < 2) { alert('Keep at least one load plan.'); return; }
  const plan = tpPlan();
  if (!plan || !confirm('Delete "' + plan.name + '"?')) return;
  pack.plans = pack.plans.filter(function (p) { return p.id !== plan.id; });
  pack.activePlanId = pack.plans[0].id;
  tpSave();
}

function setTruckFilter(val) {
  _truckFilter = val;
  renderTruckPlan();
}

function selectPiece(id) {
  _selectedPieceId = (_selectedPieceId === id) ? null : id;
  renderTruckPlan();
}

function unplaceSelectedOr(id) {
  const plan = tpPlan();
  if (!plan) return;
  TruckPack.unplacePiece(plan, id);
  if (_selectedPieceId === id) _selectedPieceId = null;
  tpSave();
}

function tryPlace(pieceId, placement) {
  const pack = tp();
  const plan = tpPlan();
  const piece = pieceById(pack, pieceId);
  if (!pack || !plan || !piece) return false;
  const check = TruckPack.canPlace(pack, plan, piece, placement);
  if (!check.ok) {
    if (check.reason) {
      const msg = document.getElementById('truck-place-msg');
      if (msg) msg.textContent = check.reason;
    }
    return false;
  }
  TruckPack.placePiece(plan, piece.id, placement, piece);
  _selectedPieceId = null;
  _dragPieceId = null;
  _hoverOrigin = null;
  tpSave();
  return true;
}

function originForHover(floor, piece, cellX, cellY) {
  const cols = Math.max(1, parseInt(floor.cols, 10) || 6);
  const rows = Math.max(1, parseInt(floor.rows, 10) || 12);
  const x = Math.max(0, Math.min(cellX, cols - piece.w));
  const y = Math.max(0, Math.min(cellY, rows - piece.d));
  return { x: x, y: y };
}

function truckDragStart(ev, pieceId) {
  _dragPieceId = pieceId;
  _selectedPieceId = pieceId;
  ev.dataTransfer.setData('text/plain', pieceId);
  ev.dataTransfer.effectAllowed = 'move';
  if (ev.target && ev.target.classList) ev.target.classList.add('dragging');
  const grid = document.getElementById('trailer-grid');
  if (grid) grid.classList.add('is-dragging');
}

function truckDragEnd(ev) {
  if (ev.target && ev.target.classList) ev.target.classList.remove('dragging');
  _dragPieceId = null;
  _hoverOrigin = null;
  const grid = document.getElementById('trailer-grid');
  if (grid) {
    grid.classList.remove('is-dragging');
    grid.querySelectorAll('.trailer-cell').forEach(function (c) { c.classList.remove('ghost-ok', 'ghost-bad'); });
  }
}

function truckDragOverOpen(ev, cellX, cellY) {
  ev.preventDefault();
  const pack = tp();
  const plan = tpPlan();
  const { floor } = currentFloor(pack);
  const piece = pieceById(pack, _dragPieceId || _selectedPieceId);
  if (!floor || floor.kind !== 'open' || !piece) return;
  const origin = originForHover(floor, piece, cellX, cellY);
  _hoverOrigin = origin;
  const placement = { truckId: _truckId, floorId: floor.id, x: origin.x, y: origin.y };
  const ok = TruckPack.canPlace(pack, plan, piece, placement).ok;
  const grid = document.getElementById('trailer-grid');
  if (!grid) return;
  grid.querySelectorAll('.trailer-cell').forEach(function (c) {
    const x = parseInt(c.dataset.x, 10);
    const y = parseInt(c.dataset.y, 10);
    const inGhost = x >= origin.x && x < origin.x + piece.w && y >= origin.y && y < origin.y + piece.d;
    c.classList.toggle('ghost-ok', inGhost && ok);
    c.classList.toggle('ghost-bad', inGhost && !ok);
  });
}

function truckDropOpen(ev, cellX, cellY) {
  ev.preventDefault();
  const pieceId = (ev.dataTransfer && ev.dataTransfer.getData('text/plain')) || _dragPieceId || _selectedPieceId;
  const pack = tp();
  const { floor } = currentFloor(pack);
  const piece = pieceById(pack, pieceId);
  if (!floor || !piece) return;
  const origin = originForHover(floor, piece, cellX, cellY);
  tryPlace(pieceId, { truckId: _truckId, floorId: floor.id, x: origin.x, y: origin.y });
}

function truckClickOpen(cellX, cellY) {
  const pieceId = _selectedPieceId;
  if (!pieceId) return;
  const pack = tp();
  const { floor } = currentFloor(pack);
  const piece = pieceById(pack, pieceId);
  if (!floor || !piece) return;
  const origin = originForHover(floor, piece, cellX, cellY);
  tryPlace(pieceId, { truckId: _truckId, floorId: floor.id, x: origin.x, y: origin.y });
}

function truckDropSlot(ev, shelfId, slot) {
  ev.preventDefault();
  const pieceId = (ev.dataTransfer && ev.dataTransfer.getData('text/plain')) || _dragPieceId || _selectedPieceId;
  const { floor } = currentFloor(tp());
  if (!floor) return;
  const placement = { truckId: _truckId, floorId: floor.id, slot: slot };
  if (shelfId) placement.shelfId = shelfId;
  tryPlace(pieceId, placement);
}

function truckClickSlot(shelfId, slot) {
  if (!_selectedPieceId) return;
  const { floor } = currentFloor(tp());
  if (!floor) return;
  const placement = { truckId: _truckId, floorId: floor.id, slot: slot };
  if (shelfId) placement.shelfId = shelfId;
  tryPlace(_selectedPieceId, placement);
}

function autoPlaceRemaining() {
  const pack = tp();
  const plan = tpPlan();
  if (!pack || !plan) return;
  const result = TruckPack.autoPack(pack, plan, { replace: false });
  tpSave();
  alert(result.placed
    ? ('Placed ' + result.placed + ' remaining piece' + (result.placed === 1 ? '' : 's') + (result.remaining ? ('. ' + result.remaining + ' still need a spot.') : '.'))
    : (result.remaining ? 'Could not place the remaining pieces — add shelves or deck cells in Truck layouts.' : 'Everything is already placed.'));
}

function clearAndRepack() {
  if (!confirm('Clear this plan and auto-pack every instrument using the preferred locations (pit on Floor 1, cases on shelves, trombones in drawers)?')) return;
  const pack = tp();
  const plan = tpPlan();
  if (!pack || !plan) return;
  TruckPack.autoPack(pack, plan, { replace: true });
  tpSave();
}

function clearCurrentFloor() {
  const pack = tp();
  const plan = tpPlan();
  const { floor } = currentFloor(pack);
  if (!pack || !plan || !floor) return;
  if (!confirm('Clear every instrument from this floor of ' + (TruckPack.findTruck(pack, _truckId) || {}).name + '?')) return;
  Object.keys(plan.placements || {}).forEach(function (pid) {
    const pl = plan.placements[pid];
    if (pl && pl.truckId === _truckId && pl.floorId === floor.id) delete plan.placements[pid];
  });
  tpSave();
}

function clearAllPlacements() {
  const plan = tpPlan();
  if (!plan || !confirm('Unassign every instrument on this load plan?')) return;
  plan.placements = {};
  tpSave();
}

function renderTruckPlan() {
  const el = document.getElementById('trucks-view-plan');
  if (!el) return;
  const pack = tp();
  const plan = tpPlan();
  if (!pack || !plan) { el.innerHTML = ''; return; }
  const { truck, floor } = currentFloor(pack);
  const pieces = TruckPack.piecesFromInventory(pack);
  const st = TruckPack.stats(pack, plan);

  const planOpts = pack.plans.map(function (p) {
    return '<option value="' + esc(p.id) + '"' + (p.id === plan.id ? ' selected' : '') + '>' + esc(p.name) + (p.date ? (' — ' + esc(p.date)) : '') + '</option>';
  }).join('');

  const filters = [
    { id: 'unassigned', label: 'Unassigned' },
    { id: 'all', label: 'All' },
    { id: 'battery', label: 'Battery' },
    { id: 'pit', label: 'Pit' },
    { id: 'wind', label: 'Winds' },
  ];

  let html = '';
  html += '<div class="card truck-toolbar">';
  html += '<div class="row" style="justify-content:space-between;gap:10px">';
  html += '<div class="row" style="gap:8px;flex:1">';
  html += '<div><label class="lbl">Load plan</label><select id="truck-plan-select" onchange="selectLoadPlan(this.value)" style="min-width:220px">' + planOpts + '</select></div>';
  html += '<button class="btn sm" style="align-self:end" onclick="renameLoadPlan()"><i class="ti ti-pencil"></i></button>';
  html += '<button class="btn sm" style="align-self:end" onclick="addLoadPlan(false)"><i class="ti ti-plus"></i> New</button>';
  html += '<button class="btn sm" style="align-self:end" onclick="addLoadPlan(true)"><i class="ti ti-copy"></i> Duplicate</button>';
  html += '<button class="btn sm danger" style="align-self:end" onclick="deleteLoadPlan()"><i class="ti ti-trash"></i></button>';
  html += '</div>';
  html += '<div class="row" style="gap:6px;align-self:end">';
  html += '<button class="btn sm" onclick="autoPlaceRemaining()"><i class="ti ti-wand"></i> Auto-place remaining</button>';
  html += '<button class="btn sm" onclick="clearAndRepack()"><i class="ti ti-refresh"></i> Clear &amp; repack</button>';
  html += '<button class="btn sm" onclick="printLoadSheet()"><i class="ti ti-printer"></i> Print load sheet</button>';
  html += '</div></div>';
  html += '<div id="truck-stats" class="truck-stats">';
  html += badgeStat(st.placed, st.total, 'placed');
  html += badgeStat(st.byCategory.battery.placed, st.byCategory.battery.total, 'Battery');
  html += badgeStat(st.byCategory.pit.placed, st.byCategory.pit.total, 'Pit');
  html += badgeStat(st.byCategory.wind.placed, st.byCategory.wind.total, 'Winds');
  html += '</div></div>';

  html += '<div class="truck-plan-grid">';
  html += '<div>';
  html += '<div class="row" style="justify-content:space-between;margin-bottom:.4rem">';
  html += '<div style="font-size:13px;font-weight:500">Instrument pool</div>';
  html += '<div style="font-size:11px;color:var(--text2)">Drag onto the trailer, or click a piece then a slot</div>';
  html += '</div>';
  html += '<div class="row" style="gap:6px;margin-bottom:.5rem">';
  filters.forEach(function (f) {
    html += '<button type="button" class="btn xs' + (_truckFilter === f.id ? ' primary' : '') + '" onclick="setTruckFilter(\'' + f.id + '\')">' + f.label + '</button>';
  });
  html += '</div>';
  html += '<div class="pool" id="truck-pool" ondragover="event.preventDefault()" ondrop="truckReturnToPool(event)">';
  const shown = pieces.filter(function (p) {
    const placed = !!(plan.placements && plan.placements[p.id]);
    if (_truckFilter === 'unassigned') return !placed;
    if (_truckFilter === 'all') return true;
    return p.category === _truckFilter;
  });
  if (!shown.length) {
    html += '<div style="font-size:12px;color:var(--text2);padding:4px 2px">Nothing in this filter.</div>';
  }
  shown.forEach(function (p) {
    const placed = plan.placements && plan.placements[p.id];
    html += truckChipHtml(p, placed, pack);
  });
  html += '</div>';
  html += '<div id="truck-place-msg" style="font-size:12px;color:var(--danger-text);min-height:16px;margin-top:6px"></div>';
  html += '</div>';

  html += '<div>';
  html += '<div class="truck-switch">';
  pack.trucks.forEach(function (t) {
    html += '<button type="button" class="btn sm' + (t.id === truck.id ? ' primary' : '') + '" onclick="selectTruck(\'' + esc(t.id) + '\')"><i class="ti ti-truck"></i> ' + esc(t.name) + '</button>';
  });
  html += '</div>';
  html += '<div class="truck-switch" style="margin-top:8px">';
  (truck.floors || []).forEach(function (f) {
    html += '<button type="button" class="btn xs' + (f.id === floor.id ? ' primary' : '') + '" onclick="selectFloor(\'' + esc(f.id) + '\')">' + esc(f.name) + '</button>';
  });
  html += '<button type="button" class="btn xs" style="margin-left:auto" onclick="clearCurrentFloor()">Clear this floor</button>';
  html += '</div>';
  html += '<div class="trailer-stage">';
  if (floor.kind === 'open') html += renderOpenFloor(pack, plan, truck, floor, pieces);
  else if (floor.kind === 'shelves') html += renderShelvesFloor(pack, plan, truck, floor, pieces);
  else if (floor.kind === 'drawers') html += renderDrawersFloor(pack, plan, truck, floor, pieces);
  html += '</div></div></div>';
  el.innerHTML = html;
}

function badgeStat(n, total, label) {
  const cls = n === total && total > 0 ? 'green' : (n === 0 ? 'gray' : 'amber');
  return '<span class="badge ' + cls + '">' + n + ' / ' + total + ' ' + esc(label) + '</span>';
}

function truckChipHtml(piece, placed, pack) {
  const sel = _selectedPieceId === piece.id ? ' selected-piece' : '';
  const placedCls = placed ? ' is-placed' : '';
  const loc = placed ? TruckPack.describePlacement(pack, placed) : '';
  return '<div class="chip truck-chip cat-' + esc(piece.category) + sel + placedCls + '" draggable="true"'
    + ' ondragstart="truckDragStart(event,\'' + esc(piece.id) + '\')" ondragend="truckDragEnd(event)"'
    + ' onclick="selectPiece(\'' + esc(piece.id) + '\')"'
    + ' title="' + esc(piece.name + (loc ? (' — ' + loc) : ' — unassigned')) + '">'
    + esc(piece.label)
    + (placed ? '<span class="chip-loc">' + esc(loc) + '</span>' : '')
    + '</div>';
}

function occupantAt(plan, pieces, truckId, floorId, pred) {
  for (let i = 0; i < pieces.length; i++) {
    const pl = plan.placements && plan.placements[pieces[i].id];
    if (pl && pl.truckId === truckId && pl.floorId === floorId && pred(pl, pieces[i])) return pieces[i];
  }
  return null;
}

function renderOpenFloor(pack, plan, truck, floor, pieces) {
  const cols = Math.max(1, parseInt(floor.cols, 10) || 6);
  const rows = Math.max(1, parseInt(floor.rows, 10) || 12);
  let html = '<div class="trailer-end">Nose / cab</div>';
  html += '<div class="trailer-grid" id="trailer-grid" style="grid-template-columns:repeat(' + cols + ',minmax(42px,1fr));grid-template-rows:repeat(' + rows + ',38px)">';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      html += '<div class="trailer-cell" data-x="' + x + '" data-y="' + y + '"'
        + ' ondragover="truckDragOverOpen(event,' + x + ',' + y + ')"'
        + ' ondrop="truckDropOpen(event,' + x + ',' + y + ')"'
        + ' onclick="truckClickOpen(' + x + ',' + y + ')"></div>';
    }
  }
  pieces.forEach(function (p) {
    const pl = plan.placements && plan.placements[p.id];
    if (!pl || pl.truckId !== truck.id || pl.floorId !== floor.id || pl.x == null) return;
    const col = (pl.x + 1) + ' / span ' + p.w;
    const row = (pl.y + 1) + ' / span ' + p.d;
    html += '<div class="trailer-item cat-' + esc(p.category) + (_selectedPieceId === p.id ? ' selected-piece' : '') + '"'
      + ' style="grid-column:' + col + ';grid-row:' + row + '"'
      + ' draggable="true" ondragstart="truckDragStart(event,\'' + esc(p.id) + '\')" ondragend="truckDragEnd(event)"'
      + ' onclick="event.stopPropagation();selectPiece(\'' + esc(p.id) + '\')"'
      + ' title="' + esc(p.name) + '">'
      + '<span>' + esc(p.label) + '</span>'
      + '<button type="button" class="item-x" onclick="event.stopPropagation();unplaceSelectedOr(\'' + esc(p.id) + '\')" title="Return to pool">&times;</button>'
      + '</div>';
  });
  html += '</div>';
  html += '<div class="trailer-end">Rear doors — load from here</div>';
  html += '<div class="trailer-hint">Each cell is a planning square on the open first floor. Larger pit pieces span multiple cells. Driver side is the left column when looking in from the rear doors.</div>';
  return html;
}

function renderShelvesFloor(pack, plan, truck, floor, pieces) {
  const shelves = floor.shelves || [];
  const driver = shelves.filter(function (s) { return s.side === 'driver'; });
  const passenger = shelves.filter(function (s) { return s.side === 'passenger'; });
  const other = shelves.filter(function (s) { return s.side !== 'driver' && s.side !== 'passenger'; });
  let html = '<div class="trailer-end">Looking in from the rear doors</div>';
  html += '<div class="shelf-columns">';
  html += shelfColumnHtml('Driver side (left)', driver, plan, truck, floor, pieces);
  html += shelfColumnHtml('Passenger side (right)', passenger, plan, truck, floor, pieces);
  html += '</div>';
  if (other.length) {
    html += '<div style="margin-top:10px">';
    html += shelfColumnHtml('Center / other', other, plan, truck, floor, pieces);
    html += '</div>';
  }
  html += '<div class="trailer-hint">Battery, baritones, mellophones, sousaphones, bass clarinets, and baritone saxes go on these Floor 2 shelves.</div>';
  return html;
}

function shelfColumnHtml(title, shelves, plan, truck, floor, pieces) {
  let html = '<div class="shelf-col"><div class="shelf-col-title">' + esc(title) + '</div>';
  if (!shelves.length) {
    html += '<div style="font-size:12px;color:var(--text2)">No shelves on this side. Add them under Truck layouts.</div>';
  }
  shelves.forEach(function (shelf) {
    html += '<div class="shelf-block"><div class="shelf-name">' + esc(shelf.name) + '</div><div class="shelf-slots">';
    const n = Math.max(0, parseInt(shelf.slots, 10) || 0);
    for (let i = 0; i < n; i++) {
      const occ = occupantAt(plan, pieces, truck.id, floor.id, function (pl) { return pl.shelfId === shelf.id && pl.slot === i; });
      html += slotBoxHtml(occ, shelf.id, i, 'Slot ' + (i + 1));
    }
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

function renderDrawersFloor(pack, plan, truck, floor, pieces) {
  const n = Math.max(0, parseInt(floor.drawers, 10) || 0);
  let html = '<div class="trailer-end">Pull-out trombone drawers</div>';
  html += '<div class="drawer-grid">';
  for (let i = 0; i < n; i++) {
    const occ = occupantAt(plan, pieces, truck.id, floor.id, function (pl) { return pl.slot === i && pl.x == null; });
    html += '<div class="drawer-row"><div class="drawer-label">Drawer ' + (i + 1) + '</div>';
    html += slotBoxHtml(occ, '', i, 'Drawer ' + (i + 1));
    html += '</div>';
  }
  html += '</div>';
  html += '<div class="trailer-hint">Trombones ride in these drawers. If a drawer is full, extra trombones can sit on a Floor 2 shelf.</div>';
  return html;
}

function slotBoxHtml(occ, shelfId, slot, title) {
  const sid = shelfId ? ('\'' + esc(shelfId) + '\'') : 'null';
  if (occ) {
    return '<div class="shelf-slot filled cat-' + esc(occ.category) + (_selectedPieceId === occ.id ? ' selected-piece' : '') + '"'
      + ' draggable="true" ondragstart="truckDragStart(event,\'' + esc(occ.id) + '\')" ondragend="truckDragEnd(event)"'
      + ' onclick="event.stopPropagation();selectPiece(\'' + esc(occ.id) + '\')"'
      + ' title="' + esc(occ.name) + '">'
      + '<span>' + esc(occ.label) + '</span>'
      + '<button type="button" class="item-x" onclick="event.stopPropagation();unplaceSelectedOr(\'' + esc(occ.id) + '\')">&times;</button>'
      + '</div>';
  }
  return '<div class="shelf-slot" title="' + esc(title) + '"'
    + ' ondragover="event.preventDefault();this.classList.add(\'drag-over\')" ondragleave="this.classList.remove(\'drag-over\')"'
    + ' ondrop="this.classList.remove(\'drag-over\');truckDropSlot(event,' + sid + ',' + slot + ')"'
    + ' onclick="truckClickSlot(' + sid + ',' + slot + ')">'
    + '<span class="slot-num">' + (slot + 1) + '</span></div>';
}

function truckReturnToPool(ev) {
  ev.preventDefault();
  const pieceId = (ev.dataTransfer && ev.dataTransfer.getData('text/plain')) || _dragPieceId;
  if (pieceId) unplaceSelectedOr(pieceId);
}

function renderTruckInventory() {
  const el = document.getElementById('trucks-view-inventory');
  if (!el) return;
  const pack = tp();
  if (!pack) { el.innerHTML = ''; return; }
  const catOpts = TruckPack.CATEGORIES.map(function (c) { return '<option value="' + c.id + '">' + esc(c.label) + '</option>'; }).join('');
  const prefOpts = TruckPack.PREFERS.map(function (p) { return '<option value="' + p.id + '">' + esc(p.label) + '</option>'; }).join('');
  let html = '<div class="card">';
  html += '<div style="font-size:15px;font-weight:500;margin-bottom:.25rem">Instrument inventory</div>';
  html += '<div style="font-size:12px;color:var(--text2);margin-bottom:.75rem">Quantities expand into individual pieces on the load plan. Preferred location is used by auto-pack: pit on Floor 1, most cases on Floor 2 shelves, trombones in drawers. Width &times; depth is the footprint on the open first-floor grid.</div>';
  html += '<div class="truck-inv-add">';
  html += '<div><label class="lbl">Name</label><input type="text" id="ti-name" placeholder="e.g. Mellophones"></div>';
  html += '<div><label class="lbl">Category</label><select id="ti-cat">' + catOpts + '</select></div>';
  html += '<div><label class="lbl">Qty</label><input type="number" id="ti-qty" min="0" value="1"></div>';
  html += '<div><label class="lbl">W &times; D</label><div class="row"><input type="number" id="ti-w" min="1" value="1" style="width:70px"><input type="number" id="ti-d" min="1" value="1" style="width:70px"></div></div>';
  html += '<div><label class="lbl">Preferred location</label><select id="ti-pref">' + prefOpts + '</select></div>';
  html += '<button class="btn primary" onclick="addTruckInstrument()" style="align-self:end"><i class="ti ti-plus"></i> Add</button>';
  html += '</div></div>';

  html += '<div class="card"><table class="jtable truck-inv-table"><colgroup>';
  html += '<col style="width:22%"><col style="width:16%"><col style="width:8%"><col style="width:8%"><col style="width:8%"><col style="width:22%"><col style="width:10%"><col style="width:6%">';
  html += '</colgroup><thead><tr><th>Name</th><th>Category</th><th>Qty</th><th>W</th><th>D</th><th>Preferred</th><th>Notes</th><th></th></tr></thead><tbody>';
  if (!pack.instruments.length) {
    html += '<tr><td colspan="8" style="padding:1rem;color:var(--text2)">No instruments yet.</td></tr>';
  }
  pack.instruments.forEach(function (inst) {
    html += '<tr>';
    html += '<td><input class="inline-edit" value="' + esc(inst.name) + '" onblur="updateTruckInstrument(\'' + esc(inst.id) + '\',\'name\',this.value)"></td>';
    html += '<td><select class="inline-edit" onchange="updateTruckInstrument(\'' + esc(inst.id) + '\',\'category\',this.value)">';
    TruckPack.CATEGORIES.forEach(function (c) {
      html += '<option value="' + c.id + '"' + (inst.category === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>';
    });
    html += '</select></td>';
    html += '<td><input class="inline-edit" type="number" min="0" value="' + esc(inst.qty) + '" onblur="updateTruckInstrument(\'' + esc(inst.id) + '\',\'qty\',this.value)"></td>';
    html += '<td><input class="inline-edit" type="number" min="1" value="' + esc(inst.w) + '" onblur="updateTruckInstrument(\'' + esc(inst.id) + '\',\'w\',this.value)"></td>';
    html += '<td><input class="inline-edit" type="number" min="1" value="' + esc(inst.d) + '" onblur="updateTruckInstrument(\'' + esc(inst.id) + '\',\'d\',this.value)"></td>';
    html += '<td><select class="inline-edit" onchange="updateTruckInstrument(\'' + esc(inst.id) + '\',\'prefer\',this.value)">';
    TruckPack.PREFERS.forEach(function (p) {
      html += '<option value="' + p.id + '"' + (inst.prefer === p.id ? ' selected' : '') + '>' + esc(p.label) + '</option>';
    });
    html += '</select></td>';
    html += '<td><input class="inline-edit" value="' + esc(inst.notes || '') + '" onblur="updateTruckInstrument(\'' + esc(inst.id) + '\',\'notes\',this.value)"></td>';
    html += '<td><button class="btn xs danger" onclick="deleteTruckInstrument(\'' + esc(inst.id) + '\')"><i class="ti ti-trash"></i></button></td>';
    html += '</tr>';
  });
  html += '</tbody></table>';
  html += '<div class="row" style="margin-top:.75rem;gap:8px">';
  html += '<button class="btn sm" onclick="resetStarterInventory()"><i class="ti ti-restore"></i> Reset to starter catalog</button>';
  html += '<span style="font-size:12px;color:var(--text2)">Starter list includes battery, front ensemble, baritones, mellophones, trombones, sousaphones, bass clarinets, and baritone saxes. Adjust counts to match this season.</span>';
  html += '</div></div>';
  el.innerHTML = html;
}

function addTruckInstrument() {
  const pack = tp();
  if (!pack) return;
  const name = (document.getElementById('ti-name').value || '').trim();
  if (!name) { alert('Name required.'); return; }
  const cat = document.getElementById('ti-cat').value;
  const qty = Math.max(0, parseInt(document.getElementById('ti-qty').value, 10) || 0);
  const w = Math.max(1, parseInt(document.getElementById('ti-w').value, 10) || 1);
  const d = Math.max(1, parseInt(document.getElementById('ti-d').value, 10) || 1);
  const prefer = document.getElementById('ti-pref').value;
  pack.instruments.push({ id: 'inst' + uid(), name: name, category: cat, qty: qty, w: w, d: d, prefer: prefer, notes: '' });
  document.getElementById('ti-name').value = '';
  tpSave();
}

function updateTruckInstrument(id, field, value) {
  const pack = tp();
  if (!pack) return;
  const inst = pack.instruments.find(function (i) { return i.id === id; });
  if (!inst) return;
  if (field === 'qty' || field === 'w' || field === 'd') {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return;
    inst[field] = field === 'qty' ? Math.max(0, n) : Math.max(1, n);
  } else {
    inst[field] = String(value || '');
  }
  tpSave();
}

function deleteTruckInstrument(id) {
  const pack = tp();
  if (!pack || !confirm('Remove this instrument from the inventory and any load plans?')) return;
  pack.instruments = pack.instruments.filter(function (i) { return i.id !== id; });
  tpSave();
}

function resetStarterInventory() {
  if (!confirm('Replace the inventory with the starter catalog? Existing placements for removed instruments will be cleared.')) return;
  const pack = tp();
  if (!pack) return;
  pack.instruments = TruckPack.defaultInstruments();
  tpSave();
}

function renderTruckLayout() {
  const el = document.getElementById('trucks-view-layout');
  if (!el) return;
  const pack = tp();
  if (!pack) { el.innerHTML = ''; return; }
  let html = '<div style="font-size:13px;color:var(--text2);margin-bottom:1rem">Match these layouts to the physical trailers. Both trucks have an open first floor for the front ensemble and a second floor of shelves. Enable trombone pull-out drawers on the truck that actually has them (Eagle 2 by default).</div>';
  html += '<div class="layout-trucks">';
  pack.trucks.forEach(function (t) {
    html += '<div class="card">';
    html += '<div class="row" style="justify-content:space-between;margin-bottom:.75rem"><div style="font-size:16px;font-weight:500"><i class="ti ti-truck"></i> ' + esc(t.name) + '</div>';
    html += '<input class="inline-edit" style="width:160px;border:.5px solid var(--border)" value="' + esc(t.name) + '" onblur="renameTruck(\'' + esc(t.id) + '\',this.value)"></div>';
    (t.floors || []).forEach(function (f) {
      html += '<div class="layout-floor">';
      html += '<div class="layout-floor-title">' + esc(f.name) + ' <span class="badge gray">' + esc(f.kind) + '</span></div>';
      html += '<div><label class="lbl">Floor label</label><input type="text" value="' + esc(f.name) + '" onblur="updateFloor(\'' + esc(t.id) + '\',\'' + esc(f.id) + '\',\'name\',this.value)"></div>';
      if (f.kind === 'open') {
        html += '<div class="row" style="margin-top:.5rem;gap:10px">';
        html += '<div><label class="lbl">Cells across (width)</label><input type="number" min="1" max="20" value="' + esc(f.cols) + '" onchange="updateFloor(\'' + esc(t.id) + '\',\'' + esc(f.id) + '\',\'cols\',this.value)"></div>';
        html += '<div><label class="lbl">Cells deep (length)</label><input type="number" min="1" max="40" value="' + esc(f.rows) + '" onchange="updateFloor(\'' + esc(t.id) + '\',\'' + esc(f.id) + '\',\'rows\',this.value)"></div>';
        html += '</div>';
        html += '<div style="font-size:11px;color:var(--text2);margin-top:4px">Wide-open first floor. Increase cells if you need a finer map of the pit deck.</div>';
      }
      if (f.kind === 'shelves') {
        html += '<table class="jtable" style="margin-top:.5rem"><thead><tr><th>Shelf</th><th>Side</th><th>Slots</th><th></th></tr></thead><tbody>';
        (f.shelves || []).forEach(function (s) {
          html += '<tr>';
          html += '<td><input class="inline-edit" value="' + esc(s.name) + '" onblur="updateShelf(\'' + esc(t.id) + '\',\'' + esc(f.id) + '\',\'' + esc(s.id) + '\',\'name\',this.value)"></td>';
          html += '<td><select class="inline-edit" onchange="updateShelf(\'' + esc(t.id) + '\',\'' + esc(f.id) + '\',\'' + esc(s.id) + '\',\'side\',this.value)">';
          ['driver', 'passenger', 'center'].forEach(function (side) {
            html += '<option value="' + side + '"' + (s.side === side ? ' selected' : '') + '>' + side + '</option>';
          });
          html += '</select></td>';
          html += '<td><input class="inline-edit" type="number" min="1" max="40" value="' + esc(s.slots) + '" onblur="updateShelf(\'' + esc(t.id) + '\',\'' + esc(f.id) + '\',\'' + esc(s.id) + '\',\'slots\',this.value)"></td>';
          html += '<td><button class="btn xs danger" onclick="removeShelf(\'' + esc(t.id) + '\',\'' + esc(f.id) + '\',\'' + esc(s.id) + '\')"><i class="ti ti-trash"></i></button></td>';
          html += '</tr>';
        });
        html += '</tbody></table>';
        html += '<button class="btn sm" style="margin-top:.5rem" onclick="addShelf(\'' + esc(t.id) + '\',\'' + esc(f.id) + '\')"><i class="ti ti-plus"></i> Add shelf</button>';
      }
      if (f.kind === 'drawers') {
        html += '<div class="row" style="margin-top:.5rem;gap:10px">';
        html += '<div><label class="lbl">Number of pull-out drawers</label><input type="number" min="1" max="40" value="' + esc(f.drawers) + '" onchange="updateFloor(\'' + esc(t.id) + '\',\'' + esc(f.id) + '\',\'drawers\',this.value)"></div>';
        html += '<button class="btn sm danger" style="align-self:end" onclick="removeDrawers(\'' + esc(t.id) + '\',\'' + esc(f.id) + '\')">Remove drawers from this truck</button>';
        html += '</div>';
      }
      html += '</div>';
    });
    const hasDrawers = (t.floors || []).some(function (f) { return f.kind === 'drawers'; });
    if (!hasDrawers) {
      html += '<button class="btn sm" onclick="addDrawers(\'' + esc(t.id) + '\')"><i class="ti ti-box"></i> Add trombone drawers to ' + esc(t.name) + '</button>';
    }
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

function renameTruck(id, name) {
  const pack = tp();
  const t = pack && TruckPack.findTruck(pack, id);
  if (!t || !name.trim()) return;
  t.name = name.trim();
  tpSave();
}

function updateFloor(truckId, floorId, field, value) {
  const pack = tp();
  const floor = pack && TruckPack.findFloor(pack, truckId, floorId);
  if (!floor) return;
  if (field === 'cols' || field === 'rows' || field === 'drawers') {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) return;
    floor[field] = n;
  } else {
    floor[field] = String(value || '').trim();
  }
  tpSave();
}

function updateShelf(truckId, floorId, shelfId, field, value) {
  const pack = tp();
  const floor = pack && TruckPack.findFloor(pack, truckId, floorId);
  const shelf = floor && TruckPack.findShelf(floor, shelfId);
  if (!shelf) return;
  if (field === 'slots') {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) return;
    shelf.slots = n;
  } else {
    shelf[field] = String(value || '').trim();
  }
  tpSave();
}

function addShelf(truckId, floorId) {
  const pack = tp();
  const floor = pack && TruckPack.findFloor(pack, truckId, floorId);
  if (!floor || floor.kind !== 'shelves') return;
  floor.shelves = floor.shelves || [];
  floor.shelves.push({ id: 'sh' + uid(), name: 'New shelf', side: 'center', slots: 8 });
  tpSave();
}

function removeShelf(truckId, floorId, shelfId) {
  const pack = tp();
  const floor = pack && TruckPack.findFloor(pack, truckId, floorId);
  if (!floor || !confirm('Remove this shelf and anything parked on it?')) return;
  floor.shelves = (floor.shelves || []).filter(function (s) { return s.id !== shelfId; });
  tpSave();
}

function addDrawers(truckId) {
  const pack = tp();
  const truck = pack && TruckPack.findTruck(pack, truckId);
  if (!truck) return;
  if ((truck.floors || []).some(function (f) { return f.kind === 'drawers'; })) return;
  truck.floors.push({ id: truck.id + '-drawers', name: 'Trombone drawers', kind: 'drawers', drawers: 16 });
  tpSave();
}

function removeDrawers(truckId, floorId) {
  const pack = tp();
  const truck = pack && TruckPack.findTruck(pack, truckId);
  if (!truck || !confirm('Remove trombone drawers from this truck?')) return;
  truck.floors = (truck.floors || []).filter(function (f) { return f.id !== floorId; });
  tpSave();
}

function printLoadSheet() {
  const pack = tp();
  const plan = tpPlan();
  if (!pack || !plan) return;
  const pieces = TruckPack.piecesFromInventory(pack);
  const st = TruckPack.stats(pack, plan);
  let html = '<div style="font-family:Georgia,serif;color:#111">';
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0B2545;padding-bottom:8px;margin-bottom:12px">';
  html += '<div><div style="font-size:22px;font-weight:600">Allen Band Boosters — Load sheet</div>';
  html += '<div style="font-size:14px;margin-top:2px">' + esc(plan.name) + (plan.date ? (' · ' + esc(plan.date)) : '') + '</div></div>';
  html += '<div style="font-size:12px">' + st.placed + ' of ' + st.total + ' pieces placed</div></div>';

  pack.trucks.forEach(function (truck) {
    html += '<div style="break-inside:avoid;margin-bottom:18px">';
    html += '<div style="font-size:16px;font-weight:600;background:#0B2545;color:#fff;padding:6px 10px">' + esc(truck.name) + '</div>';
    (truck.floors || []).forEach(function (floor) {
      html += '<div style="padding:8px 10px;border:1px solid #ccc;border-top:none">';
      html += '<div style="font-size:13px;font-weight:600;margin-bottom:6px">' + esc(floor.name) + '</div>';
      const items = [];
      pieces.forEach(function (p) {
        const pl = plan.placements && plan.placements[p.id];
        if (pl && pl.truckId === truck.id && pl.floorId === floor.id) {
          items.push({ piece: p, pl: pl, label: TruckPack.describePlacement(pack, pl) });
        }
      });
      if (!items.length) {
        html += '<div style="font-size:12px;color:#666">Nothing assigned to this floor.</div>';
      } else {
        html += '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
          + '<th style="text-align:left;border-bottom:1px solid #ccc;padding:3px 4px">Instrument</th>'
          + '<th style="text-align:left;border-bottom:1px solid #ccc;padding:3px 4px">Section</th>'
          + '<th style="text-align:left;border-bottom:1px solid #ccc;padding:3px 4px">Location</th>'
          + '</tr></thead><tbody>';
        items.sort(function (a, b) { return a.label.localeCompare(b.label); }).forEach(function (it) {
          html += '<tr><td style="padding:3px 4px;border-bottom:1px solid #eee">' + esc(it.piece.name) + '</td>'
            + '<td style="padding:3px 4px;border-bottom:1px solid #eee">' + esc(catLabel(it.piece.category)) + '</td>'
            + '<td style="padding:3px 4px;border-bottom:1px solid #eee">' + esc(it.label) + '</td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';
    });
    html += '</div>';
  });

  const unassigned = pieces.filter(function (p) { return !(plan.placements && plan.placements[p.id]); });
  html += '<div style="break-inside:avoid">';
  html += '<div style="font-size:16px;font-weight:600;background:#8C0A21;color:#fff;padding:6px 10px">Still on the dock</div>';
  html += '<div style="padding:8px 10px;border:1px solid #ccc;border-top:none;font-size:12px">';
  html += unassigned.length ? unassigned.map(function (p) { return esc(p.name); }).join(', ') : 'All instruments are assigned.';
  html += '</div></div></div>';

  const pv = document.getElementById('print-view');
  pv.innerHTML = html;
  window.print();
}
