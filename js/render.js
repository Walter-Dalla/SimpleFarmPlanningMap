function render() {
  rafPending = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.zoom, state.zoom);

  drawBackground();
  drawSatellite();
  drawGridLines();
  drawBorderLabels();
  drawPolygons();
  drawCircles();
  drawDrawingPreview();

  ctx.restore();
  drawScaleIndicator();
  updateCoordDisplay();
}

function drawSatellite() {
  if (!state.satellite.visible || !state.satellite.image) return;
  ctx.globalAlpha = state.satellite.opacity;
  ctx.drawImage(state.satellite.image, 0, 0, state.gridCols * CELL_PX, state.gridRows * CELL_PX);
  ctx.globalAlpha = 1;
}

function drawBackground() {
  ctx.fillStyle = '#d4edda';
  ctx.fillRect(0, 0, state.gridCols * CELL_PX, state.gridRows * CELL_PX);
}

function drawGridLines() {
  const gW = state.gridCols * CELL_PX, gH = state.gridRows * CELL_PX;
  const screenCell = CELL_PX * state.zoom;
  let step = 1;
  if (screenCell < 3) step = 10;
  else if (screenCell < 6) step = 5;

  const wrap = document.getElementById('canvas-wrap');
  const cx0 = clamp(Math.floor(-state.panX / state.zoom / CELL_PX) - 1, 0, state.gridCols);
  const cy0 = clamp(Math.floor(-state.panY / state.zoom / CELL_PX) - 1, 0, state.gridRows);
  const cx1 = clamp(Math.ceil((wrap.clientWidth * dpr - state.panX) / state.zoom / CELL_PX) + 1, 0, state.gridCols);
  const cy1 = clamp(Math.ceil((wrap.clientHeight * dpr - state.panY) / state.zoom / CELL_PX) + 1, 0, state.gridRows);

  // Minor grid
  ctx.beginPath();
  ctx.strokeStyle = '#b7d9c2';
  ctx.lineWidth = 0.5 / state.zoom;
  for (let x = Math.floor(cx0 / step) * step; x <= cx1; x += step) {
    ctx.moveTo(x * CELL_PX, cy0 * CELL_PX);
    ctx.lineTo(x * CELL_PX, cy1 * CELL_PX);
  }
  for (let y = Math.floor(cy0 / step) * step; y <= cy1; y += step) {
    ctx.moveTo(cx0 * CELL_PX, y * CELL_PX);
    ctx.lineTo(cx1 * CELL_PX, y * CELL_PX);
  }
  ctx.stroke();

  // Major grid every 10 cells (3m)
  if (screenCell >= 2) {
    ctx.beginPath();
    ctx.strokeStyle = '#9ec9b0';
    ctx.lineWidth = 1 / state.zoom;
    for (let x = Math.floor(cx0 / 10) * 10; x <= cx1; x += 10) {
      ctx.moveTo(x * CELL_PX, cy0 * CELL_PX);
      ctx.lineTo(x * CELL_PX, cy1 * CELL_PX);
    }
    for (let y = Math.floor(cy0 / 10) * 10; y <= cy1; y += 10) {
      ctx.moveTo(cx0 * CELL_PX, y * CELL_PX);
      ctx.lineTo(cx1 * CELL_PX, y * CELL_PX);
    }
    ctx.stroke();
  }

  // Border
  ctx.strokeStyle = '#3a7a4a';
  ctx.lineWidth = 2 / state.zoom;
  ctx.setLineDash([]);
  ctx.strokeRect(0, 0, gW, gH);
}

