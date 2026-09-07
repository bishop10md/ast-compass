import { useEffect, useRef, useState } from "react";
import { extractCellAwareTable, type CellAwareRow } from "../features/image-concordance-cell-ocr";
import {
  ExtractionCancelledError,
  POOR_IMAGE_MESSAGE,
  assessImageQuality,
  createExtractionLifecycle,
  createExtractionProgress,
  detectAstTableRegion,
  normalizeCropRegion,
  planOrientationCorrection,
  type CellConfidence,
  type ExtractedAstRow,
  type ExtractionCompletenessSummary,
  type ExtractionProgress,
  type OcrLine,
  type PixelRect,
} from "../features/image-concordance-extraction-core.mjs";
import {
  createImageWorkspace,
  type ImageCropLike,
} from "../features/image-concordance-image";
import {
  createAstOcrWorker,
  type AstOcrRecognition,
} from "../lib/ocr";
import {
  type AstCategory,
  type AstResultRow,
} from "../features/concordanceEngine";
import { imageAntimicrobialOptions as antimicrobialOptions } from "../data/coverageOptions";
import { INCOMPLETE_REVIEW_MESSAGE } from "../features/image-human-review.mjs";

export type ImageReviewFieldKey = "antimicrobial" | "measurement" | "category";
export type ImageFieldReview = {
  raw: string;
  confidence: CellConfidence["level"];
  score: number;
  reasons: string[];
  suggestions: Array<{ label: string; value: string; score: number }>;
  conflicts: string[];
  unreadable: boolean;
  verified: boolean;
  inspectedValue?: string;
  confirmedValue?: string;
  userEdited: boolean;
};
export type ImageReviewIssue = {
  field?: ImageReviewFieldKey | "row";
  message: string;
};
export type ImageRowReview = {
  physical?: CellAwareRow['physical'];
  status: ExtractedAstRow["status"];
  issues: ImageReviewIssue[];
  fields: Record<ImageReviewFieldKey, ImageFieldReview>;
};
export type ImageReviewMap = Record<string, ImageRowReview>;
export type ImageExtractionResult = {
  rows: AstResultRow[];
  review: ImageReviewMap;
  summary: ExtractionCompletenessSummary;
};

type CropBounds = { left: number; top: number; right: number; bottom: number };
type Props = {
  file: File;
  sourcePreview: string;
  privacyOcr: AstOcrRecognition;
  privacyImageSize: { width: number; height: number };
  acknowledged: boolean;
  onExtraction: (result: ImageExtractionResult) => void;
  onReset: () => void;
  onRemove: () => void;
  onBusyChange?: (busy: boolean) => void;
  onMessage?: (message: string) => void;
};

const FULL_CROP: CropBounds = { left: 0, top: 0, right: 100, bottom: 100 };
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

function cropLike(bounds: CropBounds): ImageCropLike {
  const normalized = normalizeCropRegion({
    x: bounds.left * 100,
    y: bounds.top * 100,
    width: (bounds.right - bounds.left) * 100,
    height: (bounds.bottom - bounds.top) * 100,
  }, { width: 10000, height: 10000 }).normalized;
  return { ...normalized, normalized };
}

function boundsFromRegion(region: PixelRect, imageSize: { width: number; height: number }): CropBounds {
  const left = clamp(region.x / imageSize.width * 100, 0, 95);
  const top = clamp(region.y / imageSize.height * 100, 0, 95);
  const right = clamp((region.x + region.width) / imageSize.width * 100, left + 5, 100);
  const bottom = clamp((region.y + region.height) / imageSize.height * 100, top + 5, 100);
  return { left, top, right, bottom };
}

function confidence(level: CellConfidence["level"]): AstResultRow["confidence"] {
  return level === "HIGH" ? "High" : level === "MEDIUM" ? "Moderate" : "Low";
}

function fieldReview(
  cell: { raw: string; value: string; confidence: CellConfidence },
  conflicts: string[],
  suggestions: ImageFieldReview["suggestions"] = [],
  unreadable = !cell.value,
): ImageFieldReview {
  return {
    raw: cell.raw,
    confidence: cell.confidence.level,
    score: cell.confidence.score,
    reasons: [...cell.confidence.reasons],
    suggestions,
    conflicts,
    unreadable,
    verified: false,
    userEdited: false,
  };
}

