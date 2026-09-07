import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createAuditLoader } from '../scripts/audit-module-loader.mjs';
import ts from 'typescript';
const require = createRequire(import.meta.url), React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const load = createAuditLoader();
const data = load('src/data/index.ts'), predicates = load('src/features/breakpointPredicates.ts');
const bp = load('src/features/BreakpointEngine.tsx', 'export { scaleFor, interpretMic, interpretMeasurement, CriteriaScale };');
const engine = load('src/features/concordanceEngine.ts'), coverage = load('src/features/coverageConcordance.ts');
const ledger = load('src/data/concordanceRelationships.ts');
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const record = id => data.breakpoints.find(r => r.id === id);
const scale = id => bp.scaleFor(record(id), data.antibiotics.find(d => d.id === record(id).antibioticId), data.organisms.find(o => o.id === record(id).organismId));
const classify = (id, value) => bp.interpretMeasurement(scale(id), String(value), record(id).standard);
const row = (antimicrobial, category = 'R', measurement = '') => ({ id: 'synthetic-only', antimicrobial, category, measurement, confidence: 'High' });

// Execute the actual component/function source with deterministic hook state.
// No browser, DOM emulation, scientific reimplementation or production mutation.
function compileSource(source, deps = {}, importOverrides = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', ...Object.keys(deps), code)(id => importOverrides[id] || require(id), module.exports, ...Object.values(deps));
  return module.exports;
}
function functionSource(file, name) {
  const text = read(file), ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const node = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(node, name);
  return `export ${node.getText(ast)}`;
}
function renderBreakpointState(values, previousContext, records = data.breakpoints) {
  let i = 0; const updates = [], effects = [];
  const hooks = { useState: initial => { const slot = i++; return [values[slot] ?? initial, value => updates.push([slot, value])]; }, useMemo: fn => fn(), useRef: current => ({ current: previousContext ?? current }), useEffect: fn => effects.push(fn) };
  const stubSelect = ({ label }) => React.createElement('span', null, label);
  const component = compileSource(read('src/features/BreakpointEngine.tsx'), {}, { react: hooks, '../data': { ...data, breakpoints: records }, '../utils/search': load('src/utils/search.ts'), '../components/SearchableSelect': { default: stubSelect }, './breakpointPredicates': predicates });
  const html = renderToStaticMarkup(component.default());
  return { html, updates, effects };
}

test('SCI01: breakpoint records and protected scientific content remain byte-equivalent after newline normalization', () => {
  const hashes = {
    'src/data/breakpoints.ts': '8b729567f4f5004f94187f58289fe89befce86d8649d265b048db447a7500ec5',
    'src/data/bcidForecasts.ts': '16d8161841acbed2aaae493b03f96ecc3ca60054133b6ab2c389b3e6039e3db4',
    'src/data/genes.ts': '7a7c02e97f5eaeb8c10d716a069ad9b6d4e63515e683c198f87ed4372e3b6dd5',
    'src/data/astDetectiveQuestions.ts': '1016ce12001fe5cab0336e331d67e6b4fd89c063b73337b6d2dadc3d9384e020',
    'src/features/phi-screening-core.mjs': 'a063aa08ea774c4f5463eceef34aa50c6f9e8d7140013e38f95fcc24912d740a',
  };
  for (const [path, expected] of Object.entries(hashes)) assert.equal(createHash('sha256').update(read(path).replace(/\r\n/g, '\n')).digest('hex'), expected, path);
  // SCI-04 owner-approved availability changes are checked against the original
  // scientific fields/outputs (not a new whole-file hash) in sci-04-abstention.test.mjs.
});

test('SCI01: disk diameter direction and inclusive boundaries match the unchanged loaded record', () => {
  for (const [zone, expected] of [[20, 'Resistant'], [21, 'Resistant'], [22, 'Susceptible'], [23, 'Susceptible']]) assert.equal(classify('bp4', zone).category, expected);
  assert.equal(classify('bp4', 21.5).category, 'Cannot infer');
  assert.match(classify('bp4', 21.5).explanation, /whole zone diameter/);
  assert.equal(bp.interpretMic(scale('bp4'), '20', 'CLSI'), null, 'disk cannot enter MIC path');
  assert.equal(predicates.interpretDiskZone(scale('bp5'), '20', 'EUCAST'), null, 'MIC cannot enter disk path');
});

