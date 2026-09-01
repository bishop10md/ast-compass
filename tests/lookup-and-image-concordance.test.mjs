import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { filterSearchOptions, sortAlphabetically } from "../src/utils/search-core.mjs";
import { parseMeasurement } from "../src/features/measurement-core.mjs";

test("alphabetical sorting is case-insensitive and does not mutate input", () => {
  const source = [{ label: "vanA/B" }, { label: "CTX-M" }, { label: "mecA/C" }];
  assert.deepEqual(sortAlphabetically(source, (item) => item.label).map((item) => item.label), ["CTX-M", "mecA/C", "vanA/B"]);
  assert.equal(source[0].label, "vanA/B");
});

test("search finds scientific names, aliases, and descriptions", () => {
  const options = [{ value: "ecoli", label: "Escherichia coli", aliases: ["E. coli"], description: "Enterobacterales" }];
  assert.equal(filterSearchOptions(options, "e coli").length, 1);
  assert.equal(filterSearchOptions(options, "enterobacterales").length, 1);
});

test("MIC operators are preserved and parsed", () => {
  assert.deepEqual(parseMeasurement("<= 1"), { operator: "<=", value: 1 });
  assert.deepEqual(parseMeasurement("≥64"), { operator: ">=", value: 64 });
  assert.deepEqual(parseMeasurement("no value"), {});
});

test("image workflow keeps the PHI gate and human confirmation contract", async () => {
  const source = await readFile(new URL("../src/features/ImageConcordanceAnalyzer.tsx", import.meta.url), "utf8");
  assert.match(source, /contains no PHI/);
  assert.match(source, /disabled=\{!phiAcknowledged\}/);
  assert.match(source, /Human confirmation required/);
  assert.match(source, /session/);
  assert.match(source, /image\/jpeg,image\/png,image\/webp/);
});

test("BCID2 panel definition contains the complete 43-target manufacturer menu", async () => {
  const source = await readFile(new URL("../src/data/bcid2Panel.ts", import.meta.url), "utf8");
  const organismRows = source.match(/^  target\(.*$/gm) || [];
  const markerRows = source.match(/^  marker\(/gm) || [];
  assert.equal(organismRows.length, 33);
  assert.equal(organismRows.filter((row) => row.includes('"Gram-negative bacteria"')).length, 15);
  assert.equal(organismRows.filter((row) => row.includes('"Gram-positive bacteria"')).length, 11);
  assert.equal(organismRows.filter((row) => row.includes('"Yeast"')).length, 7);
  assert.equal(markerRows.length, 10);
  assert.match(source, /totalTargets: 43/);
  assert.match(source, /bacterialTargets: 26/);
  assert.match(source, /yeastTargets: 7/);
  assert.match(source, /resistanceTargets: 10/);
});

test("BCID2 group hierarchy and five distinct carbapenemases are preserved", async () => {
  const source = await readFile(new URL("../src/data/bcid2Panel.ts", import.meta.url), "utf8");
  for (const parent of ["enterobacterales", "staphylococcus-spp", "streptococcus-spp"]) assert.match(source, new RegExp('"' + parent + '"'));
  for (const marker of ["IMP", "KPC", "NDM", "OXA-48-like", "VIM"]) assert.match(source, new RegExp('"' + marker + '"'));
  assert.match(source, /Metallo-beta-lactamase/);
  assert.match(source, /Serine carbapenemase/);
});

test("BCID workflow uses panel targets and keeps conservative result boundaries", async () => {
  const source = await readFile(new URL("../src/features/BcidForecast.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/concordance.css", import.meta.url), "utf8");
  assert.match(source, /bcid2Panel\.targets\.map/);
  assert.doesNotMatch(source, /new Set\(bcidForecasts\.map/);
  assert.match(source, /Absence of a panel marker does not establish susceptibility/);
  assert.match(source, /No antifungal resistance marker is included/);
  assert.match(source, /No reviewed organism–marker forecast is currently available/);
  assert.match(source, /GENE-TO-ORGANISM ATTRIBUTION CAUTION/);
  const forecastLookup = source.slice(source.indexOf("function forecastsFor"), source.indexOf("export default function"));
  assert.ok(forecastLookup.indexOf("const exact = bcidForecasts.filter") < forecastLookup.indexOf("if (target.parentId)"));
  assert.match(css, /@media\(max-width:760px\).*bcid-workflow\{grid-template-columns:1fr\}/s);
});

