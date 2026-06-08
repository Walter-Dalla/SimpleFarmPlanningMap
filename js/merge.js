function shapeToVerts(shape) {
  if (shape.type === 'circle') {
    const n = 72;
    return Array.from({length: n}, (_, i) => {
      const a = (2 * Math.PI * i) / n;
      return { x: shape.center.x + shape.radius * Math.cos(a), y: shape.center.y + shape.radius * Math.sin(a) };
    });
  }
  return shape.vertices.map(v => ({x: v.x, y: v.y}));
}

function segIntersectU(ax, ay, bx, by, cx, cy, dx, dy) {
  const dxAB = bx-ax, dyAB = by-ay, dxCD = dx-cx, dyCD = dy-cy;
  const den = dxAB*dyCD - dyAB*dxCD;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((cx-ax)*dyCD - (cy-ay)*dxCD) / den;
  const u = ((cx-ax)*dyAB - (cy-ay)*dxAB) / den;
  const E = 1e-9;
  if (t > E && t < 1-E && u > E && u < 1-E)
    return { x: ax+t*dxAB, y: ay+t*dyAB, t, u };
  return null;
}

function signedArea2(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) { const j = (i+1)%v.length; s += v[i].x*v[j].y - v[j].x*v[i].y; }
  return s;
}

function ensureSameWinding(v) {
  return signedArea2(v) >= 0 ? v : v.slice().reverse();
}

function computePolygonUnion(polyA, polyB) {
  polyA = ensureSameWinding(polyA);
  polyB = ensureSameWinding(polyB);
  const nA = polyA.length, nB = polyB.length;

  // Collect all edge-edge intersections
  const rawInts = [];
  for (let i = 0; i < nA; i++) {
    const a0 = polyA[i], a1 = polyA[(i+1)%nA];
    for (let j = 0; j < nB; j++) {
      const b0 = polyB[j], b1 = polyB[(j+1)%nB];
      const h = segIntersectU(a0.x, a0.y, a1.x, a1.y, b0.x, b0.y, b1.x, b1.y);
      if (h) rawInts.push({ x: h.x, y: h.y, iA: i, tA: h.t, iB: j, tB: h.u });
    }
  }

  if (rawInts.length === 0) {
    if (pointInPolygon(polyA[0].x, polyA[0].y, polyB)) return polyB;
    if (pointInPolygon(polyB[0].x, polyB[0].y, polyA)) return polyA;
    return null; // Disjoint
  }

  // Build augmented vertex list: original vertices + sorted intersection points per edge
  function buildAug(poly, edgeFld, tFld) {
    const aug = [];
    for (let i = 0; i < poly.length; i++) {
      aug.push({ x: poly[i].x, y: poly[i].y, isInter: false });
      rawInts.filter(r => r[edgeFld] === i).sort((a,b) => a[tFld]-b[tFld])
        .forEach(r => aug.push({ x: r.x, y: r.y, isInter: true, visited: false, entry: null, twin: -1, raw: r }));
    }
    return aug;
  }
  const augA = buildAug(polyA, 'iA', 'tA');
  const augB = buildAug(polyB, 'iB', 'tB');

  // Link twins
  for (let ai = 0; ai < augA.length; ai++) {
    if (!augA[ai].isInter) continue;
    for (let bi = 0; bi < augB.length; bi++) {
      if (augB[bi].isInter && augB[bi].raw === augA[ai].raw) {
        augA[ai].twin = bi; augB[bi].twin = ai; break;
      }
    }
  }

  // Mark entry/exit on A (relative to B)
  let inside = pointInPolygon(polyA[0].x, polyA[0].y, polyB);
  for (const a of augA) { if (a.isInter) { a.entry = !inside; inside = !inside; } }

  // Find start: first exit intersection on A (entry=false)
  const startIdx = augA.findIndex(a => a.isInter && !a.entry);
  if (startIdx === -1) return polyA;

  // Greiner-Hormann union traversal
  const result = [];
  let onA = true, curList = augA, cur = startIdx;
  const maxIt = (augA.length + augB.length) * 3 + 20;

  for (let it = 0; it < maxIt; it++) {
    if (it > 0 && onA && cur === startIdx) break;
    const node = curList[cur];
    result.push({ x: node.x, y: node.y });
    if (node.isInter) node.visited = true;

    const next = (cur+1) % curList.length;
    const nxt = curList[next];

    if (nxt.isInter && !nxt.visited) {
      if (onA && nxt.entry) {
        // A enters B → push intersection, switch to B
        result.push({ x: nxt.x, y: nxt.y });
        nxt.visited = true; augB[nxt.twin].visited = true;
        cur = (nxt.twin+1) % augB.length;
        curList = augB; onA = false; continue;
      }
      if (!onA) {
        const twinA = augA[nxt.twin];
        if (twinA && !twinA.entry) {
          // B exits A → close or switch
          if (nxt.twin === startIdx) break;
          result.push({ x: nxt.x, y: nxt.y });
          nxt.visited = true; twinA.visited = true;
          cur = (nxt.twin+1) % augA.length;
          curList = augA; onA = true; continue;
        }
      }
    }
    cur = next;
  }

  return result.length >= 3 ? result : null;
}

function enterMergeMode() {
  if (!state.selectedId) return;
  state.mergeMode = true;
  canvas.style.cursor = 'crosshair';
  const btn = document.getElementById('sb-merge-btn');
  const hint = document.getElementById('sb-merge-hint');
  if (btn) { btn.textContent = '✕ Cancelar fusão'; btn.onclick = cancelMergeMode; }
  if (hint) hint.style.display = '';
}

function cancelMergeMode() {
  state.mergeMode = false;
  canvas.style.cursor = 'default';
  renderSidebar();
}

function mergeSelectedWith(targetId) {
  const selA = findShapeById(state.selectedId);
  const selB = findShapeById(targetId);
  if (!selA || !selB) { cancelMergeMode(); return; }

  const union = computePolygonUnion(shapeToVerts(selA.shape), shapeToVerts(selB.shape));
  if (!union) {
    alert('As formas não se sobrepõem — impossível fundir.');
    cancelMergeMode(); return;
  }

  const s = selA.shape;
  const merged = createPolygon(union, {
    label: s.label, description: s.description,
    category: s.category, status: s.status, color: s.color, tab: s.tab
  });

  if (selA.type === 'polygon') deletePolygon(selA.shape.id); else deleteCircle(selA.shape.id);
  if (selB.type === 'polygon') deletePolygon(selB.shape.id); else deleteCircle(selB.shape.id);

  addPolygon(merged);
  state.selectedId = merged.id;
  cancelMergeMode();
  renderSidebar();
}
