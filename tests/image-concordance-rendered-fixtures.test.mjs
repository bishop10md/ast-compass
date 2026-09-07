import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  renderedImageConcordanceScenarios,
  renderedScenarioById,
  renderImageConcordanceFixtureSvg,
} from "./fixtures/rendered-image-concordance-fixtures.mjs";

const count = (text, pattern) => [...text.matchAll(pattern)].length;
const escapeXml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

test("rendered fixtures cover every required capture and table-layout scenario", () => {
  const requiredTags = [
    "clean_screenshot",
    "phone_photo_simulation",
    "rotation",
    "skew",
    "low_contrast",
    "small_text",
    "row_count_20",
    "row_count_30",
    "row_count_40",
    "mic_operators",
    "multiple_columns",
    "repeated_headers",
    "poor_quality",
    "partial_crop",
  ];
  const availableTags = new Set(renderedImageConcordanceScenarios.flatMap((fixture) => fixture.tags));
  for (const tag of requiredTags) assert.ok(availableTags.has(tag), `missing rendered scenario tag: ${tag}`);

  assert.equal(renderedScenarioById("clean-screen-5").rowCount, 5);
  assert.equal(renderedScenarioById("handheld-capture-10").phonePhotoSimulation, true);
  assert.ok(renderedScenarioById("slight-rotation-skew-10").rotationDegrees > 0);
  assert.ok(renderedScenarioById("slight-rotation-skew-10").skewDegrees > 0);
  assert.ok(renderedScenarioById("low-contrast-10").contentOpacity < 1);
  assert.ok(renderedScenarioById("small-text-20").fontSize <= 10);
  assert.equal(renderedScenarioById("poor-quality-10").qualityExpectation, "POOR");
});

test("dedicated rendered reports contain exactly 20, 30, and 40 unique rows", () => {
  for (const rowCount of [20, 30, 40]) {
    const fixture = renderedScenarioById(`long-report-${rowCount}`);
    assert.equal(fixture.rowCount, rowCount);
    assert.equal(fixture.rows.length, rowCount);
    assert.equal(new Set(fixture.rows.map((row) => row.label)).size, rowCount);
    const svg = renderImageConcordanceFixtureSvg(fixture);
    assert.equal(count(svg, /data-role="drug"/g), rowCount);
    assert.equal(count(svg, /data-role="mic"/g), rowCount);
    assert.equal(count(svg, /data-role="category"/g), rowCount);
  }
});

test("MIC-operator fixture preserves ASCII and Unicode comparison operators", () => {
  const fixture = renderedScenarioById("mic-operators-10");
  const expectedTokens = ["<0.25", "≤0.5", "=1", ">4", "≥8", "<=0.125", ">=64"];
  for (const token of expectedTokens) {
    assert.ok(fixture.rows.some((row) => row.mic === token), `missing MIC token ${token}`);
  }

  const svg = renderImageConcordanceFixtureSvg(fixture);
  for (const token of expectedTokens) assert.ok(svg.includes(`>${escapeXml(token)}</text>`), `rendered SVG missing ${token}`);
  assert.match(svg, /&lt;0\.25/);
  assert.match(svg, /&lt;=0\.125/);
  assert.match(svg, /&gt;=64/);
});

test("multiple-column fixture renders all rows once and repeats each table header", () => {
  const fixture = renderedScenarioById("repeated-columns-30");
  const svg = renderImageConcordanceFixtureSvg(fixture);
  assert.equal(fixture.columnGroups, 2);
  assert.equal(fixture.repeatedHeaders, true);
  assert.equal(count(svg, /data-role="table-group"/g), 2);
  assert.equal(count(svg, /data-role="header-drug"/g), 2);
  assert.equal(count(svg, /data-role="header-mic"/g), 2);
  assert.equal(count(svg, /data-role="header-category"/g), 2);
  assert.equal(count(svg, /data-role="drug"/g), 30);
  for (let row = 1; row <= 30; row += 1) assert.equal(count(svg, new RegExp(`data-row="${row}"`, "g")), 3);
});