function drawBorderLabels() {
  if (state.zoom * CELL_PX < 1.5) return;
  const gW = state.gridCols * CELL_PX, gH = state.gridRows * CELL_PX;
  const fs = clamp(10 / state.zoom, 5, 18);
  ctx.save();
  ctx.font = `${fs}px system-ui`;
  ctx.fillStyle = '#2a5a2a';

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Rua Adolfo Germano Rogge — frente (40m)', gW / 2, -4 / state.zoom);

  ctx.textBaseline = 'top';
  ctx.fillText('Vizinho Campo de Futebol — fundo (40m)', gW / 2, gH + 4 / state.zoom);

  ctx.save();
  ctx.translate(-10 / state.zoom, gH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Rua Nalim Sobrinho (50m)', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(gW + 10 / state.zoom, gH / 2);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Vizinho Chiquinho (50m)', 0, 0);
  ctx.restore();

  ctx.restore();
}

function getVisiblePolygons() {
  const L = state.activeLayers;
  return state.polygons.filter(p => {
    if (L.atual && p.tab === 'atual') return true;
    if (L.futuro && p.tab === 'futuro') return true;
    if (L.construcao && p.category === 'construcao') return true;
    if (L.arvores && (p.category === 'arvore' || p.category === 'arvore_frutifera')) return true;
    return false;
  });
}

function drawPolygons() {
  const vis = getVisiblePolygons();
  vis.filter(p => p.id !== state.selectedId).forEach(p => drawPolygon(p, false));
  const sel = state.polygons.find(p => p.id === state.selectedId);
  if (sel) drawPolygon(sel, true);
}

