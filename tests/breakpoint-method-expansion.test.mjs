import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createAuditLoader } from '../scripts/audit-module-loader.mjs';

const load = createAuditLoader();
const data = load('src/data/index.ts');
const methods = load('src/features/breakpointMethods.ts');
const predicates = load('src/features/breakpointPredicates.ts');
const engineSource = readFileSync(new URL('../src/features/BreakpointEngine.tsx', import.meta.url), 'utf8');
const visualSource = readFileSync(new URL('../src/components/AstMethodLearningVisual.tsx', import.meta.url), 'utf8');

test('method selector has the exact logical order and defaults to broth MIC', () => {
  assert.equal(methods.DEFAULT_AST_METHOD, 'MIC_BROTH');
  assert.deepEqual(methods.AST_METHODS.map(item => item.id), ['MIC_BROTH', 'MIC_AUTOMATED', 'MIC_GRADIENT', 'DISK_DIFFUSION']);
  assert.deepEqual(methods.AST_METHODS.map(item => item.label), ['Broth microdilution / MIC', 'Automated MIC', 'Gradient diffusion / Etest', 'Disk diffusion / Kirby-Bauer']);
});

test('MIC-producing methods use MIC/µg/mL and disk uses zone diameter/mm', () => {
  for (const id of ['MIC_BROTH', 'MIC_AUTOMATED', 'MIC_GRADIENT']) {
    const method = methods.astMethodDefinition(id);
    assert.equal(method.measurementType, 'MIC');
    assert.equal(method.unit, 'µg/mL');
    assert.equal(method.recordMethod, 'MIC');
  }
  const disk = methods.astMethodDefinition('DISK_DIFFUSION');
  assert.equal(disk.measurementType, 'Zone diameter');
  assert.equal(disk.unit, 'mm');
  assert.equal(disk.recordMethod, 'Disk');
  assert.equal(disk.allowsTeachingSimulation, false);
});

test('disk selection can never consume an MIC record and missing disk data fails closed', () => {
  const diskRecords = methods.recordsForAstMethod(data.breakpoints, 'DISK_DIFFUSION');
  assert.ok(diskRecords.length > 0);
  assert.ok(diskRecords.every(record => record.method === 'Disk'));
  assert.equal(predicates.matchingBreakpointRecords(diskRecords, 'CLSI', 'ecoli', 'ceftriaxone').length, 0);
  assert.match(engineSource, /Method-specific disk-diffusion breakpoint not yet available/);
  assert.match(engineSource, /does not reuse or convert an MIC breakpoint/);
});

// Test-only review documentation exercises admission; it does not review or
// promote any bundled record, source, numerical value, or method in the app.
function syntheticApplicability(record, method) {
  return {
    method, reviewStatus: 'Reviewed',
    reviewProvenance: {
      contentId: `${record.id}:${method}`, contentVersion: record.version,
      sources: [{ sourceId: record.sourceId, editionOrVersion: 'Synthetic review fixture', sectionOrLocator: 'Synthetic applicability test' }],
      reviewer: { identity: 'Synthetic reviewer', qualificationOrRole: 'Test fixture only', publicAttributionApproved: false },
      reviewedOn: '2026-09-13', approvalEvidenceId: 'synthetic-test-only',
    },
  };
}

for (const method of ['MIC_AUTOMATED', 'MIC_GRADIENT']) {
  test(`${method}: generic MIC records and generic Reviewed labels cannot grant applicability`, () => {
    assert.deepEqual(methods.recordsForAstMethod(data.breakpoints, method), []);
    const genericReviewed = data.breakpoints.map(record => ({ ...record, meta: { ...record.meta, status: 'Reviewed' } }));
    assert.deepEqual(methods.recordsForAstMethod(genericReviewed, method), []);
    assert.equal(methods.astMethodDefinition(method).allowsTeachingSimulation, false);
  });

  test(`${method}: only an explicit same-method, same-record review with complete provenance permits admission`, () => {
    const record = data.breakpoints.find(record => record.id === 'bp-ecoli-cro');
    const grant = syntheticApplicability(record, method);
    const admitted = { ...record, methodApplicability: [grant] };
    assert.deepEqual(methods.recordsForAstMethod([admitted], method), [admitted]);
    const other = method === 'MIC_AUTOMATED' ? 'MIC_GRADIENT' : 'MIC_AUTOMATED';
    assert.deepEqual(methods.recordsForAstMethod([admitted], other), []);
    for (const entry of [
      { ...grant, reviewStatus: 'Draft' },
      { ...grant, reviewProvenance: undefined },
      { ...grant, reviewProvenance: { ...grant.reviewProvenance, contentId: 'another-record' } },
      { ...grant, reviewProvenance: { ...grant.reviewProvenance, contentVersion: 'another-version' } },
      { ...grant, reviewProvenance: { ...grant.reviewProvenance, sources: [] } },
      { ...grant, reviewProvenance: { ...grant.reviewProvenance, sources: [{ sourceId: 'unresolved-source', editionOrVersion: 'Test', sectionOrLocator: 'Test' }] } },
      { ...grant, reviewProvenance: { ...grant.reviewProvenance, sources: [{ sourceId: record.sourceId, editionOrVersion: '', sectionOrLocator: '' }] } },
      { ...grant, reviewProvenance: { ...grant.reviewProvenance, reviewer: { identity: '', qualificationOrRole: '', publicAttributionApproved: false } } },
      { ...grant, reviewProvenance: { ...grant.reviewProvenance, reviewedOn: 'Pending review' } },
      { ...grant, reviewProvenance: { ...grant.reviewProvenance, approvalEvidenceId: '' } },
    ]) assert.deepEqual(methods.recordsForAstMethod([{ ...record, methodApplicability: [entry] }], method), []);
    assert.deepEqual(methods.recordsForAstMethod([{ ...record, methodApplicability: [grant, grant] }], method), []);
    assert.deepEqual(methods.recordsForAstMethod([{ ...admitted, method: 'Disk' }], method), []);
  });
}

