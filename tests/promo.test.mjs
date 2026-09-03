import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("promo route is unlisted and uses an isolated synthetic fixture", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const promo = await readFile(new URL("../src/features/PromoExperience.tsx", import.meta.url), "utf8");
  assert.match(app, /promo: "\/promo"/);
  assert.match(app, /page === "promo" && <PromoExperience\/>/);
  const nav = app.slice(app.indexOf("const nav ="), app.indexOf("return <div", app.indexOf("const nav =")));
  assert.doesNotMatch(nav, /promo/i);
  assert.match(promo, /Synthetic educational examples only/);
  assert.match(promo, /Klebsiella pneumoniae group/);
  assert.match(promo, /KPC detected/);
  assert.match(promo, /DE-IDENTIFIED IMAGES ONLY/);
  assert.match(promo, /Not for patient-care decisions/);
  const imports = promo.slice(0, promo.indexOf("const sceneDurations"));
  assert.doesNotMatch(imports, /BreakpointEngine|BcidForecast|concordanceEngine|Supabase/i);
});

test("promo sequence has seven timed scenes and recording controls", async () => {
  const promo = await readFile(new URL("../src/features/PromoExperience.tsx", import.meta.url), "utf8");
  assert.match(promo, /\[2500, 3000, 5000, 4500, 4000, 3500, 3000\]/);
  assert.match(promo, /"Start Demo"/);
  assert.match(promo, />Restart Demo</);
  assert.match(promo, />Full Screen</);
  assert.equal((promo.match(/promo-scene /g) || []).length, 7);
});