test("rotation, skew, capture softness, poor quality, and partial crop are encoded visually and in metadata", () => {
  const capture = renderedScenarioById("handheld-capture-10");
  const captureSvg = renderImageConcordanceFixtureSvg(capture);
  assert.match(captureSvg, /linearGradient id="capture-light"/);
  assert.match(captureSvg, /feGaussianBlur stdDeviation="0\.35"/);
  assert.match(captureSvg, /rotate\(1\.4 /);
  assert.match(captureSvg, /skewX\(0\.8\)/);

  const rotated = renderedScenarioById("slight-rotation-skew-10");
  assert.match(renderImageConcordanceFixtureSvg(rotated), /rotate\(2\.25 [^)]+\) skewX\(1\.25\)/);

  const poor = renderedScenarioById("poor-quality-10");
  const poorSvg = renderImageConcordanceFixtureSvg(poor);
  assert.match(poorSvg, /opacity="0\.48"/);
  assert.match(poorSvg, /feGaussianBlur stdDeviation="1\.45"/);

  const partial = renderedScenarioById("partial-crop-10");
  const fullTableBottom = 92 + 40 + partial.rows.length * partial.rowHeight;
  assert.equal(partial.partialCrop, true);
  assert.equal(partial.expectedPartiallyVisibleRows, 1);
  assert.ok(fullTableBottom > partial.height, "fixture viewport must clip the final row");
  const partialSvg = renderImageConcordanceFixtureSvg(partial);
  assert.match(partialSvg, new RegExp(`height="${partial.height}" viewBox="0 0 ${partial.width} ${partial.height}"`));
  assert.equal(count(partialSvg, /data-role="drug"/g), 10, "clipped source row must remain in SVG for OCR crop testing");
});

test("every fixture produces deterministic, self-contained, browser-renderable SVG markup", () => {
  for (const fixture of renderedImageConcordanceScenarios) {
    const first = renderImageConcordanceFixtureSvg(fixture);
    const second = renderImageConcordanceFixtureSvg(fixture);
    assert.equal(first, second, fixture.id);
    assert.match(first, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(first, /<title id="fixture-title">/);
    assert.match(first, /<desc id="fixture-description">/);
    assert.match(first, /data-synthetic="true"/);
    assert.match(first, /<\/svg>$/);
    assert.doesNotMatch(first, /(?:<script\b|<foreignObject\b|\s(?:href|src|onload)=)/i);
    assert.doesNotMatch(first, /(?:undefined|NaN)/);
    assert.equal(count(first, /data-role="drug"/g), fixture.rowCount, fixture.id);
  }
});

test("rendered SVG text contains no common PHI labels or identifying fields", () => {
  const prohibited = /\b(?:patient|name|mrn|medical record|dob|date of birth|birth|accession|specimen|identifier|address|phone|email|barcode|qr code|facility)\b/i;
  for (const fixture of renderedImageConcordanceScenarios) {
    const svg = renderImageConcordanceFixtureSvg(fixture);
    assert.doesNotMatch(svg, prohibited, fixture.id);
    assert.equal(fixture.synthetic, true);
    assert.equal(fixture.scientificInterpretationAllowed, false);
    assert.equal("organism" in fixture, false);
    assert.equal("marker" in fixture, false);
    assert.equal("breakpoint" in fixture, false);
  }
});

test("manual runner loads the fixture module and supports local SVG and PNG export", async () => {
  const runner = await readFile(new URL("./fixtures/rendered-image-concordance-runner.html", import.meta.url), "utf8");
  assert.match(runner, /rendered-image-concordance-fixtures\.mjs/);
  assert.match(runner, /Download SVG/);
  assert.match(runner, /Export PNG/);
  assert.match(runner, /canvas\.toBlob/);
  assert.match(runner, /nothing is uploaded/i);
  assert.match(runner, /OCR measurements are pending/i);
  assert.doesNotMatch(runner, /<script[^>]+src=["']https?:/i);
});
