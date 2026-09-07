import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createAuditLoader } from '../scripts/audit-module-loader.mjs';
import {humanReviewReadiness, REVIEW_FIELDS, confirmField} from '../src/features/image-human-review.mjs';
import * as extractionCore from '../src/features/image-concordance-extraction-core.mjs';
const source = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const load = createAuditLoader(fileURLToPath(new URL('../', import.meta.url)));
const { resolveAntimicrobial, canonicalAntimicrobials } = load('src/data/antibiotics.ts');
function telemetryHarness(path = '/unknown/SYNTHETIC_PRIVATE_ROUTE', failure = false) {
  const requests = [], exports = {}, values = new Map();
  const env = { PROD: true, MODE: 'production', VITE_SENTRY_DSN: 'https://public-test-key@synthetic.ingest.us.sentry.io/1', VITE_POSTHOG_KEY: 'public-test-key' };
  const code = ts.transpileModule(source('src/lib/telemetry.ts').replaceAll('import.meta.env', 'testEnv'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const fetchMock = async (url, options) => { requests.push({ url, options }); if (failure) throw new Error('synthetic offline'); return { ok: true }; };
  new Function('require', 'exports', 'testEnv', 'location', 'innerWidth', 'sessionStorage', 'fetch', code)(p => p.includes('version') ? { APP_VERSION: '0.0.0-audit' } : { getAstPlatform: () => 'web' }, exports, env, { pathname: path }, 900, { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) }, fetchMock);
  return { ...exports, requests };
}
const flush = () => new Promise(r => setImmediate(r));

test('post-clearance Cancel unlocks pending OCR and isolates a replacement run', async () => {
  const compiled = ts.transpileModule(source('src/components/ImageExtractionWorkspace.tsx'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const quality = { status: 'GOOD', canProceed: true, issues: [] };
  let stateIndex = 0, refIndex = 0, extractions = 0;
  const states = [], refs = [], effects = [], busy = [], messages = [], workers = [];
  const react = {
    useState: initial => { const i = stateIndex++; if (!(i in states)) states[i] = i === 6 ? quality : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef: initial => { const i = refIndex++; return refs[i] ??= { current: initial }; }, useEffect: effect => effects.push(effect),
  };
  const workspace = () => ({ width: 1600, height: 1000, crop: { x: 0, y: 0, width: 1600, height: 1000 }, measureQuality: () => ({ width: 1600, height: 1000 }), renderPreview: async () => new Blob(['synthetic']), close: () => {} });
  const exports = {};
  const requireMock = path => {
    if (path === 'react') return react;
    if (path.includes('jsx-runtime')) return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (path.includes('extraction-core')) return { ...extractionCore, assessImageQuality: () => quality };
    if (path.includes('image-concordance-image')) return { createImageWorkspace: async () => workspace() };
    if (path.includes('lib/ocr')) return { createAstOcrWorker: logger => {
      const pending = { logger, terminated: 0, recognized: 0 }; workers.push(pending);
      return new Promise(resolve => { pending.resolve = () => resolve({ terminate: async () => { pending.terminated++; }, recognize: async () => { pending.recognized++; throw new Error('Cancelled worker must not recognize'); } }); });
    } };
    if (path.includes('coverageOptions')) return { imageAntimicrobialOptions: [] };
    return {};
  };
  new Function('require', 'exports', 'requestAnimationFrame', compiled)(requireMock, exports, callback => setImmediate(callback));
  const props = { file: new File(['synthetic'], 'test.png', { type: 'image/png' }), sourcePreview: 'blob:synthetic', privacyOcr: { data: { text: '', lines: [] } }, privacyImageSize: { width: 1600, height: 1000 }, acknowledged: true, onExtraction: () => { extractions++; }, onReset: () => {}, onRemove: () => {}, onBusyChange: value => busy.push(value), onMessage: value => messages.push(value) };
  const render = () => { stateIndex = 0; refIndex = 0; return exports.default(props); };
  const find = (node, label) => { if (!node || typeof node !== 'object') return; if (node.type === 'button' && node.props?.children === label) return node; for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, label); if (found) return found; } };
  render(); const cleanup = effects[0](); await flush();
  find(render(), 'Extract AST table').props.onClick(); await flush(); assert.equal(workers.length, 1); assert.deepEqual(busy, [true]);
  find(render(), 'Cancel extraction').props.onClick(); assert.deepEqual(busy, [true, false]);
  const next = find(render(), 'Extract AST table'); assert.equal(next.props.disabled, false); next.props.onClick(); await flush(); assert.equal(workers.length, 2); assert.deepEqual(busy, [true, false, true]);
  const messageCount = messages.length;
  workers[0].logger({ status: 'recognizing text', progress: 0.5 }); workers[0].resolve(); await flush(); await flush();
  assert.equal(messages.length, messageCount); assert.equal(workers[0].terminated, 1); assert.equal(workers[0].recognized, 0); assert.deepEqual(busy, [true, false, true]); assert.equal(extractions, 0);
  find(render(), 'Cancel extraction').props.onClick(); workers[1].resolve(); await flush(); await flush();
  assert.deepEqual(busy, [true, false, true, false]); assert.equal(workers[1].terminated, 1); assert.equal(workers[1].recognized, 0); assert.equal(extractions, 0); assert.equal(states[10].stage, 'cancelled'); cleanup();
});

test('actual telemetry payloads omit raw paths, arbitrary allowed-key text, error names, messages and stacks', async () => {
  const h = telemetryHarness(), e = new Error('SYNTHETIC_PRIVATE_MESSAGE'); e.name = 'SYNTHETIC_PRIVATE_NAME'; e.stack = 'Error: synthetic\nSYNTHETIC_PRIVATE_STACK\n at run (https://www.astcompass.com/assets/app.js:1:2)';
  h.captureError(e, { feature_name: 'SYNTHETIC_PRIVATE_FEATURE' }); h.trackEvent('page_view', { page: '/unknown/SYNTHETIC_PRIVATE_PAGE' }); await flush();
  assert.equal(h.requests.length, 2); const bodies = h.requests.map(r => r.options.body).join('\n'); assert.doesNotMatch(bodies, /SYNTHETIC_PRIVATE/); assert.match(bodies, /Application error captured/);
  const safe = h.sanitizeTelemetryProperties({ feature_name: 'feedback', page: '/feedback', success_or_failure: 'failure', result_count: 3, antimicrobial_id: 'cro', mic: 'SYNTHETIC_PRIVATE_MIC', content_status: 'SYNTHETIC_PRIVATE_STATUS' });
  assert.equal(safe.feature_name, 'feedback'); assert.equal(safe.page, '/feedback'); assert.equal(safe.antimicrobial_id, 'cro'); assert.equal(safe.result_count, 3); assert.doesNotMatch(JSON.stringify(safe), /SYNTHETIC_PRIVATE/);
  assert.equal(h.telemetryRoute('/learn/topics/private-free-text'), '/learn/topics');
});
test('optional telemetry failure never rejects public calls', async () => { const h = telemetryHarness('/feedback', true); assert.doesNotThrow(() => h.captureError(new Error('synthetic'))); assert.doesNotThrow(() => h.trackEvent('feedback_submitted')); await flush(); });
function runActualAdmission(overrides = {}) {
  const text = source('src/features/ImageConcordanceAnalyzer.tsx'), start = text.indexOf('const analyze='), end = text.indexOf('const runSelfTest=', start); assert.ok(start >= 0 && end > start);
  let calls = 0, forwarded = 0, notice = '';
  const sample = { id: 'synthetic-row', antimicrobial: 'Ceftriaxone', measurement: '', category: 'R', confidence: 'High' };
  const state = { busy: false, file: { type: 'image/png' }, privacyPassed: true, ack: true, organismId: 'ecoli', marker: 'ctx-m', validRows: [sample], unverifiedFields: 0, confirmed: true, resolveAntimicrobial, setAnalysisNotice: value => { notice = value; }, analyzeConcordance: (_o, _m, rows) => { calls++; forwarded = rows.length; return rows; }, setResults: () => {}, trackEvent: () => {}, ...overrides };
  state.rows = state.validRows;
  state.imageReview = Object.fromEntries(state.rows.map(row => [row.id, {fields:Object.fromEntries(REVIEW_FIELDS.map(key=>[key,{verified:true,confirmedValue:String(row[key]??'')}]))}]));
  if(state.unverifiedFields)state.imageReview[state.rows[0].id].fields.measurement.verified=false;
  state.humanReviewReadiness=humanReviewReadiness;
  const getStart=text.indexOf('const getReadiness='), getEnd=text.indexOf('const readiness=',getStart);
  assert.ok(getStart>=0&&getEnd>getStart);
  new Function(...Object.keys(state), text.slice(getStart,getEnd)+text.slice(start, end) + ';analyze();')(...Object.values(state)); return { calls, forwarded, notice };
}
test('real image admission blocks revoked attestation/privacy/review, in-progress extraction and unverified fields', () => { for (const state of [{ ack: false }, { privacyPassed: false }, { busy: true }, { unverifiedFields: 1 }, { confirmed: false }]) { const r = runActualAdmission(state); assert.equal(r.calls, 0, JSON.stringify(state)); assert.ok(r.notice); } });
test('manual entry without an image remains available without image attestation', () => { assert.equal(runActualAdmission({ file: null, ack: false, privacyPassed: false }).calls, 1); });
test('actual image handler forwards 1,3,5,10,20 distinct reviewed observations without truncation', () => {
  for (const count of [1, 3, 5, 10, 20]) { const rows = canonicalAntimicrobials.slice(0, count).map((drug, i) => ({ id: 'synthetic-' + i, antimicrobial: drug.displayName, measurement: i % 2 ? '≤0.25' : '>2', category: 'R', confidence: 'High' })); const r = runActualAdmission({ validRows: rows }); assert.equal(r.calls, 1); assert.equal(r.forwarded, count); }
});
test('duplicate image drug aliases require reconciliation and context/attestation edits revoke review', () => {
  const r = runActualAdmission({ validRows: ['CRO', 'Ceftriaxone'].map((antimicrobial, i) => ({ id: String(i), antimicrobial, measurement: '', category: 'R' })) }); assert.equal(r.calls, 0); assert.match(r.notice, /duplicate/);
  const src = source('src/features/ImageConcordanceAnalyzer.tsx');
  assert.match(src, /setOrganismId\(value\);setAnalysisNotice\(""\);resetAnalysis\(\)/);
  assert.match(src, /setMarker\(value\);setAnalysisNotice\(""\);resetAnalysis\(\)/);
  assert.match(src, /setAck\(e.target.checked\);setAnalysisNotice\(""\);resetAnalysis\(\)/);
  assert.match(src, /privacyPassed&&ack&&<ImageExtractionWorkspace/);
  assert.match(src, /setConfirmed\(e.target.checked\);setAnalysisNotice\(""\);setResults\(\[\]\)/);
});
test('image summary cannot call mixed discordance or mostly-uninterpretable rows largely concordant', () => {
  const src = source('src/features/ImageConcordanceAnalyzer.tsx'); assert.match(src, /overall=concern>0\?"Potential discordance identified"/); assert.doesNotMatch(src, /"Largely concordant"/);
});

test('extraction failure preserves prior clear privacy screening for verified manual correction only', () => {
  const src = source('src/features/ImageConcordanceAnalyzer.tsx');
  const expression = src.match(/const privacyPassed=(.*?);/)?.[1]; assert.ok(expression);
  const passed = new Function('phi', 'status', `return ${expression}`);
  assert.equal(passed({ status: 'clear' }, 'analysis-failed'), true);
  for (const phi of [null, { status: 'blocked' }, { status: 'unable-to-screen' }]) assert.equal(!!passed(phi, 'analysis-failed'), false);
  assert.equal(runActualAdmission({ privacyPassed: passed({ status: 'clear' }, 'analysis-failed') }).calls, 1);
});

test('revocation unmount releases parent busy immediately and ignores late OCR callbacks', async () => {
  const compiled = ts.transpileModule(source('src/components/ImageExtractionWorkspace.tsx'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const quality = { status: 'GOOD', canProceed: true, issues: [] }; let stateIndex = 0, refIndex = 0, workerResolve, workerLogger;
  const states = [], refs = [], effects = [], busy = [], messages = [];
  // Seed the existing quality hook to model a completed, cleared crop preview.
  const react = { useState: value => { const i = stateIndex++; if (!(i in states)) states[i] = i === 6 ? quality : value; return [states[i], v => { states[i] = typeof v === 'function' ? v(states[i]) : v; }]; }, useRef: value => { const i = refIndex++; return refs[i] ??= { current: value }; }, useEffect: fn => effects.push(fn) };
  const workspace = () => ({ width: 1600, height: 1000, crop: { x: 0, y: 0, width: 1600, height: 1000 }, measureQuality: () => ({ width: 1600, height: 1000 }), renderPreview: async () => new Blob(['synthetic']), close: () => {} });
  const pendingWorker = new Promise(resolve => { workerResolve = resolve; }); let terminated = 0, extractions = 0; const exports = {};
  const requireMock = p => p === 'react' ? react : p.includes('jsx-runtime') ? { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) } : p.includes('extraction-core') ? { ...extractionCore, assessImageQuality: () => quality } : p.includes('image-concordance-image') ? { createImageWorkspace: async () => workspace() } : p.includes('lib/ocr') ? { createAstOcrWorker: logger => { workerLogger = logger; return pendingWorker; } } : p.includes('coverageOptions') ? { imageAntimicrobialOptions: [] } : {};
  new Function('require', 'exports', 'requestAnimationFrame', compiled)(requireMock, exports, cb => setImmediate(cb));
  const tree = exports.default({ file: new File(['synthetic'], 'test.png', { type: 'image/png' }), sourcePreview: 'blob:synthetic', privacyOcr: { data: { text: '', lines: [] } }, privacyImageSize: { width: 1600, height: 1000 }, acknowledged: true, onExtraction: () => { extractions++; }, onReset: () => {}, onRemove: () => {}, onBusyChange: value => busy.push(value), onMessage: value => messages.push(value) });
  const find = node => { if (!node || typeof node !== 'object') return; if (node.type === 'button' && node.props?.children === 'Extract AST table') return node; for (const child of [node.props?.children].flat(Infinity)) { const found = find(child); if (found) return found; } };
  const cleanup = effects[0](); await flush(); const button = find(tree); assert.ok(button); button.props.onClick(); await flush(); assert.deepEqual(busy, [true]);
  cleanup(); assert.deepEqual(busy, [true, false]); const messageCount = messages.length;
  workerLogger?.({ status: 'recognizing text', progress: 0.5 }); workerResolve({ terminate: async () => { terminated++; } }); await flush(); await flush();
  assert.deepEqual(busy, [true, false]); assert.equal(messages.length, messageCount); assert.equal(terminated, 1); assert.equal(extractions, 0);
});

test('phenotype image resources are closed on failures and changing an image revokes prior review', () => {
  const src = source('src/features/PhenotypeMechanismAnalyzer.tsx');
  assert.match(src, /finally\{bitmap\.close\(\)\}/);
  assert.match(src, /canvas\.width=canvas\.height=0/);
  assert.match(src, /await worker\.terminate\(\)/);
  assert.match(src, /useEffect\(\(\)=>\(\)=>cancelUpload\(\),\[\]\)/);
  assert.match(src, /if\(busy\)missing.push/);
});

test('privacy Cancel resets the UI immediately even if OCR initialization never settles', async () => {
  const src = source('src/features/ImageConcordanceAnalyzer.tsx'), start = src.indexOf('const cancelPrivacyScreen='), end = src.indexOf('const processFile=', start);
  const active = { controller: new AbortController() }, privacySessionRef = { current: active }, changes = []; let releases = 0;
  const state = { privacySessionRef, releasePrivacyWorker: () => { releases++; return new Promise(() => {}); }, replaceSourcePreview: () => {}, setFile: v => changes.push(['file', v]), setPhi: v => changes.push(['phi', v]), setPrivacyOcr: v => changes.push(['ocr', v]), setPrivacyImageSize: () => {}, setAck: v => changes.push(['ack', v]), resetExtraction: () => changes.push(['rows', 'cleared']), stage: v => changes.push(['stage', v]), setMessage: v => changes.push(['message', v]), inputRef: { current: { value: 'synthetic' } }, cameraRef: { current: { value: 'synthetic' } } };
  const cancelled = new Function(...Object.keys(state), src.slice(start, end) + ';return cancelPrivacyScreen();')(...Object.values(state));
  assert.equal(privacySessionRef.current, null); assert.equal(active.controller.signal.aborted, true); assert.equal(releases, 1);
  assert.ok(changes.some(([key, value]) => key === 'stage' && value === 'privacy-cancelled'));
  assert.ok(changes.some(([key, value]) => key === 'phi' && value === null)); assert.ok(changes.some(([key, value]) => key === 'ack' && value === false));
  await cancelled;
});
