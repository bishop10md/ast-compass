import test from "node:test";
import assert from "node:assert/strict";
import { parseMeasurement } from "../src/features/measurement-core.mjs";
import { screenPhiText } from "../src/features/phi-screening-core.mjs";
import { assessImageQuality, planVerticalChunks, reconstructAstTable } from "../src/features/image-concordance-extraction-core.mjs";
import { fixtureById, imageConcordanceFixtures } from "./fixtures/image-concordance-fixtures.mjs";

test("synthetic extraction fixtures cover 5, 10, 20, 30, and 40 rows without truncation", () => {
  for (const expectedCount of [5, 10, 20, 30, 40]) {
    const fixture = imageConcordanceFixtures.find((candidate) => candidate.expectedRows.length === expectedCount && !candidate.metadata.partialCrop && candidate.metadata.sourceKind !== "poor_quality");
    assert.ok(fixture, `missing ${expectedCount}-row fixture`);
    assert.equal(fixture.expectedRows.length, expectedCount);
    assert.equal(new Set(fixture.expectedRows.map((row) => row.antimicrobialId)).size, expectedCount);
    for (const row of fixture.expectedRows) assert.ok(fixture.rawOcrText.includes(row.antimicrobial), `${fixture.id}: ${row.antimicrobial}`);
  }
});

test("fixtures preserve every required MIC operator as an explicit expected cell", () => {
  const rows = fixtureById("dense-multi-column-40").expectedRows;
  const parsed = rows.map((row) => ({ raw: row.mic, parsed: parseMeasurement(row.mic) }));
  for (const operator of ["<", "<=", "=", ">=", ">"]) assert.ok(parsed.some((cell) => cell.parsed.operator === operator), `missing ${operator}`);
  assert.ok(parsed.some((cell) => cell.raw.startsWith("≤")), "missing Unicode ≤");
  assert.ok(parsed.some((cell) => cell.raw.startsWith("≥")), "missing Unicode ≥");
  for (const cell of parsed) assert.equal(typeof cell.parsed.value, "number");
});

test("fixture metadata covers multiple columns, rotation, poor quality, and partial cropping", () => {
  const multiColumn = fixtureById("rotated-multi-column-30");
  assert.equal(multiColumn.metadata.columnCount, 2);
  assert.match(multiColumn.rawOcrText, /\|\|/);
  assert.ok(multiColumn.metadata.rotationDegrees > 0);
  assert.ok(multiColumn.metadata.skewDegrees > 0);
  assert.equal(fixtureById("poor-quality-5").metadata.qualityExpectation, "POOR");
  const partial = fixtureById("partial-crop-10");
  assert.equal(partial.metadata.partialCrop, true);
  assert.equal(partial.expectedIncompleteRows, 1);
  const finalExpected = partial.expectedRows.at(-1);
  assert.match(partial.rawOcrText, new RegExp(`${finalExpected.antimicrobial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\|$`, "m"));
  assert.doesNotMatch(partial.rawOcrText, new RegExp(`${finalExpected.antimicrobial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| ${finalExpected.mic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| ${finalExpected.category}`));
});

test("fixtures are de-identified and explicitly barred from scientific interpretation", () => {
  const prohibited = /\b(patient|mrn|medical record|dob|date of birth|accession|specimen|address|phone|email|barcode|facility)\b/i;
  for (const fixture of imageConcordanceFixtures) {
    assert.equal(fixture.synthetic, true);
    assert.equal(fixture.scientificInterpretationAllowed, false);
    assert.doesNotMatch(fixture.rawOcrText, prohibited);
    assert.equal(screenPhiText(fixture.rawOcrText).status, "clear", fixture.id);
    assert.equal("organismId" in fixture, false);
    assert.equal("markerId" in fixture, false);
    assert.equal("mechanism" in fixture, false);
  }
});

test("fixture generation is deterministic", async () => {
  const secondImport = await import(`./fixtures/image-concordance-fixtures.mjs?determinism=${Date.now()}`);
  assert.deepEqual(secondImport.imageConcordanceFixtures, imageConcordanceFixtures);
});

test("quality fixtures deterministically exercise GOOD, FAIR, and POOR outcomes", () => {
  for (const fixture of imageConcordanceFixtures) {
    const quality = assessImageQuality(fixture.metadata);
    assert.equal(quality.status, fixture.metadata.qualityExpectation, fixture.id);
    assert.equal(quality.canProceed, fixture.metadata.qualityExpectation !== "POOR", fixture.id);
  }
});

test("table reconstruction returns all 5, 10, 20, 30, and 40 expected rows", () => {
  for (const fixtureId of ["clean-screen-5", "phone-photo-10", "dense-small-text-20", "rotated-multi-column-30", "dense-multi-column-40"]) {
    const fixture = fixtureById(fixtureId);
    const dictionary = fixture.expectedRows.map((row) => ({ value: row.antimicrobialId, label: row.antimicrobial }));
    const extraction = reconstructAstTable({ lines: fixture.rawOcrText.split("\n"), dictionary });
    assert.equal(extraction.rows.length, fixture.expectedRows.length, fixture.id);
    for (const expected of fixture.expectedRows) {
      const actual = extraction.rows.find((row) => row.antimicrobial.dictionaryValue === expected.antimicrobialId);
      assert.ok(actual, `${fixture.id}: missing ${expected.antimicrobial}`);
      assert.equal(actual.mic.value, expected.mic, `${fixture.id}: ${expected.antimicrobial} MIC`);
      assert.equal(actual.category.value, expected.category, `${fixture.id}: ${expected.antimicrobial} category`);
    }
  }
});

test("partial tables remain visible but incomplete fields require verification", () => {
  const fixture = fixtureById("partial-crop-10");
  const dictionary = fixture.expectedRows.map((row) => ({ value: row.antimicrobialId, label: row.antimicrobial }));
  const extraction = reconstructAstTable({ lines: fixture.rawOcrText.split("\n"), dictionary });
  assert.equal(extraction.rows.length, 10);
  assert.equal(extraction.completeness.status, "VERIFICATION_REQUIRED");
  assert.equal(extraction.completeness.requiringVerification, fixture.expectedRows.length);
  const incomplete = extraction.rows.find((row) => !row.mic.valid);
  assert.ok(incomplete);
  assert.equal(incomplete.mic.valid, false);
  assert.equal(incomplete.category.value, "Unknown");
});

test("vertical chunks overlap and always include the bottom of a 40-row synthetic report", () => {
  const fixture = fixtureById("dense-multi-column-40");
  const region = { x: 0, y: 0, width: fixture.metadata.width, height: fixture.metadata.height };
  const chunks = planVerticalChunks({ region, maxChunkHeight: 1400, overlapPx: 180 });
  assert.ok(chunks.length >= 4);
  assert.equal(chunks[0].rect.y, 0);
  assert.equal(chunks.at(-1).rect.y + chunks.at(-1).rect.height, region.height);
  for (let index = 1; index < chunks.length; index += 1) assert.ok(chunks[index].overlapTopPx > 0);
  assert.match(chunks[0].progressMessage, /Processing section 1 of/);
});
