export const POOR_IMAGE_MESSAGE: "This image may be difficult to read accurately. Crop to the AST table or upload a clearer/high-resolution image.";

export type QualityRating = "GOOD" | "FAIR" | "POOR";
export interface ImageQualityMetrics {
  width: number;
  height: number;
  /** Variance of a Laplacian or equivalent edge-sharpness measurement. */
  blurVariance?: number | null;
  /** Standard deviation of grayscale luminance on a 0–255 scale. */
  contrastStdDev?: number | null;
  estimatedTextHeightPx?: number | null;
  /** Observed clockwise text orientation, in degrees. */
  rotationDegrees?: number | null;
  /** 0–1 or Tesseract-style 0–100 confidence. */
  rotationConfidence?: number | null;
  skewDegrees?: number | null;
  /** 0–1 or Tesseract-style 0–100 confidence. */
  skewConfidence?: number | null;
}
export interface ImageQualityThresholds {
  goodPixelCount: number;
  minimumPixelCount: number;
  minimumDimension: number;
  goodBlurVariance: number;
  minimumBlurVariance: number;
  goodContrastStdDev: number;
  minimumContrastStdDev: number;
  goodTextHeightPx: number;
  minimumTextHeightPx: number;
  goodSkewDegrees: number;
  maximumSkewDegrees: number;
}
export interface QualityIssue {
  code: string;
  severity: "warning" | "blocking";
  metric: keyof ImageQualityMetrics;
  measured: number | null;
  threshold?: number;
  message: string;
}
export interface ImageQualityResult {
  status: QualityRating;
  rating: QualityRating;
  score: number;
  canProceed: boolean;
  metrics: Readonly<Required<ImageQualityMetrics>>;
  issues: readonly QualityIssue[];
  message?: string;
}
export function assessImageQuality(metrics: ImageQualityMetrics, thresholdOverrides?: Partial<ImageQualityThresholds>): ImageQualityResult;

export interface PixelRect { x: number; y: number; width: number; height: number }
export interface ImageSize { width: number; height: number }
export interface NormalizedCropRegion extends PixelRect {
  sourceWidth: number;
  sourceHeight: number;
  /** Unit coordinates, each within 0–1. */
  normalized: PixelRect;
}
export function normalizeCropRegion(region: Partial<PixelRect> | null | undefined, imageSize: ImageSize): NormalizedCropRegion;

export interface OrientationInput extends ImageSize {
  /** Observed clockwise text orientation. Automatic correction uses its inverse. */
  detectedRotationDegrees?: number | null;
  rotationConfidence?: number | null;
  skewDegrees?: number | null;
  skewConfidence?: number | null;
  /** Explicit correction: -90 rotates left and 90 rotates right. */
  manualRotationDegrees?: number | null;
}
export interface OrientationPlan {
  source: "manual" | "automatic" | "none";
  rotationDegrees: number;
  deskewDegrees: number;
  totalCorrectionDegrees: number;
  outputWidth: number;
  outputHeight: number;
  applyFromOriginal: true;
  requiresManualReview: boolean;
  warnings: readonly string[];
}
export function planOrientationCorrection(input: OrientationInput): OrientationPlan;

export type PreprocessingVariantId = "original" | "grayscale-normalized" | "sharpened" | "adaptive-threshold";
export type PreprocessingOperation =
  | { type: "crop"; region: PixelRect }
  | { type: "rotate"; degrees: number; fromOriginal: true }
  | { type: "deskew"; degrees: number; fromOriginal: true }
  | { type: "upscale"; scale: number; interpolation: "high-quality" }
  | { type: "grayscale" }
  | { type: "contrast-normalization"; clipPercentiles: readonly [number, number] }
  | { type: "sharpen"; amount: number }
  | { type: "adaptive-threshold"; windowSize: number; bias: number };
export interface PreprocessingVariant {
  id: PreprocessingVariantId;
  label: string;
  operations: readonly PreprocessingOperation[];
  estimatedScale: number;
}
export interface PreprocessingPlan {
  preserveOriginal: true;
  source: "original";
  crop?: PixelRect;
  orientation?: OrientationPlan;
  upscaleFactor: number;
  variants: readonly PreprocessingVariant[];
  maxConcurrentVariants: 1;
  releaseAfterEachVariant: true;
}
export function createPreprocessingPlan(input?: { quality?: ImageQualityResult | null; crop?: PixelRect | null; orientation?: OrientationPlan | null; maxUpscale?: number }): PreprocessingPlan;

