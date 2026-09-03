import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public account functionality is centrally disabled while architecture remains", () => {
  assert.match(read("src/config/features.ts"), /ACCOUNT_FEATURES_ENABLED\s*=\s*false/);
  assert.match(read("src/App.tsx"), /!ACCOUNT_FEATURES_ENABLED && accountPages\.has/);
  assert.match(read("src/App.tsx"), /ACCOUNT_FEATURES_ENABLED && \(auth\.user/);
  assert.match(read("src/auth/AuthContext.tsx"), /if \(!ACCOUNT_FEATURES_ENABLED\)/);
  assert.match(read("src/services/analysisService.ts"), /saveBcidForecast/);
  assert.match(read("supabase/migrations/20260901_private_workspace.sql"), /enable row level security/i);
});

test("public analyses are session-only and account-free", () => {
  const message = "This analysis is processed for the current session and is not added to a persistent personal history.";
  assert.ok(read("src/features/BcidForecast.tsx").includes(message));
  assert.ok(read("src/features/ImageConcordanceAnalyzer.tsx").includes(message));
  assert.match(read("src/features/Feedback.tsx"), /accountStatus:signedIn\?"Authenticated":"Public session"/);
});

test("legal pages describe current public access and future accounts", () => {
  const legal = read("src/features/LegalPages.tsx");
  assert.match(legal, /currently works without an account/i);
  assert.match(legal, /may be enabled in the future after validation/i);
  assert.match(legal, /Public image analysis is session-only/i);
});
