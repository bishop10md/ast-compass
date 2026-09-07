import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ExtractionCancelledError,
  POOR_IMAGE_MESSAGE,
  assessImageQuality,
  createExtractionLifecycle,
  createExtractionProgress,
  createPreprocessingPlan,
  detectAstTableRegion,
  matchAntimicrobial,
  mapOcrLinesToSource,
  mergeChunkRows,
  normalizeCropRegion,
  parseMicCell,
  planOrientationCorrection,
  planVerticalChunks,
  reconstructAstTable,
  summarizeExtraction,
} from "../src/features/image-concordance-extraction-core.mjs";
import { imageConcordanceFixtures } from "./fixtures/image-concordance-fixtures.mjs";

const dictionary = [
  { value: "ceftriaxone", label: "Ceftriaxone", aliases: ["CRO"] },
  { value: "meropenem", label: "Meropenem", aliases: ["MEM"] },
  { value: "ampicillin", label: "Ampicillin", aliases: ["AMP"] },
  { value: "vancomycin", label: "Vancomycin", aliases: ["VAN"] },
];

test("quality assessment is transparent and fails safely on poor inputs", () => {
  const good = assessImageQuality({ width: 1600, height: 1200, blurVariance: 160, contrastStdDev: 42, estimatedTextHeightPx: 18, rotationDegrees: 0, rotationConfidence: 0.95, skewDegrees: 0.2, skewConfidence: 0.95 });
  assert.equal(good.status, "GOOD");
  assert.equal(good.canProceed, true);
  assert.equal(good.issues.length, 0);

  const fair = assessImageQuality({ width: 1000, height: 800, blurVariance: 75, contrastStdDev: 20, estimatedTextHeightPx: 11, rotationDegrees: 0, skewDegrees: 2.5 });
  assert.equal(fair.status, "FAIR");
  assert.equal(fair.canProceed, true);
  assert.ok(fair.issues.every((entry) => entry.severity === "warning"));

  const poor = assessImageQuality({ width: 480, height: 320, blurVariance: 20, contrastStdDev: 8, estimatedTextHeightPx: 6, rotationDegrees: 13, rotationConfidence: 0.3, skewDegrees: 9 });
  assert.equal(poor.status, "POOR");
  assert.equal(poor.canProceed, false);
  assert.equal(poor.message, POOR_IMAGE_MESSAGE);
  assert.ok(poor.issues.some((entry) => entry.severity === "blocking"));
  assert.ok(Object.isFrozen(poor));
});

test("crop and orientation plans retain source-space geometry without mutating input", () => {
  const requested = { x: -8.4, y: 100.2, width: 850.1, height: 1000 };
  const untouched = { ...requested };
  const crop = normalizeCropRegion(requested, { width: 800, height: 600 });
  assert.deepEqual(requested, untouched);
  assert.deepEqual({ x: crop.x, y: crop.y, width: crop.width, height: crop.height }, { x: 0, y: 100, width: 800, height: 500 });
  assert.deepEqual(crop.normalized, { x: 0, y: 0.1667, width: 1, height: 0.8333 });

  const orientation = planOrientationCorrection({ width: 800, height: 1200, detectedRotationDegrees: 91, rotationConfidence: 94, skewDegrees: 2, skewConfidence: 0.9 });
  assert.equal(orientation.source, "automatic");
  assert.equal(orientation.rotationDegrees, -90);
  assert.equal(orientation.deskewDegrees, -2);
  assert.equal(orientation.outputWidth, 1200);
  assert.equal(orientation.outputHeight, 800);
  assert.equal(orientation.applyFromOriginal, true);

  const uncertain = planOrientationCorrection({ width: 800, height: 1200, detectedRotationDegrees: 88, rotationConfidence: 0.4 });
  assert.equal(uncertain.rotationDegrees, 0);
  assert.equal(uncertain.requiresManualReview, true);
  assert.throws(() => planOrientationCorrection({ width: 10, height: 20, manualRotationDegrees: 45 }), /multiple of 90/);
});

