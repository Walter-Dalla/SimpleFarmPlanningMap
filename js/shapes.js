function newId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createPolygon(vertices, overrides) {
  const cat = (overrides && overrides.category) || 'plantio';
  return Object.assign({
    id: newId(),
    vertices: vertices.map(v => ({ x: v.x, y: v.y })),
    label: '', description: '',
    category: cat,
    status: 'existe',
    color: CATEGORY_DEFAULTS[cat],
    tab: 'atual',
    createdAt: Date.now()
  }, overrides || {});
}

function addPolygon(p) {
  state.polygons.push(p);
  state.dirty = true;
  scheduleAutosave();
  scheduleRender();
  updateLegend();
}

function updatePolygon(id, patch) {
  const p = state.polygons.find(q => q.id === id);
  if (!p) return;
  Object.assign(p, patch);
  state.dirty = true;
  scheduleAutosave();
  scheduleRender();
}

function deletePolygon(id) {
  const idx = state.polygons.findIndex(p => p.id === id);
  if (idx === -1) return;
  state.polygons.splice(idx, 1);
  if (state.selectedId === id) { state.selectedId = null; renderSidebar(); }
  state.dirty = true;
  scheduleAutosave();
  scheduleRender();
  updateLegend();
}

function createCircle(center, radius, overrides) {
  const cat = (overrides && overrides.category) || 'plantio';
  return Object.assign({
    id: newId(),
    type: 'circle',
    center: { x: center.x, y: center.y },
    radius: radius,
    label: '', description: '',
    category: cat,
    status: 'existe',
    color: CATEGORY_DEFAULTS[cat],
    tab: 'atual',
    createdAt: Date.now()
  }, overrides || {});
}

function addCircle(c) {
  state.circles.push(c);
  state.dirty = true;
  scheduleAutosave();
  scheduleRender();
  updateLegend();
}

function updateCircle(id, patch) {
  const c = state.circles.find(q => q.id === id);
  if (!c) return;
  Object.assign(c, patch);
  state.dirty = true;
  scheduleAutosave();
  scheduleRender();
}

function deleteCircle(id) {
  const idx = state.circles.findIndex(c => c.id === id);
  if (idx === -1) return;
  state.circles.splice(idx, 1);
  if (state.selectedId === id) { state.selectedId = null; renderSidebar(); }
  state.dirty = true;
  scheduleAutosave();
  scheduleRender();
  updateLegend();
}

function deleteSelected() {
  if (!state.selectedId) return;
  if (state.polygons.find(p => p.id === state.selectedId)) deletePolygon(state.selectedId);
  else deleteCircle(state.selectedId);
}

function updateSelected(field, value) {
  if (!state.selectedId) return;
  if (state.polygons.find(p => p.id === state.selectedId)) updatePolygon(state.selectedId, { [field]: value });
  else updateCircle(state.selectedId, { [field]: value });
}

function updateCircleRadius(metersStr) {
  const meters = parseFloat(metersStr);
  if (!isNaN(meters) && meters > 0.05) {
    updateSelected('radius', meters / 0.3);
    document.getElementById('sb-diameter-hint').textContent = `diâmetro: ${(meters * 2).toFixed(2)}m`;
  }
}

function applyDefaultColor() {
  if (!state.selectedId) return;
  const sel = findSelected();
  if (!sel) return;
  const def = CATEGORY_DEFAULTS[sel.shape.category] || '#4CAF50';
  if (sel.type === 'polygon') updatePolygon(sel.shape.id, { color: def });
  else updateCircle(sel.shape.id, { color: def });
  document.getElementById('sb-color').value = def;
}