test('SCI01: strict MIC operators and explicit I values are not widened into fabricated intervals', () => {
  for (const [value, expected] of [[0.25, 'Susceptible'], [0.5, 'Susceptible, increased exposure (I)'], [0.5001, 'Resistant']]) assert.equal(classify('bp5', value).category, expected);
  for (const [value, expected] of [[1, 'Susceptible'], [2, 'Intermediate / SDD'], [3, 'Cannot infer'], [4, 'Resistant']]) assert.equal(classify('bp-ecoli-cro', value).category, expected);
  for (const [value, expected] of [[8, 'Susceptible'], [12, 'Cannot infer'], [16, 'Resistant']]) assert.equal(classify('bp3', value).category, expected);
  for (const input of ['.5', '5e-1', '0.5', ' 0.5 ']) assert.equal(classify('bp5', input).category, 'Susceptible, increased exposure (I)');
});

test('SCI01: all four source comparison operators retain strictness and supported annotations', () => {
  for (const [text, below, equal, above] of [['< 2', true, false, false], ['≤ 2', true, true, false], ['> 2', false, false, true], ['≥ 2', false, true, true], ['<= 2', true, true, false], ['>= 2', false, true, true]]) {
    const criterion = predicates.parseCriterion(text); assert.equal(criterion.text, text);
    assert.deepEqual([1, 2, 3].map(v => predicates.matchesCriterion(criterion, v)), [below, equal, above]);
  }
  assert.equal(predicates.parseCriterion('0.5 (SDD example)', true).operator, '=');
  assert.equal(predicates.parseCriterion('0.5 (I = susceptible, increased exposure)', true).value, 0.5);
  for (const text of ['abc22', '≥22junk', '', '—', 'NaN', 'Infinity', '2-4', '2 (conditional)', '2 (SDD example) extra']) assert.equal(predicates.parseCriterion(text, true), null, text);
});

test('SCI01: malformed, unavailable, overlapping and ambiguous loaded records never become MIC simulation', () => {
  for (const changes of [{ susceptible: 'abc22' }, { resistant: '—' }, { intermediate: 'unknown' }, { unit: 'mg/L' }, { method: 'unknown' }, { susceptible: '≤ 22', resistant: '≥ 21' }, { intermediate: '22' }]) {
    assert.equal(bp.scaleFor({ ...record('bp4'), ...changes }, data.antibiotics[0], data.organisms[0]), null);
  }
  assert.equal(predicates.loadedBreakpointScale({ ...record('bp4'), susceptible: '≤ 21', resistant: '≥ 22' }), null, 'inverted disk method polarity is refused, not repaired');
  assert.equal(predicates.loadedBreakpointScale({ ...record('bp3'), susceptible: '≥ 16', resistant: '≤ 8' }), null, 'inverted MIC method polarity is refused, not repaired');
  for (const id of ['bp-cauris-flc-none', 'bp-afum-vor-ecoff']) assert.equal(scale(id), null);
  for (const value of ['', '-1', 'Infinity', 'NaN', '22junk']) assert.equal(bp.interpretMeasurement(scale('bp4'), value, 'CLSI'), null);
  const duplicate = predicates.matchingBreakpointRecords([record('bp4'), { ...record('bp4'), id: 'fixture-duplicate' }], 'CLSI', 'staph_aureus', 'cefoxitin');
  assert.equal(duplicate.length, 2);
  assert.match(read('src/features/BreakpointEngine.tsx'), /matchingRecords\.length > 1 \? null/);
  assert.equal(predicates.matchingBreakpointRecords(data.breakpoints, 'FDA', 'staph_aureus', 'cefoxitin').length, 0);
});

test('SCI01: absent-record MIC simulations retain their previous bounded teaching path', () => {
  const teaching = bp.scaleFor(undefined, data.antibiotics.find(d => d.id === 'ciprofloxacin'), data.organisms.find(o => o.id === 'ecoli'));
  assert.equal(teaching.origin, 'Organism–drug simulation profile');
  assert.equal(teaching.method, 'MIC'); assert.equal(teaching.susceptibleMax, 0.25); assert.equal(teaching.resistantMin, 1);
  assert.equal(bp.interpretMeasurement(teaching, '0.5', 'CLSI').category, 'Intermediate / SDD');
});

