import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createAuditLoader } from '../scripts/audit-module-loader.mjs';
import { inspectPhenotypeAvailability, quinoloneCases, pauseExplanation } from '../scripts/phenotype-availability-gate.mjs';

const require = createRequire(import.meta.url), React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = createAuditLoader();
const engine = load('src/features/phenotypeMechanismEngine.ts');
const coverage = load('src/features/phenotypeCoverage.ts');
const data = load('src/data/index.ts');
const baseline = JSON.parse(readFileSync(new URL('./fixtures/sci-04-owner-baseline.json', import.meta.url), 'utf8'));
const row = (antimicrobialId, category = 'R', id = 'observation') => ({ id, antimicrobialId, category, measurement: '≥4' });
const stripAvailability = ({ availability, pauseReason, ...scientificFields }) => scientificFields;

test('SCI04: all original scientific fields, scopes, sources, statuses and numbers remain unchanged', () => {
  assert.deepEqual(engine.phenotypeSignatures.map(stripAvailability), baseline.signatures);
  const rule = engine.phenotypeSignatures.find(s => s.id === 'quinolone-like');
  assert.equal(rule.availability, 'paused-pending-review');
  assert.equal(rule.reviewStatus, 'Draft');
  assert.equal(rule.minimumEvidence, 2);
  assert.equal(rule.expectedPatterns[0].weight, 1);
  assert.equal(rule.pauseReason, pauseExplanation);
  for (const [path, expected] of Object.entries(baseline.protectedNormalizedSha256)) {
    // Git may check these out with LF or CRLF. Raw hashes remain audit evidence.
    const normalized = readFileSync(new URL('../' + path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(createHash('sha256').update(normalized).digest('hex'), expected, path);
  }
});

for (const [name, observations] of quinoloneCases) test(`SCI04: ${name} safely abstains with intact observations`, () => {
  const rows = observations.map(([id, category], i) => row(id, category, `row-${i}`));
  rows.forEach((item, i) => { item.measurement = ['<1', '≤2', '>4', '≥8'][i % 4]; Object.freeze(item); });
  Object.freeze(rows);
  const before = JSON.stringify(rows), result = engine.analyzePhenotype('ecoli', rows);
  assert.equal(JSON.stringify(rows), before);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.reviewedRows, rows.filter(r => r.category !== 'Unknown').length);
  assert.equal(result.abstentions.length, 1);
  assert.deepEqual(result.abstentions, engine.getPhenotypeAbstentions('ecoli', rows));
  assert.deepEqual(result.abstentions[0], { signatureId: 'quinolone-like', availability: 'paused-pending-review', reviewStatus: 'Draft', explanation: pauseExplanation, sourceIds: ['ref-clsi', 'ref-idsa'] });
  assert.doesNotMatch(JSON.stringify(result), /candidateMarkers|gene detected|gene present|recommend(?:ed)? therapy|treat with|resistance absent/i);
});

test('SCI04: all applicable organisms and requested profiles satisfy the explicit pause gate', () => {
  const gates = inspectPhenotypeAvailability(engine);
  assert.equal(gates.active.pass, true);
  assert.equal(gates.active.actual.active.length, 7);
  assert.equal(gates.paused.pass, true);
  assert.equal(gates.paused.actual.checkedCases, engine.phenotypeSignatures.find(s => s.id === 'quinolone-like').organisms.length * 8);
  assert.equal(gates.paused.actual.maximumPatternEvidence, 1);
  assert.equal(gates.paused.actual.minimumEvidence, 2);
  assert.match(gates.paused.actual.meaning, /not a passing active scientific model/);
});

test('SCI04: pause is an executable guard independent of unreachable arithmetic', () => {
  // Isolated in-memory fault injection only; no shipped rule or number is changed.
  const isolated = createAuditLoader()('src/features/phenotypeMechanismEngine.ts');
  const rule = isolated.phenotypeSignatures.find(s => s.id === 'quinolone-like');
  rule.minimumEvidence = 0; rule.expectedPatterns[0].weight = 100;
  const result = isolated.analyzePhenotype('ecoli', [row('ciprofloxacin')]);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.abstentions[0].explanation, pauseExplanation);
  assert.equal(inspectPhenotypeAvailability(isolated).paused.pass, false, 'gate detects weakened original numbers even though explicit pause still abstains');
});