function drawPolygon(poly, isSelected) {
  if (poly.vertices.length < 2) return;
  const isFuturo = poly.tab === 'futuro';
  const color = poly.color || CATEGORY_DEFAULTS[poly.category] || '#4a8a5a';

  ctx.beginPath();
  const f = cellToWorld(poly.vertices[0].x, poly.vertices[0].y);
  ctx.moveTo(f.x, f.y);
  for (let i = 1; i < poly.vertices.length; i++) {
    const p = cellToWorld(poly.vertices[i].x, poly.vertices[i].y);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();

  ctx.globalAlpha = isFuturo ? 0.28 : 0.52;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Stroke style by status + tab
  ctx.lineWidth = (isSelected ? 2.5 : 1.5) / state.zoom;
  ctx.strokeStyle = isSelected ? '#FFD700' : color;
  if (isFuturo) {
    ctx.setLineDash([8 / state.zoom, 4 / state.zoom]);
  } else if (poly.status === 'projeto') {
    ctx.setLineDash([6 / state.zoom, 3 / state.zoom]);
  } else if (poly.status === 'em_construcao') {
    ctx.setLineDash([3 / state.zoom, 3 / state.zoom]);
  } else {
    ctx.setLineDash([]);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Selection glow ring
  if (isSelected) {
    ctx.lineWidth = 4 / state.zoom;
    ctx.strokeStyle = 'rgba(255,215,0,0.35)';
    ctx.stroke();
  }

  // Label (only if zoom large enough)
  if (poly.label && state.zoom * CELL_PX >= 4) {
    const cx = poly.vertices.reduce((s, v) => s + v.x, 0) / poly.vertices.length * CELL_PX;
    const cy = poly.vertices.reduce((s, v) => s + v.y, 0) / poly.vertices.length * CELL_PX;
    const fs = clamp(10 / state.zoom, 4, 16);
    ctx.font = `bold ${fs}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(poly.label).width;
    const pad = 3 / state.zoom;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(cx - tw / 2 - pad, cy - fs / 2 - pad * 0.5, tw + pad * 2, fs + pad);
    ctx.fillStyle = '#1a3a1a';
    ctx.fillText(poly.label, cx, cy);
  }

  if (isSelected && state.tool === 'editVertices') {
    const HANDLE_R = 5 / state.zoom;
    poly.vertices.forEach((v, i) => {
      const w = cellToWorld(v.x, v.y);
      ctx.beginPath();
      ctx.arc(w.x, w.y, HANDLE_R, 0, Math.PI * 2);
      const isDragging = state.vertexDrag.active && state.vertexDrag.vertexIndex === i;
      ctx.fillStyle = isDragging ? '#FF4500' : '#FFD700';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 / state.zoom;
      ctx.fill();
      ctx.stroke();
    });
  }
}

function drawCircles() {
  const L = state.activeLayers;
  const vis = state.circles.filter(c => {
    if (L.atual && c.tab === 'atual') return true;
    if (L.futuro && c.tab === 'futuro') return true;
    if (L.construcao && c.category === 'construcao') return true;
    if (L.arvores && (c.category === 'arvore' || c.category === 'arvore_frutifera')) return true;
    return false;
  });
  vis.filter(c => c.id !== state.selectedId).forEach(c => drawCircle(c, false));
  const sel = state.circles.find(c => c.id === state.selectedId);
  if (sel) drawCircle(sel, true);
}

function drawCircle(circle, isSelected) {
  const cw = cellToWorld(circle.center.x, circle.center.y);
  const r = circle.radius * CELL_PX;
  if (r < 0.5) return;
  const isFuturo = circle.tab === 'futuro';
  const color = circle.color || CATEGORY_DEFAULTS[circle.category] || '#4a8a5a';

  ctx.beginPath();
  ctx.arc(cw.x, cw.y, r, 0, Math.PI * 2);
  ctx.globalAlpha = isFuturo ? 0.28 : 0.52;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.lineWidth = (isSelected ? 2.5 : 1.5) / state.zoom;
  ctx.strokeStyle = isSelected ? '#FFD700' : color;
  if (isFuturo) {
    ctx.setLineDash([8 / state.zoom, 4 / state.zoom]);
  } else if (circle.status === 'projeto') {
    ctx.setLineDash([6 / state.zoom, 3 / state.zoom]);
  } else if (circle.status === 'em_construcao') {
    ctx.setLineDash([3 / state.zoom, 3 / state.zoom]);
  } else {
    ctx.setLineDash([]);
  }
  ctx.beginPath();
  ctx.arc(cw.x, cw.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  if (isSelected) {
    ctx.beginPath();
    ctx.arc(cw.x, cw.y, r, 0, Math.PI * 2);
    ctx.lineWidth = 4 / state.zoom;
    ctx.strokeStyle = 'rgba(255,215,0,0.35)';
    ctx.stroke();

    const HANDLE_R = 5 / state.zoom;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(cw.x + dx * r, cw.y + dy * r, HANDLE_R, 0, Math.PI * 2);
      ctx.fillStyle = state.radiusDrag.active && state.radiusDrag.circleId === circle.id ? '#FF4500' : '#FFD700';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 / state.zoom;
      ctx.fill();
      ctx.stroke();
    });
  }

  if (circle.label && state.zoom * CELL_PX >= 4) {
    const fs = clamp(10 / state.zoom, 4, 16);
    ctx.font = `bold ${fs}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(circle.label).width;
    const pad = 3 / state.zoom;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(cw.x - tw / 2 - pad, cw.y - fs / 2 - pad * 0.5, tw + pad * 2, fs + pad);
    ctx.fillStyle = '#1a3a1a';
    ctx.fillText(circle.label, cw.x, cw.y);
  }
}

function drawDrawingPreview() {
  const d = state.drawing;
  const snapDot = (cx, cy, color) => {
    const w = cellToWorld(cx, cy);
    ctx.fillStyle = color;
    ctx.fillRect(w.x - 3 / state.zoom, w.y - 3 / state.zoom, 6 / state.zoom, 6 / state.zoom);
  };

  if (state.tool === 'drawCircle') {
    snapDot(d.mouseCell.x, d.mouseCell.y, d.circleStart ? 'rgba(42,122,58,0.85)' : 'rgba(42,122,58,0.55)');
    if (d.circleStart) {
      const A = cellToWorld(d.circleStart.x, d.circleStart.y);
      const B = cellToWorld(d.mouseCell.x, d.mouseCell.y);
      const radius = Math.hypot(d.mouseCell.x - d.circleStart.x, d.mouseCell.y - d.circleStart.y) / 2 * CELL_PX;
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
      ctx.strokeStyle = '#e05020';
      ctx.lineWidth = 1.5 / state.zoom;
      ctx.setLineDash([4 / state.zoom, 3 / state.zoom]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (radius > 0.5) {
        ctx.beginPath();
        ctx.arc(mx, my, radius, 0, Math.PI * 2);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#2a7a3a';
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#2a7a3a';
        ctx.lineWidth = 1.5 / state.zoom;
        ctx.setLineDash([4 / state.zoom, 3 / state.zoom]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.arc(A.x, A.y, 4 / state.zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#e05020';
      ctx.fill();
    }
    return;
  }

  if (!d.active) {
    if (state.tool === 'draw') snapDot(d.mouseCell.x, d.mouseCell.y, 'rgba(42,122,58,0.55)');
    return;
  }

  if (d.vertices.length > 0) {
    ctx.beginPath();
    const f = cellToWorld(d.vertices[0].x, d.vertices[0].y);
    ctx.moveTo(f.x, f.y);
    for (let i = 1; i < d.vertices.length; i++) {
      const p = cellToWorld(d.vertices[i].x, d.vertices[i].y);
      ctx.lineTo(p.x, p.y);
    }
    const m = cellToWorld(d.mouseCell.x, d.mouseCell.y);
    ctx.lineTo(m.x, m.y);
    ctx.strokeStyle = '#2a7a3a';
    ctx.lineWidth = 1.5 / state.zoom;
    ctx.setLineDash([4 / state.zoom, 3 / state.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);

    d.vertices.forEach((v, i) => {
      const p = cellToWorld(v.x, v.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 / state.zoom, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#e05020' : '#2a7a3a';
      ctx.fill();
    });

    // Close indicator
    if (d.vertices.length >= 3) {
      const dist = Math.hypot(d.mouseCell.x - d.vertices[0].x, d.mouseCell.y - d.vertices[0].y);
      if (dist <= 1.5) {
        const p = cellToWorld(d.vertices[0].x, d.vertices[0].y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9 / state.zoom, 0, Math.PI * 2);
        ctx.strokeStyle = '#e05020';
        ctx.lineWidth = 1.5 / state.zoom;
        ctx.stroke();
      }
    }
  }

  snapDot(d.mouseCell.x, d.mouseCell.y, 'rgba(42,122,58,0.85)');
}

function drawScaleIndicator() {
  const pixPerMeter = (CELL_PX * state.zoom * dpr) / 0.3;
  const nm = niceNumber(110 / pixPerMeter);
  const barPx = nm * pixPerMeter / dpr;
  const x = 14, y = canvas.height / dpr - 14;

  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillRect(x - 5, y - 18, barPx + 10, 22);
  ctx.strokeStyle = '#2a5a2a';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + barPx, y);
  ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 3);
  ctx.moveTo(x + barPx, y - 6); ctx.lineTo(x + barPx, y + 3);
  ctx.stroke();
  ctx.font = '10px system-ui';
  ctx.fillStyle = '#2a5a2a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const lbl = nm >= 1 ? `${nm}m` : `${Math.round(nm * 100)}cm`;
  ctx.fillText(lbl, x + barPx / 2, y - 1);
}

function niceNumber(v) {
  for (const n of [0.3, 0.6, 1, 2, 3, 5, 10, 15, 20, 30, 50, 100, 200]) if (n >= v) return n;
  return 200;
}

let _lastMouse = { x: 0, y: 0 };
function updateCoordDisplay() {
  const w = screenToWorld(_lastMouse.x, _lastMouse.y);
  const c = snapToGrid(w.x, w.y);
  const mx = (c.x * 0.3).toFixed(1), my = (c.y * 0.3).toFixed(1);
  document.getElementById('coord-display').textContent = `x:${mx}m y:${my}m | ${state.zoom.toFixed(1)}×`;
}
