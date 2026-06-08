function pointInPolygon(px, py, verts) {
  let inside = false;
  const n = verts.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = verts[i].x, yi = verts[i].y, xj = verts[j].x, yj = verts[j].y;
    if (((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function polygonHitTest(cx, cy) {
  const vis = getVisiblePolygons();
  for (let i = vis.length - 1; i >= 0; i--) {
    const p = vis[i];
    if (p.vertices.length >= 3 && pointInPolygon(cx, cy, p.vertices)) return p;
  }
  return null;
}

function circleHitTest(cx, cy) {
  const L = state.activeLayers;
  const vis = state.circles.filter(c => {
    if (L.atual && c.tab === 'atual') return true;
    if (L.futuro && c.tab === 'futuro') return true;
    if (L.construcao && c.category === 'construcao') return true;
    if (L.arvores && (c.category === 'arvore' || c.category === 'arvore_frutifera')) return true;
    return false;
  });
  for (let i = vis.length - 1; i >= 0; i--) {
    const c = vis[i];
    if (Math.hypot(cx - c.center.x, cy - c.center.y) <= c.radius) return c;
  }
  return null;
}

function findShapeById(id) {
  if (!id) return null;
  const poly = state.polygons.find(p => p.id === id);
  if (poly) return { type: 'polygon', shape: poly };
  const circ = state.circles.find(c => c.id === id);
  if (circ) return { type: 'circle', shape: circ };
  return null;
}

function findSelected() { return findShapeById(state.selectedId); }
