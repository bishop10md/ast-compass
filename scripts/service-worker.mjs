import { createHash } from 'node:crypto';

export function contentCacheVersion(entries) {
  const hash = createHash('sha256').update('ast-sw-policy-v2\0');
  for (const [path, bytes] of [...entries].sort(([a], [b]) => a.localeCompare(b))) hash.update(path).update('\0').update(bytes).update('\0');
  return hash.digest('hex').slice(0, 12);
}

export function buildServiceWorker(version, precache, runtimePaths) {
  return `const CACHE = 'ast-compass-${version}';
const PRECACHE = ${JSON.stringify(precache)};
const STATIC_PATHS = new Set(${JSON.stringify([...new Set([...precache, ...runtimePaths])])});
const PRIVATE_PATH = /^\\/(?:auth|signin|create-account|recover-account|dashboard|history|my-images|settings|admin|api|upload|uploads|storage|feedback|\\.netlify)(?:\\/|$)/;
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map(path => new Request(path, {cache:'reload'}))))));
// Do not replace the worker controlling an in-progress analysis. The waiting
// version activates after all windows using the previous version close.
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('ast-compass-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('Authorization') || request.headers.has('Range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.protocol !== 'https:' || PRIVATE_PATH.test(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      return await cache.match('/index.html') || await cache.match('/offline.html') || Response.error();
    }));
    return;
  }
  // Only known first-party build assets may be stored; not arbitrary /assets/ URLs.
  if (url.search || !STATIC_PATHS.has(url.pathname)) return;
  let write = Promise.resolve();
  const pending = caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(url.pathname);
    if (cached) return cached;
    const response = await fetch(request, {cache:'reload'});
    if (response.ok && !response.redirected && response.type === 'basic' && !/no-store|private/i.test(response.headers.get('Cache-Control') || '')) {
      write = cache.put(url.pathname, response.clone()).catch(() => undefined);
    }
    return response;
  });
  event.respondWith(pending);
  event.waitUntil(pending.then(() => write, () => undefined));
});
`;
}
