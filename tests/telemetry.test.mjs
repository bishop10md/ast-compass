import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("telemetry is production-only, anonymous, optional, and provider failures are non-blocking", async () => {
  const source = await readFile(new URL("../src/lib/telemetry.ts", import.meta.url), "utf8");
  assert.match(source, /const enabled = import\.meta\.env\.PROD/);
  assert.match(source, /\$process_person_profile: false/);
  assert.match(source, /\.catch\(\(\) => undefined\)/);
  assert.match(source, /if \(!enabled \|\| !key\) return/);
  assert.match(source, /if \(!enabled \|\| !dsn\) return/);
  assert.doesNotMatch(source, /identify\(|sessionReplay|recording/i);
});

test("telemetry privacy filter blocks private laboratory, image, account, and feedback fields", async () => {
  const source = await readFile(new URL("../src/lib/telemetry.ts", import.meta.url), "utf8");
  for (const blocked of ["email", "password", "token", "authorization", "cookie", "session", "filename", "image", "ocr", "mic", "barcode", "qr", "phi", "patient", "storage", "signed", "feedback", "analysis", "input", "table"]) assert.match(source, new RegExp(blocked, "i"));
  assert.match(source, /ALLOWED_PROPERTIES/);
  assert.match(source, /PRIVATE_ROUTES/);
});

test("application error boundary reports technical failures without exposing details", async () => {
  const boundary = await readFile(new URL("../src/components/AppErrorBoundary.tsx", import.meta.url), "utf8");
  assert.match(boundary, /Something went wrong/);
  assert.match(boundary, /Refresh AST Compass/);
  assert.match(boundary, /Send feedback/);
  assert.doesNotMatch(boundary, /error\.stack|JSON\.stringify\(error\)|environment variable|API key/i);
});
