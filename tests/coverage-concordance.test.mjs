import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as search from "../src/utils/search-core.mjs";
import * as measurement from "../src/features/measurement-core.mjs";

// Execute the real data and functions, not copied scientific fixtures. The
// in-memory CommonJS wrapper only provides the imports TypeScript emits.
function loadTs(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  const require = (specifier) => {
    if (!(specifier in dependencies)) throw new Error(`Unmapped test import: ${path}: ${specifier}`);
    return dependencies[specifier];
  };
  new Function("require", "module", "exports", compiled)(require, module, module.exports);
  return module.exports;
}

const breakpoints = loadTs("../src/data/breakpoints.ts");
const drugs = loadTs("../src/data/antibiotics.ts", { "./breakpoints": breakpoints });
const organismData = loadTs("../src/data/organisms.ts");
const forecasts = loadTs("../src/data/bcidForecasts.ts");
const data = {
  ...drugs,
  ...organismData,
  ...forecasts,
  ...loadTs("../src/data/genes.ts"),
  ...loadTs("../src/data/mechanisms.ts"),
};
const relationships = loadTs("../src/data/concordanceRelationships.ts", { "./bcidForecasts": forecasts, "./organisms": organismData });
const existing = loadTs("../src/features/concordanceEngine.ts", {
  "../data": data,
  "../data/antibiotics": drugs,
  "../data/concordanceRelationships": relationships,
  "../utils/search": search,
  "./measurement-core.mjs": measurement,
});
const coverage = loadTs("../src/features/coverageConcordance.ts", {
  "../data/concordanceRelationships": relationships,
  "../data/antibiotics": drugs,
  "../data/bcidForecasts": forecasts,
  "../data/organisms": organismData,
  "../utils/search": search,
  "./concordanceEngine": existing,
});
const row = (antimicrobial, category = "R") => ({ id: `${antimicrobial}-${category}`, antimicrobial, category, measurement: "<=1", confidence: "High" });

test("coverage admission preserves existing canonical results in explicitly mapped contexts", () => {
  for (const [organism, marker, drug] of [
    ["ecoli", "CTX-M", "Ceftriaxone"],
    ["ecoli", "CTX-M", "Meropenem"],
    ["kpneumo", "KPC", "Meropenem"],
    ["pseudomonas", "VIM", "Meropenem"],
    ["efaecalis", "vanA/B", "Vancomycin"],
    ["efaecium", "vanA/B", "Vancomycin"],
    ["cons", "mecA/C", "Oxacillin"],
    ["staph_aureus", "mecA/C and MREJ (MRSA)", "Oxacillin"],
  ]) {
    for (const category of ["S", "R", "I", "SDD", "NS", "Unknown"]) {
      const rows = [row(drug, category)];
      assert.deepEqual(coverage.analyzeConcordance(organism, marker, rows), existing.analyzeConcordance(organism, marker, rows), `${organism}/${marker}/${drug}/${category}`);
    }
  }
});

test("new reference-only and unknown organism contexts cannot inherit marker-wide forecasts", () => {
  for (const organism of ["reference-only-aeromonas-caviae", "organism-not-in-catalog", ""]) {
    const result = coverage.analyzeConcordance(organism, "CTX-M", [row("Ceftriaxone")])[0];
    assert.equal(result.assessment, "Cannot infer");
    assert.equal(result.rationale, coverage.NO_CONCORDANCE_RULE_MESSAGE);
    assert.equal(result.forecast, undefined);
  }
});

test("recognized but incompatible organism-marker pairs fail closed in both entry points", () => {
  for (const [organism, marker] of [["staph_aureus", "CTX-M"], ["ecoli", "VIM"], ["cons", "mecA/C and MREJ (MRSA)"], ["listeria", "KPC"], ["pseudomonas", "vanA/B"]]) {
    assert.equal(coverage.hasConcordanceContext(organism, marker), false);
    const result = coverage.analyzeConcordance(organism, marker, [row("Meropenem")])[0];
    assert.equal(result.assessment, "Cannot infer");
    assert.equal(result.forecast, undefined);
  }
  // SCI-03 removes the legacy fallback rather than merely containing it.
  assert.equal(existing.analyzeConcordance("staph_aureus", "CTX-M", [row("Ceftriaxone")])[0].assessment, "Cannot infer");
});

