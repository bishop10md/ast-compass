/**
 * Browser-local, dependency-free primitives for image-assisted AST extraction.
 *
 * This module deliberately does not perform clinical or concordance inference.
 * It accepts pixel/OCR measurements, preserves source strings, and makes
 * uncertainty explicit for a later human-verification step.
 */

export const POOR_IMAGE_MESSAGE = "This image may be difficult to read accurately. Crop to the AST table or upload a clearer/high-resolution image.";

const QUALITY_DEFAULTS = Object.freeze({
  goodPixelCount: 1_000_000,
  minimumPixelCount: 300_000,
  minimumDimension: 250,
  goodBlurVariance: 100,
  minimumBlurVariance: 45,
  goodContrastStdDev: 28,
  minimumContrastStdDev: 12,
  goodTextHeightPx: 13,
  minimumTextHeightPx: 8,
  goodSkewDegrees: 2,
  maximumSkewDegrees: 8,
});

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const round = (value, digits = 4) => Number(value.toFixed(digits));
const normalizeScore = (value, fallback = 0.5) => {
  if (!isFiniteNumber(value)) return fallback;
  return clamp(value > 1 ? value / 100 : value, 0, 1);
};
const normalizeDegrees = (degrees) => {
  const normalized = ((degrees % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
};
const confidenceFor = (score, reasons = []) => {
  const normalized = round(clamp(score, 0, 1), 3);
  return {
    score: normalized,
    level: normalized >= 0.85 ? "HIGH" : normalized >= 0.6 ? "MEDIUM" : "LOW",
    reasons: [...new Set(reasons.filter(Boolean))],
  };
};
const deepFreeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

/** Grade pixel-derived quality metrics without reading or changing an image. */
export function assessImageQuality(metrics, thresholdOverrides = {}) {
  if (!metrics || !isFiniteNumber(metrics.width) || !isFiniteNumber(metrics.height) || metrics.width <= 0 || metrics.height <= 0) {
    throw new TypeError("Image quality assessment requires positive width and height values.");
  }
  const thresholds = { ...QUALITY_DEFAULTS, ...thresholdOverrides };
  const measured = {
    width: metrics.width,
    height: metrics.height,
    blurVariance: isFiniteNumber(metrics.blurVariance) ? metrics.blurVariance : null,
    contrastStdDev: isFiniteNumber(metrics.contrastStdDev) ? metrics.contrastStdDev : null,
    estimatedTextHeightPx: isFiniteNumber(metrics.estimatedTextHeightPx) ? metrics.estimatedTextHeightPx : null,
    rotationDegrees: isFiniteNumber(metrics.rotationDegrees) ? normalizeDegrees(metrics.rotationDegrees) : null,
    rotationConfidence: isFiniteNumber(metrics.rotationConfidence) ? normalizeScore(metrics.rotationConfidence) : null,
    skewDegrees: isFiniteNumber(metrics.skewDegrees) ? normalizeDegrees(metrics.skewDegrees) : null,
    skewConfidence: isFiniteNumber(metrics.skewConfidence) ? normalizeScore(metrics.skewConfidence) : null,
  };
  const issues = [];
  const addIssue = (code, severity, metric, value, threshold, message) => issues.push({ code, severity, metric, measured: value, ...(threshold === undefined ? {} : { threshold }), message });
  const pixelCount = measured.width * measured.height;

  if (Math.min(measured.width, measured.height) < thresholds.minimumDimension) {
    addIssue("dimension-too-small", "blocking", measured.width <= measured.height ? "width" : "height", Math.min(measured.width, measured.height), thresholds.minimumDimension, "One image dimension is too small for dependable table OCR.");
  } else if (pixelCount < thresholds.minimumPixelCount) {
    addIssue("resolution-too-low", "blocking", "width", pixelCount, thresholds.minimumPixelCount, "The image contains too few pixels for dependable table OCR.");
  } else if (pixelCount < thresholds.goodPixelCount) {
    addIssue("resolution-limited", "warning", "width", pixelCount, thresholds.goodPixelCount, "Image resolution may limit small-text recognition.");
  }

  const assessLowerBound = (key, poor, good, poorCode, fairCode, missingCode, label) => {
    const value = measured[key];
    if (value === null) {
      addIssue(missingCode, "warning", key, null, undefined, `${label} was not measured; quality cannot be rated GOOD.`);
    } else if (value < poor) {
      addIssue(poorCode, "blocking", key, value, poor, `${label} is below the conservative OCR threshold.`);
    } else if (value < good) {
      addIssue(fairCode, "warning", key, value, good, `${label} may reduce OCR accuracy.`);
    }
  };
  assessLowerBound("blurVariance", thresholds.minimumBlurVariance, thresholds.goodBlurVariance, "image-blurred", "image-soft", "blur-not-measured", "Sharpness");
  assessLowerBound("contrastStdDev", thresholds.minimumContrastStdDev, thresholds.goodContrastStdDev, "contrast-too-low", "contrast-limited", "contrast-not-measured", "Contrast");
  assessLowerBound("estimatedTextHeightPx", thresholds.minimumTextHeightPx, thresholds.goodTextHeightPx, "text-too-small", "text-small", "text-size-not-measured", "Estimated text size");

  if (measured.skewDegrees === null) {
    addIssue("skew-not-measured", "warning", "skewDegrees", null, undefined, "Skew was not measured; quality cannot be rated GOOD.");
  } else {
    const absoluteSkew = Math.abs(measured.skewDegrees);
    if (absoluteSkew > thresholds.maximumSkewDegrees) addIssue("skew-too-large", "blocking", "skewDegrees", measured.skewDegrees, thresholds.maximumSkewDegrees, "The table is too skewed for automatic correction with confidence.");
    else if (absoluteSkew > thresholds.goodSkewDegrees) addIssue("skew-detected", "warning", "skewDegrees", measured.skewDegrees, thresholds.goodSkewDegrees, "Table skew should be corrected before OCR.");
  }

  if (measured.rotationDegrees === null) {
    addIssue("rotation-not-measured", "warning", "rotationDegrees", null, undefined, "Rotation was not measured; quality cannot be rated GOOD.");
  } else if (Math.abs(measured.rotationDegrees) > 2) {
    const nearestQuarterTurn = Math.round(measured.rotationDegrees / 90) * 90;
    const confidentlyCorrectable = Math.abs(measured.rotationDegrees - nearestQuarterTurn) <= 8 && (measured.rotationConfidence ?? 0) >= 0.8;
    addIssue(confidentlyCorrectable ? "rotation-correctable" : "rotation-review-needed", confidentlyCorrectable ? "warning" : "blocking", "rotationDegrees", measured.rotationDegrees, confidentlyCorrectable ? 2 : 8, confidentlyCorrectable ? "Obvious rotation can be corrected from the original image before OCR." : "Image rotation could not be corrected automatically with confidence.");
  }

  const blockingCount = issues.filter((issue) => issue.severity === "blocking").length;
  const warningCount = issues.length - blockingCount;
  const status = blockingCount ? "POOR" : warningCount ? "FAIR" : "GOOD";
  const score = clamp(100 - blockingCount * 30 - warningCount * 10, 0, 100);
  return deepFreeze({
    status,
    rating: status,
    score,
    canProceed: status !== "POOR",
    metrics: measured,
    issues,
    ...(status === "POOR" ? { message: POOR_IMAGE_MESSAGE } : {}),
  });
}

/** Clamp a user-selected crop to integer source-image coordinates. */
export function normalizeCropRegion(region, imageSize) {
  if (!imageSize || !isFiniteNumber(imageSize.width) || !isFiniteNumber(imageSize.height) || imageSize.width <= 0 || imageSize.height <= 0) {
    throw new TypeError("Crop normalization requires positive source dimensions.");
  }
  const sourceWidth = Math.round(imageSize.width);
  const sourceHeight = Math.round(imageSize.height);
  const requested = region || { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  const rawX = isFiniteNumber(requested.x) ? requested.x : 0;
  const rawY = isFiniteNumber(requested.y) ? requested.y : 0;
  const rawWidth = isFiniteNumber(requested.width) ? requested.width : sourceWidth - rawX;
  const rawHeight = isFiniteNumber(requested.height) ? requested.height : sourceHeight - rawY;
  if (rawWidth <= 0 || rawHeight <= 0) throw new RangeError("Crop width and height must be positive.");
  const x = clamp(Math.floor(rawX), 0, sourceWidth - 1);
  const y = clamp(Math.floor(rawY), 0, sourceHeight - 1);
  const x1 = clamp(Math.ceil(rawX + rawWidth), x + 1, sourceWidth);
  const y1 = clamp(Math.ceil(rawY + rawHeight), y + 1, sourceHeight);
  const normalized = {
    x: round(x / sourceWidth),
    y: round(y / sourceHeight),
    width: round((x1 - x) / sourceWidth),
    height: round((y1 - y) / sourceHeight),
  };
  return deepFreeze({ x, y, width: x1 - x, height: y1 - y, sourceWidth, sourceHeight, normalized });
}

/**
 * Describe a single correction from the original pixels. detectedRotationDegrees
 * is the observed clockwise orientation; manualRotationDegrees is the correction
 * the user explicitly requested (left = -90, right = 90).
 */
export function planOrientationCorrection(input) {
  if (!input || !isFiniteNumber(input.width) || !isFiniteNumber(input.height) || input.width <= 0 || input.height <= 0) {
    throw new TypeError("Orientation planning requires positive width and height.");
  }
  const warnings = [];
  let source = "none";
  let rotationDegrees = 0;
  let requiresManualReview = false;
  if (isFiniteNumber(input.manualRotationDegrees)) {
    const manual = normalizeDegrees(input.manualRotationDegrees);
    if (Math.abs(manual / 90 - Math.round(manual / 90)) > 1e-8) throw new RangeError("Manual rotation must be a multiple of 90 degrees.");
    source = manual ? "manual" : "none";
    rotationDegrees = manual;
  } else if (isFiniteNumber(input.detectedRotationDegrees)) {
    const detected = normalizeDegrees(input.detectedRotationDegrees);
    const nearestQuarterTurn = normalizeDegrees(Math.round(detected / 90) * 90);
    const confidence = normalizeScore(input.rotationConfidence, 0);
    if (Math.abs(detected) <= 2) {
      source = "none";
    } else if (confidence >= 0.8 && Math.abs(normalizeDegrees(detected - nearestQuarterTurn)) <= 8) {
      source = "automatic";
      rotationDegrees = normalizeDegrees(-nearestQuarterTurn);
    } else {
      requiresManualReview = true;
      warnings.push("Rotation was detected but not corrected automatically because confidence was insufficient.");
    }
  }

  let deskewDegrees = 0;
  if (isFiniteNumber(input.skewDegrees)) {
    const skew = normalizeDegrees(input.skewDegrees);
    const confidence = normalizeScore(input.skewConfidence, 0);
    if (Math.abs(skew) >= 0.35 && Math.abs(skew) <= 5 && confidence >= 0.85) {
      deskewDegrees = round(-skew, 2);
      if (source === "none") source = "automatic";
    } else if (Math.abs(skew) > 0.35) {
      requiresManualReview = true;
      warnings.push(Math.abs(skew) > 5 ? "Skew exceeds the safe automatic-correction range." : "Skew was not corrected automatically because confidence was insufficient.");
    }
  }
  const quarterTurns = Math.abs(Math.round(rotationDegrees / 90)) % 2;
  const outputWidth = quarterTurns ? Math.round(input.height) : Math.round(input.width);
  const outputHeight = quarterTurns ? Math.round(input.width) : Math.round(input.height);
  return deepFreeze({
    source,
    rotationDegrees,
    deskewDegrees,
    totalCorrectionDegrees: round(rotationDegrees + deskewDegrees, 2),
    outputWidth,
    outputHeight,
    applyFromOriginal: true,
    requiresManualReview,
    warnings,
  });
}

/** Build immutable extraction variants; callers render each variant on demand. */
export function createPreprocessingPlan(input = {}) {
  const quality = input.quality || null;
  const crop = input.crop ? { x: input.crop.x, y: input.crop.y, width: input.crop.width, height: input.crop.height } : undefined;
  const orientation = input.orientation || undefined;
  const textHeight = quality?.metrics?.estimatedTextHeightPx;
  const maximumUpscale = clamp(isFiniteNumber(input.maxUpscale) ? input.maxUpscale : 2.5, 1, 4);
  const desiredScale = isFiniteNumber(textHeight) && textHeight > 0 && textHeight < 16 ? 16 / textHeight : 1;
  const upscaleFactor = round(clamp(desiredScale, 1, maximumUpscale), 2);
  const baseOperations = [];
  if (crop) baseOperations.push({ type: "crop", region: { ...crop } });
  if (orientation?.rotationDegrees) baseOperations.push({ type: "rotate", degrees: orientation.rotationDegrees, fromOriginal: true });
  if (orientation?.deskewDegrees) baseOperations.push({ type: "deskew", degrees: orientation.deskewDegrees, fromOriginal: true });
  const scaled = upscaleFactor > 1 ? [...baseOperations, { type: "upscale", scale: upscaleFactor, interpolation: "high-quality" }] : [...baseOperations];
  const variants = [
    { id: "original", label: "Original crop", operations: baseOperations, estimatedScale: 1 },
    { id: "grayscale-normalized", label: "Grayscale + normalized contrast", operations: [...scaled, { type: "grayscale" }, { type: "contrast-normalization", clipPercentiles: [1, 99] }], estimatedScale: upscaleFactor },
    { id: "sharpened", label: "Normalized + sharpened", operations: [...scaled, { type: "grayscale" }, { type: "contrast-normalization", clipPercentiles: [1, 99] }, { type: "sharpen", amount: quality?.status === "POOR" ? 0.65 : 0.45 }], estimatedScale: upscaleFactor },
    { id: "adaptive-threshold", label: "Adaptive threshold", operations: [...scaled, { type: "grayscale" }, { type: "adaptive-threshold", windowSize: 25, bias: 7 }], estimatedScale: upscaleFactor },
  ];
  return deepFreeze({
    preserveOriginal: true,
    source: "original",
    ...(crop ? { crop } : {}),
    ...(orientation ? { orientation } : {}),
    upscaleFactor,
    variants,
    maxConcurrentVariants: 1,
    releaseAfterEachVariant: true,
  });
}

/** Plan overlapping top-to-bottom source rectangles with guaranteed bottom coverage. */
export function planVerticalChunks(input) {
  if (!input?.region) throw new TypeError("Vertical chunk planning requires a region.");
  const region = {
    x: Math.round(input.region.x),
    y: Math.round(input.region.y),
    width: Math.round(input.region.width),
    height: Math.round(input.region.height),
  };
  if (Object.values(region).some((value) => !isFiniteNumber(value)) || region.width <= 0 || region.height <= 0) throw new RangeError("Chunk region dimensions must be positive finite numbers.");
  const maxChunkHeight = Math.max(1, Math.round(isFiniteNumber(input.maxChunkHeight) ? input.maxChunkHeight : 1400));
  const overlapPx = Math.max(0, Math.round(isFiniteNumber(input.overlapPx) ? input.overlapPx : Math.min(180, maxChunkHeight * 0.15)));
  if (overlapPx >= maxChunkHeight) throw new RangeError("Chunk overlap must be smaller than the maximum chunk height.");
  const minChunkHeight = Math.min(maxChunkHeight, Math.max(1, Math.round(isFiniteNumber(input.minChunkHeight) ? input.minChunkHeight : Math.min(500, maxChunkHeight * 0.5))));
  const localStarts = [0];
  while (localStarts.at(-1) + maxChunkHeight < region.height) {
    const current = localStarts.at(-1);
    let next = current + maxChunkHeight - overlapPx;
    const remaining = region.height - next;
    if (remaining < minChunkHeight) next = Math.max(current + 1, region.height - minChunkHeight);
    if (next <= current) break;
    localStarts.push(next);
  }
  const rectangles = localStarts.map((start) => ({ x: region.x, y: region.y + start, width: region.width, height: Math.min(maxChunkHeight, region.height - start) }));
  const totalSections = rectangles.length;
  const chunks = rectangles.map((rect, index) => {
    const previous = rectangles[index - 1];
    const next = rectangles[index + 1];
    return {
      id: `chunk-${index + 1}-of-${totalSections}`,
      index,
      sectionNumber: index + 1,
      totalSections,
      rect,
      overlapTopPx: previous ? Math.max(0, previous.y + previous.height - rect.y) : 0,
      overlapBottomPx: next ? Math.max(0, rect.y + rect.height - next.y) : 0,
      progressMessage: `Processing section ${index + 1} of ${totalSections}...`,
    };
  });
  return deepFreeze(chunks);
}

const PROGRESS_STAGES = new Set(["quality", "region-detection", "preprocessing", "ocr", "reconstruction", "deduplication", "complete", "cancelled"]);

export function createExtractionProgress(stage, current, total, message) {
  if (!PROGRESS_STAGES.has(stage)) throw new RangeError(`Unknown extraction stage: ${stage}`);
  if (!isFiniteNumber(total) || total <= 0) throw new RangeError("Progress total must be positive.");
  const safeCurrent = clamp(isFiniteNumber(current) ? current : 0, 0, total);
  return Object.freeze({ stage, current: safeCurrent, total, fraction: round(safeCurrent / total, 4), message: message || (stage === "ocr" ? `Processing section ${safeCurrent} of ${total}...` : "Analyzing image...") });
}

export class ExtractionCancelledError extends Error {
  constructor(stage, reason = "user-cancelled") {
    super(`Image extraction was cancelled${stage ? ` during ${stage}` : ""}.`);
    this.name = "ExtractionCancelledError";
    this.code = "EXTRACTION_CANCELLED";
    this.stage = stage || null;
    this.reason = reason;
  }
}

/** Register worker/bitmap/object-URL cleanup and bind it to one AbortSignal. */
export function createExtractionLifecycle() {
  const controller = new AbortController();
  const cleanupEntries = [];
  let disposed = false;
  let disposePromise = null;
  let registered = 0;
  const registerCleanup = (cleanup, label = "resource") => {
    if (typeof cleanup !== "function") throw new TypeError("A cleanup registration must be a function.");
    const entry = { id: ++registered, label, cleanup, active: true };
    if (disposed) {
      void Promise.resolve().then(cleanup).catch(() => {});
      return () => false;
    }
    cleanupEntries.push(entry);
    return () => {
      if (!entry.active) return false;
      entry.active = false;
      return true;
    };
  };
  const dispose = () => {
    if (disposePromise) return disposePromise;
    disposed = true;
    disposePromise = (async () => {
      let released = 0;
      const errors = [];
      for (const entry of [...cleanupEntries].reverse()) {
        if (!entry.active) continue;
        entry.active = false;
        try {
          await entry.cleanup();
          released += 1;
        } catch (error) {
          errors.push({ label: entry.label, error });
        }
      }
      return { released, errors };
    })();
    return disposePromise;
  };
  const cancel = (reason = "user-cancelled") => {
    if (!controller.signal.aborted) controller.abort(reason);
    return dispose();
  };
  const checkpoint = (stage) => {
    if (controller.signal.aborted) throw new ExtractionCancelledError(stage, controller.signal.reason || "user-cancelled");
  };
  return {
    signal: controller.signal,
    registerCleanup,
    checkpoint,
    cancel,
    dispose,
    get disposed() { return disposed; },
    get cancelled() { return controller.signal.aborted; },
  };
}

const normalizeText = (value) => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const compactText = (value) => normalizeText(value).replace(/\s+/g, "");
const cleanCellText = (value) => String(value || "").replace(/^[\s|:;,]+|[\s|:;,]+$/g, "").trim();
const levenshtein = (left, right) => {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
    previous = current;
  }
  return previous[right.length];
};

const validateDictionary = (dictionary) => (Array.isArray(dictionary) ? dictionary : []).filter((entry) => entry && typeof entry.value === "string" && typeof entry.label === "string");

/** Match only exact dictionary entries/aliases; fuzzy candidates are suggestions. */
export function matchAntimicrobial(raw, dictionary, options = {}) {
  const source = cleanCellText(raw);
  const normalized = normalizeText(source);
  const entries = validateDictionary(dictionary);
  const ocrConfidence = normalizeScore(options.ocrConfidence, source ? 0.75 : 0);
  for (const entry of entries) {
    if (normalized && normalized === normalizeText(entry.label)) {
      return {
        raw: source,
        value: entry.label,
        matchStatus: "EXACT",
        canonical: entry.label,
        dictionaryValue: entry.value,
        suggestions: [],
        confidence: confidenceFor(0.72 + ocrConfidence * 0.28, ["exact canonical dictionary match", "OCR confidence"]),
      };
    }
    const alias = (entry.aliases || []).find((candidate) => normalized && normalized === normalizeText(candidate));
    if (alias) {
      return {
        raw: source,
        value: entry.label,
        matchStatus: "ALIAS",
        canonical: entry.label,
        dictionaryValue: entry.value,
        suggestions: [],
        confidence: confidenceFor(0.68 + ocrConfidence * 0.27, [`exact dictionary alias: ${alias}`, "OCR confidence"]),
      };
    }
  }

  const needle = compactText(source);
  const suggestionsByValue = new Map();
  if (needle.length >= 5) {
    for (const entry of entries) {
      for (const candidate of [entry.label, ...(entry.aliases || [])]) {
        const comparable = compactText(candidate);
        if (comparable.length < 5) continue;
        const distance = levenshtein(needle, comparable);
        const maximumDistance = Math.min(3, comparable.length <= 6 ? 1 : comparable.length <= 12 ? 2 : 3);
        const score = 1 - distance / Math.max(needle.length, comparable.length);
        if (distance > maximumDistance || score < 0.78) continue;
        const prior = suggestionsByValue.get(entry.value);
        if (!prior || score > prior.score) suggestionsByValue.set(entry.value, { canonical: entry.label, dictionaryValue: entry.value, matchedAlias: candidate, score: round(score, 3) });
      }
    }
  }
  const suggestions = [...suggestionsByValue.values()].sort((a, b) => b.score - a.score || a.canonical.localeCompare(b.canonical)).slice(0, 3);
  if (suggestions.length) {
    return {
      raw: source,
      value: source,
      matchStatus: "SUGGESTION",
      suggestions,
      confidence: confidenceFor(Math.min(0.58, suggestions[0].score * ocrConfidence * 0.65), ["fuzzy dictionary candidate requires user confirmation", "original text retained"]),
    };
  }
  return {
    raw: source,
    value: source,
    matchStatus: "UNMATCHED",
    suggestions: [],
    confidence: confidenceFor(source ? ocrConfidence * 0.35 : 0, [source ? "no conservative dictionary match" : "antimicrobial text missing", "original text retained"]),
  };
}

const MIC_NUMBER = "(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)";
const MIC_OPERATOR = "(?:<=|>=|≤|≥|<|>|=)?";
const MIC_UNIT = "(?:µg\\s*\\/\\s*mL|μg\\s*\\/\\s*mL|ug\\s*\\/\\s*mL|mcg\\s*\\/\\s*mL|mg\\s*\\/\\s*L|mm)";
const micFullPattern = new RegExp(`^\\s*(?:(?:MIC|Result)\\s*[:=]?\\s*)?(${MIC_OPERATOR})\\s*(${MIC_NUMBER})\\s*(${MIC_UNIT})?\\s*$`, "i");
const micSearchPattern = new RegExp(`(?:^|[\\s|,:])((?:${MIC_OPERATOR})\\s*${MIC_NUMBER})(?:\\s*(${MIC_UNIT}))?(?=$|[\\s|,;])`, "i");
const normalizeMeasurementUnit = (unit) => {
  if (!unit) return undefined;
  const compact = String(unit).trim().toLocaleLowerCase().replace(/[μµ]/g, "u").replace(/\s+/g, "");
  // These concentration spellings are numerically equivalent at the same
  // magnitude. Source spelling remains separately preserved for display.
  if (["ug/ml", "mcg/ml", "mg/l"].includes(compact)) return "µg/mL";
  if (compact === "mm") return "mm";
  return compact;
};

/** Parse a MIC cell while retaining its exact operator glyph/string for display. */
export function parseMicCell(raw, ocrConfidence = 1) {
  const source = cleanCellText(raw);
  const match = source.match(micFullPattern);
  if (!match) return { raw: source, value: source, valid: false, confidence: confidenceFor(source ? normalizeScore(ocrConfidence) * 0.25 : 0, [source ? "MIC syntax not recognized" : "MIC text missing", "no scientific value inferred"]) };
  const operator = match[1] || undefined;
  const numericText = match[2];
  const unit = match[3]?.trim() || undefined;
  const normalizedUnit = normalizeMeasurementUnit(unit);
  const value = `${operator || ""}${numericText}${unit ? ` ${unit}` : ""}`;
  const normalizedOperator = operator?.replace("≤", "<=").replace("≥", ">=");
  const reasons = ["MIC numeric syntax recognized", operator ? "OCR operator retained; compare its glyph with the source" : "No operator read; verify that none was omitted", "Operator/value integrity is not established by numeric syntax", "VERIFY MIC against the source image"];
  return {
    raw: source,
    value,
    ...(operator ? { operator, normalizedOperator } : {}),
    numericValue: Number(numericText.replace(",", ".")),
    ...(unit ? { unit } : {}),
    ...(normalizedUnit ? { normalizedUnit } : {}),
    valid: true,
    confidence: confidenceFor(normalizeScore(ocrConfidence) * 0.79, reasons),
  };
}

const CATEGORY_MAP = new Map([
  ["s", "S"], ["susceptible", "S"],
  ["i", "I"], ["intermediate", "I"],
  ["r", "R"], ["resistant", "R"],
  ["sdd", "SDD"], ["susceptible dose dependent", "SDD"],
  ["ns", "NS"], ["nonsusceptible", "NS"], ["non susceptible", "NS"],
]);
const categorySearchPattern = /(?:^|[\s|,;])(susceptible\s+dose[- ]dependent|non[- ]?susceptible|susceptible|intermediate|resistant|SDD|NS|S|I|R)(?=$|[\s|,;])/gi;

const parseCategoryCell = (raw, ocrConfidence = 1) => {
  const source = cleanCellText(raw);
  const normalized = normalizeText(source);
  const value = CATEGORY_MAP.get(normalized) || "Unknown";
  return {
    raw: source,
    value,
    confidence: value === "Unknown"
      ? confidenceFor(source ? normalizeScore(ocrConfidence) * 0.25 : 0, [source ? "category token not recognized" : "category text missing", "no category inferred"])
      : confidenceFor(0.7 + normalizeScore(ocrConfidence) * 0.28, ["explicit category token recognized", "OCR confidence"]),
  };
};

const normalizeBBox = (bbox) => {
  if (!bbox || typeof bbox !== "object") return undefined;
  if ([bbox.x0, bbox.y0, bbox.x1, bbox.y1].every(isFiniteNumber) && bbox.x1 > bbox.x0 && bbox.y1 > bbox.y0) return { x0: bbox.x0, y0: bbox.y0, x1: bbox.x1, y1: bbox.y1 };
  if ([bbox.x, bbox.y, bbox.width, bbox.height].every(isFiniteNumber) && bbox.width > 0 && bbox.height > 0) return { x0: bbox.x, y0: bbox.y, x1: bbox.x + bbox.width, y1: bbox.y + bbox.height };
  return undefined;
};
const bboxCenterX = (bbox) => bbox ? (bbox.x0 + bbox.x1) / 2 : null;
const sanitizeLines = (lines, fallbackChunkId = "chunk-1-of-1") => {
  const sourceLines = typeof lines === "string" ? lines.split(/\r?\n/) : Array.isArray(lines) ? lines : [];
  return sourceLines.map((line, lineIndex) => {
  if (typeof line === "string") return { text: line, confidence: 0.75, lineIndex, chunkId: fallbackChunkId, words: [], bbox: undefined };
  const words = Array.isArray(line?.words) ? line.words.map((word) => ({ text: String(word?.text || ""), confidence: normalizeScore(word?.confidence, normalizeScore(line?.confidence, 0.5)), bbox: normalizeBBox(word?.bbox) })).filter((word) => word.text.trim()) : [];
  return {
    text: String(line?.text ?? words.map((word) => word.text).join(" ")),
    confidence: normalizeScore(line?.confidence, words.length ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length : 0.5),
    lineIndex: Number.isInteger(line?.lineIndex) ? line.lineIndex : lineIndex,
    chunkId: String(line?.chunkId || fallbackChunkId),
    words,
    bbox: normalizeBBox(line?.bbox) || unionBBoxes(words.map((word) => word.bbox).filter(Boolean)),
  };
  });
};

function unionBBoxes(boxes) {
  if (!boxes.length) return undefined;
  return { x0: Math.min(...boxes.map((box) => box.x0)), y0: Math.min(...boxes.map((box) => box.y0)), x1: Math.max(...boxes.map((box) => box.x1)), y1: Math.max(...boxes.map((box) => box.y1)) };
}

/** Reunite OCR cell/block fragments using geometry, never scientific expectations. */
export function regroupOcrRows(input) {
  const lines = sanitizeLines(input);
  const completeGeometry = line => line.words.length && line.words.every(word=>word.bbox);
  const unresolved = lines.filter(line=>!completeGeometry(line)).map(line=>({...line,words:[],confidence:Math.min(line.confidence,0.5)}));
  const words = lines.filter(completeGeometry).flatMap(line => line.words);
  if (!words.length) return lines;
  // Estimate modest baseline slope only from multi-cell OCR lines. No pixel
  // rotation or perspective transformation is inferred from text confidence.
  const slopes = lines.flatMap(line => {
    const items = line.words.filter(w => w.bbox).sort((a,b) => a.bbox.x0-b.bbox.x0);
    if (items.length < 3) return [];
    const a=items[0].bbox, b=items.at(-1).bbox, dx=b.x0-a.x0;
    const slope=dx>200 ? (b.y1-a.y1)/dx : 0;
    return dx>200 && Math.abs(slope)<0.08 ? [slope] : [];
  }).sort((a,b)=>a-b);
  const slope=slopes.length ? slopes[Math.floor(slopes.length/2)] : 0;
  const center = word => (word.bbox.y0+word.bbox.y1)/2-slope*bboxCenterX(word.bbox);
  const groups=[];
  for (const word of words.sort((a,b)=>center(a)-center(b)||a.bbox.x0-b.bbox.x0)) {
    const y=center(word), height=word.bbox.y1-word.bbox.y0;
    const group=groups.find(g=>Math.abs(g.y-y)<=Math.max(3,Math.min(g.height,height)*0.6));
    if (group) { group.words.push(word); group.y=group.words.reduce((sum,w)=>sum+center(w),0)/group.words.length; }
    else groups.push({y,height,words:[word]});
  }
  const regrouped = groups.sort((a,b)=>a.y-b.y).map((group,lineIndex)=>{
    const sorted=group.words.sort((a,b)=>a.bbox.x0-b.bbox.x0);
    return {text:sorted.map(w=>w.text).join(' '),words:sorted,bbox:unionBBoxes(sorted.map(w=>w.bbox)),confidence:Math.min(...sorted.map(w=>w.confidence)),lineIndex,chunkId:lines[0]?.chunkId||'chunk-1-of-1'};
  });
  return [...regrouped,...unresolved].sort((a,b)=>(a.bbox?.y0??Infinity)-(b.bbox?.y0??Infinity)).map((line,lineIndex)=>({...line,lineIndex}));
}

/**
 * Convert OCR geometry from a rendered chunk back into global workspace
 * coordinates. This prevents local chunk y values (and preprocessing upscale)
 * from producing false duplicate/conflict decisions.
 */
export function mapOcrLinesToSource(lines, transform = {}) {
  const sourceLines = typeof lines === "string" ? lines.split(/\r?\n/) : Array.isArray(lines) ? lines : [];
  const offsetX = isFiniteNumber(transform.offsetX) ? transform.offsetX : 0;
  const offsetY = isFiniteNumber(transform.offsetY) ? transform.offsetY : 0;
  const scaleX = isFiniteNumber(transform.scaleX) && transform.scaleX > 0 ? transform.scaleX : 1;
  const scaleY = isFiniteNumber(transform.scaleY) && transform.scaleY > 0 ? transform.scaleY : 1;
  const mapBox = (bbox) => {
    const normalized = normalizeBBox(bbox);
    if (!normalized) return undefined;
    return {
      x0: offsetX + normalized.x0 / scaleX,
      y0: offsetY + normalized.y0 / scaleY,
      x1: offsetX + normalized.x1 / scaleX,
      y1: offsetY + normalized.y1 / scaleY,
    };
  };
  return deepFreeze(sourceLines.map((line, lineIndex) => {
    if (typeof line === "string") return { text: line, lineIndex, ...(transform.chunkId ? { chunkId: String(transform.chunkId) } : {}) };
    return {
      ...line,
      lineIndex: Number.isInteger(line?.lineIndex) ? line.lineIndex : lineIndex,
      ...(transform.chunkId ? { chunkId: String(transform.chunkId) } : {}),
      ...(mapBox(line?.bbox) ? { bbox: mapBox(line.bbox) } : {}),
      ...(Array.isArray(line?.words) ? { words: line.words.map((word) => ({ ...word, ...(mapBox(word?.bbox) ? { bbox: mapBox(word.bbox) } : {}) })) } : {}),
    };
  }));
}

const headerRole = (text) => {
  const normalized = normalizeText(text);
  if (/^(antimicrobial|antibiotic|drug|agent)$/.test(normalized)) return "antimicrobial";
  if (/^(mic|mic zone|result|minimum inhibitory concentration)$/.test(normalized)) return "mic";
  if (/^(interpretation|category|interp|susceptibility)$/.test(normalized)) return "category";
  return null;
};
const delimitedCells = (text) => String(text).split(/(?<!\|)\|(?!\|)|\t+|\s{2,}/).map(cleanCellText);
const delimitedColumnGroups = (text) => String(text).split(/\s*\|\|\s*/).map((group) => delimitedCells(group));

/** Detect common AST headings and, when available, their spatial x centers. */
export function detectTableColumns(lines) {
  const safeLines = regroupOcrRows(lines);
  for (const line of safeLines) {
    const spatialHeaders = [];
    for (const word of line.words) {
      const role = headerRole(word.text);
      const center = word.bbox?.x0 ?? null;
      if (role && center !== null) spatialHeaders.push({ role, x: center });
    }
    if (spatialHeaders.length >= 2) {
      const orderedHeaders = spatialHeaders.sort((a, b) => a.x - b.x);
      const spatialGroups = [];
      let current = { columns: {}, order: [] };
      for (const header of orderedHeaders) {
        // A repeated role marks the next side-by-side table rather than
        // replacing the first role's coordinate.
        if (current.columns[header.role] !== undefined) {
          if (Object.keys(current.columns).length >= 2) spatialGroups.push(current);
          current = { columns: {}, order: [] };
        }
        current.columns[header.role] = header.x;
        current.order.push(header.role);
      }
      if (Object.keys(current.columns).length >= 2) spatialGroups.push(current);
      if (spatialGroups.length) {
        const { columns, order } = spatialGroups[0];
        return deepFreeze({
          headerLineIndex: line.lineIndex,
          source: "spatial",
          confidence: confidenceFor(Math.min(0.98, line.confidence + 0.08), ["multiple recognized table headings", "spatial word coordinates", ...(spatialGroups.length > 1 ? ["repeated multi-column groups"] : [])]),
          columns,
          order,
          groups: spatialGroups,
        });
      }
    }
    const rawGroups = delimitedColumnGroups(line.text);
    const groups = rawGroups.map((cells) => {
      const roles = cells.map(headerRole);
      const columns = {};
      const order = [];
      roles.forEach((role, index) => { if (role && columns[role] === undefined) { columns[role] = index; order.push(role); } });
      return { columns, order };
    }).filter((group) => Object.keys(group.columns).length >= 2);
    if (groups.length) {
      const { columns, order } = groups[0];
      return deepFreeze({ headerLineIndex: line.lineIndex, source: "delimited", confidence: confidenceFor(Math.min(0.95, line.confidence + 0.05), ["multiple recognized table headings", groups.length > 1 ? "repeated multi-column groups" : "delimited columns"]), columns, order, groups });
    }
    const occurrences = [
      ["antimicrobial", /\b(?:antimicrobial|antibiotic|drug|agent)\b/i.exec(line.text)],
      ["mic", /\b(?:MIC|result)\b/i.exec(line.text)],
      ["category", /\b(?:interpretation|category|interp|susceptibility)\b/i.exec(line.text)],
    ].filter(([, match]) => match);
    if (occurrences.length >= 2) {
      const columns = Object.fromEntries(occurrences.map(([role, match]) => [role, match.index]));
      const order = occurrences.sort((a, b) => a[1].index - b[1].index).map(([role]) => role);
      return deepFreeze({ headerLineIndex: line.lineIndex, source: "character", confidence: confidenceFor(Math.min(0.88, line.confidence), ["multiple recognized table headings", "character-position columns"]), columns, order });
    }
  }
  return deepFreeze({ headerLineIndex: null, source: "none", confidence: confidenceFor(0, ["no table header recognized"]), columns: {}, order: [], groups: [] });
}

const spatialPartition = (line, layout) => {
  const ordered = Object.entries(layout.columns).sort((a, b) => a[1] - b[1]);
  const buckets = Object.fromEntries(ordered.map(([role]) => [role, []]));
  for (const word of line.words) {
    const center = bboxCenterX(word.bbox);
    if (center === null) continue;
    let bestRole = ordered[0]?.[0];
    let bestDistance = Infinity;
    for (const [role, x] of ordered) {
      const distance = Math.abs(center - x);
      if (distance < bestDistance) { bestRole = role; bestDistance = distance; }
    }
    if (bestRole) buckets[bestRole].push(word);
  }
  const result = {};
  for (const [role, words] of Object.entries(buckets)) result[role] = {
    text: words.map((word) => word.text).join(" "),
    confidence: words.length ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length : line.confidence,
    ...(words.length && words.every((word) => word.bbox) ? { bbox: unionBBoxes(words.map((word) => word.bbox)) } : {}),
  };
  return result;
};
const spatialPartitions = (line, layout) => {
  const groups = layout.groups?.length ? layout.groups : [{ columns: layout.columns, order: layout.order }];
  const targets = groups.flatMap((group, groupIndex) => Object.entries(group.columns).map(([role, x]) => ({ groupIndex, role, x })));
  const buckets = groups.map((group) => Object.fromEntries(Object.keys(group.columns).map((role) => [role, []])));
  for (const word of line.words) {
    const center = word.bbox?.x0 ?? null;
    if (center === null) continue;
    let nearest = null;
    let bestDistance = Infinity;
    for (const target of targets) {
      // Header left edges locate column starts, not centers. Long drug names
      // must not spill into the MIC cell just because their midpoint is closer.
      const distance = center >= target.x - 16 ? center - target.x + 16 : Infinity;
      if (distance < bestDistance) {
        nearest = target;
        bestDistance = distance;
      }
    }
    if (nearest) buckets[nearest.groupIndex][nearest.role].push(word);
  }
  return buckets.map((bucket) => {
    const result = {};
    for (const [role, words] of Object.entries(bucket)) result[role] = {
      text: words.map((word) => word.text).join(" "),
      confidence: words.length ? Math.min(...words.map(word => word.confidence)) : 0,
      ...(words.length && words.every((word) => word.bbox) ? { bbox: unionBBoxes(words.map((word) => word.bbox)) } : {}),
    };
    return result;
  }).filter((cells) => Object.values(cells).some((cell) => cleanCellText(cell.text)));
};
const delimitedPartition = (line, layout) => {
  const cells = delimitedCells(line.text);
  const result = {};
  for (const [role, index] of Object.entries(layout.columns)) if (Number.isInteger(index)) result[role] = { text: cells[index] || "", confidence: line.confidence };
  return result;
};
const delimitedPartitions = (line, layout) => {
  const textGroups = delimitedColumnGroups(line.text);
  const layouts = layout.groups?.length ? layout.groups : [{ columns: layout.columns, order: layout.order }];
  return layouts.map((groupLayout, groupIndex) => {
    const cells = textGroups[groupIndex] || [];
    const result = {};
    for (const [role, index] of Object.entries(groupLayout.columns)) if (Number.isInteger(index)) result[role] = { text: cells[index] || "", confidence: line.confidence };
    return result;
  }).filter((cells) => Object.values(cells).some((cell) => cleanCellText(cell.text)));
};
const characterPartition = (line, layout) => {
  const ordered = Object.entries(layout.columns).sort((a, b) => a[1] - b[1]);
  const result = {};
  ordered.forEach(([role, start], index) => {
    const next = ordered[index + 1]?.[1] ?? line.text.length;
    result[role] = { text: line.text.slice(start, next), confidence: line.confidence };
  });
  return result;
};
const findCategoryInText = (text) => {
  const matches = [...String(text).matchAll(categorySearchPattern)];
  const match = matches.at(-1);
  if (!match) return null;
  const prefixLength = match[0].length - match[1].length;
  return { raw: match[1], index: match.index + prefixLength, length: match[1].length };
};
const findMicInText = (text) => {
  const match = micSearchPattern.exec(String(text));
  if (!match) return null;
  const raw = `${match[1]}${match[2] ? ` ${match[2]}` : ""}`.trim();
  const within = match[0].indexOf(match[1]);
  return { raw, valueRaw: match[1], index: match.index + within, length: raw.length };
};
const genericPartition = (line) => {
  const category = findCategoryInText(line.text);
  const mic = findMicInText(line.text);
  let antimicrobial = line.text;
  for (const found of [mic, category].filter(Boolean).sort((a, b) => b.index - a.index)) antimicrobial = `${antimicrobial.slice(0, found.index)} ${antimicrobial.slice(found.index + found.length)}`;
  antimicrobial = antimicrobial.replace(/\b(?:MIC|Result)\b\s*[:=]?/gi, " ").replace(/[|\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return {
    antimicrobial: { text: antimicrobial, confidence: line.confidence },
    mic: { text: mic?.raw || "", confidence: line.confidence },
    category: { text: category?.raw || "", confidence: line.confidence },
  };
};
const partitionLine = (line, layout) => {
  if (layout.source === "spatial" && line.words.length) return spatialPartitions(line, layout)[0] || {};
  if (layout.source === "delimited" && /\||\t|\s{2,}/.test(line.text)) return delimitedPartition(line, layout);
  // Plain OCR character offsets are not physical table columns.
  const cells = delimitedCells(line.text);
  if (cells.length >= 2) {
    const categoryIndex = cells.findIndex((cell) => parseCategoryCell(cell).value !== "Unknown");
    const micIndex = cells.findIndex((cell) => parseMicCell(cell).valid);
    const antimicrobialIndex = cells.findIndex((_, index) => index !== categoryIndex && index !== micIndex);
    if (antimicrobialIndex >= 0) return {
      antimicrobial: { text: cells[antimicrobialIndex], confidence: line.confidence },
      mic: { text: micIndex >= 0 ? cells[micIndex] : "", confidence: line.confidence },
      category: { text: categoryIndex >= 0 ? cells[categoryIndex] : "", confidence: line.confidence },
    };
  }
  return genericPartition(line);
};
const partitionLineGroups = (line, layout) => {
  if (layout.source === "spatial" && layout.groups?.length > 1 && line.words.length) return spatialPartitions(line, layout);
  if (layout.source === "delimited" && layout.groups?.length > 1) return delimitedPartitions(line, layout);
  return [partitionLine(line, layout)];
};

const issue = (code, field, severity, message) => ({ code, field, severity, message });
const rowStatus = (antimicrobial, mic, category, issues, conflicts) => {
  if (conflicts.length) return "conflict";
  if (antimicrobial.matchStatus === "UNMATCHED") return "unreadable";
  if (issues.length || antimicrobial.confidence.level === "LOW" || mic.confidence.level === "LOW" || category.confidence.level === "LOW") return "needs-verification";
  return "complete";
};
const buildRow = (line, cells, dictionary, groupIndex = 0) => {
  const antimicrobial = matchAntimicrobial(cells.antimicrobial?.text || "", dictionary, { ocrConfidence: cells.antimicrobial?.confidence ?? line.confidence });
  const mic = parseMicCell(cells.mic?.text || "", cells.mic?.confidence ?? line.confidence);
  const category = parseCategoryCell(cells.category?.text || "", cells.category?.confidence ?? line.confidence);
  const issues = [];
  if (antimicrobial.matchStatus === "SUGGESTION") issues.push(issue("antimicrobial-suggestion", "antimicrobial", "warning", `Did you mean ${antimicrobial.suggestions[0]?.canonical || "a known antimicrobial"}?`));
  if (antimicrobial.matchStatus === "UNMATCHED") issues.push(issue(antimicrobial.raw ? "antimicrobial-unmatched" : "antimicrobial-missing", "antimicrobial", "error", antimicrobial.raw ? "Antimicrobial text did not match the dictionary conservatively." : "Antimicrobial name could not be read."));
  if (!mic.raw) issues.push(issue("mic-missing", "mic", "error", "MIC could not be read; no value was inferred."));
  else if (!mic.valid) issues.push(issue("mic-invalid", "mic", "error", "MIC syntax is uncertain; verify the original image."));
  if (category.value === "Unknown") issues.push(issue("category-missing", "category", "error", "Category could not be read; no category was inferred."));
  for (const [field, cell] of [["antimicrobial", antimicrobial], ["mic", mic], ["category", category]]) {
    if (cell.confidence.level === "LOW" && !issues.some((entry) => entry.field === field)) issues.push(issue("low-confidence", field, "warning", `${field} extraction confidence is low.`));
  }
  const score = Math.min(antimicrobial.confidence.score, mic.confidence.score, category.confidence.score);
  const confidence = confidenceFor(score, ["lowest required cell confidence", ...(score < 0.6 ? ["human verification required"] : [])]);
  const cellBoxes = Object.values(cells).map((cell) => normalizeBBox(cell?.bbox)).filter(Boolean);
  const rowBox = unionBBoxes(cellBoxes) || line.bbox;
  const sourceRef = { chunkId: line.chunkId, lineIndex: line.lineIndex, text: line.text, ...(rowBox ? { bbox: rowBox } : {}) };
  const conflicts = [];
  return {
    id: `${line.chunkId}-line-${line.lineIndex}-group-${groupIndex}`,
    antimicrobial,
    mic,
    category,
    confidence,
    status: rowStatus(antimicrobial, mic, category, issues, conflicts),
    issues,
    sourceRefs: [sourceRef],
    conflicts,
  };
};

const looksLikeDataRow = (row, cells, layout) => {
  if (row.antimicrobial.matchStatus === "EXACT" || row.antimicrobial.matchStatus === "ALIAS") return true;
  if (row.antimicrobial.matchStatus === "SUGGESTION" && (row.mic.valid || row.category.value !== "Unknown")) return true;
  if (row.mic.valid && row.category.value !== "Unknown") return true;
  return layout.source !== "none" && Boolean(cleanCellText(cells.antimicrobial?.text)) && (Boolean(cleanCellText(cells.mic?.text)) || Boolean(cleanCellText(cells.category?.text)));
};

/** Reconstruct column-aware rows without applying concordance/scientific rules. */
export function reconstructAstTable(input) {
  const dictionary = validateDictionary(input?.dictionary);
  const lineInput = input?.lines ?? input?.rawOcrText ?? "";
  const lines = regroupOcrRows(sanitizeLines(lineInput, input?.chunkId || "chunk-1-of-1"));
  const table = input?.layout || detectTableColumns(lines);
  const rowsByColumnGroup = [];
  for (const line of lines) {
    if (!line.text.trim() || (!input?.layout && line.lineIndex === table.headerLineIndex)) continue;
    if (line.words.filter(word => headerRole(word.text)).length >= 2) continue;
    if (table.source === 'spatial' && table.headerLineIndex !== null && !input?.layout && line.lineIndex < table.headerLineIndex) continue;
    const groups = partitionLineGroups(line, table);
    groups.forEach((cells, groupIndex) => {
      const row = buildRow(line, cells, dictionary, groupIndex);
      if (looksLikeDataRow(row, cells, table)) {
        if (!rowsByColumnGroup[groupIndex]) rowsByColumnGroup[groupIndex] = [];
        rowsByColumnGroup[groupIndex].push(row);
      }
    });
  }
  // Repeated side-by-side AST panels conventionally continue top-to-bottom in
  // each visual column. Column-major ordering avoids interleaving left/right.
  const rows = rowsByColumnGroup.flat();
  const result = {
    rows,
    detectedRowCount: rows.length,
    sourceLineCount: lines.filter((line) => line.text.trim()).length,
    table,
  };
  return deepFreeze({ ...result, completeness: summarizeExtraction(rows, rows.length) });
}

/** Suggest a table bounding box from OCR coordinates; never applies the crop. */
export function detectAstTableRegion(input) {
  if (!input?.imageSize || !isFiniteNumber(input.imageSize.width) || !isFiniteNumber(input.imageSize.height) || input.imageSize.width <= 0 || input.imageSize.height <= 0) throw new TypeError("Table-region detection requires positive image dimensions.");
  const lines = regroupOcrRows(input.lines);
  const reconstructed = reconstructAstTable({ lines, dictionary: input.dictionary });
  const indexes = new Set(reconstructed.rows.flatMap((row) => row.sourceRefs.map((ref) => ref.lineIndex)));
  if (reconstructed.table.headerLineIndex !== null) indexes.add(reconstructed.table.headerLineIndex);
  const selected = lines.filter((line) => indexes.has(line.lineIndex) && line.bbox);
  const full = { x: 0, y: 0, width: Math.round(input.imageSize.width), height: Math.round(input.imageSize.height) };
  if (!selected.length) return deepFreeze({ region: full, confidence: confidenceFor(0, ["no AST row coordinates available"]), source: "full-image", candidateLineIndexes: [], shouldSuggestCrop: false, reason: "No coordinate-backed AST table region could be identified." });
  const union = unionBBoxes(selected.map((line) => line.bbox));
  const padding = Math.max(0, Math.round(isFiniteNumber(input.paddingPx) ? input.paddingPx : 16));
  const x0 = clamp(Math.floor(union.x0 - padding), 0, full.width - 1);
  const y0 = clamp(Math.floor(union.y0 - padding), 0, full.height - 1);
  const x1 = clamp(Math.ceil(union.x1 + padding), x0 + 1, full.width);
  const y1 = clamp(Math.ceil(union.y1 + padding), y0 + 1, full.height);
  const coordinateCoverage = selected.length / Math.max(1, reconstructed.rows.length + (reconstructed.table.headerLineIndex === null ? 0 : 1));
  const score = clamp(0.35 + Math.min(0.35, reconstructed.rows.length * 0.08) + coordinateCoverage * 0.2 + (reconstructed.table.source === "none" ? 0 : 0.1), 0, 0.98);
  const shouldSuggestCrop = reconstructed.rows.length >= 2 && score >= 0.6;
  return deepFreeze({
    region: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
    confidence: confidenceFor(score, ["coordinate-backed AST-like rows", reconstructed.table.source === "none" ? "no recognized heading" : "recognized table headings"]),
    source: "detected",
    candidateLineIndexes: [...indexes].sort((a, b) => a - b),
    shouldSuggestCrop,
    reason: shouldSuggestCrop ? "A likely AST table region was detected; user confirmation is still required." : "Possible AST content was detected, but crop confidence is limited.",
  });
}

const cloneRow = (row) => ({
  ...row,
  antimicrobial: { ...row.antimicrobial, suggestions: [...(row.antimicrobial.suggestions || [])], confidence: { ...row.antimicrobial.confidence, reasons: [...row.antimicrobial.confidence.reasons] } },
  mic: { ...row.mic, confidence: { ...row.mic.confidence, reasons: [...row.mic.confidence.reasons] } },
  category: { ...row.category, confidence: { ...row.category.confidence, reasons: [...row.category.confidence.reasons] } },
  confidence: { ...row.confidence, reasons: [...row.confidence.reasons] },
  issues: [...(row.issues || [])].map((entry) => ({ ...entry })),
  sourceRefs: [...(row.sourceRefs || [])].map((ref) => ({ ...ref, ...(ref.bbox ? { bbox: { ...ref.bbox } } : {}) })),
  conflicts: [...(row.conflicts || [])].map((conflict) => ({ ...conflict, values: [...conflict.values], sourceRefs: [...conflict.sourceRefs].map((ref) => ({ ...ref })) })),
});
const rowIdentity = (row) => row.antimicrobial.dictionaryValue ? `dictionary:${row.antimicrobial.dictionaryValue}` : `raw:${compactText(row.antimicrobial.raw)}`;
const sameSourceText = (left, right) => normalizeText(left.sourceRefs?.[0]?.text) === normalizeText(right.sourceRefs?.[0]?.text);
const chunkPosition = (chunkId) => {
  const match = String(chunkId || "").match(/^chunk-(\d+)-of-(\d+)$/);
  return match ? { section: Number(match[1]), total: Number(match[2]) } : null;
};
const adjacentChunkPair = (left, right) => left.sourceRefs?.some((leftRef) => right.sourceRefs?.some((rightRef) => {
  const a = chunkPosition(leftRef.chunkId);
  const b = chunkPosition(rightRef.chunkId);
  return a && b && a.total === b.total && a.section !== b.section && Math.abs(a.section - b.section) === 1;
}));
const sameSourceBand = (left, right) => left.sourceRefs?.some((leftRef) => right.sourceRefs?.some((rightRef) => {
  const a = normalizeBBox(leftRef.bbox);
  const b = normalizeBBox(rightRef.bbox);
  if (!a || !b) return false;
  const verticalOverlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  const centerDistance = Math.abs((a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
  const maximumRowHeight = Math.max(a.y1 - a.y0, b.y1 - b.y0);
  const minimumRowHeight = Math.min(a.y1 - a.y0, b.y1 - b.y0);
  const horizontalOverlap = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const minimumRowWidth = Math.min(a.x1 - a.x0, b.x1 - b.x0);
  const overlapRatio = Math.max(0, verticalOverlap) / Math.max(1, minimumRowHeight);
  // Adjacent table rows are commonly separated by less than half a row
  // height. Require substantial band overlap (or very close centers) so they
  // cannot be mistaken for duplicate OCR of the same source row.
  const sameVerticalBand = overlapRatio >= 0.5 || centerDistance <= Math.max(3, maximumRowHeight * 0.35);
  const sameHorizontalBand = horizontalOverlap >= Math.max(1,minimumRowWidth*0.5);
  return sameVerticalBand && sameHorizontalBand;
}));
const hasCoordinates = (row) => row.sourceRefs?.some((ref) => Boolean(normalizeBBox(ref.bbox)));
const isOverlapDuplicate = (left, right) => {
  if (!adjacentChunkPair(left, right)) return false;
  // Coordinate-backed rows must occupy the same global source band. Exact OCR
  // text alone is not enough: the same antimicrobial/result can legitimately
  // occur in two distinct report sections.
  if (hasCoordinates(left) && hasCoordinates(right)) return sameSourceBand(left, right);
  // Text equality is a conservative fallback only when the OCR engine did not
  // return geometry for one or both adjacent chunks.
  return sameSourceText(left, right);
};
const uniqueSourceRefs = (refs) => [...new Map(refs.map((ref) => [`${ref.chunkId}:${ref.lineIndex}:${ref.text}`, ref])).values()];
const blankMicConflictCell = (left, right) => ({ raw: "", value: "", valid: false, confidence: confidenceFor(0, ["conflicting MIC extractions", "user verification required"]), conflictCandidates: [left.value || left.raw, right.value || right.raw].filter(Boolean) });
const blankCategoryConflictCell = (left, right) => ({ raw: "", value: "Unknown", confidence: confidenceFor(0, ["conflicting category extractions", "user verification required"]), conflictCandidates: [left.value, right.value].filter((value) => value && value !== "Unknown") });
const usableMic = (cell) => cell?.valid && Boolean(cell.value);
const usableCategory = (cell) => cell?.value && cell.value !== "Unknown";
const micComparisonKey = (cell) => `${cell?.normalizedOperator || ""}:${cell?.numericValue}:${cell?.normalizedUnit || "unitless"}`;

const mergeTwoRows = (base, incoming) => {
  const merged = cloneRow(base);
  merged.sourceRefs = uniqueSourceRefs([...merged.sourceRefs, ...incoming.sourceRefs]);
  merged.issues = [...merged.issues, ...incoming.issues.map((entry) => ({ ...entry }))];
  merged.conflicts = [...merged.conflicts, ...incoming.conflicts.map((entry) => ({ ...entry, values: [...entry.values], sourceRefs: [...entry.sourceRefs] }))];
  const addConflict = (field, values) => {
    const normalizedValues = [...new Set(values.filter(Boolean))];
    if (normalizedValues.length < 2) return;
    merged.conflicts.push({ field, values: normalizedValues, sourceRefs: uniqueSourceRefs([...base.sourceRefs, ...incoming.sourceRefs]) });
    merged.issues.push(issue("duplicate-conflict", field, "error", "Conflicting extraction — please verify."));
  };
  if (!usableMic(merged.mic) && usableMic(incoming.mic)) merged.mic = cloneRow(incoming).mic;
  else if (usableMic(merged.mic) && usableMic(incoming.mic) && micComparisonKey(merged.mic) !== micComparisonKey(incoming.mic)) {
    addConflict("mic", [merged.mic.value || merged.mic.raw, incoming.mic.value || incoming.mic.raw]);
    merged.mic = blankMicConflictCell(merged.mic, incoming.mic);
  } else if (usableMic(incoming.mic) && incoming.mic.confidence.score > merged.mic.confidence.score) merged.mic = cloneRow(incoming).mic;

  if (!usableCategory(merged.category) && usableCategory(incoming.category)) merged.category = cloneRow(incoming).category;
  else if (usableCategory(merged.category) && usableCategory(incoming.category) && merged.category.value !== incoming.category.value) {
    addConflict("category", [merged.category.value, incoming.category.value]);
    merged.category = blankCategoryConflictCell(merged.category, incoming.category);
  } else if (usableCategory(incoming.category) && incoming.category.confidence.score > merged.category.confidence.score) merged.category = cloneRow(incoming).category;

  merged.issues = [...new Map(merged.issues.map((entry) => [`${entry.code}:${entry.field || ""}:${entry.message}`, entry])).values()]
    .filter((entry) => !(entry.code === "mic-missing" && usableMic(merged.mic)) && !(entry.code === "category-missing" && usableCategory(merged.category)));
  merged.conflicts = [...new Map(merged.conflicts.map((entry) => [`${entry.field}:${[...entry.values].sort().join("|")}`, entry])).values()];
  // A third reading must never silently resolve an existing contradiction.
  for (const field of ['mic','category']) {
    const prior = merged.conflicts.filter(conflict => conflict.field === field);
    if (!prior.length) continue;
    const values = [...new Set([...prior.flatMap(conflict => conflict.values),
      ...(base[field].conflictCandidates || []), ...(incoming[field].conflictCandidates || []),
      base[field].value, incoming[field].value].filter(value => value && value !== 'Unknown'))];
    merged[field] = field === 'mic' ? blankMicConflictCell(base.mic,incoming.mic) : blankCategoryConflictCell(base.category,incoming.category);
    merged[field].conflictCandidates=values;
    merged.conflicts=merged.conflicts.filter(conflict=>conflict.field!==field);
    merged.conflicts.push({field,values,sourceRefs:merged.sourceRefs});
  }
  const score = Math.min(merged.antimicrobial.confidence.score, merged.mic.confidence.score, merged.category.confidence.score);
  merged.confidence = confidenceFor(score, ["lowest merged cell confidence", ...(merged.conflicts.length ? ["conflicting overlap extraction"] : [])]);
  merged.status = rowStatus(merged.antimicrobial, merged.mic, merged.category, merged.issues, merged.conflicts);
  return merged;
};

/** Merge only overlap-like duplicates. Disagreements become empty conflicted cells. */
export function mergeChunkRows(rows) {
  const merged = [];
  let duplicatesMerged = 0;
  for (const original of [...(Array.isArray(rows) ? rows : [])].sort((a,b)=>(a.sourceRefs[0]?.chunkId||'').localeCompare(b.sourceRefs[0]?.chunkId||'',undefined,{numeric:true}))) {
    const row = cloneRow(original);
    const identity = rowIdentity(row);
    const matchIndex = identity === "raw:" ? -1 : merged.findIndex((candidate) => rowIdentity(candidate) === identity && isOverlapDuplicate(candidate, row));
    if (matchIndex < 0) merged.push(row);
    else {
      merged[matchIndex] = mergeTwoRows(merged[matchIndex], row);
      duplicatesMerged += 1;
    }
  }
  const result = { rows: merged, duplicatesMerged, conflictCount: merged.reduce((sum, row) => sum + row.conflicts.length, 0) };
  return deepFreeze(result);
}

/** Compare bounded readings of the same pixels. Agreement is not independent
 * scientific validation; disagreements stay blank/LOW and retain alternatives. */
export function reconcileExtractionPasses(passes) {
  const rows=[];
  for (const pass of passes) {
   const previousLength=rows.length,used=new Set();
   for (const original of pass) {
    const match=rows.findIndex((row,index)=>index<previousLength&&!used.has(index)&&sameSourceBand(row,original));
    if (match<0) {rows.push(cloneRow(original));continue;}
    used.add(match);
    if (rowIdentity(rows[match])===rowIdentity(original)) rows[match]=mergeTwoRows(rows[match],original);
    else {
      const current=rows[match], incoming=cloneRow(original);
      // Prefer only an exact dictionary spelling, never an invented fuzzy fix;
      // preserve and display the differing raw reading as an uncertainty.
      const chosen=mergeTwoRows(current,incoming);
      if (!current.antimicrobial.canonical && incoming.antimicrobial.canonical) chosen.antimicrobial=incoming.antimicrobial;
      const alternatives=[current.antimicrobial.raw,incoming.antimicrobial.raw];
      chosen.antimicrobial.confidence=confidenceFor(0.5,['Conflicting drug readings: '+alternatives.join(' / '),'Verify against source']);
      chosen.sourceRefs=uniqueSourceRefs([...current.sourceRefs,...incoming.sourceRefs]);
      chosen.status=chosen.conflicts.length?'conflict':'needs-verification';
      rows[match]=chosen;
    }
  }
  }
  for (const row of rows) {
    const observations=passes.flatMap(pass=>pass.filter(candidate=>rowIdentity(candidate)===rowIdentity(row)&&sameSourceBand(candidate,row)));
    const uncertainDrug=row.antimicrobial.confidence.level==='LOW'||!row.antimicrobial.canonical;
    for (const field of ['antimicrobial','mic','category']) {
      const cell=row[field];
      const comparable=observations.map(observation=>observation[field].value).filter(Boolean);
      const agreement=comparable.length>=2&&comparable.every(value=>value===cell.value);
      const limit=uncertainDrug?0.5:field==='mic'?0.79:agreement?0.94:0.79;
      cell.confidence=confidenceFor(Math.min(cell.confidence.score,limit),[...cell.confidence.reasons,
        agreement?'Bounded source-pixel passes agree (not independent validation)':'No consistent multi-pass support for this field',
        ...(uncertainDrug?['Drug/row alignment uncertain; verify every cell in this row']:[])]);
    }
    row.confidence=confidenceFor(Math.min(...['antimicrobial','mic','category'].map(field=>row[field].confidence.score)),['Lowest required field confidence']);
    row.status=rowStatus(row.antimicrobial,row.mic,row.category,row.issues,row.conflicts);
  }
  return deepFreeze(rows);
}

/** Report losses and verification work without using a success claim. */
export function summarizeExtraction(rows, detectedRowCount) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const rowsDetected = Math.max(safeRows.length, Number.isInteger(detectedRowCount) && detectedRowCount >= 0 ? detectedRowCount : safeRows.length);
  const explicitUnreadable = safeRows.filter((row) => row.status === "unreadable").length;
  const unreturnedDetectedRows = Math.max(0, rowsDetected - safeRows.length);
  const unreadable = explicitUnreadable + unreturnedDetectedRows;
  const complete = safeRows.filter((row) => row.status === "complete").length;
  const requiringVerification = safeRows.filter((row) => row.status === "needs-verification" || row.status === "conflict").length;
  const conflicts = safeRows.filter((row) => row.status === "conflict").length;
  const rowsReconstructed = safeRows.length - explicitUnreadable;
  const status = !rowsReconstructed || unreadable || rowsReconstructed < rowsDetected ? "INCOMPLETE" : requiringVerification ? "VERIFICATION_REQUIRED" : "COMPLETE";
  const prefix = !rowsReconstructed || (rowsDetected >= 5 && rowsReconstructed < rowsDetected / 2) ? 'AST Compass could not reliably reconstruct this susceptibility table. ' : '';
  const message = `${prefix}${rowsDetected} row${rowsDetected === 1 ? "" : "s"} estimated; ${safeRows.length} reconstructed; ${complete} complete; ${requiringVerification} require verification; ${unreadable} unreadable. AST Compass may not have extracted the complete table. Please compare the results with the source image.`;
  return deepFreeze({ status, rowsDetected, rowsReconstructed, complete, requiringVerification, unreadable, conflicts, message });
}