test('SCI01: rendered source-scale preserves operators and omits an invented Intermediate box', () => {
  const html = renderToStaticMarkup(React.createElement(bp.CriteriaScale, { scale: scale('bp4'), standard: 'CLSI' }));
  assert.match(html, /≥ 22/); assert.match(html, /≤ 21/); assert.doesNotMatch(html, /I \/ SDD/);
  assert.match(html, /No intermediate category/);
  const source = read('src/features/BreakpointEngine.tsx');
  for (const text of ['Zone diameter (mm)', 'Disk diffusion teaching result', 'Manual zone diameter entry', 'Disk content:']) assert.ok(source.includes(text));
  assert.match(source, /scale\?\.method === "MIC" && <div className="isolate-simulator"/);
  assert.match(source, /scale\.method !== "MIC"/);
  assert.match(source, /previousMeasurementContext\.current !== measurementContext/);
  assert.match(source, /setMic\(""\)/);
  assert.match(source, /NOT CLINICAL/);
});

test('SCI01: actual component cannot render stale wrong-unit measurements or a simulator for ambiguous criteria', () => {
  const diskValues = ['Bacteria', 'CLSI', 'staph_aureus', 'cefoxitin', '5', 'typical', 'Manual MIC entry'];
  const transition = renderBreakpointState(diskValues, 'MIC:µg/mL');
  assert.match(transition.html, /Zone diameter \(mm\)/); assert.match(transition.html, /value=""/);
  assert.doesNotMatch(transition.html, /The entered zone diameter|Generate two-fold MIC|Generated teaching interpretation/);
  for (const effect of transition.effects) effect();
  assert.ok(transition.updates.some(([slot, value]) => slot === 4 && value === ''));
  const confirmedDisk = renderBreakpointState([...diskValues.slice(0, 4), '20', ...diskValues.slice(5)], 'Disk:mm').html;
  assert.match(confirmedDisk, /The entered zone diameter \(20 mm\)/); assert.match(confirmedDisk, /<h3>Resistant<\/h3>/);
  const micTransition = renderBreakpointState(['Bacteria', 'CLSI', 'ecoli', 'ceftriaxone', '20'], 'Disk:mm').html;
  assert.doesNotMatch(micTransition, /The entered MIC|Generated teaching interpretation/); assert.match(micTransition, /value=""/);
  const ambiguous = renderBreakpointState(diskValues, undefined, [...data.breakpoints, { ...record('bp4'), id: 'fixture-duplicate' }]).html;
  assert.match(ambiguous, /Ambiguous loaded breakpoint records/); assert.match(ambiguous, /no record or simulation is selected automatically/);
  assert.doesNotMatch(ambiguous, /Generate two-fold MIC|no mapped antimicrobial options|Generated teaching interpretation/);
  assert.match(ambiguous, /disabled=""/);
});

test('SCI02: exact mec relationships are relevant-only across aliases, categories and optional MIC operators', () => {
  for (const [organism, marker] of [['staph_aureus', 'mecA/C and MREJ (MRSA)'], ['cons', 'mecA/C']]) {
    for (const drug of ['Oxacillin', 'OXA', 'Cefoxitin', 'FOX']) for (const category of ['S', 'I', 'R', 'SDD', 'NS', 'Unknown']) for (const measurement of ['', '<1', '<=1', '≤1', '=2', '>8', '>=4', '≥4']) {
      for (const api of [engine, coverage]) {
        const result = api.analyzeConcordance(organism, marker, [row(drug, category, measurement)])[0];
        assert.equal(result.relevance, 'recognized'); assert.equal(result.pendingSourceReview, true);
        assert.equal(result.assessment, 'Cannot infer'); assert.equal(result.forecast, undefined);
        assert.equal(result.measurement, measurement); assert.equal(result.category, category);
        assert.match(result.rationale, /species and method/); assert.match(result.rationale, /MREJ/);
      }
    }
  }
});

test('SCI02: explicit relationships refer to real identities and unchanged Draft authored records, not prose classifiers', () => {
  for (const r of ledger.concordanceRelationships) {
    const f = data.bcidForecasts.find(f => f.id === r.forecastId); assert.ok(f); assert.equal(f.meta.status, 'Draft'); assert.equal(r.reviewStatus, 'Draft');
    assert.deepEqual(r.sourceIds, f.sourceIds);
    for (const id of r.antimicrobialIds) assert.ok(data.antibiotics.some(d => d.id === id), id);
    assert.equal(new Set(r.antimicrobialIds).size, r.antimicrobialIds.length);
  }
  const source = read('src/features/concordanceEngine.ts');
  assert.doesNotMatch(source, /classLinked|contextFits|haystack|markerForecasts|antimicrobialClass/);
  for (const drug of ['Cefepime', 'Cefazolin', 'Cefuroxime', 'Ceftaroline', 'Cefiderocol', 'Trimethoprim', 'CFZ']) assert.equal(coverage.analyzeConcordance('ecoli', 'CTX-M', [row(drug)])[0].assessment, 'Cannot infer');
});

