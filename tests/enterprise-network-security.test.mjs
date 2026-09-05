import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { validateAstImageFile } from "../src/security/image-validation-core.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const fakeFile = (name, type, bytes, size = bytes.length) => ({ name, type, size, arrayBuffer: () => bytes.buffer, slice: (start, end) => new Blob([bytes.slice(start, end)]) });

test("browser runtime has no public CDN or Google Fonts dependency", () => {
  const source = [read("src/lib/supabase.ts"), read("src/lib/ocr.ts"), read("src/styles.css"), read("src/features/ImageConcordanceAnalyzer.tsx"), read("src/features/PhenotypeMechanismAnalyzer.tsx")].join("\n");
  assert.doesNotMatch(source, /cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|tessdata\.projectnaptha\.com/);
  assert.match(read("scripts/postbuild.mjs"), /dist\/ocr\/worker\.min\.js/);
});

test("CSP is narrow and optional telemetry remains optional", () => {
  const config = read("netlify.toml");
  assert.match(config, /script-src 'self' 'wasm-unsafe-eval';/);
  assert.doesNotMatch(config, /script-src [^;]*\*/);
  assert.doesNotMatch(config, /connect-src [^;]* \*/);
  assert.doesNotMatch(config, /script-src [^;]*'unsafe-eval'/);
  assert.match(config, /object-src 'none'/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(read("src/lib/telemetry.ts"), /\.catch\(\(\) => undefined\)/);
});

test("image validator accepts genuine signatures and rejects spoofed files", async () => {
  assert.equal((await validateAstImageFile(fakeFile("ast.jpg", "image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0x00])))).valid, true);
  assert.equal((await validateAstImageFile(fakeFile("ast.png", "image/png", Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))).valid, true);
  assert.equal((await validateAstImageFile(fakeFile("malware.jpg", "image/jpeg", new TextEncoder().encode("MZ executable")))).reason, "signature");
  assert.equal((await validateAstImageFile(fakeFile("vector.svg", "image/svg+xml", new TextEncoder().encode("<svg>")))).reason, "format");
  assert.equal((await validateAstImageFile(fakeFile("image.jpg.exe", "image/jpeg", Uint8Array.from([0xff,0xd8,0xff])))).reason, "format");
});

test("unused public AI endpoint is removed and trust artifacts exist", () => {
  assert.equal(existsSync(new URL("../netlify/functions/science-assistant.mjs", import.meta.url)), false);
  assert.match(read("public/.well-known/security.txt"), /Contact: https:\/\/astcompass\.com\/feedback/);
  assert.match(read("src/features/TrustPage.tsx"), /No-PHI policy/);
});

test("restricted local storage cannot block AST Detective or Learning Center", () => {
  assert.match(read("src/App.tsx"), /Restricted storage must not block educational use/);
  assert.match(read("src/features/LearningCenter.tsx"), /Progress remains available for this session/);
});