test('SCI04: gate rejects accidental reactivation, missing status, missing explanation or emitted inference', () => {
  for (const changes of [{ availability: 'active' }, { availability: undefined }, { reviewStatus: 'Reviewed' }, { pauseReason: '' }]) {
    const isolated = createAuditLoader()('src/features/phenotypeMechanismEngine.ts');
    Object.assign(isolated.phenotypeSignatures.find(s => s.id === 'quinolone-like'), changes);
    const gates = inspectPhenotypeAvailability(isolated);
    assert.equal(gates.paused.pass, false, JSON.stringify(changes));
    if (changes.availability === 'active' || 'availability' in changes) assert.equal(gates.active.pass, false);
  }
  const unsafe = { ...engine, analyzePhenotype: (...args) => ({ ...engine.analyzePhenotype(...args), candidates: [{ signatureId: 'quinolone-like', mechanismId: 'quinolone' }] }) };
  assert.equal(inspectPhenotypeAvailability(unsafe).paused.pass, false);
  const hidden = { ...engine, getPhenotypeAbstentions: () => [] };
  assert.equal(inspectPhenotypeAvailability(hidden).paused.pass, false);
  const inactiveEverything = { ...engine, analyzePhenotype: (...args) => ({ ...engine.analyzePhenotype(...args), candidates: [] }) };
  assert.equal(inspectPhenotypeAvailability(inactiveEverything).active.pass, false, 'standalone gate executes all seven active witnesses, not just arithmetic');
});

test('SCI04: pause applies to relevant inputs only and does not interpret S/I/SDD/Unknown as resistance', () => {
  for (const category of ['S', 'I', 'SDD', 'Unknown']) {
    const result = engine.analyzePhenotype('ecoli', [row('ciprofloxacin', category)]);
    assert.equal(result.candidates.length, 0);
    assert.equal(result.abstentions[0].explanation, pauseExplanation);
  }
  for (const rows of [[], [row('gentamicin')], [row('unknown-drug')]]) assert.deepEqual(engine.getPhenotypeAbstentions('ecoli', rows), []);
  const scope = engine.phenotypeSignatures.find(s => s.id === 'quinolone-like').organisms;
  for (const organismId of [...data.organisms.filter(o => !scope.includes(o.id)).map(o => o.id), 'unlisted-organism']) {
    assert.deepEqual(engine.getPhenotypeAbstentions(organismId, [row('ciprofloxacin')]), []);
  }
  for (const drug of ['ciprofloxacin', 'levofloxacin', 'moxifloxacin', 'nalidixic']) {
    assert.ok(data.antibiotics.some(a => a.id === drug));
    const context = coverage.phenotypeRowCoverage('ecoli', row(drug));
    assert.equal(context.recognized, true);
    assert.equal(context.hasRuleContext, false);
    assert.deepEqual(context.signatureIds, []);
    assert.deepEqual(context.pausedSignatureIds, ['quinolone-like']);
    assert.match(context.message, /paused pending scientific review/);
  }
});

test('SCI04: all seven active signatures retain actual pre-decision outputs and remain reachable', () => {
  const emitted = new Set();
  for (const fixture of baseline.scenarios) {
    const { abstentions, ...current } = engine.analyzePhenotype(fixture.organismId, fixture.rows);
    assert.deepEqual(current, fixture.result, fixture.name);
    assert.deepEqual(abstentions, []);
    current.candidates.forEach(c => emitted.add(c.signatureId));
    const mixed = engine.analyzePhenotype(fixture.organismId, [...fixture.rows, row('ciprofloxacin'), row('levofloxacin', 'S')]);
    assert.deepEqual(mixed.candidates, fixture.result.candidates, `mixed ${fixture.name}`);
    assert.deepEqual(mixed.intrinsicFindings, fixture.result.intrinsicFindings);
    assert.equal(mixed.combinedPossible, fixture.result.combinedPossible);
    assert.equal(mixed.abstentions.length, 1);
  }
  assert.deepEqual([...emitted].sort(), engine.phenotypeSignatures.filter(s => s.availability === 'active').map(s => s.id).sort());
});

