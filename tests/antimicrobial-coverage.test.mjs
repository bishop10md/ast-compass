import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const moduleCache = new Map();
async function load(path) {
  if (moduleCache.has(path)) return moduleCache.get(path);
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  let compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  for (const match of [...compiled.matchAll(/from "(\.\/[^\"]+)"/g)]) {
    const childPath = `${path.slice(0, path.lastIndexOf("/") + 1)}${match[1].slice(2)}.ts`;
    const dependency = await load(childPath);
    compiled = compiled.replace(match[0], `from "${dependency.url}"`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
  const result = { url, exports: await import(url) };
  moduleCache.set(path, result);
  return result;
}

const { antibiotics, canonicalAntimicrobials, findAntimicrobialMatches, resolveAntimicrobial } = (await load("src/data/antibiotics.ts")).exports;
const { requiredAntimicrobialIds, antimicrobialCoverage } = (await load("src/data/antimicrobialCoverage.ts")).exports;
const required = [
  ["penicillin", "Penicillin", "PEN"], ["ampicillin", "Ampicillin", "AMP"],
  ["amp_sulb", "Ampicillin-sulbactam", "SAM"], ["pip_tazo", "Piperacillin-tazobactam", "TZP"],
  ["cefazolin", "Cefazolin", "CFZ"], ["cefoxitin", "Cefoxitin", "FOX"],
  ["cefuroxime", "Cefuroxime", "CXM"], ["cefotaxime", "Cefotaxime", "CTX"],
  ["ceftazidime", "Ceftazidime", "CAZ"], ["ceftriaxone", "Ceftriaxone", "CRO"],
  ["cefepime", "Cefepime", "FEP"], ["aztreonam", "Aztreonam", "ATM"],
  ["ertapenem", "Ertapenem", "ETP"], ["meropenem", "Meropenem", "MEM"],
  ["mero_vabor", "Meropenem-vaborbactam", "MEV"], ["caz_avi", "Ceftazidime-avibactam", "CZA"],
  ["cef_tol_tazo", "Ceftolozane-tazobactam", "C/T"], ["amikacin", "Amikacin", "AMK"],
  ["gentamicin", "Gentamicin", "GEN"], ["tobramycin", "Tobramycin", "TOB"],
  ["ciprofloxacin", "Ciprofloxacin", "CIP"], ["levofloxacin", "Levofloxacin", "LVX"],
  ["trim_sulfa", "Trimethoprim-sulfamethoxazole", "SXT"], ["tigecycline", "Tigecycline", "TGC"],
];

test("all 24 required drugs retain one canonical identity, full name, and correct abbreviation", () => {
  assert.equal(requiredAntimicrobialIds.length, 24);
  for (const [id, displayName, abbreviation] of required) {
    assert.ok(requiredAntimicrobialIds.includes(id));
    assert.equal(canonicalAntimicrobials.filter((drug) => drug.id === id).length, 1);
    assert.equal(resolveAntimicrobial(displayName)?.id, id);
    assert.equal(resolveAntimicrobial(abbreviation, "Bacteria")?.id, id);
    assert.equal(resolveAntimicrobial(id)?.displayName, displayName);
  }
});

test("canonical catalog is alphabetized and deduplicated while legacy scientific entries remain intact", () => {
  assert.equal(antibiotics.length, 73);
  assert.equal(canonicalAntimicrobials.length, 72);
  assert.equal(new Set(canonicalAntimicrobials.map((drug) => drug.id)).size, canonicalAntimicrobials.length);
  assert.equal(new Set(canonicalAntimicrobials.map((drug) => drug.displayName.toLowerCase())).size, canonicalAntimicrobials.length);
  const names = canonicalAntimicrobials.map((drug) => drug.displayName);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  assert.equal(antibiotics.find((drug) => drug.id === "cefoxitin").name, "Cefoxitin screen");
  assert.deepEqual(antibiotics.find((drug) => drug.id === "clindamycin").domains, ["Bacteria"]);
  assert.deepEqual(antibiotics.find((drug) => drug.id === "clinda_ana").domains, ["Anaerobes"]);
  assert.equal(resolveAntimicrobial("clinda_ana")?.id, "clindamycin");
  assert.equal(resolveAntimicrobial("Clindamycin (anaerobes)")?.id, "clindamycin");
});

test("aliases normalize separators and historical naming without fuzzy or constituent-drug substitution", () => {
  for (const alias of ["TMP/SMX", "co-trimoxazole", "Trimethoprim and sulfamethoxazole"]) assert.equal(resolveAntimicrobial(alias)?.id, "trim_sulfa");
  for (const alias of ["C/T", "C-T", "Ceftolozane/tazobactam", "Ceftolozane–tazobactam"]) assert.equal(resolveAntimicrobial(alias)?.id, "cef_tol_tazo");
  assert.equal(resolveAntimicrobial("CAZ/AVI")?.id, "caz_avi");
  assert.equal(resolveAntimicrobial("MEM/VAB")?.id, "mero_vabor");
  assert.equal(resolveAntimicrobial("Cefoxitin screen")?.id, "cefoxitin");
  assert.equal(resolveAntimicrobial("Benzylpenicillin")?.id, "penicillin");
  for (const unknown of ["", "unknown drug", "cef", "Ceftriaxone 1 S", "avibactam", "CTX-M", "tazobactam"]) assert.equal(resolveAntimicrobial(unknown), undefined);
});

test("ambiguous CFZ requires full name or domain instead of choosing the wrong drug", () => {
  assert.deepEqual(findAntimicrobialMatches("CFZ").map((drug) => drug.id).sort(), ["cefazolin", "clofazimine"]);
  assert.equal(resolveAntimicrobial("CFZ"), undefined);
  assert.equal(resolveAntimicrobial("CFZ", "Bacteria")?.id, "cefazolin");
  assert.equal(resolveAntimicrobial("CFZ", "Mycobacteria")?.id, "clofazimine");
  assert.equal(resolveAntimicrobial("CFZ", "Yeast"), undefined);
});

test("recognition metadata remains Draft and cannot create authoritative or numeric breakpoints", () => {
  for (const drug of canonicalAntimicrobials) {
    assert.equal(drug.reviewStatus, "Draft");
    assert.equal(drug.breakpointAvailability, "PENDING AUTHORITATIVE SOURCE REVIEW");
    assert.ok(drug.sourceIds.length > 0);
    for (const field of ["susceptible", "intermediate", "resistant", "susceptibleMax", "resistantMin"]) assert.equal(Object.hasOwn(drug, field), false);
  }
  for (const coverage of antimicrobialCoverage) {
    assert.deepEqual(coverage.authoritativeBreakpointRecordIds, []);
    assert.equal(coverage.reviewStatus, "Draft");
  }
  assert.ok(antimicrobialCoverage.find((entry) => entry.antimicrobialId === "ceftriaxone").teachingBreakpointRecordIds.includes("bp-ecoli-cro"));
  const unsupported = antimicrobialCoverage.find((entry) => entry.antimicrobialId === "mero_vabor");
  assert.deepEqual(unsupported.teachingBreakpointRecordIds, []);
  assert.deepEqual(unsupported.educationalOrganismContexts, []);
});
