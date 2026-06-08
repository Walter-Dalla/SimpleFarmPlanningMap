function buildSaveData() {
  return {
    version: 1,
    gridCols: state.gridCols,
    gridRows: state.gridRows,
    polygons: state.polygons,
    circles: state.circles,
    satellite: { dataUrl: state.satellite.dataUrl, opacity: state.satellite.opacity, visible: state.satellite.visible },
    savedAt: new Date().toISOString()
  };
}

// File System Access API handle (Chrome/Edge) for true auto-save to file
let _fileHandle = null;

async function saveToJSON() {
  const json = JSON.stringify(buildSaveData(), null, 2);
  if (window.showSaveFilePicker && !_fileHandle) {
    try {
      _fileHandle = await window.showSaveFilePicker({
        suggestedName: 'chacara.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
    } catch (e) { _fileHandle = null; }
  }
  if (_fileHandle) {
    try {
      const w = await _fileHandle.createWritable();
      await w.write(json); await w.close();
      state.dirty = false; return;
    } catch (e) { _fileHandle = null; }
  }
  // Fallback: blob download
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'chacara.json'; a.click();
  URL.revokeObjectURL(url);
  state.dirty = false;
}

function triggerLoad() { document.getElementById('file-load').click(); }

async function loadFromJSON(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try { deserializeState(JSON.parse(e.target.result)); }
    catch (err) { alert('Erro ao carregar: ' + err.message); }
  };
  reader.readAsText(file);
  input.value = '';
}

function deserializeState(data) {
  if (!data || data.version !== 1) { alert('Formato de arquivo inválido.'); return; }
  state.polygons = (data.polygons || []).map(p => Object.assign(createPolygon(p.vertices, p), p));
  state.circles = (data.circles || []);
  state.gridCols = data.gridCols || 133;
  state.gridRows = data.gridRows || 167;
  document.getElementById('grid-cols').value = state.gridCols;
  document.getElementById('grid-rows').value = state.gridRows;
  updateGridHint();

  if (data.satellite) {
    state.satellite.opacity = data.satellite.opacity ?? 0.5;
    state.satellite.visible = data.satellite.visible ?? false;
    document.getElementById('sat-visible').checked = state.satellite.visible;
    document.getElementById('sat-opacity').value = state.satellite.opacity;
    if (data.satellite.dataUrl) {
      state.satellite.dataUrl = data.satellite.dataUrl;
      const img = new Image();
      img.onload = () => {
        state.satellite.image = img;
        document.getElementById('sat-remove').style.display = '';
        scheduleRender();
      };
      img.src = data.satellite.dataUrl;
    } else {
      state.satellite.dataUrl = null;
      state.satellite.image = null;
      document.getElementById('sat-remove').style.display = 'none';
    }
  }

  state.selectedId = null;
  renderSidebar(); updateLegend(); scheduleRender();
}

let _autosaveTimer = null;
function scheduleAutosave() {
  clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(async () => {
    // 1. Auto-save to file handle if available
    if (_fileHandle) {
      try {
        const w = await _fileHandle.createWritable();
        await w.write(JSON.stringify(buildSaveData(), null, 2));
        await w.close();
        state.dirty = false;
      } catch (e) { _fileHandle = null; }
    }
    // 2. Save to localStorage — try with satellite image, fall back without if quota exceeded
    try {
      const data = buildSaveData();
      localStorage.setItem('chacara_autosave', JSON.stringify(data));
      localStorage.setItem('chacara_autosave_ts', new Date().toISOString());
    } catch (e) {
      try {
        const data = buildSaveData();
        const slim = { ...data, satellite: { ...data.satellite, dataUrl: null } };
        localStorage.setItem('chacara_autosave', JSON.stringify(slim));
        localStorage.setItem('chacara_autosave_ts', new Date().toISOString());
      } catch (e2) { /* quota even without satellite */ }
    }
  }, 800);
}

function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (((h << 5) + h) ^ str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

// Stringify with sorted keys at every level — eliminates key-order differences
// caused by createPolygon rebuilding objects with a different insertion order.
function sortedStringify(obj) {
  if (Array.isArray(obj)) return '[' + obj.map(sortedStringify).join(',') + ']';
  if (obj !== null && typeof obj === 'object') {
    return '{' + Object.keys(obj).sort().map(k => JSON.stringify(k) + ':' + sortedStringify(obj[k])).join(',') + '}';
  }
  return JSON.stringify(obj);
}

function normalizeForHash(data) {
  const d = JSON.parse(JSON.stringify(data));
  delete d.savedAt;
  if (d.satellite) d.satellite.dataUrl = null;
  if (d.polygons) d.polygons.sort((a, b) => a.id.localeCompare(b.id));
  if (d.circles) d.circles.sort((a, b) => a.id.localeCompare(b.id));
  return sortedStringify(d);
}

function reloadFromJSONFile(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const jsonData = JSON.parse(e.target.result);

      const lsRaw = localStorage.getItem('chacara_autosave');
      if (lsRaw) {
        const lsData = JSON.parse(lsRaw);
        const lsNorm = normalizeForHash(lsData);
        const jsonNorm = normalizeForHash(jsonData);
        console.log('[hash] localStorage normalizado:', lsNorm);
        console.log('[hash] JSON arquivo normalizado:', jsonNorm);
        const lsHash = simpleHash(lsNorm);
        const jsonHash = simpleHash(jsonNorm);

        if (lsHash !== jsonHash) {
          const ok = confirm(
            'Diferença detectada entre o JSON selecionado e dados locais.\n\n' +
            'Hash JSON:         ' + jsonHash + '\n' +
            'Hash localStorage: ' + lsHash + '\n\n' +
            'Carregar JSON e descartar alterações locais?'
          );
          if (!ok) { input.value = ''; return; }
        }
      }

      deserializeState(jsonData);
    } catch (err) {
      alert('Erro ao carregar JSON: ' + err.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
}

// Try to load chacara.json from same directory (works on HTTP servers; blocked on file:// in Chrome)
async function tryLoadDefaultFile() {
  try {
    const res = await fetch('./chacara.json');
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.version === 1) { deserializeState(data); return true; }
  } catch (e) { /* file:// CORS block or file not found */ }
  return false;
}

// Silently restore from localStorage if data exists and no default file loaded
function restoreFromLocalStorage() {
  try {
    const raw = localStorage.getItem('chacara_autosave');
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || !data.polygons || !data.polygons.length) return false;
    deserializeState(data);
    return true;
  } catch (e) { return false; }
}
