function setTool(t) {
  if (state.tool === 'draw' && t !== 'draw') {
    state.drawing.active = false;
    state.drawing.vertices = [];
  }
  if (state.tool === 'drawCircle' && t !== 'drawCircle') {
    state.drawing.circleStart = null;
  }
  if (state.tool === 'editVertices' && t !== 'editVertices') {
    state.vertexDrag = { active: false, vertexIndex: null, startCell: null, startVertex: null };
  }
  state.tool = t;
  document.querySelectorAll('.tb-btn[id^="btn-"]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('btn-' + t);
  if (btn) btn.classList.add('active');
  canvas.style.cursor = t === 'pan' ? 'grab' : (t === 'draw' || t === 'drawCircle') ? 'crosshair' : t === 'editVertices' ? 'crosshair' : 'default';
  scheduleRender();
}

function enterVertexEdit() {
  if (!state.selectedId) return;
  setTool('editVertices');
  renderSidebar();
}

function toggleLayer(v) {
  state.activeLayers[v] = !state.activeLayers[v];
  document.getElementById('tab-' + v).classList.toggle('active', state.activeLayers[v]);
  scheduleRender();
}
