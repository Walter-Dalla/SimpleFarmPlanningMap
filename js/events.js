let _justDblClicked = false;

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const cp = canvasPos(e);
  zoomAt(cp.x, cp.y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
}, { passive: false });

canvas.addEventListener('mousemove', e => {
  const cp = canvasPos(e);
  _lastMouse = cp;
  const w = screenToWorld(cp.x, cp.y);
  const cell = snapToGrid(w.x, w.y);

  if (state.tool === 'draw' || state.tool === 'drawCircle' || state.drawing.active) {
    state.drawing.mouseCell = cell;
    scheduleRender();
  }

  if (state.pan.active) {
    state.panX = state.pan.startPan.x + (cp.x - state.pan.startMouse.x) * dpr;
    state.panY = state.pan.startPan.y + (cp.y - state.pan.startMouse.y) * dpr;
    scheduleRender();
    return;
  }

  if (state.radiusDrag.active) {
    const c = state.circles.find(q => q.id === state.radiusDrag.circleId);
    if (c) {
      const wRaw = screenToWorld(cp.x, cp.y);
      const newRadius = Math.hypot(wRaw.x / CELL_PX - c.center.x, wRaw.y / CELL_PX - c.center.y);
      if (newRadius >= 0.5) {
        c.radius = newRadius;
        const ri = document.getElementById('sb-radius');
        const dh = document.getElementById('sb-diameter-hint');
        if (ri) ri.value = (newRadius * 0.3).toFixed(2);
        if (dh) dh.textContent = `diâmetro: ${(newRadius * 0.6).toFixed(2)}m`;
        scheduleRender();
      }
    }
    updateCoordDisplay();
    return;
  }

  if (state.vertexDrag.active && state.selectedId) {
    const p = state.polygons.find(q => q.id === state.selectedId);
    if (p && state.vertexDrag.vertexIndex !== null) {
      p.vertices[state.vertexDrag.vertexIndex] = { x: cell.x, y: cell.y };
      scheduleRender();
    }
    updateCoordDisplay();
    return;
  }

  if (state.drag.active && state.selectedId) {
    const dx = cell.x - state.drag.startCell.x;
    const dy = cell.y - state.drag.startCell.y;
    const p = state.polygons.find(q => q.id === state.selectedId);
    if (p) {
      p.vertices = state.drag.startVertices.map(v => ({ x: v.x + dx, y: v.y + dy }));
      scheduleRender();
    } else {
      const c = state.circles.find(q => q.id === state.selectedId);
      if (c && state.drag.startCenter) {
        c.center = { x: state.drag.startCenter.x + dx, y: state.drag.startCenter.y + dy };
        scheduleRender();
      }
    }
  }

  updateCoordDisplay();
});

canvas.addEventListener('mousedown', e => {
  _justDblClicked = false;
  const cp = canvasPos(e);
  _lastMouse = cp;

  if (e.button === 1 || state.tool === 'pan') {
    e.preventDefault();
    state.pan.active = true;
    state.pan.startMouse = cp;
    state.pan.startPan = { x: state.panX, y: state.panY };
    canvas.style.cursor = 'grabbing';
    return;
  }

  if (e.button !== 0) return;

  const w = screenToWorld(cp.x, cp.y);
  const cell = snapToGrid(w.x, w.y);

  if (state.tool === 'draw') {
    if (!state.drawing.active) state.drawing.active = true;
    if (state.drawing.vertices.length >= 3) {
      const f = state.drawing.vertices[0];
      if (Math.hypot(cell.x - f.x, cell.y - f.y) <= 1.5) { finalizePolygon(); return; }
    }
    state.drawing.vertices.push({ x: cell.x, y: cell.y });
    scheduleRender();
    return;
  }

  if (state.tool === 'drawCircle') {
    if (!state.drawing.circleStart) {
      state.drawing.circleStart = { x: cell.x, y: cell.y };
    } else {
      const A = state.drawing.circleStart;
      const B = { x: cell.x, y: cell.y };
      const center = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      const radius = Math.hypot(B.x - A.x, B.y - A.y) / 2;
      if (radius >= 0.5) {
        const tabDefault = (state.activeLayers.futuro && !state.activeLayers.atual) ? 'futuro' : 'atual';
        const c = createCircle(center, radius, { tab: tabDefault });
        addCircle(c);
        state.selectedId = c.id;
        state.drawing.circleStart = null;
        setTool('select');
        renderSidebar();
      } else {
        state.drawing.circleStart = null;
      }
    }
    scheduleRender();
    return;
  }

  if (state.tool === 'editVertices' && state.selectedId) {
    const p = state.polygons.find(q => q.id === state.selectedId);
    if (p) {
      const hitIdx = p.vertices.findIndex(v => Math.hypot(v.x - cell.x, v.y - cell.y) <= 1.5);
      if (hitIdx !== -1) {
        state.vertexDrag.active = true;
        state.vertexDrag.vertexIndex = hitIdx;
        state.vertexDrag.startCell = cell;
        state.vertexDrag.startVertex = { ...p.vertices[hitIdx] };
        canvas.style.cursor = 'grabbing';
      }
    }
    return;
  }

  if (state.tool === 'select' && state.mergeMode) {
    const hit = polygonHitTest(cell.x, cell.y) || circleHitTest(cell.x, cell.y);
    if (hit && hit.id !== state.selectedId) {
      mergeSelectedWith(hit.id);
    } else if (!hit) {
      cancelMergeMode();
    }
    return;
  }

  if (state.tool === 'select') {
    // Check resize handle on selected circle first
    if (state.selectedId) {
      const selC = state.circles.find(c => c.id === state.selectedId);
      if (selC) {
        const wRaw = screenToWorld(cp.x, cp.y);
        const distFromCenter = Math.hypot(wRaw.x / CELL_PX - selC.center.x, wRaw.y / CELL_PX - selC.center.y);
        const threshold = Math.max(1.5, selC.radius * 0.12);
        if (Math.abs(distFromCenter - selC.radius) <= threshold) {
          state.radiusDrag.active = true;
          state.radiusDrag.circleId = selC.id;
          canvas.style.cursor = 'crosshair';
          return;
        }
      }
    }

    const hit = polygonHitTest(cell.x, cell.y);
    if (hit) {
      state.selectedId = hit.id;
      state.drag.active = true;
      state.drag.startCell = cell;
      state.drag.startVertices = hit.vertices.map(v => ({ ...v }));
      state.drag.startCenter = null;
      canvas.style.cursor = 'move';
    } else {
      const hitC = circleHitTest(cell.x, cell.y);
      if (hitC) {
        state.selectedId = hitC.id;
        state.drag.active = true;
        state.drag.startCell = cell;
        state.drag.startVertices = null;
        state.drag.startCenter = { ...hitC.center };
        canvas.style.cursor = 'move';
      } else {
        state.selectedId = null;
      }
    }
    renderSidebar();
    scheduleRender();
  }
});

