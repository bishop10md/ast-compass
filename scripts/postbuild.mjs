import { cp, mkdir, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
await mkdir('dist/server', { recursive: true })
await mkdir('dist/client', { recursive: true })
await cp('dist/index.html', 'dist/client/index.html')
await cp('dist/assets', 'dist/client/assets', { recursive: true })
await mkdir('dist/ocr/core', { recursive: true })
await mkdir('dist/ocr/lang', { recursive: true })
await cp('node_modules/tesseract.js/dist/tesseract.min.js', 'dist/ocr/tesseract.min.js')
await cp('node_modules/tesseract.js/dist/worker.min.js', 'dist/ocr/worker.min.js')
for (const file of ['tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm']) {
  await cp(`node_modules/tesseract.js-core/${file}`, `dist/ocr/core/${file}`)
}
await cp('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'dist/ocr/lang/eng.traineddata.gz')
await writeFile('dist/server/index.js', `export default {
  async fetch(request, env) {
    if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') return new Response('Static asset binding unavailable', { status: 503 })
    const url = new URL(request.url)
    const assetPath = url.pathname === '/' ? '/index.html' : url.pathname
    let response = await env.ASSETS.fetch(new Request(new URL(assetPath, url.origin), request))
    if (response.status === 404 && request.headers.get('accept')?.includes('text/html')) response = await env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request))
    return response
  }
}\n`)

const assetNames = (await readdir('dist/assets')).filter((name) => !/^Promo/i.test(name))
const precache = ['/index.html', '/offline.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png', ...assetNames.map((name) => `/assets/${name}`)]
const cacheVersion = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 12)
await writeFile('dist/sw.js', `const CACHE = 'ast-compass-${cacheVersion}';
const PRECACHE = ${JSON.stringify(precache)};
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('ast-compass-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.protocol !== 'https:') return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')).then((response) => response || caches.match('/offline.html')));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/ocr/') || /^\\/(?:icon-|apple-touch-icon|favicon)/.test(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') void caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
  }
});
`)

