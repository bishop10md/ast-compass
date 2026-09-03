import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("privacy and terms are public routes with canonical metadata and footer access", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /privacy: "\/privacy"/);
  assert.match(app, /terms: "\/terms"/);
  assert.match(app, /Privacy Policy \| AST Compass/);
  assert.match(app, /Terms of Use \| AST Compass/);
  assert.match(app, /go\("privacy"\)/);
  assert.match(app, /go\("terms"\)/);
  assert.match(app, /go\("feedback"\)/);
});

test("legal pages preserve No-PHI and educational-use boundaries without guarantees", async () => {
  const legal = await readFile(new URL("../src/features/LegalPages.tsx", import.meta.url), "utf8");
  assert.match(legal, /DO NOT UPLOAD PROTECTED HEALTH INFORMATION/);
  assert.match(legal, /EDUCATIONAL USE ONLY/);
  assert.match(legal, /cannot guarantee detection of every identifier/i);
  assert.match(legal, /should not be considered a HIPAA-compliant system/);
  assert.doesNotMatch(legal, /100% secure|unhackable|guaranteed protection/i);
  assert.match(legal, /Governing-law and jurisdiction provisions will be established/);
});

test("unknown routes render an intentional noindex not-found state", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /\| "notFound"/);
  assert.match(app, /\|\| "notFound"/);
  assert.match(app, /Page not found\./);
  assert.match(app, /page === "notFound" \|\| page === "promo" \|\| page === "promoPhone" \? "noindex,follow" : "index,follow"/);
});