test("preprocessing variants are immutable descriptors and preserve the original", () => {
  const quality = assessImageQuality({ width: 1200, height: 900, blurVariance: 70, contrastStdDev: 20, estimatedTextHeightPx: 8, rotationDegrees: 0, skewDegrees: 0 });
  const crop = { x: 20, y: 30, width: 1000, height: 700 };
  const plan = createPreprocessingPlan({ quality, crop, maxUpscale: 2 });
  assert.equal(plan.preserveOriginal, true);
  assert.equal(plan.source, "original");
  assert.equal(plan.maxConcurrentVariants, 1);
  assert.equal(plan.releaseAfterEachVariant, true);
  assert.deepEqual(plan.variants.map((variant) => variant.id), ["original", "grayscale-normalized", "sharpened", "adaptive-threshold"]);
  assert.equal(plan.upscaleFactor, 2);
  assert.deepEqual(crop, { x: 20, y: 30, width: 1000, height: 700 });
  assert.ok(Object.isFrozen(plan.variants[2].operations));
  assert.equal(plan.variants[0].operations.some((operation) => operation.type === "grayscale"), false);
});

test("vertical chunk plans overlap, cover every pixel, and never truncate long reports", () => {
  for (const rowCount of [5, 10, 20, 30, 40]) {
    const region = { x: 50, y: 80, width: 900, height: 100 + rowCount * 72 };
    const chunks = planVerticalChunks({ region, maxChunkHeight: 900, overlapPx: 120, minChunkHeight: 360 });
    assert.equal(chunks[0].rect.y, region.y);
    const last = chunks.at(-1).rect;
    assert.equal(last.y + last.height, region.y + region.height, `${rowCount}-row bottom coverage`);
    for (let index = 1; index < chunks.length; index += 1) {
      const prior = chunks[index - 1].rect;
      const current = chunks[index].rect;
      assert.ok(current.y < prior.y + prior.height, `${rowCount}-row overlap`);
      assert.equal(chunks[index].overlapTopPx, prior.y + prior.height - current.y);
      assert.equal(chunks[index - 1].overlapBottomPx, prior.y + prior.height - current.y);
    }
  }
  assert.throws(() => planVerticalChunks({ region: { x: 0, y: 0, width: 500, height: 2000 }, maxChunkHeight: 500, overlapPx: 500 }), /overlap/);
});

test("progress is section-aware and bounded", () => {
  assert.deepEqual(createExtractionProgress("ocr", 2, 4), { stage: "ocr", current: 2, total: 4, fraction: 0.5, message: "Processing section 2 of 4..." });
  assert.equal(createExtractionProgress("complete", 10, 4).fraction, 1);
  assert.throws(() => createExtractionProgress("guessing", 1, 1), /Unknown extraction stage/);
});

test("MIC parsing preserves every supported source operator", () => {
  for (const [source, operator, normalized, number] of [
    ["<0.25", "<", "<", 0.25],
    ["≤0.5", "≤", "<=", 0.5],
    ["=1", "=", "=", 1],
    ["2", undefined, undefined, 2],
    [">4", ">", ">", 4],
    ["≥8", "≥", ">=", 8],
    ["<=0.125", "<=", "<=", 0.125],
    [">=64", ">=", ">=", 64],
  ]) {
    const cell = parseMicCell(source, 95);
    assert.equal(cell.valid, true, source);
    assert.equal(cell.value, source, source);
    assert.equal(cell.operator, operator, source);
    assert.equal(cell.normalizedOperator, normalized, source);
    assert.equal(cell.numericValue, number, source);
  }
  assert.equal(parseMicCell("probably resistant").valid, false);
});

test("explicit measurement units remain visible and participate in comparison", () => {
  const zone = parseMicCell("20 mm", 95);
  assert.equal(zone.valid, true);
  assert.equal(zone.raw, "20 mm");
  assert.equal(zone.value, "20 mm");
  assert.equal(zone.unit, "mm");
  assert.equal(zone.normalizedUnit, "mm");

  const concentration = parseMicCell("≤0.25 µg / mL", 95);
  assert.equal(concentration.value, "≤0.25 µg / mL");
  assert.equal(concentration.unit, "µg / mL");
  assert.equal(concentration.normalizedUnit, "µg/mL");
  assert.equal(concentration.operator, "≤");

  const generic = reconstructAstTable({ rawOcrText: "Ceftriaxone 20 mm S", dictionary });
  assert.equal(generic.rows[0].mic.value, "20 mm", "undelimited rows retain their explicit unit");
});