export interface VerticalChunk {
  id: string;
  /** Zero-based array index. */
  index: number;
  /** One-based section number for progress copy. */
  sectionNumber: number;
  totalSections: number;
  rect: PixelRect;
  overlapTopPx: number;
  overlapBottomPx: number;
  progressMessage: string;
}
export function planVerticalChunks(input: { region: PixelRect; maxChunkHeight?: number; overlapPx?: number; minChunkHeight?: number }): readonly VerticalChunk[];

export type ExtractionStage = "quality" | "region-detection" | "preprocessing" | "ocr" | "reconstruction" | "deduplication" | "complete" | "cancelled";
export interface ExtractionProgress {
  stage: ExtractionStage;
  current: number;
  total: number;
  fraction: number;
  message: string;
}
export function createExtractionProgress(stage: ExtractionStage, current: number, total: number, message?: string): ExtractionProgress;

export class ExtractionCancelledError extends Error {
  readonly code: "EXTRACTION_CANCELLED";
  readonly stage: string | null;
  readonly reason: unknown;
  constructor(stage?: string, reason?: unknown);
}
export interface CleanupResult { released: number; errors: Array<{ label: string; error: unknown }> }
export interface ExtractionLifecycle {
  readonly signal: AbortSignal;
  readonly disposed: boolean;
  readonly cancelled: boolean;
  registerCleanup(cleanup: () => void | Promise<unknown>, label?: string): () => boolean;
  checkpoint(stage?: string): void;
  cancel(reason?: unknown): Promise<CleanupResult>;
  dispose(): Promise<CleanupResult>;
}
export function createExtractionLifecycle(): ExtractionLifecycle;

export interface CellConfidence {
  score: number;
  level: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
}
export interface AntimicrobialDictionaryEntry {
  value: string;
  label: string;
  aliases?: readonly string[];
}
export interface AntimicrobialSuggestion {
  canonical: string;
  dictionaryValue: string;
  matchedAlias: string;
  score: number;
}
export interface ExtractedAntimicrobialCell {
  raw: string;
  value: string;
  matchStatus: "EXACT" | "ALIAS" | "SUGGESTION" | "UNMATCHED";
  /** Set only for exact canonical/explicit-alias matches; never for fuzzy suggestions. */
  canonical?: string;
  /** Set only for exact canonical/explicit-alias matches; never for fuzzy suggestions. */
  dictionaryValue?: string;
  suggestions: AntimicrobialSuggestion[];
  confidence: CellConfidence;
}
export type MicSourceOperator = "<" | "<=" | "≤" | "=" | "≥" | ">=" | ">";
export type NormalizedMicOperator = "<" | "<=" | "=" | ">=" | ">";
export interface ExtractedMicCell {
  raw: string;
  /** Operator + number + explicit unit as represented in the OCR cell. */
  value: string;
  operator?: MicSourceOperator;
  normalizedOperator?: NormalizedMicOperator;
  numericValue?: number;
  /** Explicit source unit retained for display, including its source glyph. */
  unit?: string;
  /** Conservative comparison form; source spelling remains in `unit`. */
  normalizedUnit?: string;
  valid: boolean;
  confidence: CellConfidence;
  conflictCandidates?: string[];
}
export type ExtractedAstCategory = "S" | "I" | "R" | "SDD" | "NS" | "Unknown";
export interface ExtractedCategoryCell {
  raw: string;
  value: ExtractedAstCategory;
  confidence: CellConfidence;
  conflictCandidates?: ExtractedAstCategory[];
}
export interface BBox { x0: number; y0: number; x1: number; y1: number }
export interface OcrWord { text: string; confidence?: number; bbox?: BBox | PixelRect }
export interface OcrLine {
  text?: string;
  confidence?: number;
  bbox?: BBox | PixelRect;
  words?: readonly OcrWord[];
  lineIndex?: number;
  chunkId?: string;
}
export interface OcrSourceTransform {
  /** Global workspace x/y coordinate of the rendered chunk. */
  offsetX?: number;
  offsetY?: number;
  /** Rendered pixels per workspace source pixel. */
  scaleX?: number;
  scaleY?: number;
  chunkId?: string;
}
export function mapOcrLinesToSource(lines: string | readonly (string | OcrLine)[], transform?: OcrSourceTransform): readonly OcrLine[];
export function regroupOcrRows(lines: string | readonly (string | OcrLine)[]): OcrLine[];
export function reconcileExtractionPasses(passes: readonly (readonly ExtractedAstRow[])[]): readonly ExtractedAstRow[];
export interface SourceRef {
  chunkId: string;
  lineIndex: number;
  text: string;
  /** Global image coordinates. Offset chunk-local OCR boxes before merging. */
  bbox?: BBox;
}
export interface RowIssue {
  code: string;
  field?: "antimicrobial" | "mic" | "category" | "row";
  severity: "warning" | "error";
  message: string;
}
export interface FieldConflict {
  field: "antimicrobial" | "mic" | "category";
  values: string[];
  sourceRefs: SourceRef[];
}
export interface ExtractedAstRow {
  id: string;
  antimicrobial: ExtractedAntimicrobialCell;
  mic: ExtractedMicCell;
  category: ExtractedCategoryCell;
  confidence: CellConfidence;
  status: "complete" | "needs-verification" | "unreadable" | "conflict";
  issues: RowIssue[];
  sourceRefs: SourceRef[];
  conflicts: FieldConflict[];
}
export function matchAntimicrobial(raw: string, dictionary: readonly AntimicrobialDictionaryEntry[], options?: { ocrConfidence?: number }): ExtractedAntimicrobialCell;
export function parseMicCell(raw: string, ocrConfidence?: number): ExtractedMicCell;

