import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { buildServiceWorker, contentCacheVersion } from '../scripts/service-worker.mjs';
const origin = 'https://astcompass.com', paths = ['/index.html', '/offline.html', '/assets/lazy.js'];
const response = (text = 'asset', headers = {}, options = {}) => ({ ok: true, type: 'basic', redirected: false, headers: new Headers(headers), text: async () => text, clone() { return this; }, ...options });
function harness({ offline = false, networkResponse = response() } = {}) {
  const stores = new Map(), handlers = {}, calls = [], added = []; let skipped = 0, claimed = 0;
  const key = p => new URL(typeof p === 'string' ? p : p.url, origin).pathname;
  const getCache = name => { if (!stores.has(name)) stores.set(name, new Map()); const store = stores.get(name); return { match: async p => store.get(key(p)), addAll: async requests => { added.push(...requests); for (const req of requests) store.set(key(req), response(key(req))); }, put: async (p, value) => { store.set(key(p), value); calls.push(key(p)); } }; };
  const caches = { open: async name => getCache(name), keys: async () => [...stores.keys()], delete: async name => stores.delete(name) };
  class LocalRequest { constructor(path, options = {}) { this.url = new URL(path, origin).href; this.cache = options.cache; } }
  runInNewContext(buildServiceWorker('test', paths, ['/ocr/worker.min.js']), { self: { location: { origin }, clients: { claim: async () => { claimed++; } }, skipWaiting: () => { skipped++; }, addEventListener: (name, fn) => { handlers[name] = fn; } }, caches, Request: LocalRequest, Response, URL, fetch: async () => { if (offline) throw Error('synthetic offline'); return networkResponse; } });
  async function lifecycle(name) { const waits = []; handlers[name]({ waitUntil: p => waits.push(p) }); await Promise.all(waits); }
  async function fetchPath(path, options = {}) { const waits = []; let pending; handlers.fetch({ request: { url: new URL(path, origin).href, method: 'GET', mode: 'cors', headers: new Headers(), ...options }, respondWith: p => { pending = p; }, waitUntil: p => waits.push(p) }); const result = await pending; await Promise.all(waits); return { intercepted: !!pending, response: result }; }
  return { stores, calls, added, getCache, lifecycle, fetchPath, skipped: () => skipped, claimed: () => claimed };
}
test('service-worker version hashes fixed-path content and OCR content, not just file names', () => {
  const a = [['/index.html', Buffer.from('a')], ['/ocr/worker.min.js', Buffer.from('one')]];
  assert.notEqual(contentCacheVersion(a), contentCacheVersion([['/index.html', Buffer.from('b')], a[1]]));
  assert.notEqual(contentCacheVersion(a), contentCacheVersion([a[0], ['/ocr/worker.min.js', Buffer.from('two')]]));
  assert.equal(contentCacheVersion(a), contentCacheVersion([...a].reverse()));
});
test('PWA installation waits for existing clients and activation only removes this app old caches', async () => {
  const h = harness(); h.getCache('ast-compass-old'); h.getCache('unrelated-cache'); await h.lifecycle('install'); assert.equal(h.skipped(), 0); assert.ok(h.stores.has('ast-compass-old')); assert.ok(h.added.every(x => x.cache === 'reload'));
  await h.lifecycle('activate'); assert.equal(h.stores.has('ast-compass-old'), false); assert.ok(h.stores.has('unrelated-cache')); assert.equal(h.claimed(), 1);
});
test('service worker excludes submissions, auth, feedback, arbitrary paths, query values and sensitive headers', async () => {
  const h = harness(); await h.lifecycle('install');
  for (const [path, options] of [['/feedback', { mode: 'navigate' }], ['/auth/callback', { mode: 'navigate' }], ['/api/test', { mode: 'navigate' }], ['/storage/test', {}], ['/my-images', { mode: 'navigate' }], ['/assets/unknown.js', {}], ['/ocr/worker.min.js?token=synthetic', {}], ['/assets/lazy.js', { headers: new Headers({ Authorization: 'synthetic' }) }], ['/assets/lazy.js', { headers: new Headers({ Range: 'bytes=0-9' }) }], ['/assets/lazy.js', { method: 'POST' }], ['https://other.example/assets/lazy.js', {}]]) assert.equal((await h.fetchPath(path, options)).intercepted, false, path);
  assert.equal(h.calls.length, 0);
});
test('offline public route and known lazy chunk load only from the current app cache', async () => {
  const h = harness({ offline: true }); await h.lifecycle('install');
  assert.equal(await (await h.fetchPath('/learn', { mode: 'navigate' })).response.text(), '/index.html');
  assert.equal(await (await h.fetchPath('/references/coverage?organism=ecoli', { mode: 'navigate' })).response.text(), '/index.html');
  assert.equal(h.calls.length, 0, 'navigation URLs and query data are never persisted');
  assert.equal(await (await h.fetchPath('/assets/lazy.js')).response.text(), '/assets/lazy.js');
  await h.getCache('unrelated').put('/ocr/worker.min.js', response('poison')); await assert.rejects(h.fetchPath('/ocr/worker.min.js'), /offline/);
});
test('runtime OCR caching respects no-store, private, redirects, and response type', async () => {
  for (const value of [response('asset', { 'Cache-Control': 'no-store' }), response('asset', { 'Cache-Control': 'private' }), response('asset', {}, { redirected: true }), response('asset', {}, { type: 'opaque' }), response('asset', {}, { ok: false })]) { const h = harness({ networkResponse: value }); await h.fetchPath('/ocr/worker.min.js'); assert.equal(h.calls.length, 0); }
  const h = harness(); await h.fetchPath('/ocr/worker.min.js'); assert.deepEqual(h.calls, ['/ocr/worker.min.js']);
});
test('manifest icons match actual PNG dimensions and offline Retry requires no inline script', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  for (const icon of manifest.icons) { const bytes = readFileSync(new URL('../public' + icon.src, import.meta.url)); assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes); }
  const offline = readFileSync(new URL('../public/offline.html', import.meta.url), 'utf8'); assert.doesNotMatch(offline, /onclick=/i); assert.match(offline, /href="\/"/);
  const platform = readFileSync(new URL('../src/lib/platform.ts', import.meta.url), 'utf8'); assert.match(platform, /document.readyState === "complete"/); assert.match(platform, /updateViaCache: "none"/);
});