test("recognized exact aliases delegate with canonical drug names and keep measurements/categories", () => {
  for (const [alias, canonical] of [["CRO", "Ceftriaxone"], ["CTX", "Cefotaxime"], ["MEM", "Meropenem"], ["CAZ", "Ceftazidime"], ["SXT", "Trimethoprim-sulfamethoxazole"]]) {
    const input = row(alias);
    const actual = coverage.analyzeConcordance("ecoli", "CTX-M", [input]);
    assert.deepEqual(actual, existing.analyzeConcordance("ecoli", "CTX-M", [{ ...input, antimicrobial: canonical }]));
    assert.equal(input.antimicrobial, alias, "input is not mutated");
  }
});

test("inhibitor combinations never borrow parent-drug or class-level forecasts", () => {
  const combinationIds = ["amox_clav", "amp_sulb", "pip_tazo", "mero_vabor", "caz_avi", "cef_tol_tazo", "imi_rel"];
  const combinations = drugs.canonicalAntimicrobials.filter((drug) => combinationIds.includes(drug.id));
  assert.equal(combinations.length, combinationIds.length);
  for (const drug of combinations) {
    for (const alias of new Set([drug.displayName, drug.abbreviation, ...drug.aliases])) {
      assert.equal(drugs.resolveAntimicrobial(alias)?.id, drug.id);
      for (const marker of ["KPC", "CTX-M", "NDM"]) {
        for (const category of ["S", "R"]) {
          const result = coverage.analyzeConcordance("ecoli", marker, [row(alias, category)])[0];
          assert.equal(result.assessment, "Cannot infer", `${marker}/${alias}/${category}`);
          assert.equal(result.rationale, coverage.NO_CONCORDANCE_RULE_MESSAGE);
          assert.equal(result.forecast, undefined);
          assert.match(result.troubleshooting[0], /full beta-lactam\/inhibitor combination/);
        }
      }
    }
  }
  // A true single-agent input remains distinct from its inhibitor combination.
  assert.deepEqual(coverage.analyzeConcordance("ecoli", "KPC", [row("MEM")]), existing.analyzeConcordance("ecoli", "KPC", [{ ...row("MEM"), antimicrobial: "Meropenem" }]));
});

test("ambiguous and unknown drug strings never become inferred class matches", () => {
  const ambiguous = coverage.analyzeConcordance("ecoli", "CTX-M", [row("CFZ")])[0];
  assert.equal(ambiguous.assessment, "Cannot infer");
  assert.match(ambiguous.rationale, /ambiguous/);
  assert.equal(ambiguous.forecast, undefined);
  for (const name of ["Novel-unmapped-cephalosporin", "ceftriaxne", "", "carbapenems"]) {
    const result = coverage.analyzeConcordance("ecoli", "CTX-M", [row(name)])[0];
    assert.equal(result.assessment, "Cannot infer");
    assert.match(result.rationale, /not recognized/);
    assert.equal(result.forecast, undefined);
  }
});

test("mixed supported/unsupported input retains row identity/order and never fabricates rows", () => {
  const rows = [row("CRO"), row("CFZ"), row("Not a drug"), row("MEM", "S")];
  const results = coverage.analyzeConcordance("ecoli", "CTX-M", rows);
  assert.equal(results.length, rows.length);
  assert.deepEqual(results.map((result) => result.id), rows.map((item) => item.id));
  assert.equal(results[1].assessment, "Cannot infer");
  assert.equal(results[2].assessment, "Cannot infer");
  assert.deepEqual(coverage.analyzeConcordance("ecoli", "CTX-M", []), []);
  assert.equal(coverage.hasConcordanceContext("ecoli", "unknown-marker"), false);
});