test('SCI03: specificity is exact and per drug, never another species or global marker precedence', () => {
  for (const [organism, expected] of [['ecoli', 'ctxm-ecoli'], ['ecloacae', 'ctxm-ecloacae'], ['kpneumo', 'ctxm-1'], ['enterobacterales', 'ctxm-1']]) {
    for (const drug of ['CRO', 'CTX', 'CAZ']) for (const category of ['S', 'R', 'I', 'SDD']) {
      const r = coverage.analyzeConcordance(organism, 'CTX-M', [row(drug, category)])[0];
      assert.equal(r.forecast?.id, expected, `${organism}/${drug}/${category}`);
      if (r.forecast.organism) assert.equal(r.forecast.organism, data.organisms.find(o => o.id === organism).name);
    }
  }
  assert.equal(coverage.analyzeConcordance('ecoli', 'CTX-M', [row('MEM')])[0].forecast.id, 'ctxm-2');
  assert.equal(coverage.analyzeConcordance('ecoli', 'NDM', [row('ATM')])[0].forecast.id, 'mbl-2');
  for (const [organism, expected] of [['efaecalis', 'vana-efaecalis'], ['efaecium', 'vana-efaecium']]) assert.equal(coverage.analyzeConcordance(organism, 'vanA/B', [row('Vancomycin')])[0].forecast.id, expected);
});

test('SCI03: selection is order-independent and malformed species-to-group mappings cannot bypass authored scope', () => {
  for (const organism of ['ecoli', 'ecloacae', 'kpneumo', 'enterobacterales']) {
    const args = [organism, 'CTX-M', 'ceftriaxone'];
    const expected = ledger.matchingConcordanceRelationships(...args).map(x => x.forecast.id);
    assert.deepEqual(ledger.matchingConcordanceRelationships(...args, [...data.bcidForecasts].reverse(), [...ledger.concordanceRelationships].reverse()).map(x => x.forecast.id), expected);
  }
  const foreign = data.bcidForecasts.find(f => f.id === 'ctxm-ecloacae');
  const badRelation = { ...ledger.concordanceRelationships.find(r => r.forecastId === foreign.id), scope: { kind: 'group', groupId: 'enterobacterales' } };
  assert.equal(ledger.relationshipFits(badRelation, foreign, 'ecoli'), false);
  assert.equal(ledger.relationshipFits(badRelation, foreign, 'ecloacae'), false, 'explicit species record cannot be authored as a group relationship');
});

test('SCI03: missing/unknown contexts never fall back, including direct engine and all current drug identities', () => {
  for (const [organism, marker] of [['acinetobacter', 'VIM'], ['ecoli', 'VIM'], ['unknown', 'CTX-M'], ['staph_aureus', 'CTX-M'], ['pseudomonas', 'vanA/B'], ['pseudomonas', 'unknown']]) for (const drug of data.antibiotics) {
    const r = engine.analyzeConcordance(organism, marker, [row(drug.name)])[0];
    assert.equal(r.assessment, 'Cannot infer'); assert.equal(r.forecast, undefined);
  }
  for (const marker of ['VIM', 'IMP']) {
    assert.ok(engine.analyzeConcordance('pseudomonas', marker, [row('Meropenem')])[0].forecast);
    assert.equal(engine.analyzeConcordance('pseudomonas', marker, [row('Ertapenem')])[0].assessment, 'Cannot infer');
  }
  assert.equal(engine.analyzeConcordance('ecoli', 'CTX-M', [row('CRO', 'Unknown')])[0].assessment, 'Cannot infer');
});