test("antimicrobial normalization resolves explicit aliases but only suggests fuzzy names", () => {
  const exact = matchAntimicrobial("Ceftriaxone", dictionary, { ocrConfidence: 0.98 });
  assert.equal(exact.matchStatus, "EXACT");
  assert.equal(exact.canonical, "Ceftriaxone");
  const alias = matchAntimicrobial("CRO", dictionary);
  assert.equal(alias.matchStatus, "ALIAS");
  assert.equal(alias.value, "Ceftriaxone");
  const fuzzy = matchAntimicrobial("Ceftrlaxone", dictionary);
  assert.equal(fuzzy.matchStatus, "SUGGESTION");
  assert.equal(fuzzy.value, "Ceftrlaxone");
  assert.equal(fuzzy.canonical, undefined);
  assert.equal(fuzzy.dictionaryValue, undefined);
  assert.equal(fuzzy.suggestions[0].canonical, "Ceftriaxone");
  assert.match(fuzzy.confidence.reasons.join(" "), /requires user confirmation/);
});

test("table reconstruction recognizes header variants and tracks confidence per cell", () => {
  const result = reconstructAstTable({
    rawOcrText: [
      "Antibiotic | Result | Interpretation",
      "Ceftriaxone | ≤0.25 | S",
      "Ceftrlaxone | >2 | R",
      "Meropenem | | R",
    ].join("\n"),
    dictionary,
  });
  assert.equal(result.table.source, "delimited");
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0].mic.operator, "≤");
  assert.equal(result.rows[0].mic.normalizedOperator, "<=");
  assert.equal(result.rows[0].category.value, "S");
  assert.equal(result.rows[0].status, "needs-verification", "plain OCR text does not establish operator fidelity");
  assert.equal(result.rows[1].antimicrobial.matchStatus, "SUGGESTION");
  assert.equal(result.rows[1].status, "needs-verification");
  assert.match(result.rows[1].issues[0].message, /Did you mean Ceftriaxone/);
  assert.equal(result.rows[2].mic.valid, false);
  assert.equal(result.rows[2].mic.value, "");
  assert.equal(result.rows[2].category.value, "R");
  assert.equal(result.rows[2].status, "needs-verification");
  assert.ok(result.rows.every((row) => row.antimicrobial.confidence && row.mic.confidence && row.category.confidence));
});

test("spatial columns reconstruct cells and produce a conservative crop suggestion", () => {
  const lines = [
    { text: "Antimicrobial MIC Category", confidence: 96, bbox: { x0: 100, y0: 200, x1: 900, y1: 230 }, words: [
      { text: "Antimicrobial", confidence: 97, bbox: { x0: 100, y0: 200, x1: 300, y1: 230 } },
      { text: "MIC", confidence: 96, bbox: { x0: 500, y0: 200, x1: 550, y1: 230 } },
      { text: "Category", confidence: 95, bbox: { x0: 800, y0: 200, x1: 900, y1: 230 } },
    ] },
    { text: "Ceftriaxone <=1 S", confidence: 94, bbox: { x0: 100, y0: 250, x1: 850, y1: 280 }, words: [
      { text: "Ceftriaxone", confidence: 95, bbox: { x0: 100, y0: 250, x1: 280, y1: 280 } },
      { text: "<=1", confidence: 93, bbox: { x0: 500, y0: 250, x1: 550, y1: 280 } },
      { text: "S", confidence: 94, bbox: { x0: 820, y0: 250, x1: 840, y1: 280 } },
    ] },
    { text: "Meropenem >=16 R", confidence: 92, bbox: { x0: 100, y0: 300, x1: 850, y1: 330 }, words: [
      { text: "Meropenem", confidence: 93, bbox: { x0: 100, y0: 300, x1: 250, y1: 330 } },
      { text: ">=16", confidence: 91, bbox: { x0: 500, y0: 300, x1: 560, y1: 330 } },
      { text: "R", confidence: 92, bbox: { x0: 820, y0: 300, x1: 840, y1: 330 } },
    ] },
  ];
  const table = reconstructAstTable({ lines, dictionary });
  assert.equal(table.table.source, "spatial");
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[1].antimicrobial.canonical, "Meropenem");
  const detected = detectAstTableRegion({ lines, dictionary, imageSize: { width: 1200, height: 1600 }, paddingPx: 20 });
  assert.equal(detected.source, "detected");
  assert.equal(detected.shouldSuggestCrop, true);
  assert.deepEqual(detected.region, { x: 80, y: 180, width: 840, height: 170 });
});

