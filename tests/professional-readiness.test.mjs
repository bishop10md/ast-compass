import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("search dialog has keyboard trap, Escape close, and focus restoration", () => {
  const app = read("src/App.tsx");
  assert.match(app, /event\.key !== "Tab"/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /\.search-button"\)\?\.focus/);
  assert.match(app, /aria-modal="true"/);
});

test("password recovery completion uses provider-supported updateUser", () => {
  assert.match(read("src/auth/AuthContext.tsx"), /auth\.updateUser\(\{ password \}\)/);
  assert.match(read("src/App.tsx"), /recover-account/);
  assert.match(read("src/features/AccountWorkspace.tsx"), /Set a new password/);
});

test("permanent image persistence fails closed pending server gate", () => {
  assert.match(read("src/services/imageService.ts"), /Permanent image saving is unavailable/);
  assert.match(read("src/features/ImageConcordanceAnalyzer.tsx"), /Client-side screening cannot authorize permanent storage/);
  assert.match(read("src/security/phiServerGate.ts"), /Server-side PHI screening is not configured/);
});

test("scientific version values are centralized without changing breakpoint code", () => {
  const version = read("src/config/version.ts");
  assert.match(version, /APP_VERSION/);
  assert.match(version, /BCID_ENGINE_VERSION/);
  assert.match(version, /CONCORDANCE_ENGINE_VERSION/);
  assert.match(version, /CONTENT_SCHEMA_VERSION/);
});

test("unknown routes intentionally render a noindex 404", () => {
  const app = read("src/App.tsx");
  assert.match(app, /Page not found/);
  assert.match(app, /page === "notFound"[^?]+\? "noindex,follow"/);
});

test("telemetry source rejects sensitive property names", () => {
  const telemetry = read("src/lib/telemetry.ts");
  for (const term of ["phi", "patient", "ocr", "mic", "password", "token", "feedback", "image"]) assert.match(telemetry, new RegExp(term, "i"));
  assert.match(telemetry, /ALLOWED_PROPERTIES/);
  assert.match(telemetry, /\$process_person_profile: false/);
});
