import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import * as search from "../src/utils/search-core.mjs";
import { matchAntimicrobial } from "../src/features/image-concordance-extraction-core.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const cache = new Map();
function load(relativePath) {
  const path = resolve(root, relativePath);
  if (cache.has(path)) return cache.get(path);
  const exports = {}; cache.set(path, exports);
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "exports", compiled)(specifier => specifier.endsWith("utils/search") ? search : load(resolve(dirname(path), `${specifier}.ts`)), exports);
  return exports;
}
const options = load("src/data/coverageOptions.ts");
const { canonicalAntimicrobials } = load("src/data/antibiotics.ts");
const { requiredAntimicrobialIds } = load("src/data/antimicrobialCoverage.ts");
const { referenceOnlyOrganisms } = load("src/data/organismCoverage.ts");
const source = file => readFileSync(resolve(root, file), "utf8");

test("every required full name and abbreviation is found by the actual global coverage search", () => {
  for (const id of requiredAntimicrobialIds) {
    const drug = canonicalAntimicrobials.find(item => item.id === id);
    for (const query of [drug.displayName, drug.abbreviation]) {
      assert.ok(options.searchCoverage(query).some(result => result.analyticsId === id), `${query}: ${id}`);
    }
  }
  assert.ok(options.searchCoverage("TMP/SMX").some(result => result.analyticsId === "trim_sulfa"));
  assert.deepEqual(options.searchCoverage("C/T").map(result => result.analyticsId), ["cef_tol_tazo"]);
  assert.equal(options.searchCoverage("").length, 0);
});

test("organism aliases surface canonical names and open coverage, not a default scientific result", () => {
  for (const [query, expected] of [["E. cloacae complex", "Enterobacter cloacae complex"], ["S. aureus", "Staphylococcus aureus"], ["K. pneumoniae group", "Klebsiella pneumoniae group"], ["ACB complex", "Acinetobacter calcoaceticus-baumannii complex"], ["Stomatococcus mucilaginosus", "Rothia mucilaginosa"]]) {
    const result = options.searchCoverage(query).find(result => result.title === expected);
    assert.ok(result, query); assert.ok(result.path.startsWith("/references/coverage?organism="));
  }
});

test("scientific and image selectors are alphabetic and do not duplicate canonical drugs or admit reference-only taxa", () => {
  for (const list of [options.scientificOrganismOptions, options.antimicrobialIdOptions, options.imageAntimicrobialOptions]) {
    assert.deepEqual(list.map(item => item.label), search.sortAlphabetically(list, item => item.label).map(item => item.label));
    assert.equal(new Set(list.map(item => item.value)).size, list.length);
  }
  for (const organism of referenceOnlyOrganisms) assert.ok(!options.scientificOrganismOptions.some(option => option.value === organism.id));
  assert.equal(options.antimicrobialIdOptions.filter(option => option.label === "Clindamycin").length, 1);
  assert.equal(search.filterSearchOptions(options.antimicrobialIdOptions, "CFZ").length, 2);
});

test("the production OCR dictionary resolves required aliases without guessing ambiguous CFZ", () => {
  for (const id of requiredAntimicrobialIds) {
    const drug = canonicalAntimicrobials.find(item => item.id === id);
    assert.equal(matchAntimicrobial(drug.displayName, options.imageAntimicrobialOptions).canonical, drug.displayName);
    if (drug.abbreviation !== "CFZ") assert.equal(matchAntimicrobial(drug.abbreviation, options.imageAntimicrobialOptions).canonical, drug.displayName);
  }
  const ambiguous = matchAntimicrobial("CFZ", options.imageAntimicrobialOptions);
  assert.ok(!["EXACT", "ALIAS"].includes(ambiguous.matchStatus));
  assert.equal(ambiguous.canonical, undefined);
  assert.equal(matchAntimicrobial("TMP/SMX", options.imageAntimicrobialOptions).canonical, "Trimethoprim-sulfamethoxazole");
});

test("route, canonical metadata, source links, and shared PWA navigation expose the coverage directory", () => {
  const app = source("src/App.tsx"), page = source("src/features/CoverageDirectory.tsx");
  assert.match(app, /coverage: "\/references\/coverage"/);
  assert.match(app, /page === "coverage"/);
  assert.match(app, /Organism & Antimicrobial Coverage \| AST Compass/);
  assert.match(app, /searchCoverage\(query\)/);
  assert.match(source("public/sitemap.xml"), /https:\/\/astcompass.com\/references\/coverage/);
  assert.match(page, /getOrganismStandardMessage/);
  assert.match(page, /source.scopeUrl \|\| source.url/);
  assert.match(page, /source.url/);
  assert.match(app, /page === "coverage" \? "references"/);
  assert.match(page, /addEventListener\("popstate", restoreSelection\)/);
  assert.match(page, /removeEventListener\("popstate", restoreSelection\)/);
  assert.match(source("scripts/postbuild.mjs"), /assetNames.map/);
});

test("coverage source additions preserve every existing citation and never duplicate source identities", () => {
  const { references } = load("src/data/references.ts");
  for (const reference of references) assert.deepEqual(options.coverageReferenceLibrary.find(item => item.id === reference.id), reference);
  assert.equal(new Set(options.coverageReferenceLibrary.map(item => item.id)).size, options.coverageReferenceLibrary.length);
  for (const id of ["ref-clsi", "ref-clsi-m45", "ref-eucast"]) assert.ok(options.coverageReferenceLibrary.some(item => item.id === id), id);
});

test("all public Concordance callers use coverage admission and review dropdowns support aliases", () => {
  for (const file of ["src/App.tsx", "src/features/ImageConcordanceAnalyzer.tsx"]) assert.match(source(file), /import \{ analyzeConcordance \} from "\.\.?\/features\/coverageConcordance"|import \{ analyzeConcordance \} from "\.\/coverageConcordance"/);
  assert.match(source("src/components/ASTObservationList.tsx"), /<SearchableSelect label="Antimicrobial"/);
  assert.match(source("src/components/ImageExtractionWorkspace.tsx"), /imageAntimicrobialOptions as antimicrobialOptions/);
  assert.match(source("src/features/PhenotypeMechanismAnalyzer.tsx"), /phenotypeSignatures.some/);
});