test("repeated side-by-side spatial columns reconstruct both AST table groups", () => {
  const headerWords = [
    ["Drug", 50], ["MIC", 280], ["Category", 410],
    ["Antibiotic", 620], ["Result", 850], ["Interpretation", 980],
  ].map(([text, x]) => ({ text, confidence: 96, bbox: { x0: x, y0: 20, x1: x + 80, y1: 45 } }));
  const rowWords = [
    ["Ceftriaxone", 50], ["<=1", 280], ["S", 410],
    ["Meropenem", 620], [">=16", 850], ["R", 980],
  ].map(([text, x]) => ({ text, confidence: 94, bbox: { x0: x, y0: 60, x1: x + 80, y1: 85 } }));
  const result = reconstructAstTable({
    lines: [
      { text: headerWords.map((word) => word.text).join(" "), confidence: 96, words: headerWords },
      { text: rowWords.map((word) => word.text).join(" "), confidence: 94, words: rowWords },
    ],
    dictionary,
  });
  assert.equal(result.table.source, "spatial");
  assert.equal(result.table.groups.length, 2);
  assert.deepEqual(result.rows.map((row) => row.antimicrobial.dictionaryValue), ["ceftriaxone", "meropenem"]);
  assert.deepEqual(result.rows.map((row) => row.mic.value), ["<=1", ">=16"]);
  assert.deepEqual(result.rows.map((row) => row.category.value), ["S", "R"]);
});

test("synthetic 5/10/20/30/40 row fixtures reconstruct both repeated column groups", () => {
  const allExpected = imageConcordanceFixtures.flatMap((fixture) => fixture.expectedRows);
  const fixtureDictionary = [...new Map(allExpected.map((row) => [row.antimicrobialId, { value: row.antimicrobialId, label: row.antimicrobial, aliases: [row.antimicrobialId] }])).values()];
  for (const fixture of imageConcordanceFixtures.filter((record) => !record.metadata.partialCrop)) {
    const result = reconstructAstTable({ rawOcrText: fixture.rawOcrText, dictionary: fixtureDictionary });
    assert.equal(result.rows.length, fixture.expectedRows.length, `${fixture.id} row count`);
    assert.deepEqual(result.rows.map((row) => row.antimicrobial.dictionaryValue), fixture.expectedRows.map((row) => row.antimicrobialId), `${fixture.id} names`);
    assert.deepEqual(result.rows.map((row) => row.mic.value), fixture.expectedRows.map((row) => row.mic), `${fixture.id} MICs`);
    assert.deepEqual(result.rows.map((row) => row.category.value), fixture.expectedRows.map((row) => row.category), `${fixture.id} categories`);
  }
  const partial = imageConcordanceFixtures.find((record) => record.metadata.partialCrop);
  const partialResult = reconstructAstTable({ rawOcrText: partial.rawOcrText, dictionary: fixtureDictionary });
  assert.equal(partialResult.rows.length, 10);
  assert.equal(partialResult.rows.at(-1).status, "needs-verification");
  assert.equal(partialResult.completeness.requiringVerification, 10, "all text-only MIC fields require verification");
});