function mapExtractedRow(extracted: ExtractedAstRow): { row: AstResultRow; review: ImageRowReview } {
  const conflicts = (field: "antimicrobial" | "mic" | "category") => extracted.conflicts
    .filter((conflict) => conflict.field === field)
    .flatMap((conflict) => conflict.values);
  const antimicrobial = extracted.antimicrobial.canonical || extracted.antimicrobial.value || extracted.antimicrobial.raw;
  // The source cell is the display authority: unlike a normalized numeric
  // value, it retains an explicit operator glyph and unit (for example,
  // "≤0.25 µg/mL" or "20 mm").
  const measurement = extracted.mic.raw || [extracted.mic.value, extracted.mic.unit].filter(Boolean).join(" ");
  return {
    row: {
      id: extracted.id,
      antimicrobial,
      measurement,
      ...(extracted.mic.normalizedOperator ? { operator: extracted.mic.normalizedOperator } : {}),
      ...(Number.isFinite(extracted.mic.numericValue) ? { value: extracted.mic.numericValue } : {}),
      category: extracted.category.value as AstCategory,
      confidence: confidence(extracted.confidence.level),
      sourceText: extracted.sourceRefs.map((source) => source.text).join(" | "),
    },
    review: {
      ...('physical' in extracted ? {physical:(extracted as CellAwareRow).physical} : {}),
      status: extracted.status,
      issues: extracted.issues.map((issue) => ({
        field: issue.field === "mic" ? "measurement" : issue.field,
        message: issue.message,
      })),
      fields: {
        antimicrobial: fieldReview(
          extracted.antimicrobial,
          conflicts("antimicrobial"),
          extracted.antimicrobial.suggestions.map((suggestion) => ({
            label: suggestion.canonical,
            value: suggestion.dictionaryValue,
            score: suggestion.score,
          })),
          extracted.antimicrobial.matchStatus === "UNMATCHED" || !extracted.antimicrobial.raw.trim(),
        ),
        measurement: fieldReview(extracted.mic, conflicts("mic"), [], !extracted.mic.valid),
        category: fieldReview(extracted.category, conflicts("category"), [], extracted.category.value === "Unknown"),
      },
    },
  };
}

function manualField(value: string): ImageFieldReview {
  return {
    raw: value,
    confidence: "LOW",
    score: 0,
    reasons: ["Manually entered; compare with your source and explicitly confirm this field."],
    suggestions: [],
    conflicts: [],
    unreadable: !value.trim(),
    verified: false,
    userEdited: true,
  };
}

export function createManualImageRowReview(row: AstResultRow): ImageRowReview {
  return {
    status: "needs-verification",
    issues: [{ field: "row", message: "Manually added; every field requires explicit verification." }],
    fields: {
      antimicrobial: manualField(row.antimicrobial),
      measurement: manualField(row.measurement),
      category: manualField(row.category),
    },
  };
}


function asOcrLines(response: AstOcrRecognition, chunkId: string): OcrLine[] {
  const percent = (value?: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value! / 100)) : 0;
  if (response.data.lines?.length) {
    return response.data.lines.map((line, lineIndex) => ({
      ...line,
      confidence: percent(line.confidence),
      lineIndex,
      chunkId,
      words: line.words?.map((word) => ({ ...word, confidence: percent(word.confidence) })),
    }));
  }
  return (response.data.text || "").split(/\r?\n/).map((text) => text.trim()).filter(Boolean)
    .map((text, lineIndex) => ({ text, confidence: percent(response.data.confidence), lineIndex, chunkId }));
}

function privacyLines(response: AstOcrRecognition): OcrLine[] {
  return asOcrLines(response, "privacy-screen");
}