// Execute the actual UI with controlled hook state, without browser/PHI uploads.
function uiHarness(rows, result = null) {
  const values = ['manual', 'ecoli', rows, true, '', false, result]; let cursor = 0;
  const noop = () => null;
  const hooks = { useState: initial => { const i = cursor++; return [values[i] ?? initial, next => { values[i] = next; }]; }, useMemo: fn => fn(), useRef: current => ({ current }), useEffect: noop };
  const overrides = {
    react: hooks, '../data': data,
    '../data/coverageOptions': load('src/data/coverageOptions.ts'),
    './phenotypeCoverage': coverage, './phenotypeMechanismEngine': engine,
    '../components/PhenotypeInferenceNotices': load('src/components/PhenotypeInferenceNotices.tsx'),
    '../components/SearchableSelect': { default: noop }, '../components/ASTObservationList': { default: noop },
    '../components/ScientificIssueLink': { default: noop }, '../components/ClinicalContextBoundary': { default: noop },
    './phi-screening-core.mjs': {}, '../lib/ocr': {}, '../security/image-validation-core.mjs': {},
  };
  const source = readFileSync(new URL('../src/features/PhenotypeMechanismAnalyzer.tsx', import.meta.url), 'utf8');
  const module = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', code)(id => overrides[id] || require(id), module.exports);
  return { values, tree: () => { cursor = 0; return module.exports.default({ go: noop }); } };
}
const visit = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(visit) : [node, ...visit(node.props?.children)];

test('SCI04: Unknown-only UI shows the pause before analysis without bypassing human review', () => {
  const harness = uiHarness([row('ciprofloxacin', 'Unknown')]);
  const tree = harness.tree(), html = renderToStaticMarkup(tree);
  assert.match(html, /Inference paused pending scientific review/);
  assert.ok(html.includes(pauseExplanation));
  assert.match(html, /role="status"/);
  visit(tree).find(n => n.type === 'button' && n.props.children === 'Analyze phenotype →').props.onClick();
  assert.equal(harness.values[6], null);
  assert.match(harness.values[4], /add at least one row with a reviewed category/);
});

test('SCI04: rendered paused-only results retain references and never promise more rows resolve inference', () => {
  const rows = [row('ciprofloxacin')];
  const html = renderToStaticMarkup(uiHarness(rows, engine.analyzePhenotype('ecoli', rows)).tree());
  assert.equal(html.split(pauseExplanation).length - 1, 1);
  assert.match(html, /not a negative mechanism result or evidence of susceptibility/);
  assert.match(html, /Scientific status: Draft/);
  assert.match(html, /do not validate the AST Compass scoring model/);
  assert.doesNotMatch(html, /Add more AST results if available|TOP CANDIDATE|IN(?:SUFFICIENT DATA)/);
  for (const id of ['ref-clsi', 'ref-idsa']) assert.ok(html.includes(data.references.find(r => r.id === id).url));
});

test('SCI04: rendered mixed results show both unchanged active candidates and a single paused notice', () => {
  const rows = [row('ceftriaxone'), row('meropenem', 'S'), row('ciprofloxacin')];
  const html = renderToStaticMarkup(uiHarness(rows, engine.analyzePhenotype('ecoli', rows)).tree());
  assert.match(html, /TOP CANDIDATE/);
  assert.match(html, /Extended-spectrum/);
  assert.equal(html.split(pauseExplanation).length - 1, 1);
});

test('SCI04: coverage directory retains quinolone literature with explicit paused availability', () => {
  for (const drugId of ['ciprofloxacin', 'ceftriaxone']) {
    let cursor = 0; const state = ['', drugId, ''];
    const hooks = { useState: initial => [state[cursor++] ?? initial, () => {}], useEffect: () => {} };
    const source = readFileSync(new URL('../src/features/CoverageDirectory.tsx', import.meta.url), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const module = { exports: {} };
    new Function('require', 'exports', 'location', code)(id => {
      if (id === 'react') return hooks;
      if (id.endsWith('.css')) return {};
      if (id.endsWith('SearchableSelect')) return { default: () => null };
      if (id.startsWith('.')) return load(`src/features/${id}.ts`);
      return require(id);
    }, module.exports, { search: '' });
    const html = renderToStaticMarkup(module.exports.default());
    if (drugId === 'ciprofloxacin') {
      assert.match(html, /Inference paused pending scientific review; educational literature remains available/);
      assert.match(html, /href="\/resistance\/mechanisms\/quinolone"/);
      assert.match(html, /Draft/);
    } else assert.doesNotMatch(html, /Inference paused pending scientific review/);
  }
});