export interface TableColumnGroup { columns: Partial<Record<"antimicrobial" | "mic" | "category", number>>; order: Array<"antimicrobial" | "mic" | "category"> }
export interface TableColumnLayout {
  headerLineIndex: number | null;
  source: "spatial" | "delimited" | "character" | "none";
  confidence: CellConfidence;
  columns: Partial<Record<"antimicrobial" | "mic" | "category", number>>;
  order: Array<"antimicrobial" | "mic" | "category">;
  groups?: TableColumnGroup[];
}
export function detectTableColumns(lines: string | readonly (string | OcrLine)[]): TableColumnLayout;

export interface ExtractionCompletenessSummary {
  status: "COMPLETE" | "VERIFICATION_REQUIRED" | "INCOMPLETE";
  rowsDetected: number;
  rowsReconstructed: number;
  complete: number;
  requiringVerification: number;
  unreadable: number;
  conflicts: number;
  message: string;
}
export interface ReconstructedAstTable {
  rows: readonly ExtractedAstRow[];
  detectedRowCount: number;
  sourceLineCount: number;
  table: TableColumnLayout;
  completeness: ExtractionCompletenessSummary;
}
export function reconstructAstTable(input: { lines?: string | readonly (string | OcrLine)[]; rawOcrText?: string; dictionary: readonly AntimicrobialDictionaryEntry[]; chunkId?: string; layout?: TableColumnLayout }): ReconstructedAstTable;

export interface DetectedTableRegion {
  region: PixelRect;
  confidence: CellConfidence;
  source: "detected" | "full-image";
  candidateLineIndexes: readonly number[];
  shouldSuggestCrop: boolean;
  reason: string;
}
export function detectAstTableRegion(input: { lines: string | readonly (string | OcrLine)[]; dictionary: readonly AntimicrobialDictionaryEntry[]; imageSize: ImageSize; paddingPx?: number }): DetectedTableRegion;

export interface MergeChunkRowsResult {
  rows: readonly ExtractedAstRow[];
  duplicatesMerged: number;
  conflictCount: number;
}
export function mergeChunkRows(rows: readonly ExtractedAstRow[]): MergeChunkRowsResult;
export function summarizeExtraction(rows: readonly ExtractedAstRow[], detectedRowCount?: number): ExtractionCompletenessSummary;