test("overlap duplicates merge only when source evidence is overlap-like", () => {
  const first = reconstructAstTable({ lines: [{ text: "Ceftriaxone | <=1 | S", bbox: { x0: 100, y0: 800, x1: 900, y1: 830 } }], dictionary, chunkId: "chunk-1-of-2" }).rows[0];
  const repeated = reconstructAstTable({ lines: [{ text: "Ceftriaxone | <=1 | S", bbox: { x0: 100, y0: 800, x1: 900, y1: 830 } }], dictionary, chunkId: "chunk-2-of-2" }).rows[0];
  const identical = mergeChunkRows([first, repeated]);
  assert.equal(identical.rows.length, 1);
  assert.equal(identical.duplicatesMerged, 1);
  assert.equal(identical.conflictCount, 0);

  const conflictSource = reconstructAstTable({ lines: [{ text: "Ceftriaxone | >=4 | R", bbox: { x0: 100, y0: 802, x1: 900, y1: 832 } }], dictionary, chunkId: "chunk-2-of-2" }).rows[0];
  const conflict = mergeChunkRows([first, conflictSource]);
  assert.equal(conflict.rows.length, 1);
  assert.equal(conflict.conflictCount, 2);
  assert.equal(conflict.rows[0].status, "conflict");
  assert.equal(conflict.rows[0].mic.value, "");
  assert.deepEqual(conflict.rows[0].mic.conflictCandidates, ["<=1", ">=4"]);
  assert.equal(conflict.rows[0].category.value, "Unknown");
  assert.match(conflict.rows[0].issues.find((entry) => entry.code === "duplicate-conflict").message, /please verify/);

  const farAway = reconstructAstTable({ lines: [{ text: "Ceftriaxone | <=1 | S", bbox: { x0: 100, y0: 1400, x1: 900, y1: 1430 } }], dictionary, chunkId: "chunk-2-of-2" }).rows[0];
  const distinct = mergeChunkRows([first, farAway]);
  assert.equal(distinct.rows.length, 2, "coordinate-backed identical rows outside the same global band remain distinct");
  const coordinateFreeFirst = { ...first, sourceRefs: first.sourceRefs.map(({ bbox: _bbox, ...ref }) => ref) };
  const coordinateFreeRepeated = { ...repeated, sourceRefs: repeated.sourceRefs.map(({ bbox: _bbox, ...ref }) => ref) };
  assert.equal(mergeChunkRows([coordinateFreeFirst, coordinateFreeRepeated]).rows.length, 1, "exact source text is a fallback when OCR geometry is unavailable");
  const nonAdjacent = { ...farAway, sourceRefs: farAway.sourceRefs.map((ref) => ({ ...ref, chunkId: "chunk-3-of-3" })) };
  assert.equal(mergeChunkRows([first, nonAdjacent]).rows.length, 2, "non-adjacent sections must not merge merely by antimicrobial identity");

  const sideBySide = reconstructAstTable({ lines: [{ text: "Ceftriaxone | <=1 | S", bbox: { x0: 1000, y0: 800, x1: 1500, y1: 830 } }], dictionary, chunkId: "chunk-2-of-2" }).rows[0];
  assert.equal(mergeChunkRows([first, sideBySide]).rows.length, 2, "same-y rows in distinct horizontal table groups remain distinct");

  const adjacentRow = reconstructAstTable({ lines: [{ text: "Ceftriaxone | >=4 | R", bbox: { x0: 100, y0: 820, x1: 900, y1: 850 } }], dictionary, chunkId: "chunk-2-of-2" }).rows[0];
  const adjacent = mergeChunkRows([first, adjacentRow]);
  assert.equal(adjacent.rows.length, 2, "adjacent source rows with only incidental bbox overlap are not merged or conflicted");
  assert.equal(adjacent.conflictCount, 0);

  const unitless = reconstructAstTable({ lines: [{ text: "Ceftriaxone | 20 | S", bbox: { x0: 100, y0: 800, x1: 900, y1: 830 } }], dictionary, chunkId: "chunk-1-of-2" }).rows[0];
  const millimetres = reconstructAstTable({ lines: [{ text: "Ceftriaxone | 20 mm | S", bbox: { x0: 100, y0: 802, x1: 900, y1: 832 } }], dictionary, chunkId: "chunk-2-of-2" }).rows[0];
  const unitConflict = mergeChunkRows([unitless, millimetres]);
  assert.equal(unitConflict.rows.length, 1);
  assert.equal(unitConflict.rows[0].status, "conflict");
  assert.equal(unitConflict.rows[0].mic.value, "");
  assert.deepEqual(unitConflict.rows[0].mic.conflictCandidates, ["20", "20 mm"]);
});

test("chunk OCR boxes are remapped through render scale into global source coordinates", () => {
  const mapped = mapOcrLinesToSource([{
    text: "Ceftriaxone <=1 S",
    confidence: 95,
    bbox: { x0: 20, y0: 40, x1: 420, y1: 100 },
    words: [{ text: "Ceftriaxone", bbox: { x: 20, y: 40, width: 180, height: 60 } }],
  }], { offsetX: 100, offsetY: 700, scaleX: 2, scaleY: 2, chunkId: "chunk-2-of-4" });
  assert.deepEqual(mapped[0].bbox, { x0: 110, y0: 720, x1: 310, y1: 750 });
  assert.deepEqual(mapped[0].words[0].bbox, { x0: 110, y0: 720, x1: 200, y1: 750 });
  assert.equal(mapped[0].chunkId, "chunk-2-of-4");
  assert.ok(Object.isFrozen(mapped));
});