test('SCI03: actual BCID individual selector isolates all 330 organism/marker combinations', () => {
  const selector = compileSource(functionSource('src/features/BcidForecast.tsx', 'forecastsFor'), { bcidForecasts: data.bcidForecasts, targetById: id => data.bcid2Panel.targets.find(t => t.id === id) }).forecastsFor;
  let count = 0;
  for (const target of data.bcid2Panel.targets) for (const marker of data.bcid2Panel.markers) {
    const parent = data.bcid2Panel.targets.find(t => t.id === target.parentId);
    for (const forecast of selector(target, marker)) {
      assert.equal(forecast.markerLabel, marker.label);
      if (forecast.organism) assert.equal(forecast.organism, target.name);
      else assert.ok(forecast.organismGroup === target.name || parent && forecast.organismGroup === parent.name);
    }
    count++;
  }
  assert.equal(count, 330);
  const ecoli = data.bcid2Panel.targets.find(t => t.id === 'e-coli');
  const ctxm = data.bcid2Panel.markers.find(m => m.id === 'ctx-m');
  assert.deepEqual(selector(ecoli, ctxm).map(f => f.id), ['ctxm-ecoli']);
  assert.deepEqual(selector({ id: 'unknown', name: 'Unknown organism' }, ctxm), []);
});

test('SCI02: manual UI requires the exact marker instead of inferring a combined MREJ result from gene aliases', () => {
  const source = functionSource('src/App.tsx', 'ConcordanceChecker');
  assert.doesNotMatch(source, /gene\.aliases|gene\.name|markerOptions\.find|geneId|setGene/);
  assert.match(source, /setMarker\(event\.target\.value\)/);
  assert.match(source, /option value=\{item\.value\}/);
  assert.match(source, /Other detected gene — no inferred assay pattern/);
  assert.match(source, /generic mec gene does not establish a combined mec\/MREJ assay result/);
  const options = engine.markerOptions;
  for (const marker of ['mecA/C', 'mecA/C and MREJ (MRSA)']) assert.ok(options.some(o => o.value === marker && o.label === marker));
  for (const marker of ['mecA', 'mecC', 'mecA/C']) for (const drug of ['OXA', 'FOX']) {
    const result = coverage.analyzeConcordance('staph_aureus', marker, [row(drug)])[0];
    assert.equal(result.assessment, 'Cannot infer'); assert.equal(result.forecast, undefined);
  }
  const values = ['staph_aureus', 'mecA', [{ id: 'fixture-row', antimicrobialId: 'oxacillin', measurement: '≥4', category: 'R' }], null, ''];
  let cursor = 0; const selectedMarkers = [];
  const noop = () => null;
  const deps = { useState: initial => { const i = cursor++; return [values[i] === undefined ? initial : values[i], next => { values[i] = typeof next === 'function' ? next(values[i]) : next; }]; },
    markerOptions: options, sortedGenes: data.genes, scientificOrganismOptions: [], antimicrobialIdOptions: [], contentReviewMeta: data.contentReviewMeta,
    analyzeConcordance: (organism, marker, rows) => { selectedMarkers.push(marker); return coverage.analyzeConcordance(organism, marker, rows); },
    antibioticName: id => data.antibiotics.find(d => d.id === id).name, parseMeasurement: engine.parseMeasurement,
    PageHead: noop, ContentStatus: noop, SearchableSelect: noop, ASTObservationList: noop, Citation: noop, Disclosure: noop, SatisfactionPrompt: noop, ScientificIssueLink: noop };
  const component = compileSource(source, deps).ConcordanceChecker;
  const visit = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(visit) : [node, ...visit(node.props?.children)];
  const tree = () => { cursor = 0; return visit(component({ go: noop })); };
  const analyze = () => tree().find(n => n.type === 'button' && n.props.children === 'Analyze concordance →').props.onClick();
  analyze(); assert.deepEqual(selectedMarkers, ['mecA']); assert.equal(values[3][0].assessment, 'Cannot infer'); assert.equal(values[3][0].relevance, undefined);
  tree().find(n => n.type === 'select').props.onChange({ target: { value: 'mecA/C and MREJ (MRSA)' } });
  assert.equal(values[3], null, 'editing marker revokes old results');
  analyze(); assert.equal(selectedMarkers[1], 'mecA/C and MREJ (MRSA)'); assert.equal(values[3][0].relevance, 'recognized');
  assert.equal(values[3][0].assessment, 'Cannot infer'); assert.equal(values[3][0].forecast, undefined); assert.equal(values[3][0].measurement, '≥4');
});

