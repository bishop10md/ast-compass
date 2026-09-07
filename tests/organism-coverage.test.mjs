import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { normalizeSearch, sortAlphabetically } from "../src/utils/search-core.mjs";

// Compile the real typed datasets in memory; no generated fixture can conceal a drift.
const root = fileURLToPath(new URL("../", import.meta.url));
const cache = new Map();
function loadModule(relativePath) {
  const path = resolve(root, relativePath);
  if (cache.has(path)) return cache.get(path);
  const exports = {};
  cache.set(path, exports);
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "exports", compiled)(specifier => {
    if (specifier.endsWith("utils/search")) return { normalizeSearch, sortAlphabetically };
    return loadModule(resolve(dirname(path), `${specifier}.ts`));
  }, exports);
  return exports;
}
const data = loadModule("src/data/organismCoverage.ts");
const { organismCoverage, referenceOnlyOrganisms, organismCoverageSources, organismCoverageSummary, findOrganismCoverage, getOrganismStandardMessage } = data;
const { organisms } = loadModule("src/data/organisms.ts");
const { bcid2Targets, bcid2Markers } = loadModule("src/data/bcid2Panel.ts");

test("organism audit accounts for all existing records and bounded reference-only additions", () => {
  assert.deepEqual(organismCoverageSummary, {
    originalCount: 63, originalBacterialCount: 47, originalAcidFastCount: 3,
    originalFungalCount: 13, addedReferenceOnlyCount: 33, partialCount: 47,
    outOfScopeCount: 16, authoritativeInterpretiveCount: 0,
  });
  assert.equal(organismCoverage.length, 96);
  for (const original of organisms) {
    const companion = organismCoverage.find(item => item.existingOrganismId === original.id);
    assert.ok(companion, original.id);
    assert.equal(companion.name, original.name);
    assert.deepEqual(companion.aliases, original.aliases);
  }
});

test("coverage names and aliases resolve without silently converting panel groups to species", () => {
  assert.equal(findOrganismCoverage("E. cloacae complex")?.id, "ecloacae");
  assert.equal(findOrganismCoverage("S. aureus")?.id, "staph_aureus");
  assert.equal(findOrganismCoverage("Enterobacter aerogenes")?.id, "eaerogenes");
  assert.equal(findOrganismCoverage("Klebsiella pneumoniae")?.id, "kpneumo");
  assert.equal(findOrganismCoverage("K. pneumoniae group")?.id, "coverage-bcid-k-pneumoniae-group");
  assert.equal(findOrganismCoverage("ACB complex")?.id, "coverage-bcid-acb-complex");
  assert.equal(findOrganismCoverage("Haemophilus influenzae")?.id, "coverage-bcid-h-influenzae");
  assert.equal(findOrganismCoverage("H. influenzae")?.id, "coverage-bcid-h-influenzae");
  assert.equal(findOrganismCoverage("Bacteroides fragilis")?.id, "coverage-bcid-b-fragilis");
  assert.equal(findOrganismCoverage("B. fragilis group")?.id, "bfragilis");
  assert.equal(findOrganismCoverage("Proteus spp.")?.id, "coverage-bcid-proteus-spp");
  assert.equal(findOrganismCoverage("Enterococci")?.id, "coverage-enterococcus");
  assert.equal(findOrganismCoverage("an organism not in the dataset"), undefined);
  assert.equal(findOrganismCoverage(""), undefined);
});

test("organism coverage directory is alphabetized with no duplicate canonical entries", () => {
  assert.deepEqual(organismCoverage.map(item => item.name), sortAlphabetically(organismCoverage, item => item.name).map(item => item.name));
  assert.deepEqual(referenceOnlyOrganisms.map(item => item.name), sortAlphabetically(referenceOnlyOrganisms, item => item.name).map(item => item.name));
  assert.equal(new Set(organismCoverage.map(item => item.id)).size, organismCoverage.length);
  assert.equal(new Set(organismCoverage.map(item => normalizeSearch(item.name))).size, organismCoverage.length);
});

