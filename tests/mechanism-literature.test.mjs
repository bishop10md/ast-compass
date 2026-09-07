import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/App.tsx");
const metadata = read("src/data/mechanismLiterature.ts");
const page = read("src/features/MechanismDetailPage.tsx");
const sitemap = read("public/sitemap.xml");

const ids = ["esbl", "ampc", "serine_carb", "mbl", "pbp2a", "van_target", "mlsb", "aminoglycoside", "quinolone", "polymyxin"];

test("every mechanism card opens a dedicated detail route", () => {
  assert.match(app, /className="mechanism-card"/);
  assert.match(app, /Explore mechanism/);
  assert.match(app, /Typical phenotype \/ important pattern/);
  assert.match(app, /mechanism-family/);
  assert.match(app, /page === "mechanism"/);
  assert.match(app, /MechanismDetailPage/);
});

test("every mechanism has literature metadata and a sitemap route", () => {
  for (const id of ids) {
    assert.match(metadata, new RegExp(`mechanismId: "${id}"`));
    assert.ok(sitemap.includes(`/resistance/mechanisms/${id.replaceAll("_", "-")}</loc>`));
  }
});

test("mechanism pages retain scientific limits and source provenance", () => {
  assert.match(page, /Scientific content status: Demo/);
  assert.match(page, /Mechanism is not category/);
  assert.match(page, /does not generate an MIC/);
  assert.match(page, /source\.url/);
  assert.match(page, /Inclusion does not mean AST Compass content has completed independent expert review/);
});