test('GOV01: every current combined configuration remains Draft and unreviewed without invented provenance', () => {
  let checked = 0;
  for (const target of data.bcid2Panel.targets) for (let bits = 1; bits < 1 << data.bcid2Panel.markers.length; bits++) {
    const markers = data.bcid2Panel.markers.filter((_, i) => bits & (1 << i)).map(m => m.id);
    const r = data.getCombinedForecast(target.id, markers);
    assert.equal(r.reviewed, false); assert.equal(r.reviewStatus, 'Draft'); assert.equal(r.reviewProvenance, undefined);
    for (const f of r.individualForecasts) { assert.equal(f.meta.status, 'Draft'); if (f.organism) assert.equal(f.organism, target.name); }
    checked++;
  }
  assert.equal(checked, 33759);
});

test('GOV01: former positive combined narrative and six individual Draft expectations are preserved', () => {
  const r = data.getCombinedForecast('k-pneumoniae-group', ['ctx-m', 'kpc']);
  assert.equal(r.interpretation, 'The carbapenemase mechanism is expected to dominate much of the beta-lactam phenotype, while CTX-M represents an additional ESBL mechanism. The complete phenotype cannot be predicted from molecular markers alone.');
  assert.deepEqual(r.individualForecasts.map(f => f.id), ['ctxm-1', 'ctxm-2', 'ctxm-3', 'kpc-ent', 'kpc-new', 'kpc-kp']);
  assert.equal(data.getCombinedForecast('k-pneumoniae-group', ['kpc', 'ctx-m']).interpretation, r.interpretation);
  assert.match(read('src/features/BcidForecast.tsx'), /No reviewed combined rule — individual expectations follow/);
});

test('GOV01: compatibility pair identities, source IDs and special caveats persist with neutral default prose', () => {
  const rules = data.bcid2CompatibilityRules;
  assert.equal(rules.length, 68); assert.equal(new Set(rules.map(r => `${r.organismId}:${r.markerId}`)).size, 68);
  assert.equal(rules.filter(r => r.explanation === 'Relevant BCID organism–marker interpretation context.').length, 65);
  assert.equal(rules.filter(r => r.compatibility === 'possible').length, 3);
  const expected = ['e-cloacae-complex', 'e-coli', 'k-aerogenes', 'k-oxytoca', 'k-pneumoniae-group', 'proteus-spp', 'salmonella-spp', 's-marcescens'].flatMap(o => ['ctx-m', 'imp', 'kpc', 'ndm', 'oxa-48-like', 'vim', 'mcr-1'].map(m => `${o}:${m}:primary`));
  expected.push(...['imp', 'kpc', 'ndm', 'vim'].map(m => `p-aeruginosa:${m}:primary`), 'acb-complex:ndm:primary', 'acb-complex:imp:possible', 'acb-complex:vim:possible', 's-aureus:meca-c-mrej:primary', 's-epidermidis:meca-c:primary', 's-lugdunensis:meca-c:possible', 'e-faecalis:vana-b:primary', 'e-faecium:vana-b:primary');
  assert.deepEqual(rules.map(r => `${r.organismId}:${r.markerId}:${r.compatibility}`).sort(), expected.sort());
  for (const r of rules) { assert.doesNotMatch(r.explanation, /reviewed|verified/i); assert.deepEqual(r.sourceIds, ['ref-bcid2-ifu', 'ref-idsa']); assert.equal(r.reviewProvenance, undefined); }
  assert.match(rules.find(r => r.organismId === 's-lugdunensis').explanation, /assay-specific/);
  for (const marker of ['imp', 'vim']) assert.match(rules.find(r => r.organismId === 'acb-complex' && r.markerId === marker).explanation, /qualified organism attribution and phenotypic confirmation/);
});

test('GOV01: future provenance schema records content scope, source locators, authentic approval and independent review without activation', () => {
  const schema = read('src/data/scientificGovernance.ts');
  for (const field of ['QualifiedReviewProvenance', 'contentId', 'contentVersion', 'editionOrVersion', 'sectionOrLocator', 'qualificationOrRole', 'publicAttributionApproved', 'reviewedOn', 'approvalEvidenceId', 'independentVerification', 'verifiedOn']) assert.ok(schema.includes(field), field);
  const combined = read('src/data/bcidCombinedForecasts.ts');
  assert.match(combined, /reviewed: false/); assert.doesNotMatch(combined, /reviewed: !!|reviewedCombined/);
  for (const group of [data.breakpoints, data.bcidForecasts, data.genes]) for (const r of group) assert.equal(r.meta.status, 'Draft');
  for (const r of data.astDetectiveQuestions) assert.equal(r.reviewStatus, 'Draft');
  for (const r of Object.values(data.contentReviewMeta)) assert.equal(r.status, 'Demo');
});
