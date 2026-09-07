import { createAuditLoader } from './audit-module-loader.mjs';
import { inspectPhenotypeAvailability } from './phenotype-availability-gate.mjs';
const load = createAuditLoader();
const data = load('src/data/index.ts'), drugs = load('src/data/antibiotics.ts'), directory = load('src/data/organismCoverage.ts'), coverage = load('src/features/coverageConcordance.ts'), phenotype = load('src/features/phenotypeMechanismEngine.ts');
const bp = load('src/features/BreakpointEngine.tsx', 'export { scaleFor, interpretMeasurement };');
const results = [];
function gate(name, severity, expected, inspect) {
  try { const { pass, actual } = inspect(); results.push({ name, severity, status: pass ? 'PASS' : 'FAIL', expected, actual }); }
  catch (error) { results.push({ name, severity, status: 'ERROR', expected, actual: String(error.message || error) }); }
}
const row = (antimicrobial, category = 'R') => ({ id: 'audit-row', antimicrobial, category, measurement: '', confidence: 'High' });
gate('Disk direction agrees with the loaded inequalities', 'HIGH', 'Low resistant disk zone is resistant; high susceptible zone is susceptible.', () => {
  const record = data.breakpoints.find(x => x.method === 'Disk'), drug = drugs.antibiotics.find(x => x.id === record.antibioticId), organism = data.organisms.find(x => x.id === record.organismId), scale = bp.scaleFor(record, drug, organism);
  const low = Number(record.resistant.match(/\d+(?:\.\d+)?/)[0]) - 1, high = Number(record.susceptible.match(/\d+(?:\.\d+)?/)[0]) + 1;
  const a = bp.interpretMeasurement(scale, String(low), record.standard), b = bp.interpretMeasurement(scale, String(high), record.standard);
  return { pass: a.tone === 'res' && b.tone === 'sus', actual: { recordId: record.id, method: record.method, unit: record.unit, loadedS: record.susceptible, loadedR: record.resistant, lowInput: low, lowCategory: a.category, highInput: high, highCategory: b.category } };
});
gate('MRSA marker is explicitly relevant without an unreviewed category', 'HIGH', 'Oxacillin/cefoxitin mec contexts are explicitly recognized but Cannot infer pending source review.', () => {
  const actual = [['staph_aureus', 'mecA/C and MREJ (MRSA)', 'Oxacillin'], ['staph_aureus', 'mecA/C and MREJ (MRSA)', 'Cefoxitin'], ['cons', 'mecA/C', 'Oxacillin']].map(([organism, marker, drug]) => { const r = coverage.analyzeConcordance(organism, marker, [row(drug)])[0]; return { organism, marker, drug, assessment: r.assessment, relevance: r.relevance, pendingSourceReview: r.pendingSourceReview, hasForecast: !!r.forecast }; });
  return { pass: actual.every(x => x.assessment === 'Cannot infer' && x.relevance === 'recognized' && x.pendingSourceReview && !x.hasForecast), actual };
});
gate('Concordance does not attach another species forecast', 'HIGH', 'E. coli uses its own or a generic forecast, not E. cloacae-specific material.', () => {
  const actual = ['I', 'SDD'].map(category => { const r = coverage.analyzeConcordance('ecoli', 'CTX-M', [row('Ceftriaxone', category)])[0]; return { category, assessment: r.assessment, forecastId: r.forecast?.id, forecastOrganism: r.forecast?.organism || null }; });
  return { pass: actual.every(x => x.forecastId === 'ctxm-ecoli' && x.forecastOrganism === 'Escherichia coli'), actual };
});
gate('Active phenotype evidence thresholds are reachable', 'MEDIUM', 'Explicitly active rules have reachable thresholds; unknown availability states fail.', () => inspectPhenotypeAvailability(phenotype).active);
gate('SCI-04 safely abstains while paused pending scientific review', 'MEDIUM', 'Explicit pause, Draft status, original minimum 2 and weight 1, no inference, intact observations and public explanation.', () => inspectPhenotypeAvailability(phenotype).paused);
gate('Combined review claims remain disabled pending documented approval', 'HIGH', 'Current combined result is Draft/unreviewed and compatibility prose does not invent review.', () => {
  const r = data.getCombinedForecast('k-pneumoniae-group', ['ctx-m', 'kpc']), reviewProse = data.bcid2CompatibilityRules.filter(rule => /\breviewed\b/i.test(rule.explanation));
  return { pass: r.reviewed === false && r.reviewStatus === 'Draft' && !r.reviewProvenance && !reviewProse.length, actual: { reviewed: r.reviewed, reviewStatus: r.reviewStatus, hasReviewProvenance: !!r.reviewProvenance, unsupportedReviewProse: reviewProse.length, availableFields: Object.keys(r) } };
});
gate('Required coverage does not invent reviewed criteria', 'HIGH', 'Required drugs present, canonical IDs unique, new metadata Draft, no authoritative interpretation promotion.', () => {
  const ids = load('src/data/antimicrobialCoverage.ts').requiredAntimicrobialIds, missing = ids.filter(id => !drugs.canonicalAntimicrobials.some(x => x.id === id)), duplicateIds = drugs.canonicalAntimicrobials.length - new Set(drugs.canonicalAntimicrobials.map(x => x.id)).size, nonDraft = drugs.canonicalAntimicrobials.filter(x => x.reviewStatus !== 'Draft').map(x => x.id), promoted = directory.organismCoverage.filter(x => x.authoritativeInterpretationAvailable !== false).map(x => x.id);
  return { pass: ids.length === 24 && !missing.length && !duplicateIds && !nonDraft.length && !promoted.length, actual: { required: ids.length, missing, duplicateIds, nonDraft, promoted } };
});
gate('Unsupported contexts and combinations fail closed', 'HIGH', 'Cannot infer, without an attached forecast.', () => {
  const actual = [['reference-only-organism', 'CTX-M', 'Ceftriaxone'], ['staph_aureus', 'CTX-M', 'Ceftriaxone'], ['ecoli', 'KPC', 'MEV'], ['ecoli', 'KPC', 'CZA'], ['ecoli', 'KPC', 'C/T']].map(([organism, marker, drug]) => { const r = coverage.analyzeConcordance(organism, marker, [row(drug)])[0]; return { organism, marker, drug, assessment: r.assessment, hasForecast: !!r.forecast }; });
  return { pass: actual.every(x => x.assessment === 'Cannot infer' && !x.hasForecast), actual };
});
gate('Scientific source IDs resolve', 'MEDIUM', 'All source IDs resolve in shared references or the separate coverage source registry.', () => {
  const shared = new Set(data.references.map(x => x.id)), scoped = new Set(Object.values(directory.organismCoverageSources).map(x => x.sourceId)), used = [];
  const walk = v => { if (Array.isArray(v)) return v.forEach(walk); if (!v || typeof v !== 'object') return; for (const [k, c] of Object.entries(v)) { if (k === 'sourceId' && typeof c === 'string') used.push(c); else if (k === 'sourceIds' && Array.isArray(c)) used.push(...c); else walk(c); } };
  for (const k of ['genes', 'breakpoints', 'intrinsicPatterns', 'bcidForecasts', 'bcid2Panel', 'bcid2CompatibilityRules', 'learningModules', 'astDetectiveQuestions', 'mechanismLiterature', 'educationalTopics', 'contentReviewMeta', 'standardCatalog']) walk(data[k]);
  walk(drugs.canonicalAntimicrobials); walk(directory.organismCoverage); walk(phenotype.phenotypeSignatures);
  const ids = [...new Set(used)], missing = ids.filter(id => !shared.has(id) && !scoped.has(id));
  return { pass: missing.length === 0, actual: { missing, coverageRegistryOnly: ids.filter(id => !shared.has(id) && scoped.has(id)) } };
});
gate('BCID and Detective scope remains intact', 'HIGH', '26 bacterial identifiers, 7 retained manufacturer yeast identifiers, 10 markers; 100 unique Draft questions.', () => {
  const t = data.bcid2Panel.targets, actual = { bacteria: t.filter(x => x.category !== 'Yeast').length, yeast: t.filter(x => x.category === 'Yeast').length, markers: data.bcid2Panel.markers.length, questions: data.astDetectiveQuestions.length, uniqueQuestions: new Set(data.astDetectiveQuestions.map(x => x.id)).size, reviewStatuses: [...new Set(data.astDetectiveQuestions.map(x => x.reviewStatus))] };
  return { pass: actual.bacteria === 26 && actual.yeast === 7 && actual.markers === 10 && actual.questions === 100 && actual.uniqueQuestions === 100 && actual.reviewStatuses.join() === 'Draft', actual };
});
const releaseBlocked = results.some(r => r.status !== 'PASS');
console.log(JSON.stringify({ audit: 'AST Compass scientific predeploy release gate', releaseBlocked, results }, null, 2));
process.exitCode = releaseBlocked ? 1 : 0;
