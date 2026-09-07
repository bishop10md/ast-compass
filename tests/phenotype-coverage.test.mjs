import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import * as search from "../src/utils/search-core.mjs";
import * as extraction from "../src/features/image-concordance-extraction-core.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const cache = new Map();
function load(relative) {
  const path = resolve(root, relative);
  if (cache.has(path)) return cache.get(path);
  const exports = {}; cache.set(path, exports);
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "exports", compiled)(specifier => {
    if (specifier.endsWith("utils/search")) return search;
    if (specifier.endsWith("image-concordance-extraction-core.mjs")) return extraction;
    if (specifier === "../data") return Object.assign({}, ...["antibiotics", "organisms", "intrinsicPatterns", "mechanisms"].map(name => load(`src/data/${name}.ts`)));
    return load(resolve(dirname(path), `${specifier}.ts`));
  }, exports);
  return exports;
}
const { parsePhenotypeAstText, phenotypeRowCoverage } = load("src/features/phenotypeCoverage.ts");
const { analyzePhenotype } = load("src/features/phenotypeMechanismEngine.ts");
const input = (id, antimicrobialId, category = "R") => ({ id, antimicrobialId, category, measurement: "1" });

test("phenotype upload preserves full combinations and aliases instead of selecting a parent drug", () => {
  const examples = [
    ["Meropenem-vaborbactam", "mero_vabor"], ["MEV", "mero_vabor"],
    ["Ceftazidime-avibactam", "caz_avi"], ["CZA", "caz_avi"],
    ["Ampicillin-sulbactam", "amp_sulb"], ["SAM", "amp_sulb"],
    ["Ceftolozane-tazobactam", "cef_tol_tazo"], ["C-T", "cef_tol_tazo"], ["C/T", "cef_tol_tazo"],
    ["Trimethoprim-sulfamethoxazole", "trim_sulfa"], ["TMP/SMX", "trim_sulfa"], ["SXT", "trim_sulfa"],
    ["CRO", "ceftriaxone"], ["CTX", "cefotaxime"], ["TZP", "pip_tazo"],
  ];
  for (const [name, expectedId] of examples) {
    const table = parsePhenotypeAstText(`Antimicrobial | MIC | Category\n${name} | ≤0.25 | R`);
    assert.equal(table.length, 1, name);
    assert.equal(table[0].antimicrobialId, expectedId, name);
    assert.equal(table[0].measurement, "≤0.25", name);
    assert.equal(table[0].category, "R", name);
    assert.equal(table[0].rawAntimicrobial, name, name);
    const plain = parsePhenotypeAstText(`${name} >32 S`);
    assert.equal(plain[0]?.antimicrobialId, expectedId, `unstructured: ${name}`);
  }
});

test("ambiguous and unknown phenotype OCR names stay visible and unresolved, never guessed or dropped", () => {
  const rows = parsePhenotypeAstText("Antimicrobial | MIC | Category\nCFZ | >32 | R\nUnlisted-drug | 1 | S\nCeftriaxne | 2 | I");
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.rawAntimicrobial), ["CFZ", "Unlisted-drug", "Ceftriaxne"]);
  assert.ok(rows.every(row => row.antimicrobialId === ""));
  assert.ok(rows.every(row => row.extractionIssues.length > 0));
  assert.equal(rows[0].measurement, ">32");
  assert.equal(rows[0].category, "R");
});

test("missing phenotype OCR measurements and categories are not invented", () => {
  const rows = parsePhenotypeAstText("Antimicrobial | MIC | Category\nCeftriaxone | | R\nMeropenem | 0.25 | ");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].measurement, "");
  assert.equal(rows[1].category, "Unknown");
});

test("phenotype row coverage is derived only from existing organism-specific signatures and intrinsic patterns", () => {
  const ceftriaxone = phenotypeRowCoverage("ecoli", input("one", "ceftriaxone"));
  assert.equal(ceftriaxone.hasRuleContext, true);
  assert.ok(ceftriaxone.signatureIds.includes("esbl-like"));
  const intrinsic = phenotypeRowCoverage("kpneumo", input("two", "ampicillin"));
  assert.equal(intrinsic.hasRuleContext, true);
  assert.ok(intrinsic.intrinsicPatternIds.includes("ip4"));
  for (const id of ["tigecycline", "mero_vabor", "caz_avi", "amp_sulb", "cef_tol_tazo"]) {
    const unsupported = phenotypeRowCoverage("ecoli", input(id, id));
    assert.equal(unsupported.recognized, true, id);
    assert.equal(unsupported.hasRuleContext, false, id);
    assert.equal(unsupported.message, "Drug is recognized, but no interpretation rule is currently available for this organism/context.");
  }
  assert.equal(phenotypeRowCoverage("ecoli", input("three", "oxacillin")).hasRuleContext, false);
  assert.equal(phenotypeRowCoverage("staph_aureus", input("four", "oxacillin")).hasRuleContext, true);
  assert.equal(phenotypeRowCoverage("coverage-new-taxon", input("five", "ceftriaxone")).hasRuleContext, false);
});

test("mixed supported and unsupported rows remain disclosed without changing scientific scores or input counts", () => {
  const rows = [input("one", "ceftriaxone"), input("two", "meropenem", "S"), input("three", "tigecycline")];
  assert.deepEqual(rows.map(row => phenotypeRowCoverage("ecoli", row).hasRuleContext), [true, true, false]);
  const supported = analyzePhenotype("ecoli", rows.slice(0, 2));
  const mixed = analyzePhenotype("ecoli", rows);
  assert.deepEqual(mixed.candidates, supported.candidates);
  assert.equal(mixed.reviewedRows, 3);
  const ui = readFileSync(resolve(root, "src/features/PhenotypeMechanismAnalyzer.tsx"), "utf8");
  assert.match(ui, /parsePhenotypeAstText\(text\)/);
  assert.doesNotMatch(ui, /parseAstText|antibiotics\.find/);
  assert.match(ui, /OCR antimicrobial/);
  assert.match(ui, /correct or remove unresolved antimicrobial names/);
  assert.match(ui, /Reviewed-row counts describe entered observations/);
  assert.match(ui, /reviewed antimicrobial input/);
});
