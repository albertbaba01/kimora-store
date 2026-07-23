console.log('🚀 Kimora Store v2.0');
async function loadModule(p) { try { return await import(p); } catch(e) { return null; } }
async function initApp() {
  console.log('📦 Initialisation...');
  try { const t = await loadModule('./ui/theme.js'); if(t) t.initTheme(); } catch(e) {}
  try { const i = await loadModule('./core/i18n.js'); if(i) i.applyLang(); } catch(e) {}
  try { const f = await loadModule('./core/firebase.js'); if(f) { const ok = await f.initFirebase(); if(ok) { f.syncProductsFromCloud(); f.syncConfigFromCloud(); } } } catch(e) {}
  try { const r = await loadModule('./ui/render.js'); if(r) r.renderHomeSections(); } catch(e) {}
  try { const p = await loadModule('./features/products.js'); if(p) p.checkFirstVisit(); } catch(e) {}
  console.log('✅ Kimora Store pret');
  const y = document.getElementById('ftYear'); if(y) y.textContent = new Date().getFullYear();
}
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initApp); } else { initApp(); }