test('broth and disk keep their exact existing record sets regardless of new applicability metadata', () => {
  for (const [method, legacy] of [['MIC_BROTH', 'MIC'], ['DISK_DIFFUSION', 'Disk']]) {
    const expected = data.breakpoints.filter(record => record.method === legacy);
    assert.deepEqual(methods.recordsForAstMethod(data.breakpoints, method), expected);
  }
  const mic = data.breakpoints.find(record => record.id === 'bp-ecoli-cro');
  const withGrant = { ...mic, methodApplicability: [syntheticApplicability(mic, 'MIC_AUTOMATED')] };
  assert.deepEqual(methods.recordsForAstMethod([withGrant], 'DISK_DIFFUSION'), []);
  assert.deepEqual(methods.recordsForAstMethod([withGrant], 'MIC_BROTH'), [withGrant]);
});

test('all MIC operators remain distinct and non-equality operators fail closed in the draft UI', () => {
  for (const operator of ['<', '≤', '>', '≥', '=']) assert.match(engineSource, new RegExp(`value=["']${operator.replace(/[<>]/g, '\\$&')}["']`));
  assert.match(engineSource, /micOperator === "="/);
  assert.match(engineSource, /Operator-aware category assignment is not enabled/);
});

test('method changes create incompatible measurement contexts and preserve URL aliases safely', () => {
  assert.notEqual(methods.measurementContextFor('MIC_BROTH', 'µg/mL'), methods.measurementContextFor('DISK_DIFFUSION', 'mm'));
  assert.equal(methods.astMethodFromSearch('?astMethod=MIC_GRADIENT'), 'MIC_GRADIENT');
  assert.equal(methods.astMethodFromSearch('?astMethod=not-real'), 'MIC_BROTH');
  assert.equal(methods.updateAstMethodSearch('?topic=ampc', 'DISK_DIFFUSION'), '?topic=ampc&astMethod=DISK_DIFFUSION');
  assert.equal(methods.updateAstMethodSearch('?topic=ampc&astMethod=DISK_DIFFUSION', 'MIC_BROTH'), '?topic=ampc');
  assert.match(engineSource, /setMic\(""\)/);
  assert.match(engineSource, /setMicOperator\("="\)/);
});

test('method expansion adds no numerical disk or MIC breakpoint records', () => {
  const normalized = readFileSync(new URL('../src/data/breakpoints.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(createHash('sha256').update(normalized).digest('hex'), '8b729567f4f5004f94187f58289fe89befce86d8649d265b048db447a7500ec5');
});

test('educational visuals are original, accessible, method-correct, and non-clinical', () => {
  for (const text of ['How this AST method works', 'Antimicrobial disk', 'Inhibition zone', 'Zone diameter', 'measured in mm', 'Gradient strip', 'Inhibition ellipse', 'MIC read point', 'ellipse–scale intersection']) assert.match(visualSource, new RegExp(text));
  assert.match(visualSource, /role="img"/);
  assert.match(visualSource, /<title/);
  assert.match(visualSource, /<desc/);
  assert.match(visualSource, /Educational overview · not clinical instructions/);
  assert.match(visualSource, /Original AST Compass educational diagram/);
  assert.doesNotMatch(visualSource, /img src=|manufacturer artwork/i);
});

test('method comparison and expert feedback callout are present without fake values', () => {
  assert.match(engineSource, /Compare AST Methods/);
  assert.match(engineSource, /Provide method feedback/);
  assert.match(engineSource, /Method expansion — under expert review/);
  assert.match(engineSource, /This panel does not assert or convert breakpoint values/);
});
