import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("nested Image Concordance and AST Detective routes have unique metadata", () => {
  const app = read("src/App.tsx");
  assert.match(app, /imageConcordance: \["Image Concordance Analyzer \| AST Compass"/);
  assert.match(app, /detective: \["AST Detective \| Microbiology Learning Game"/);
});

test("primary navigation uses semantic links with real hrefs and current-page state", () => {
  const app = read("src/App.tsx");
  assert.match(app, /<nav aria-label="Primary navigation"[^>]*>\{nav\.map\(\(\[id, label\]\) => <a/);
  assert.match(app, /href=\{routes\[id\]\}/);
  assert.match(app, /aria-current=\{activeNavPage === id \? "page"/);
});

test("Image Concordance review controls wait for extraction or Manual Entry", () => {
  const image = read("src/features/ImageConcordanceAnalyzer.tsx");
  assert.match(image, /useState<AstResultRow\[]>\(\[\]\)/);
  assert.match(image, /\(workflow==="manual"\|\|rows\.length>0\)&&<>/);
  assert.match(image, /setWorkflow\("manual"\);if\(!rows\.length\)setRows\(\[emptyRow\(\)\]\)/);
});

test("privacy account language remains explicitly conditional", () => {
  const legal = read("src/features/LegalPages.tsx");
  assert.match(legal, /If optional account functionality is enabled in the future, this information may be associated/);
  assert.match(legal, /If optional accounts are enabled in the future, authenticate users/);
  assert.match(legal, /If optional account functionality is enabled in the future, account deletion should/);
  assert.doesNotMatch(legal, /For registered users, this may be associated/);
});

test("Netlify badge-injection plugin is removed", () => {
  assert.doesNotMatch(read("vite.config.mjs"), /sites-vite-plugin|sites\(\)/);
  assert.doesNotMatch(read("package.json"), /sites-vite-plugin/);
  assert.doesNotMatch(read("pnpm-lock.yaml"), /sites-vite-plugin/);
});

test("homepage secondary tools do not duplicate general Concordance", () => {
  const app = read("src/App.tsx");
  const homeStart = app.indexOf("function Home");
  const resistanceStart = app.indexOf("function ResistanceHub");
  const home = app.slice(homeStart, resistanceStart);
  const secondary = home.slice(home.indexOf("const secondary"), home.indexOf("const openExample"));
  assert.doesNotMatch(secondary, /\["Concordance"/);
  assert.match(secondary, /\["Image Concordance"/);
});

test("heavy image, account, and promotional modules are route-lazy-loaded", () => {
  const app = read("src/App.tsx");
  for (const module of ["ImageConcordanceAnalyzer", "AccountWorkspace", "PromoExperience", "PromoPhone"]) {
    assert.match(app, new RegExp(`lazy\\(\\(\\) => import\\(\\"\\./features/${module}`));
  }
  assert.match(app, /<Suspense fallback=/);
});
