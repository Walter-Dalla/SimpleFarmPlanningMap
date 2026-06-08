resizeCanvas();
fitView();
updateLegend();
updateGridHint();
scheduleRender();

// Startup: try default file → fallback to localStorage (silent, no prompt)
tryLoadDefaultFile().then(loaded => {
  if (!loaded) restoreFromLocalStorage();
});