test("reference-only additions stay Draft and cannot fabricate breakpoint criteria or scientific eligibility", () => {
  const originalIds = new Set(organisms.map(item => item.id));
  for (const item of referenceOnlyOrganisms) {
    assert.equal(item.reviewStatus, "Draft");
    assert.equal(item.coverageStatus, "REFERENCE-ONLY");
    assert.equal(item.authoritativeInterpretationAvailable, false);
    assert.equal(item.breakpointAvailability, "PENDING AUTHORITATIVE SOURCE REVIEW");
    assert.equal(originalIds.has(item.id), false);
    assert.equal(item.existingOrganismId, undefined);
    for (const field of ["susceptible", "intermediate", "resistant", "mic", "threshold", "domains", "ruleIds"]) assert.equal(field in item, false, `${item.id}: ${field}`);
  }
});

test("every reference-only organism has explicit public source identity and relevance", () => {
  for (const item of referenceOnlyOrganisms) {
    assert.ok(item.relevance.some(reason => reason.length > 30), item.id);
    assert.ok(item.sourceIds.length && item.standardSupport.length, item.id);
    for (const support of item.standardSupport) {
      const source = organismCoverageSources[support.sourceKey];
      assert.ok(source && source.document && source.editionOrVersion, item.id);
      assert.match(source.url, /^https:\/\//);
      assert.ok(item.sourceIds.includes(source.sourceId), item.id);
      assert.ok(support.note.length > 20, item.id);
    }
  }
});

test("M45 organism mappings remain separate from M100 and fastidious UI domains do not select standards", () => {
  const m45 = organismCoverageSources["clsi-m45"], m100 = organismCoverageSources["clsi-m100"];
  assert.equal(m45.document, "M45");
  assert.equal(m45.editionOrVersion, "3rd Edition");
  assert.equal(m100.document, "M100");
  assert.notEqual(m45.sourceId, m100.sourceId);
  assert.deepEqual(findOrganismCoverage("Abiotrophia spp.").standardSupport.map(item => item.sourceKey), ["clsi-m45"]);
  for (const id of ["haemophilus", "ngonorrhoeae", "nmeningitidis"]) {
    const item = organismCoverage.find(item => item.id === id);
    assert.ok(item.standardSupport.some(item => item.sourceKey === "clsi-m100"));
    assert.ok(!item.standardSupport.some(item => item.sourceKey === "clsi-m45"));
  }
  assert.match(findOrganismCoverage("Burkholderia cepacia complex").standardSupport.find(item => item.sourceKey === "eucast-16.1").note, /no numerical breakpoints/);
});

test("pending and unknown organism-standard pairs always explain absent implemented interpretation", () => {
  const boundary = "AST Compass does not currently provide breakpoint interpretation for this organism under the selected standard.";
  for (const id of ["ecoli", "coverage-abiotrophia", "coverage-bcid-k-pneumoniae-group", "unknown"]) {
    for (const source of ["clsi-m100", "clsi-m45", "eucast-16.1", "unrecognized-standard"]) {
      assert.ok(getOrganismStandardMessage(id, source).startsWith(boundary), `${id} / ${source}`);
      assert.match(getOrganismStandardMessage(id, source), /PENDING AUTHORITATIVE SOURCE REVIEW/);
    }
  }
});

test("BCID recognition preserves all 26 bacterial targets and the existing AMR panel boundary", () => {
  const bacterial = bcid2Targets.filter(item => item.category !== "Yeast");
  assert.equal(bacterial.length, 26);
  assert.equal(bcid2Markers.length, 10);
  assert.equal(bcid2Targets.filter(item => item.category === "Yeast").length, 7);
  for (const target of bacterial) {
    const record = organismCoverage.find(item => item.bcidTargetId === target.id);
    assert.ok(record, target.id);
    assert.equal(record.name, target.name);
  }
  assert.equal(referenceOnlyOrganisms.filter(item => item.bcidTargetId).length, 10);
});

test("coverage source metadata does not become a scientific-engine import", () => {
  for (const file of ["src/data/organisms.ts", "src/features/BreakpointEngine.tsx", "src/features/phenotypeMechanismEngine.ts", "src/features/concordanceEngine.ts", "src/data/bcid2Panel.ts"]) {
    assert.doesNotMatch(readFileSync(resolve(root, file), "utf8"), /organismCoverage|referenceOnlyOrganisms/, file);
  }
});