export default function ImageExtractionWorkspace({
  file,
  sourcePreview,
  privacyOcr,
  privacyImageSize,
  acknowledged,
  onExtraction,
  onReset,
  onRemove,
  onBusyChange,
  onMessage,
}: Props) {
  const [crop, setCrop] = useState<CropBounds>({ ...FULL_CROP });
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [skewDegrees, setSkewDegrees] = useState<number | null>(null);
  const [skewConfidence, setSkewConfidence] = useState<number | null>(null);
  const [cropNotice, setCropNotice] = useState("");
  const [orientationNotice, setOrientationNotice] = useState("");
  const [quality, setQuality] = useState<ReturnType<typeof assessImageQuality> | null>(null);
  const [localPreview, setLocalPreview] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [summary, setSummary] = useState<(ExtractionCompletenessSummary & {partial?:number}) | null>(null);
  const [notice, setNotice] = useState("");
  const previewUrl = useRef("");
  const previewAbortRef = useRef<AbortController | null>(null);
  const lifecycleRef = useRef<ReturnType<typeof createExtractionLifecycle> | null>(null);

  const setBusy = (value: boolean) => {
    setExtracting(value);
    onBusyChange?.(value);
  };
  const replaceLocalPreview = (blob: Blob) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = URL.createObjectURL(blob);
    setLocalPreview(previewUrl.current);
  };
  const clearLocalPreview = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = "";
    setLocalPreview("");
  };

  const assessAndPreview = async (bounds: CropBounds, rotation: number, skew: number | null, skewScore: number | null) => {
    previewAbortRef.current?.abort("preview-replaced");
    const controller = new AbortController();
    previewAbortRef.current = controller;
    setPreviewBusy(true);
    let workspace: Awaited<ReturnType<typeof createImageWorkspace>> | null = null;
    try {
      const orientation = planOrientationCorrection({
        width: privacyImageSize.width,
        height: privacyImageSize.height,
        manualRotationDegrees: rotation,
        skewDegrees: skew,
        skewConfidence: skewScore,
      });
      workspace = await createImageWorkspace(file, {
        rotationDegrees: orientation.rotationDegrees,
        deskewDegrees: orientation.deskewDegrees,
        crop: cropLike(bounds),
        maxDimension: 2800,
        signal: controller.signal,
      });
      const assessed = assessImageQuality({
        ...workspace.measureQuality(),
        rotationDegrees: 0,
        rotationConfidence: 1,
        skewDegrees: orientation.deskewDegrees ? 0 : skew,
        skewConfidence: orientation.deskewDegrees ? 1 : skewScore,
      });
      const rendered = await workspace.renderPreview(1600);
      if (controller.signal.aborted || previewAbortRef.current !== controller) return null;
      setQuality(assessed);
      replaceLocalPreview(rendered);
      const text = assessed.status === "POOR"
        ? POOR_IMAGE_MESSAGE
        : "Image quality is " + assessed.status + ". Review the crop before image-assisted extraction.";
      setNotice(text);
      onMessage?.(text);
      return assessed;
    } catch {
      if (controller.signal.aborted || previewAbortRef.current !== controller) return null;
      setNotice("Crop preview could not be prepared. Try a clearer image.");
      return null;
    } finally {
      workspace?.close();
      if (previewAbortRef.current === controller) {
        previewAbortRef.current = null;
        setPreviewBusy(false);
      }
    }
  };

  useEffect(() => {
    const lines = privacyLines(privacyOcr);
    const table = detectAstTableRegion({
      lines,
      dictionary: antimicrobialOptions,
      imageSize: privacyImageSize,
      paddingPx: 24,
    });
    const suggested = table.shouldSuggestCrop ? boundsFromRegion(table.region, privacyImageSize) : { ...FULL_CROP };
    setCropNotice(table.shouldSuggestCrop
      ? "A possible AST table region was detected. Confirm or adjust every crop edge."
      : "No confident AST table boundary was detected. Crop manually to the de-identified AST table.");
    const rawDegrees = Number.isFinite(privacyOcr.data.rotateRadians)
      ? (privacyOcr.data.rotateRadians || 0) * 180 / Math.PI
      : 0;
    // OCR boxes may be expressed in an auto-oriented frame. Until that frame
    // can be inverted with a validated angle, never apply its crop coordinates
    // to the original image automatically.
    // A recognition-based bounding box cannot prove that unreadable rows are
    // absent beyond it. Keep the original extent until the user chooses a crop.
    const safeSuggested = { ...FULL_CROP };
    void suggested;
    if (Math.abs(rawDegrees) > 0.5) {
      setCropNotice("A possible rotation was detected. The automatic crop was not applied because its coordinates may be rotated; use the manual rotation and crop controls.");
    }
    // Tesseract exposes a text-confidence score and a suggested angle, but no
    // independently validated angle-confidence score. Text confidence must
    // never be repurposed as orientation confidence.
    const orientation = planOrientationCorrection({
      width: privacyImageSize.width,
      height: privacyImageSize.height,
      detectedRotationDegrees: rawDegrees,
      rotationConfidence: null,
      skewDegrees: Math.abs(rawDegrees) <= 8 ? rawDegrees : null,
      skewConfidence: null,
    });
    setRotationDegrees(0);
    setSkewDegrees(null);
    setSkewConfidence(null);
    setCrop(safeSuggested);
    setOrientationNotice(Math.abs(rawDegrees) > 0.5
      ? `OCR suggested a possible ${Math.round(rawDegrees)}° orientation, but no validated angle confidence was available. No automatic rotation or deskew was applied; verify the preview and use the manual controls if needed.`
      : "No validated orientation confidence was available, so no automatic rotation or deskew was applied. Verify the preview before extraction.");
    // Keep the conservative plan call explicit for diagnostics, but never
    // apply its untrusted suggestion automatically.
    void orientation;
    void assessAndPreview(safeSuggested, 0, null, null).catch((error) => {
      setNotice(error instanceof Error ? error.message : "Crop preview could not be prepared.");
    });
    return () => {
      previewAbortRef.current?.abort("component-unmounted");
      previewAbortRef.current = null;
      const active = lifecycleRef.current;
      lifecycleRef.current = null;
      void active?.cancel("component-unmounted");
      onBusyChange?.(false);
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = "";
    };
    // A new cleared image remounts this workspace; callbacks are intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, privacyOcr, privacyImageSize.height, privacyImageSize.width]);

  const changeCrop = (edge: keyof CropBounds, value: number) => {
    setCrop((current) => {
      const next = { ...current, [edge]: value };
      if (edge === "left") next.left = Math.min(value, current.right - 5);
      if (edge === "right") next.right = Math.max(value, current.left + 5);
      if (edge === "top") next.top = Math.min(value, current.bottom - 5);
      if (edge === "bottom") next.bottom = Math.max(value, current.top + 5);
      return next;
    });
    setQuality(null);
    setSummary(null);
    setProgress(null);
    clearLocalPreview();
    setCropNotice("Crop changed. Preview and reassess it before extraction.");
    onReset();
  };

  const rotate = (amount: -90 | 90) => {
    const next = ((rotationDegrees + amount + 540) % 360) - 180;
    setRotationDegrees(next);
    setCrop({ ...FULL_CROP });
    setQuality(null);
    setSummary(null);
    setProgress(null);
    clearLocalPreview();
    setCropNotice("Rotation changed from the original image. Crop edges were reset.");
    setOrientationNotice("Manual rotation will be applied once from the original image.");
    onReset();
  };

  const extract = async () => {
    if (!acknowledged || extracting || lifecycleRef.current || previewBusy || !quality?.canProceed) return;
    const lifecycle = createExtractionLifecycle();
    lifecycleRef.current = lifecycle;
    setBusy(true);
    setSummary(null);
    onReset();
    try {
      setProgress(createExtractionProgress("quality", 0, 1, "Analyzing image..."));
      const orientation = planOrientationCorrection({
        width: privacyImageSize.width,
        height: privacyImageSize.height,
        manualRotationDegrees: rotationDegrees,
        skewDegrees,
        skewConfidence,
      });
      const workspaceOptions: Parameters<typeof createImageWorkspace>[1] = {
        rotationDegrees: orientation.rotationDegrees,
        deskewDegrees: orientation.deskewDegrees,
        crop: cropLike(crop),
        maxDimension: 2800,
        signal: lifecycle.signal,
      };
      const workspace = await createImageWorkspace(file, workspaceOptions);
      lifecycle.registerCleanup(() => workspace.close(), "image workspace");
      lifecycle.checkpoint("quality");
      const assessed = assessImageQuality({
        ...workspace.measureQuality(),
        rotationDegrees: 0,
        rotationConfidence: 1,
        skewDegrees: orientation.deskewDegrees ? 0 : skewDegrees,
        skewConfidence: orientation.deskewDegrees ? 1 : skewConfidence,
      });
      setQuality(assessed);
      if (!assessed.canProceed) {
        setNotice(POOR_IMAGE_MESSAGE);
        onMessage?.(POOR_IMAGE_MESSAGE);
        return;
      }

      const worker = await createAstOcrWorker(() => { /* Per-cell progress is reported by the bounded runner. */ });
      lifecycle.registerCleanup(() => worker.terminate(), "OCR worker");
      lifecycle.checkpoint("ocr");
      const candidate = await extractCellAwareTable({
        workspace, worker, dictionary: antimicrobialOptions, lifecycle,
        onProgress(current, total, message) {
          if (lifecycleRef.current !== lifecycle || lifecycle.signal.aborted) return;
          setProgress(createExtractionProgress("ocr", current, total, message));
          setNotice(message);
          onMessage?.(message);
        },
      });
      lifecycle.checkpoint("reconstruction");
      if (lifecycleRef.current !== lifecycle) return;
      const complete = candidate.summary;
      const mapped = candidate.rows.map(mapExtractedRow);
      const result: ImageExtractionResult = {
        rows: mapped.map((item) => item.row),
        review: Object.fromEntries(mapped.map((item) => [item.row.id, item.review])),
        summary: complete,
      };
      setSummary(complete);
      onExtraction(result);
      setProgress(createExtractionProgress("complete", 1, 1, complete.message));
      const finish = complete.message + " Review and verify every field before concordance analysis.";
      setNotice(finish);
      onMessage?.(finish);
    } catch (error) {
      if (lifecycleRef.current !== lifecycle) return;
      if (lifecycle.signal.aborted || error instanceof ExtractionCancelledError) {
        setProgress(createExtractionProgress("cancelled", 1, 1, "Extraction cancelled."));
        const text = "Extraction cancelled. Temporary OCR resources were released; the source image remains only in this browser session.";
        setNotice(text);
        onMessage?.(text);
      } else {
        const text = "AST extraction failed after privacy screening. Enter results manually or try a clearer crop.";
        setNotice(text);
        onMessage?.(text);
      }
    } finally {
      await lifecycle.dispose();
      if (lifecycleRef.current === lifecycle) {
        lifecycleRef.current = null;
        setBusy(false);
      }
    }
  };

  const cancel = () => {
    const active = lifecycleRef.current;
    if (!active) return;
    lifecycleRef.current = null;
    void active.cancel("user-cancelled");
    setBusy(false);
    setSummary(null);
    setProgress(createExtractionProgress("cancelled", 1, 1, "Extraction cancelled."));
    const text = "Extraction cancelled. No further extraction results will be accepted for this run. The source image remains only in this browser session.";
    setNotice(text);
    onMessage?.(text);
  };

  return <section className="image-diagnostics extraction-workspace" aria-labelledby="crop-to-ast-table">
    <div className="review-heading">
      <div><p className="eyebrow">After privacy clearance</p><h2 id="crop-to-ast-table">Crop to AST table</h2></div>
      {quality && <span className={`confidence-alert quality-badge quality-${quality.status.toLowerCase()}`}>IMAGE QUALITY: {quality.status}</span>}
    </div>
    <p>Remove headers, logos, blank space, footers, and unrelated information. Include only the de-identified AST table while keeping every antimicrobial row.</p>
    <div className="image-review">
      <div>
        <img src={localPreview || sourcePreview} alt="Local preview of the de-identified AST table crop" />
        <button type="button" className="secondary" disabled={extracting || previewBusy} onClick={onRemove}>Remove image</button>
      </div>
      <div>
        <fieldset className="crop-controls" disabled={extracting || previewBusy}>
          <legend>Crop edges (% of oriented image)</legend>
          <label>Left {Math.round(crop.left)}%<input type="range" min={0} max={Math.max(0, crop.right - 5)} value={crop.left} onChange={(event) => changeCrop("left", Number(event.target.value))} /></label>
          <label>Top {Math.round(crop.top)}%<input type="range" min={0} max={Math.max(0, crop.bottom - 5)} value={crop.top} onChange={(event) => changeCrop("top", Number(event.target.value))} /></label>
          <label>Right {Math.round(crop.right)}%<input type="range" min={Math.min(100, crop.left + 5)} max={100} value={crop.right} onChange={(event) => changeCrop("right", Number(event.target.value))} /></label>
          <label>Bottom {Math.round(crop.bottom)}%<input type="range" min={Math.min(100, crop.top + 5)} max={100} value={crop.bottom} onChange={(event) => changeCrop("bottom", Number(event.target.value))} /></label>
        </fieldset>
        <div className="crop-actions">
          <button type="button" className="secondary" disabled={extracting || previewBusy} onClick={() => rotate(-90)}>Rotate left</button>{" "}
          <button type="button" className="secondary" disabled={extracting || previewBusy} onClick={() => rotate(90)}>Rotate right</button>{" "}
          <button type="button" className="secondary" disabled={extracting || previewBusy} onClick={() => { setCrop({ ...FULL_CROP }); setQuality(null); setSummary(null); setProgress(null); clearLocalPreview(); setCropNotice("Full image restored. Crop again to include only the AST table."); onReset(); }}>Reset crop</button>
        </div>
        <p className="ocr-status">{cropNotice}</p>
        <p className="ocr-status">{orientationNotice} Rotation and deskew use the original image, not a repeatedly recompressed copy.</p>
        <button type="button" className="secondary" disabled={previewBusy || extracting} onClick={() => void assessAndPreview(crop, rotationDegrees, skewDegrees, skewConfidence)}>{previewBusy ? "Preparing crop preview..." : "Preview crop and reassess quality"}</button>
        {quality?.issues.length ? <details><summary>Quality details</summary><ul>{quality.issues.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul></details> : null}
        {quality?.status === "POOR" && <p className="analysis-readiness error" role="alert">{POOR_IMAGE_MESSAGE}</p>}
        <button type="button" className="primary" disabled={!acknowledged || extracting || previewBusy || !quality || !quality.canProceed} onClick={() => void extract()}>{extracting ? "Analyzing image..." : "Extract AST table"}</button>
        {extracting && <button type="button" className="secondary" onClick={() => void cancel()}>Cancel extraction</button>}
        <small>Image-assisted extraction runs locally in this browser. No image is sent to an external AI or cloud OCR service.</small>
        {progress && <div className="extraction-progress" aria-live="polite">
          <progress max={1} value={progress.fraction}>{Math.round(progress.fraction * 100)}%</progress>
          <p>{progress.message}</p>
        </div>}
        {notice && <p className="ocr-status" aria-live="polite">{notice}</p>}
      </div>
    </div>
    {summary && <div className="extraction-completeness">
      <p className="eyebrow">AST EXTRACTION</p>
      <div className="summary-grid">
        <div className="summary-card"><b>{summary.rowsDetected}</b><span>Rows estimated</span></div>
        <div className="summary-card"><b>{summary.rowsReconstructed}</b><span>Rows reconstructed</span></div>
        <div className="summary-card"><b>{summary.complete}</b><span>Complete</span></div>
        <div className="summary-card"><b>{summary.partial ?? 0}</b><span>Partial</span></div>
        <div className="summary-card"><b>{summary.requiringVerification}</b><span>Require verification</span></div>
        <div className="summary-card"><b>{summary.unreadable}</b><span>Unreadable</span></div>
      </div>
      <p>{INCOMPLETE_REVIEW_MESSAGE}</p>
      {summary.conflicts > 0 && <p className="analysis-readiness error"><b>Conflicting extraction — please verify.</b></p>}
      <small>Counts are estimates. Missing or unreadable fields are never filled from expected resistance biology.</small>
    </div>}
  </section>;
}
