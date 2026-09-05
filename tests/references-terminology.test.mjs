import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("reference library uses References throughout shared navigation", () => {
  const app = read("src/App.tsx");
  assert.match(app, /const nav = \[\["home", "Home"\], \["breakpoints", "Breakpoints"\], \["resistance", "Mechanisms"\], \["concordance", "Concordance"\], \["bcid", "BCID"\], \["learn", "Learn"\], \["references", "References"\], \["about", "About"\]\]/);
  assert.doesNotMatch(app, /\["references", "Evidence"\]/);
  assert.doesNotMatch(app, /Evidence & Sources/);
});

test("References route, heading, and SEO metadata remain canonical", () => {
  const app = read("src/App.tsx");
  assert.match(app, /references: "\/references"/);
  assert.match(app, /title="References" text="Scientific sources supporting AST Compass educational content\."/);
  assert.match(app, /references: \["AST Compass References", "Scientific references and source documentation supporting AST Compass educational content on antimicrobial susceptibility testing, resistance mechanisms, BCID markers, and gene–phenotype relationships\."\]/);
  assert.doesNotMatch(app, /"\/evidence"/);
});

test("global search supports References and the Evidence alias", () => {
  const app = read("src/App.tsx");
  assert.match(app, /group: "References", title: "References", subtitle: "Scientific evidence and source documentation supporting AST Compass educational content\."/);
});

