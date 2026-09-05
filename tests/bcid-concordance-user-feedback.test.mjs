import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("BCID scope identifies external manufacturer information without a summed target headline", () => {
  const bcid = read("src/features/BcidForecast.tsx");
  assert.doesNotMatch(bcid, /36 targets/i);
  assert.match(bcid, /26 bacterial organisms/);
  assert.match(bcid, /10 AMR markers/);
  assert.match(bcid, /publicly available BIOFIRE BCID2 panel information/);
  assert.match(bcid, /External manufacturer reference:/);
  assert.doesNotMatch(bcid, /our panel|AST Compass panel|our assay|AST Compass targets/i);
});

test("manual Molecular Concordance uses repeatable shared AST observations", () => {
  const app = read("src/App.tsx");
  const shared = read("src/components/ASTObservationList.tsx");
  const phenotype = read("src/features/PhenotypeMechanismAnalyzer.tsx");
  assert.match(app, /<ASTObservationList rows=\{rows\}/);
  assert.match(phenotype, /<ASTObservationList rows=\{rows as ASTObservationInput\[\]\}/);
  assert.match(shared, /\+ Add antimicrobial/);
  assert.match(shared, /MIC \/ zone <small>optional<\/small>/);
  assert.match(shared, /"S", "I", "R", "SDD", "NS", "Unknown"/);
  assert.match(shared, /Each antimicrobial may be entered only once/);
  assert.match(shared, /aria-label=\{`Antimicrobial result \$\{index \+ 1\}`\}/);
});

test("Concordance evaluates every reviewed row and presents conservative pattern results", () => {
  const app = read("src/App.tsx");
  const engine = read("src/features/concordanceEngine.ts");
  assert.match(engine, /return rows\.map\(\(row\) =>/);
  assert.match(app, /reviewed\.map\(\(row\) =>/);
  assert.match(app, /"Concordant" \| "Potentially discordant" \| "Cannot infer" \| "Not evaluable"/);
  assert.match(app, /Largely concordant with the detected \$\{marker\} marker/);
  assert.match(app, /does not confirm that the marker caused the observed pattern/);
  assert.match(app, /result\.forecast\.sourceIds\.map/);
});

test("multi-row entry is bounded and stacks without horizontal overflow on mobile", () => {
  const shared = read("src/components/ASTObservationList.tsx");
  const css = read("src/concordance.css");
  assert.match(shared, /maxRows = 20/);
  assert.match(css, /@media\(max-width:760px\)[^{]*\{[^}]*\.concordance-context,\.concordance-counts\{grid-template-columns:1fr 1fr\}\.ast-observation-row\{grid-template-columns:1fr\}/);
  assert.match(css, /@media\(max-width:380px\)\{\.concordance-context,\.concordance-counts\{grid-template-columns:1fr\}\}/);
});

