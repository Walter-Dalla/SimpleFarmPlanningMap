function triggerSatellite() { document.getElementById('file-satellite').click(); }

function loadSatelliteImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    state.satellite.dataUrl = e.target.result;
    const img = new Image();
    img.onload = () => {
      state.satellite.image = img;
      document.getElementById('sat-remove').style.display = '';
      scheduleRender(); scheduleAutosave();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function removeSatellite() {
  state.satellite.dataUrl = null; state.satellite.image = null;
  document.getElementById('sat-remove').style.display = 'none';
  scheduleRender(); scheduleAutosave();
}