canvas.addEventListener('mouseup', e => {
  if (state.pan.active) {
    state.pan.active = false;
    canvas.style.cursor = state.tool === 'pan' ? 'grab' : state.tool === 'draw' ? 'crosshair' : state.tool === 'editVertices' ? 'crosshair' : 'default';
    return;
  }
  if (state.radiusDrag.active) {
    state.radiusDrag.active = false;
    state.radiusDrag.circleId = null;
    canvas.style.cursor = 'default';
    state.dirty = true;
    scheduleAutosave();
    return;
  }
  if (state.vertexDrag.active) {
    state.vertexDrag.active = false;
    state.vertexDrag.vertexIndex = null;
    canvas.style.cursor = 'crosshair';
    if (state.selectedId) { state.dirty = true; scheduleAutosave(); }
    return;
  }
  if (state.drag.active) {
    state.drag.active = false;
    canvas.style.cursor = 'default';
    if (state.selectedId) { state.dirty = true; scheduleAutosave(); }
  }
});

canvas.addEventListener('dblclick', e => {
  if (state.tool !== 'draw') return;
  _justDblClicked = true;
  // Remove the last vertex added by the second click of dblclick
  if (state.drawing.vertices.length > 3) state.drawing.vertices.pop();
  finalizePolygon();
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.key === 's' || e.key === 'S') setTool('select');
  if (e.key === 'd' || e.key === 'D') setTool('draw');
  if (e.key === 'c' || e.key === 'C') setTool('drawCircle');
  if (e.key === 'p' || e.key === 'P') setTool('pan');
  if (e.key === ' ') {
    e.preventDefault();
    if (!state.pan.active) {
      state.pan.prevTool = state.tool;
      state.tool = 'pan';
      canvas.style.cursor = 'grab';
    }
  }
  if (e.key === 'Escape') {
    if (state.mergeMode) { cancelMergeMode(); return; }
    state.drawing.active = false; state.drawing.vertices = [];
    state.drawing.circleStart = null;
    state.vertexDrag = { active: false, vertexIndex: null, startCell: null, startVertex: null };
    if (state.tool === 'editVertices') { setTool('select'); }
    state.selectedId = null;
    renderSidebar(); scheduleRender();
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedId) deleteSelected();
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveToJSON(); }
});

document.addEventListener('keyup', e => {
  if (e.key === ' ') {
    state.tool = state.pan.prevTool || 'select';
    canvas.style.cursor = state.tool === 'draw' ? 'crosshair' : 'default';
    state.pan.active = false;
    scheduleRender();
  }
});

function finalizePolygon() {
  const d = state.drawing;
  if (d.vertices.length < 3) { d.active = false; d.vertices = []; scheduleRender(); return; }
  const tabDefault = (state.activeLayers.futuro && !state.activeLayers.atual) ? 'futuro' : 'atual';
  const poly = createPolygon(d.vertices, { tab: tabDefault });
  d.active = false; d.vertices = [];
  addPolygon(poly);
  state.selectedId = poly.id;
  setTool('select');
  renderSidebar();
}
