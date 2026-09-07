import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const analyzerUrl = new URL("../src/features/ImageConcordanceAnalyzer.tsx", import.meta.url);
const workspaceUrl = new URL("../src/components/ImageExtractionWorkspace.tsx", import.meta.url);
const imageRuntimeUrl = new URL("../src/features/image-concordance-image.ts", import.meta.url);
const extractionCoreUrl = new URL("../src/features/image-concordance-extraction-core.mjs", import.meta.url);
const ocrUrl = new URL("../src/lib/ocr.ts", import.meta.url);

async function readRuntimeSources() {
  const [analyzer, workspace, imageRuntime, extractionCore, ocr] = await Promise.all([
    readFile(analyzerUrl, "utf8"),
    readFile(workspaceUrl, "utf8"),
    readFile(imageRuntimeUrl, "utf8"),
    readFile(extractionCoreUrl, "utf8"),
    readFile(ocrUrl, "utf8"),
  ]);
  return { analyzer, workspace, imageRuntime, extractionCore, ocr };
}

function sourceSection(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `missing source section: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `missing source section terminator: ${end}`);
  return source.slice(startIndex, endIndex);
}

function assertAppearsBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.notEqual(firstIndex, -1, `missing ${first}`);
  assert.notEqual(secondIndex, -1, `missing ${second}`);
  assert.ok(firstIndex < secondIndex, message || `${first} must precede ${second}`);
}

test("full-image PHI clearance remains a fail-closed prerequisite for extraction", async () => {
  const { analyzer } = await readRuntimeSources();
  const uploadPipeline = sourceSection(analyzer, "const processFile", "const applyExtraction");

  assert.match(analyzer, /Full-image privacy screening always runs before crop or AST extraction/);
  assert.match(uploadPipeline, /screenPhiText\(text,\{barcode,face\}\)/);
  assert.match(uploadPipeline, /if\(result\.status!==["']clear["']\)/);
  assert.match(uploadPipeline, /unable-to-screen/);
  assert.match(uploadPipeline, /There is no override/);
  assertAppearsBefore(uploadPipeline, "screenPhiText(", "setPrivacyOcr(response)", "extraction input must not be exposed until the PHI screen clears");
  assert.match(analyzer, /privacyPassed&&ack&&<ImageExtractionWorkspace/);
  assert.match(analyzer, /acknowledged=\{ack\}/);
});

test("initial full-image privacy OCR can be cancelled without clearing the PHI gate", async () => {
  const { analyzer } = await readRuntimeSources();
  const cancelHandler = sourceSection(analyzer, "const cancelPrivacyScreen", "const processFile");
  const uploadPipeline = sourceSection(analyzer, "const processFile", "const applyExtraction");
  const cleanup = sourceSection(analyzer, "async function releasePrivacyWorker", "async function normalizeImage");

  assert.match(analyzer, /Cancel privacy screening/);
  assert.match(analyzer, /new AbortController\(\)/);
  assert.match(cancelHandler, /active\.controller\.abort\(["']user-cancelled["']\)/);
  assert.match(cancelHandler, /void releasePrivacyWorker\(active\)/);
  assert.doesNotMatch(cancelHandler, /await releasePrivacyWorker\(active\)/);
  assert.match(cancelHandler, /setPrivacyOcr\(null\)/);
  assert.match(cancelHandler, /stage\(["']privacy-cancelled["']/);
  assert.match(cancelHandler, /AST extraction did not run/);
  assert.match(cleanup, /session\.workerPromise/);
  assert.match(cleanup, /worker\.terminate\(\)/);
  assert.match(uploadPipeline, /normalizeImage\(next,session\.controller\.signal\)/);
  assert.match(uploadPipeline, /if\(session\.controller\.signal\.aborted\)return/);
  assertAppearsBefore(uploadPipeline, "ensureCurrent()", "setPrivacyOcr(response)");
});

test("image extraction stays browser-local and uses only first-party OCR assets", async () => {
  const { workspace, imageRuntime, extractionCore, ocr } = await readRuntimeSources();
  const extractionRuntime = `${workspace}\n${imageRuntime}\n${extractionCore}\n${ocr}`;

  assert.match(workspace, /Image-assisted extraction runs locally in this browser/);
  assert.match(workspace, /No image is sent to an external AI or cloud OCR service/);
  assert.doesNotMatch(extractionRuntime, /https?:\/\//i);
  assert.doesNotMatch(extractionRuntime, /\bfetch\s*\(|\bXMLHttpRequest\b|\bGoogle Vision\b|\bAWS Textract\b|\bAzure AI\b/i);
  for (const asset of ["/ocr/tesseract.min.js", "/ocr/worker.min.js", "/ocr/core", "/ocr/lang"]) {
    assert.ok(ocr.includes(asset), `missing first-party OCR asset ${asset}`);
  }
});

test("the post-clearance workspace exposes crop, orientation, quality, progress, and cancellation controls", async () => {
  const { workspace } = await readRuntimeSources();

  for (const label of [
    "Crop to AST table",
    "Rotate left",
    "Rotate right",
    "Preview crop and reassess quality",
    "Extract AST table",
    "Analyzing image...",
    "Cancel extraction",
  ]) assert.ok(workspace.includes(label), `missing user-facing control: ${label}`);

  assert.match(workspace, /IMAGE QUALITY: \{quality\.status\}/);
  assert.match(workspace, /POOR_IMAGE_MESSAGE/);
  assert.match(workspace, /extractCellAwareTable/);
  assert.match(workspace, /<progress max=\{1\} value=\{progress\.fraction\}/);
  assert.match(workspace, /aria-live=["']polite["']/);
  assert.match(workspace, /createExtractionLifecycle\(\)/);
  assert.match(workspace, /registerCleanup\(\(\) => worker\.terminate\(\)/);
  assert.match(workspace, /const active = lifecycleRef\.current;[\s\S]*?lifecycleRef\.current = null;[\s\S]*?void active\.cancel\(["']user-cancelled["']\);[\s\S]*?setBusy\(false\)/);
  assert.match(workspace, /await lifecycle\.dispose\(\)/);
});

test("untrusted OCR text confidence is never reused as orientation confidence", async () => {
  const { workspace } = await readRuntimeSources();
  const chunkOcr = await readFile(new URL('../src/features/image-concordance-cell-ocr.ts',import.meta.url),'utf8');

  assert.match(workspace, /rotationConfidence: null/);
  assert.match(workspace, /skewConfidence: null/);
  assert.match(workspace, /no validated angle confidence was available/i);
  assert.match(workspace, /no automatic rotation or deskew was applied/i);
  assert.match(workspace, /const safeSuggested = \{ \.\.\.FULL_CROP \}/, 'Recognition cannot prove unreadable rows are absent outside an automatic crop');
  assert.match(workspace, /automatic crop was not applied because its coordinates may be rotated/i);
  assert.doesNotMatch(workspace, /rotationConfidence:\s*ocrConfidence|skewConfidence:\s*ocrConfidence/);
  assert.match(chunkOcr, /rotateAuto:\s*false/);
  assert.doesNotMatch(chunkOcr, /rotateAuto:\s*true/);
});

test("overlapping extraction reports completeness and conflict state without claiming blanket success", async () => {
  const { workspace } = await readRuntimeSources();

  const runner = await readFile(new URL('../src/features/image-concordance-cell-ocr.ts',import.meta.url),'utf8');
  assert.match(runner, /planVerticalChunks/);
  assert.match(runner, /segmentPhysicalRows/);
  assert.match(runner, /summarizeExtraction/);
  for (const label of ["AST EXTRACTION", "Rows estimated", "Rows reconstructed", "Complete", "Require verification", "Unreadable"]) {
    assert.ok(workspace.includes(label), `missing completeness label: ${label}`);
  }
  assert.match(workspace, /Conflicting extraction — please verify\./);
  assert.match(workspace, /Missing or unreadable fields are never filled from expected resistance biology/);
  assert.doesNotMatch(workspace, /Extraction successful/i);
});

test("cell confidence, conservative suggestions, and explicit field verification reach the editable review table", async () => {
  const { analyzer, workspace } = await readRuntimeSources();

  assert.match(workspace, /extracted\.antimicrobial\.suggestions\.map/);
  assert.match(analyzer, /field\.confidence\+["'] CONFIDENCE["']/);
  assert.match(analyzer, /UNREADABLE/);
  assert.match(analyzer, /Did you mean \{suggestion\.label\}\?/);
  assert.match(analyzer, /Why this confidence\?/);
  assert.match(analyzer, /Verified ["']\+name/);
  assert.match(analyzer, /Confirmed absent \/ unreadable/);
  assert.match(analyzer, /aria-label=\{key==="antimicrobial"\?"Antimicrobial name":"MIC or zone"\}/);
  assert.match(analyzer, /aria-label=["']Susceptibility category["']/);

  const suggestionHandler = sourceSection(analyzer, "const applySuggestion", "const removeRow");
  assert.match(suggestionHandler, /updateRow\(/);
  assert.doesNotMatch(workspace, /suggestions\[0\].*canonical.*(?:row|antimicrobial)\s*=/s);
});

test("image rows preserve displayed units and field edits retire only stale field issues", async () => {
  const { analyzer, workspace } = await readRuntimeSources();

  assert.match(workspace, /const measurement = extracted\.mic\.raw \|\| \[extracted\.mic\.value, extracted\.mic\.unit\]/);
  assert.match(workspace, /field: issue\.field === ["']mic["'] \? ["']measurement["'] : issue\.field/);
  assert.match(analyzer, /issues:review\.issues\.filter\(issue=>issue\.field!==field\)/);
  assert.match(analyzer, /\{issue\.message\}/);
});

test("chunk section banners cannot be reparsed into duplicate image-review rows", async () => {
  const { analyzer, workspace } = await readRuntimeSources();

  assert.doesNotMatch(workspace, /Rebuild review from edited text|Review or edit recognized text|<textarea|onParseEditedText|onRawTextChange|reviewEditedAstText/);
  assert.doesNotMatch(analyzer, /Rebuild review from edited text|onParseEditedText|onRawTextChange|reviewEditedAstText/);
  assert.doesNotMatch(workspace, /SECTION ["']?\s*\+.* OF |chosenText|rawText:/);
  assert.match(analyzer, />Manual entry</);
  assert.match(workspace, /onExtraction\(result\)/);
});

test("concordance cannot run until extracted fields and the overall review are explicitly confirmed", async () => {
  const { analyzer, workspace } = await readRuntimeSources();
  const analyzeHandler = sourceSection(analyzer, "const analyze", "const runSelfTest");

  assertAppearsBefore(analyzeHandler, "if(!current.ready)", "analyzeConcordance(", "value-bound admission must precede scientific analysis");
  assert.match(analyzer, /humanReviewReadiness\(rows,imageReview,/);
  assert.match(analyzeHandler, /if\(!current.ready\).*return/s);
  assert.doesNotMatch(workspace, /analyzeConcordance|summarizeConcordance/);
  assert.match(analyzer, /I reviewed the image \(if used\), organism, marker, every antimicrobial name, every MIC\/zone string, every category, and every extraction warning/);
  assert.match(analyzer, /This analysis is processed for the current session and is not added to a persistent personal history/);
  assert.match(analyzer, /Uploaded images are not permanently saved/);
});
