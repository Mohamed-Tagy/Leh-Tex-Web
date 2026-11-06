// Leh? Tex's service worker (F100, docs/design/F100.md). build.py fills in CACHE and FILES (tools/pwa_sw.py).
// It keeps the app's own files for offline use and nothing else: no documents (they stay in IndexedDB), no requests
// to other origins, no importScripts, no push, sync or analytics.
'use strict';
const CACHE = "lehtex-e28319c6c9ee6fcd";
const FILES = {
 "folio.js": "72b69859d08f25919f7c7555706eb9978749d50cdd90e4c0024473006a7cd269",
 "fonts/alexandria.woff2": "70db8c344ab7787d0a619d1b3c621081d14f62467399921b0090b8a0465bac22",
 "fonts/amiri-bold.woff2": "ecd48d2fc8d41d5005245cce146c5cf150b65ed9508f84f1c90af5410119d95a",
 "fonts/amiri-regular.woff2": "793c2e78d60fbb3bf6d93bdbf784f646c8bb59e9ef16ce5b03a3db96de9dec2b",
 "fonts/aref-ruqaa-qmark.woff2": "106dd458ccb6225b12693a7f642255f96889145c961301453bf1eb2afb07c61b",
 "fonts/lehtex-serif-bold.woff2": "52c858b170da19205c072e91478b871f6276e4116a4bef1940549f45268492d2",
 "fonts/lehtex-serif-bolditalic.woff2": "add5ec7a731668ee2bd337862c3cfaf0f637e0423398018a874bbb6c0660eacd",
 "fonts/lehtex-serif-italic.woff2": "48b53c62a15164f1ba29bfd9efe925797a025827cd4bc3d34ac49d3d9be2e04a",
 "fonts/lehtex-serif-regular.woff2": "483277399fb63298c91a21945d228b3c4e62296a2dd983dfd11f6fe366ff13b7",
 "fonts/libertinus-serif-bold.woff2": "98719c3741fc83ca074c682e39511c5abf25b456ea431357f6e55d4dc27ff459",
 "fonts/libertinus-serif-bolditalic.woff2": "612382e3a05e865a0ca43894b64ff0bb430327f9735eb7450d778dcb7fd2565b",
 "fonts/libertinus-serif-italic.woff2": "f10b9aae102b8e9b221a2d6e558a9860e4b1d176c6cff23b8d8d282d26b12af3",
 "fonts/libertinus-serif-regular.woff2": "ed93005aaf99c90ace7eff2c84da86095e7e1ddda6a9a7c2f9dec9f514b2a01d",
 "fonts/noto-naskh-arabic-bold.woff2": "43f9d537873454c147f5b4a394477f9375bf432aad134d5ddf4de9ff8c85c35f",
 "fonts/noto-naskh-arabic-regular.woff2": "acc414fb417e3a36a90b0e5fd225e76a80b175ad0dd350a86b6b7a1cae13dc3c",
 "fonts/stix-two-text-bold.woff2": "8ba3b5c71c81d6308ee8022404882e9f2060b0cd80a6cfe86938e408326419fb",
 "fonts/stix-two-text-bolditalic.woff2": "bdb4aee2ec11e2567e0661e9a6c6db0dda9331627d5bf0106577dc135c950c21",
 "fonts/stix-two-text-italic.woff2": "8c10e937f6977f90dcaeca06a2ed934a01104251394d01a5c269cde280183f4a",
 "fonts/stix-two-text-regular.woff2": "c22fd68515252a331914d1ee5e1eafa949f12a603cbb04d2c207cb6a206e89ec",
 "icon-192.png": "189d5745cf8c56b4e750ca70c0793dca50101e55784a675e9bc9997d5a960d83",
 "icon-512.png": "fe45b6048d8c2e86ef03a4d85ae1df35bfd231e6c06a3559b87056f082b75733",
 "index.html": "a1d09bc87dd146fef7770beb5c512f8558cf71b3142d4c418b909ef45e07c2b6",
 "manifest.webmanifest": "d399c2c47a937d30ecd3d79e5143d18d5e4d8354e1fac3551ca2de1794aad874",
 "mathjax-config.js": "d226b6a36f9161f1c596f2483b3601969dec219bb6c67021beee463225639eca",
 "pwa.js": "1016eda229e0f1733ca8dd6a3208d49796fdd6a8bbcb0a652e4e1e0533a7d06e",
 "THIRD-PARTY-NOTICES.txt": "e190bb5caad8de4622f955a5f097d1a4df8e100ea88edac23bdf5d7df5555cbf",
 "vendor/jszip.min.js": "acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e",
 "vendor/tex-svg-full.js": "a4354ff94fd868aea0cc6eaaa79a57fda0588646fc46ee3700a349ee0a11cbe6"
};
const BASE = new URL('./', self.location).href;
const URLS = new Set(Object.keys(FILES).map(p => new URL(p, BASE).href));

function hex(buf) { return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join(''); }

// Install: fetch every file of this build and keep it only if its SHA-256 is the one build.py listed; any failure
// stops the install, and the version already installed keeps working.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => Promise.all(Object.keys(FILES).map(async path => {
    const url = new URL(path, BASE).href;
    const res = await fetch(url, { cache: 'no-store', redirect: 'error' });
    if (!res.ok) throw new Error(path + ': HTTP ' + res.status);
    const body = await res.clone().arrayBuffer();
    if (hex(await crypto.subtle.digest('SHA-256', body)) !== FILES[path]) throw new Error(path + ': not the file this build lists');
    await cache.put(url, res);
  }))).catch(err => caches.delete(CACHE).then(() => { throw err; })));
  // no skipWaiting here: a new version waits until the page asks for it (Reload now)
});

// Activate: delete the caches of older versions.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('lehtex-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// The page's Reload now button.
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

// Fetch: a GET for one of this build's files, on this origin, is answered from the cache (the network if it is
// missing, without storing the answer). Every other request is left alone.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin || u.search) return;
  const key = u.href.split('#')[0] === BASE ? BASE + 'index.html' : u.href.split('#')[0];
  if (!URLS.has(key)) return;
  e.respondWith(caches.open(CACHE).then(cache => cache.match(key)).then(hit => hit || fetch(req)));
});
