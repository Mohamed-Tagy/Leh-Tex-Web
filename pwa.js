// Leh? Tex hosted web app (F100): registers the service worker and, when a new version has been downloaded, asks
// before switching to it. Loaded after folio.js only by the pwa build (build.py --target pwa).
'use strict';
(function () {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const state = window.__lehtexPwa = { registered: false, prompted: 0, error: '' };
  let reloading = false;
  function prompt(reg) {
    if (document.getElementById('pwaUpdate')) return;
    state.prompted++;
    const now = h('button', { class: 'btn primary', type: 'button', text: 'Reload now' });
    const later = h('button', { class: 'btn', type: 'button', text: 'Later' });
    const bar = h('div', { class: 'storage-banner pwa-update', id: 'pwaUpdate', role: 'status' },
      h('span', { class: 'msg', text: 'A new version of Leh? Tex is ready.' }), now, later);
    now.onclick = async () => {
      now.disabled = later.disabled = true;
      try { await flushSave(); } catch (e) { /* the save shows its own message */ }
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
      if (reg.waiting) reg.waiting.postMessage('skipWaiting');
    };
    later.onclick = () => bar.remove(); // asked again at the next start
    document.body.append(bar);
  }
  function watch(reg) {
    state.registered = true;
    if (reg.waiting && navigator.serviceWorker.controller) prompt(reg);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) prompt(reg); });
    });
  }
  addEventListener('load', () => { navigator.serviceWorker.register('sw.js').then(watch, e => { state.error = String(e && e.message || e); }); });
})();
