const CELL_PX = 8; // world pixels per 30cm cell
const MIN_ZOOM = 0.25, MAX_ZOOM = 14;

const CATEGORY_DEFAULTS = {
  construcao: '#8B7355',
  arvore: '#2D5A27',
  arvore_frutifera: '#6B8E23',
  plantio: '#4CAF50'
};
const CATEGORY_LABELS = {
  construcao: 'Construção',
  arvore: 'Árvore',
  arvore_frutifera: 'Árvore Frutífera',
  plantio: 'Plantio'
};

const state = {
  gridCols: 133,
  gridRows: 167,
  zoom: 1,
  panX: 0,
  panY: 0,
  polygons: [],
  circles: [],
  tool: 'select',
  drawing: { active: false, vertices: [], mouseCell: { x: 0, y: 0 }, circleStart: null },
  selectedId: null,
  drag: { active: false, startCell: null, startVertices: null, startCenter: null },
  vertexDrag: { active: false, vertexIndex: null, startCell: null, startVertex: null },
  radiusDrag: { active: false, circleId: null },
  mergeMode: false,
  pan: { active: false, startMouse: null, startPan: null, prevTool: 'select' },
  activeLayers: { atual: true, futuro: true, construcao: true, arvores: true },
  satellite: { dataUrl: null, image: null, opacity: 0.5, visible: false },
  dirty: false
};
