function renderSidebar() {
  const form = document.getElementById('sb-form');
  const empty = document.getElementById('sb-empty');
  if (!state.selectedId) { form.style.display = 'none'; empty.style.display = ''; return; }
  const sel = findSelected();
  if (!sel) { form.style.display = 'none'; empty.style.display = ''; return; }
  const shape = sel.shape;
  form.style.display = ''; empty.style.display = 'none';
  document.getElementById('sb-label').value = shape.label || '';
  document.getElementById('sb-category').value = shape.category || 'plantio';
  document.getElementById('sb-status').value = shape.status || 'existe';
  document.getElementById('sb-tab').value = shape.tab || 'atual';
  document.getElementById('sb-color').value = shape.color || CATEGORY_DEFAULTS[shape.category] || '#4CAF50';
  document.getElementById('sb-description').value = shape.description || '';
  const evBtn = document.getElementById('btn-edit-vertices');
  if (evBtn) {
    evBtn.style.display = sel.type === 'circle' ? 'none' : '';
    evBtn.classList.toggle('active', state.tool === 'editVertices');
  }
  const mergeBtn = document.getElementById('sb-merge-btn');
  const mergeHint = document.getElementById('sb-merge-hint');
  if (mergeBtn) { mergeBtn.textContent = '⊕ Fundir com outra forma'; mergeBtn.onclick = enterMergeMode; }
  if (mergeHint) mergeHint.style.display = state.mergeMode ? '' : 'none';

  const radiusRow = document.getElementById('sb-circle-radius-row');
  if (radiusRow) {
    radiusRow.style.display = sel.type === 'circle' ? '' : 'none';
    if (sel.type === 'circle') {
      const meters = (shape.radius * 0.3).toFixed(2);
      document.getElementById('sb-radius').value = meters;
      document.getElementById('sb-diameter-hint').textContent = `diâmetro: ${(shape.radius * 0.6).toFixed(2)}m`;
    }
  }
}

function updateLegend() {
  const allShapes = [...state.polygons, ...state.circles];
  const cats = [...new Set(allShapes.map(p => p.category))];
  const el = document.getElementById('legend-list');
  if (!cats.length) { el.innerHTML = '<div class="sb-empty">Nenhuma forma ainda</div>'; return; }
  el.innerHTML = cats.map(c => {
    const cnt = allShapes.filter(p => p.category === c).length;
    return `<div class="sb-row-inline" style="margin-bottom:5px">
      <div style="width:13px;height:13px;background:${CATEGORY_DEFAULTS[c]};border-radius:2px;flex-shrink:0"></div>
      <span style="font-size:12px">${CATEGORY_LABELS[c]} <span style="color:#8aaa8a">(${cnt})</span></span>
    </div>`;
  }).join('');
}

function updateGridHint() {
  const cols = parseInt(document.getElementById('grid-cols').value) || 133;
  const rows = parseInt(document.getElementById('grid-rows').value) || 167;
  const w = (cols * 0.3).toFixed(1), h = (rows * 0.3).toFixed(1), a = Math.round(cols * rows * 0.09);
  document.getElementById('grid-size-hint').textContent = `${w}m × ${h}m ≈ ${a}m²`;
}

function applyGridSize() {
  state.gridCols = parseInt(document.getElementById('grid-cols').value) || 133;
  state.gridRows = parseInt(document.getElementById('grid-rows').value) || 167;
  updateGridHint();
  scheduleRender();
}
