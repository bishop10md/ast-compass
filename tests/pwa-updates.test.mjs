import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync(new URL('../src/lib/pwaUpdates.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));
function target() { const handlers = new Map(); return { addEventListener(name, handler) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(handler); }, emit(name) { for (const handler of handlers.get(name) || []) handler(); }, count(name) { return handlers.get(name)?.size || 0; } }; }
function harness({ controlled = true, waiting = false, failure = false, deferred = false } = {}) {
  const exports = {}, document = Object.assign(target(), { visibilityState: 'visible' }), events = target(), navigator = { onLine: true, serviceWorker: { controller: controlled ? {} : null } };
  let now = 120_000, calls = 0, settle;
  const registration = Object.assign(target(), { waiting: waiting ? target() : null, installing: null, update() { calls++; if (failure) return Promise.reject(Error('synthetic update failure')); if (deferred) return new Promise(resolve => { settle = () => resolve(registration); }); return Promise.resolve(registration); } });
  new Function('exports', 'navigator', 'document', 'addEventListener', 'Date', compiled)(exports, navigator, document, events.addEventListener, { now: () => now });
  return { ...exports, registration, navigator, document, events, calls: () => calls, advance: () => { now += 60_000; }, settle: () => settle?.() };
}
test('existing waiting update reaches current and late subscribers; monitoring is idempotent', () => {
  const h=harness({waiting:true}), states=[]; h.subscribeAstUpdates(v=>states.push(v)); h.monitorAstUpdates(h.registration); h.monitorAstUpdates(h.registration); assert.deepEqual(states,[false,true]);
  const late=[]; h.subscribeAstUpdates(v=>late.push(v)); assert.deepEqual(late,[true]); assert.equal(h.registration.count('updatefound'),1); assert.equal(h.document.count('visibilitychange'),1); assert.equal(h.events.count('online'),1);
});
test('first install is not an update; unsubscribed UI receives no notice', () => {
  const h=harness({controlled:false,waiting:true}), states=[]; h.subscribeAstUpdates(v=>states.push(v)); h.monitorAstUpdates(h.registration); assert.deepEqual(states,[false]);
  const active=harness(), gone=[]; const unsubscribe=active.subscribeAstUpdates(v=>gone.push(v)); active.monitorAstUpdates(active.registration); unsubscribe(); active.registration.waiting=target(); active.registration.emit('updatefound'); assert.deepEqual(gone,[false]);
});
test('later installation announces only a waiting worker once', () => {
  const h=harness(), states=[], worker=target(); h.subscribeAstUpdates(v=>states.push(v)); h.monitorAstUpdates(h.registration); h.registration.installing=worker; h.registration.emit('updatefound'); worker.emit('statechange'); assert.deepEqual(states,[false]); h.registration.waiting=worker; worker.emit('statechange'); worker.emit('statechange'); assert.deepEqual(states,[false,true]);
});
test('update checks require online visible state and are throttled', async () => {
  const h=harness(); h.monitorAstUpdates(h.registration); assert.equal(h.calls(),0); h.document.emit('visibilitychange'); await flush(); assert.equal(h.calls(),1);
  h.events.emit('online'); await flush(); assert.equal(h.calls(),1); h.advance(); h.document.visibilityState='hidden'; h.document.emit('visibilitychange'); assert.equal(h.calls(),1);
  h.document.visibilityState='visible'; h.document.emit('visibilitychange'); await flush(); assert.equal(h.calls(),2); h.advance(); h.navigator.onLine=false; h.document.emit('visibilitychange'); assert.equal(h.calls(),2);
  h.navigator.onLine=true; h.events.emit('online'); await flush(); assert.equal(h.calls(),3);
});
test('failed update checks do not reject and later checks recover', async () => {
  const h=harness({failure:true}), states=[]; h.subscribeAstUpdates(v=>states.push(v)); h.monitorAstUpdates(h.registration); h.events.emit('online'); await flush(); h.advance(); h.events.emit('online'); await flush(); assert.equal(h.calls(),2); assert.deepEqual(states,[false]);
});
test('concurrent checks are suppressed and completion discovers waiting updates', async () => {
  const h=harness({deferred:true}), states=[]; h.subscribeAstUpdates(v=>states.push(v)); h.monitorAstUpdates(h.registration); h.events.emit('online'); h.advance(); h.document.emit('visibilitychange'); assert.equal(h.calls(),1);
  h.registration.waiting=target(); h.settle(); await flush(); assert.deepEqual(states,[false,true]); h.document.emit('visibilitychange'); assert.equal(h.calls(),2); h.settle(); await flush();
});
test('update notifications never force activation or navigation; combined notices share one sticky wrapper', () => {
  assert.doesNotMatch(compiled,/skipWaiting|postMessage|location\s*\.|controllerchange|reload\(/);
  const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
  assert.match(css,/\.network-notices\{position:sticky/); assert.doesNotMatch(css,/\.offline-indicator\{position:sticky/);
});