test("globalized overlapping chunk boxes expose disagreements instead of choosing a value", () => {
  const firstLines = mapOcrLinesToSource([{
    text: "Ceftriaxone | <=1 | S",
    bbox: { x0: 0, y0: 700, x1: 500, y1: 730 },
  }], { offsetY: 0, chunkId: "chunk-1-of-2" });
  const secondLines = mapOcrLinesToSource([{
    text: "Ceftriaxone | >=4 | R",
    bbox: { x0: 0, y0: 200, x1: 1000, y1: 260 },
  }], { offsetY: 600, scaleX: 2, scaleY: 2, chunkId: "chunk-2-of-2" });
  const firstRow = reconstructAstTable({ lines: firstLines, dictionary }).rows[0];
  const secondRow = reconstructAstTable({ lines: secondLines, dictionary }).rows[0];
  const merged = mergeChunkRows([firstRow, secondRow]);
  assert.equal(merged.rows.length, 1);
  assert.equal(merged.rows[0].status, "conflict");
  assert.equal(merged.rows[0].mic.value, "");
  assert.equal(merged.rows[0].category.value, "Unknown");
});

test("completeness summary distinguishes verification from unreadable/lost rows", () => {
  const result = reconstructAstTable({ rawOcrText: "Drug | MIC | Category\nCeftriaxone | <=1 | S\nMeropenem | | R\nUnknownDrug | 2 | I", dictionary });
  const summary = summarizeExtraction(result.rows, 4);
  assert.equal(summary.status, "INCOMPLETE");
  assert.equal(summary.rowsDetected, 4);
  assert.equal(summary.rowsReconstructed, 2);
  assert.equal(summary.complete, 0);
  assert.equal(summary.requiringVerification, 2);
  assert.equal(summary.unreadable, 2);
  assert.match(summary.message, /0 complete; 2 require verification; 2 unreadable/);
  assert.match(summary.message, /may not have extracted the complete table/);
});

test("cancellation aborts checkpoints and disposes every registered resource once", async () => {
  const lifecycle = createExtractionLifecycle();
  const calls = [];
  lifecycle.registerCleanup(() => calls.push("canvas"), "canvas");
  lifecycle.registerCleanup(async () => { calls.push("worker"); }, "worker");
  lifecycle.registerCleanup(() => { calls.push("broken"); throw new Error("cleanup-failure"); }, "broken");
  lifecycle.checkpoint("quality");
  const result = await lifecycle.cancel("user pressed cancel");
  assert.equal(lifecycle.signal.aborted, true);
  assert.equal(lifecycle.cancelled, true);
  assert.equal(lifecycle.disposed, true);
  assert.deepEqual(calls, ["broken", "worker", "canvas"]);
  assert.equal(result.released, 2);
  assert.equal(result.errors.length, 1);
  assert.throws(() => lifecycle.checkpoint("ocr"), (error) => error instanceof ExtractionCancelledError && error.stage === "ocr" && error.reason === "user pressed cancel");
  assert.strictEqual(await lifecycle.dispose(), result);
  assert.deepEqual(calls, ["broken", "worker", "canvas"]);
});

test("the pure extraction core has no upload path or scientific inference hook", async () => {
  const source = await readFile(new URL("../src/features/image-concordance-extraction-core.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|OpenAI|Google Vision|Textract|Azure AI/);
  assert.doesNotMatch(source, /KPC|CTX-M|breakpoint|concordanceEngine|analyzeConcordance/);
  assert.match(source, /no scientific value inferred/);
});

test("the browser image workspace is local, bounded, cancellable, and releases canvases", async () => {
  const source = await readFile(new URL("../src/features/image-concordance-image.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|OpenAI|Google Vision|Textract|Azure AI/);
  assert.match(source, /MAX_RENDER_PIXELS/);
  assert.match(source, /signal\?: AbortSignal/);
  assert.match(source, /yieldToBrowser\(signal\)/);
  assert.match(source, /output\.width = 0/);
  assert.match(source, /canvas\.width = 0/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.match(source, /deskewDegrees/);
});
