const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let dpr = window.devicePixelRatio || 1;

function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  const wrap = document.getElementById('canvas-wrap');
  canvas.width = Math.floor(wrap.clientWidth * dpr);
  canvas.height = Math.floor(wrap.clientHeight * dpr);
  scheduleRender();
}
window.addEventListener('resize', resizeCanvas);

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function screenToWorld(sx, sy) {
  return { x: (sx * dpr - state.panX) / state.zoom, y: (sy * dpr - state.panY) / state.zoom };
}
function worldToScreen(wx, wy) {
  return { x: (wx * state.zoom + state.panX) / dpr, y: (wy * state.zoom + state.panY) / dpr };
}
function snapToGrid(wx, wy) {
  return { x: Math.round(wx / CELL_PX), y: Math.round(wy / CELL_PX) };
}
function cellToWorld(cx, cy) {
  return { x: cx * CELL_PX, y: cy * CELL_PX };
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function zoomAt(sx, sy, factor) {
  const newZoom = clamp(state.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const wx = (sx * dpr - state.panX) / state.zoom;
  const wy = (sy * dpr - state.panY) / state.zoom;
  state.panX = sx * dpr - wx * newZoom;
  state.panY = sy * dpr - wy * newZoom;
  state.zoom = newZoom;
  scheduleRender();
}

function fitView() {
  const wrap = document.getElementById('canvas-wrap');
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const gW = state.gridCols * CELL_PX, gH = state.gridRows * CELL_PX;
  const margin = 48;
  state.zoom = clamp(Math.min((W - margin * 2) / gW, (H - margin * 2) / gH), MIN_ZOOM, MAX_ZOOM);
  state.panX = (W * dpr - gW * state.zoom) / 2;
  state.panY = (H * dpr - gH * state.zoom) / 2;
  scheduleRender();
}

let rafPending = false;
function scheduleRender() {
  if (!rafPending) { rafPending = true; requestAnimationFrame(render); }
}
