export type ImageCropLike = {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth?: number;
  sourceHeight?: number;
  normalized?: { x: number; y: number; width: number; height: number };
};

export type ImageChunkLike = {
  rect: { x: number; y: number; width: number; height: number };
};

export type ImageQualityMetrics = {
  width: number;
  height: number;
  contrastStdDev: number;
  blurVariance: number;
  estimatedTextHeightPx?: number;
};

export type OcrVariantId =
  | "original"
  | "table-contrast"
  | "grayscale-normalized"
  | "sharpened"
  | "adaptive-threshold";

export type RenderedImageAsset = {
  blob: Blob;
  sourceRect: { x: number; y: number; width: number; height: number };
  outputWidth: number;
  outputHeight: number;
  /** Rendered pixels per workspace source pixel. */
  scaleX: number;
  scaleY: number;
  variant: OcrVariantId;
};

export type ImageWorkspace = {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  rotationDegrees: number;
  deskewDegrees: number;
  totalCorrectionDegrees: number;
  crop: { x: number; y: number; width: number; height: number };
  measureQuality(): ImageQualityMetrics;
  renderPreview(maxWidth?: number): Promise<Blob>;
  renderChunk(chunk: ImageChunkLike, variant: OcrVariantId, upscaleFactor?: number): Promise<Blob>;
  renderChunkAsset(chunk: ImageChunkLike, variant: OcrVariantId, upscaleFactor?: number): Promise<RenderedImageAsset>;
  /** Bounded cell views are always rendered directly from the decoded source. */
  renderCell(rect: ImageChunkLike['rect'], variant: OcrVariantId, upscaleFactor?: number): Promise<RenderedImageAsset>;
  readPixels(): ImageData;
  toOriginalRect(rect: ImageChunkLike['rect']): ImageChunkLike['rect'];
  close(): void;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const MAX_RENDER_PIXELS = 3_000_000;

function abortError(signal?: AbortSignal) {
  if (signal?.reason instanceof Error) return signal.reason;
  return new DOMException("Image extraction was cancelled.", "AbortError");
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError(signal);
}

async function yieldToBrowser(signal?: AbortSignal) {
  throwIfAborted(signal);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  throwIfAborted(signal);
}

function normalizedRotation(value: number) {
  if (!Number.isFinite(value)) return 0;
  const result = ((Math.round(value / 90) * 90) % 360 + 360) % 360;
  return result === 270 ? -90 : result;
}

function resolveCrop(
  crop: ImageCropLike | null | undefined,
  width: number,
  height: number,
) {
  if (!crop) return { x: 0, y: 0, width, height };
  const normalized = crop.normalized ?? (
    crop.width <= 1 && crop.height <= 1
      ? { x: crop.x, y: crop.y, width: crop.width, height: crop.height }
      : {
          x: crop.x / Math.max(1, crop.sourceWidth ?? width),
          y: crop.y / Math.max(1, crop.sourceHeight ?? height),
          width: crop.width / Math.max(1, crop.sourceWidth ?? width),
          height: crop.height / Math.max(1, crop.sourceHeight ?? height),
        }
  );
  const x = clamp(Math.round(normalized.x * width), 0, Math.max(0, width - 1));
  const y = clamp(Math.round(normalized.y * height), 0, Math.max(0, height - 1));
  const cropWidth = clamp(Math.round(normalized.width * width), 1, width - x);
  const cropHeight = clamp(Math.round(normalized.height * height), 1, height - y);
  return { x, y, width: cropWidth, height: cropHeight };
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("image-encode-failed")), "image/png");
  });
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close(): void;
};

async function decodeImage(source: File, signal?: AbortSignal): Promise<DecodedImage> {
  throwIfAborted(signal);
  if (typeof createImageBitmap === "function") {
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
      throwIfAborted(signal);
      const openedBitmap = bitmap;
      return { source: openedBitmap, width: openedBitmap.width, height: openedBitmap.height, close: () => openedBitmap.close() };
    } catch {
      bitmap?.close();
      if (signal?.aborted) throw abortError(signal);
      // Some Safari/PWA versions expose createImageBitmap but reject specific
      // image formats. The local object-URL fallback keeps decoding on-device.
    }
  }
  const objectUrl = URL.createObjectURL(source);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        signal?.removeEventListener("abort", onAbort);
        image.onload = null;
        image.onerror = null;
      };
      const onAbort = () => {
        cleanup();
        reject(abortError(signal));
      };
      image.onload = () => { cleanup(); resolve(); };
      image.onerror = () => { cleanup(); reject(new Error("image-decode-failed")); };
      signal?.addEventListener("abort", onAbort, { once: true });
      image.src = objectUrl;
    });
    throwIfAborted(signal);
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("image-decode-failed");
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => { image.src = ""; URL.revokeObjectURL(objectUrl); },
    };
  } catch (error) {
    image.src = "";
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function grayscale(image: ImageData) {
  const data = image.data;
  const values = new Float32Array(image.width * image.height);
  let sum = 0;
  for (let pixel = 0, offset = 0; offset < data.length; pixel += 1, offset += 4) {
    const value = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
    values[pixel] = value;
    sum += value;
  }
  return { values, mean: sum / Math.max(1, values.length) };
}

function standardDeviation(values: Float32Array, mean: number) {
  let sum = 0;
  for (const value of values) sum += (value - mean) ** 2;
  return Math.sqrt(sum / Math.max(1, values.length));
}

function estimateTextHeight(values: Float32Array, width: number, height: number, threshold: number) {
  const active = new Array<boolean>(height).fill(false);
  for (let y = 0; y < height; y += 1) {
    let dark = 0;
    for (let x = 0; x < width; x += 1) if (values[y * width + x] < threshold) dark += 1;
    active[y] = dark >= Math.max(2, Math.round(width * 0.012));
  }
  const runs: number[] = [];
  let start = -1;
  for (let y = 0; y <= height; y += 1) {
    if (y < height && active[y] && start < 0) start = y;
    if ((y === height || !active[y]) && start >= 0) {
      const run = y - start;
      if (run >= 2 && run <= Math.max(4, height * 0.12)) runs.push(run);
      start = -1;
    }
  }
  if (!runs.length) return undefined;
  runs.sort((a, b) => a - b);
  return runs[Math.floor(runs.length / 2)];
}

function laplacianVariance(values: Float32Array, width: number, height: number) {
  if (width < 3 || height < 3) return 0;
  let count = 0;
  let sum = 0;
  let squared = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const value = values[index - width] + values[index - 1] - 4 * values[index] + values[index + 1] + values[index + width];
      sum += value;
      squared += value * value;
      count += 1;
    }
  }
  const mean = sum / Math.max(1, count);
  return Math.max(0, squared / Math.max(1, count) - mean * mean);
}

async function grayscaleForExtraction(image: ImageData, signal?: AbortSignal) {
  const data = image.data;
  const values = new Float32Array(image.width * image.height);
  let sum = 0;
  for (let pixel = 0, offset = 0; offset < data.length; pixel += 1, offset += 4) {
    const value = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
    values[pixel] = value;
    sum += value;
    if (pixel > 0 && pixel % 250_000 === 0) await yieldToBrowser(signal);
  }
  return { values, mean: sum / Math.max(1, values.length) };
}

async function normalizeContrastForExtraction(values: Float32Array, mean: number, deviation: number, signal?: AbortSignal) {
  const targetDeviation = 58;
  const scale = deviation > 1 ? clamp(targetDeviation / deviation, 0.8, 3.2) : 1;
  for (let index = 0; index < values.length; index += 1) {
    values[index] = clamp((values[index] - mean) * scale + 220, 0, 255);
    if (index > 0 && index % 250_000 === 0) await yieldToBrowser(signal);
  }
}

async function sharpenForExtraction(values: Float32Array, width: number, height: number, signal?: AbortSignal) {
  const source = values.slice();
  const amount = 0.45;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const edge = source[index] * 4 - source[index - width] - source[index - 1] - source[index + 1] - source[index + width];
      values[index] = clamp(source[index] + edge * amount, 0, 255);
    }
    if (y % 48 === 0) await yieldToBrowser(signal);
  }
}

async function adaptiveThresholdForExtraction(values: Float32Array, width: number, height: number, signal?: AbortSignal) {
  const source = values.slice();
  const radius = clamp(Math.round(Math.min(width, height) / 80), 5, 18);
  const integralWidth = width + 1;
  const integral = new Uint32Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0;
    for (let x = 1; x <= width; x += 1) {
      rowSum += Math.round(source[(y - 1) * width + x - 1]);
      integral[y * integralWidth + x] = integral[(y - 1) * integralWidth + x] + rowSum;
    }
    if (y % 48 === 0) await yieldToBrowser(signal);
  }
  for (let y = 0; y < height; y += 1) {
    const top = Math.max(0, y - radius);
    const bottom = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x += 1) {
      const left = Math.max(0, x - radius);
      const right = Math.min(width - 1, x + radius);
      const area = (right - left + 1) * (bottom - top + 1);
      const sum = integral[(bottom + 1) * integralWidth + right + 1]
        - integral[top * integralWidth + right + 1]
        - integral[(bottom + 1) * integralWidth + left]
        + integral[top * integralWidth + left];
      values[y * width + x] = source[y * width + x] < sum / area - 8 ? 0 : 255;
    }
    if (y % 48 === 0) await yieldToBrowser(signal);
  }
}

async function writeGrayForExtraction(image: ImageData, values: Float32Array, signal?: AbortSignal) {
  for (let pixel = 0, offset = 0; pixel < values.length; pixel += 1, offset += 4) {
    const value = Math.round(values[pixel]);
    image.data[offset] = value;
    image.data[offset + 1] = value;
    image.data[offset + 2] = value;
    image.data[offset + 3] = 255;
    if (pixel > 0 && pixel % 250_000 === 0) await yieldToBrowser(signal);
  }
}

/**
 * Holds one bounded, orientation-corrected canvas and renders one OCR variant at
 * a time. The source File is never overwritten or recompressed.
 */
export async function createImageWorkspace(
  source: File,
  options: { rotationDegrees?: number; deskewDegrees?: number; crop?: ImageCropLike | null; maxDimension?: number; signal?: AbortSignal } = {},
): Promise<ImageWorkspace> {
  const signal = options.signal;
  const decoded = await decodeImage(source, signal);
  const originalWidth = decoded.width;
  const originalHeight = decoded.height;
  const rotationDegrees = normalizedRotation(options.rotationDegrees ?? 0);
  const deskewDegrees = Number.isFinite(options.deskewDegrees) ? options.deskewDegrees! : 0;
  if (Math.abs(deskewDegrees) > 5) {
    decoded.close();
    throw new RangeError("Automatic deskew exceeds the safe five-degree correction range.");
  }
  const totalCorrectionDegrees = rotationDegrees + deskewDegrees;
  const radians = totalCorrectionDegrees * Math.PI / 180;
  const absoluteCosine = Math.abs(Math.cos(radians));
  const absoluteSine = Math.abs(Math.sin(radians));
  const rotatedWidth = originalWidth * absoluteCosine + originalHeight * absoluteSine;
  const rotatedHeight = originalWidth * absoluteSine + originalHeight * absoluteCosine;
  const requestedMaximum = Number.isFinite(options.maxDimension) ? options.maxDimension! : 2800;
  const maxDimension = clamp(requestedMaximum, 1000, 3600);
  const scale = Math.min(1, maxDimension / Math.max(rotatedWidth, rotatedHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rotatedWidth * scale));
  canvas.height = Math.max(1, Math.round(rotatedHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    decoded.close();
    throw new Error("canvas-unavailable");
  }
  try {
    throwIfAborted(signal);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(radians);
    context.drawImage(decoded.source, -originalWidth * scale / 2, -originalHeight * scale / 2, originalWidth * scale, originalHeight * scale);
    context.restore();
    throwIfAborted(signal);
  } catch (error) {
    decoded.close();
    throw error;
  }

  let closed = false;
  const crop = resolveCrop(options.crop, canvas.width, canvas.height);
  const requireOpen = () => {
    if (closed) throw new Error("image-workspace-closed");
  };
  const render = async (
    rect: { x: number; y: number; width: number; height: number },
    variant: OcrVariantId,
    maximumWidth: number,
    upscaleFactor: number,
    maximumUpscale = 2.5,
    originalCell = false,
  ): Promise<RenderedImageAsset> => {
    requireOpen();
    throwIfAborted(signal);
    const x = clamp(Math.round(rect.x), 0, canvas.width - 1);
    const y = clamp(Math.round(rect.y), 0, canvas.height - 1);
    const width = clamp(Math.round(rect.width), 1, canvas.width - x);
    const height = clamp(Math.round(rect.height), 1, canvas.height - y);
    const boundedUpscale = clamp(Number.isFinite(upscaleFactor) ? upscaleFactor : 1, 1, maximumUpscale);
    const pixelBoundScale = Math.sqrt(MAX_RENDER_PIXELS / Math.max(1, width * height));
    const outputScale = Math.min(boundedUpscale, maximumWidth / width, pixelBoundScale);
    const output = document.createElement("canvas");
    output.width = Math.max(1, Math.floor(width * outputScale));
    output.height = Math.max(1, Math.floor(height * outputScale));
    try {
      const outputContext = output.getContext("2d", { willReadFrequently: true });
      if (!outputContext) throw new Error("canvas-unavailable");
      outputContext.imageSmoothingEnabled = true;
      outputContext.imageSmoothingQuality = "high";
      if (originalCell) {
        // Compose source -> workspace -> cell directly, not through a reduced raster.
        outputContext.fillStyle = '#ffffff';
        outputContext.fillRect(0,0,output.width,output.height);
        outputContext.scale(output.width/width,output.height/height);
        outputContext.translate(-x,-y);
        outputContext.translate(canvas.width/2,canvas.height/2);
        outputContext.rotate(radians);
        outputContext.drawImage(decoded.source,-originalWidth*scale/2,-originalHeight*scale/2,originalWidth*scale,originalHeight*scale);
        outputContext.setTransform(1,0,0,1,0,0);
      } else outputContext.drawImage(canvas, x, y, width, height, 0, 0, output.width, output.height);
      await yieldToBrowser(signal);
      if (variant !== "original") {
        const image = outputContext.getImageData(0, 0, output.width, output.height);
        const gray = await grayscaleForExtraction(image, signal);
        const deviation = standardDeviation(gray.values, gray.mean);
        if (variant === 'table-contrast') {
          // A bounded alternate view: lighten pale rules/shading, never mutate
          // the original. Compare with original OCR; disagreement is uncertainty.
          for (let i=0;i<gray.values.length;i++) {
            gray.values[i]=clamp((gray.values[i]-30)*255/140,0,255);
            if (i>0 && i%250000===0) await yieldToBrowser(signal);
          }
        } else if (variant !== 'grayscale-normalized') {
          await normalizeContrastForExtraction(gray.values, gray.mean, deviation, signal);
        }
        if (variant === "sharpened") await sharpenForExtraction(gray.values, output.width, output.height, signal);
        if (variant === "adaptive-threshold") await adaptiveThresholdForExtraction(gray.values, output.width, output.height, signal);
        await writeGrayForExtraction(image, gray.values, signal);
        outputContext.putImageData(image, 0, 0);
      }
      throwIfAborted(signal);
      const blob = await canvasBlob(output);
      throwIfAborted(signal);
      return {
        blob,
        sourceRect: { x, y, width, height },
        outputWidth: output.width,
        outputHeight: output.height,
        scaleX: output.width / width,
        scaleY: output.height / height,
        variant,
      };
    } finally {
      output.width = 0;
      output.height = 0;
    }
  };

  return {
    width: canvas.width,
    height: canvas.height,
    originalWidth,
    originalHeight,
    rotationDegrees,
    deskewDegrees,
    totalCorrectionDegrees,
    crop,
    measureQuality() {
      requireOpen();
      const sampleScale = Math.min(1, 900 / Math.max(crop.width, crop.height));
      const sample = document.createElement("canvas");
      sample.width = Math.max(1, Math.round(crop.width * sampleScale));
      sample.height = Math.max(1, Math.round(crop.height * sampleScale));
      const sampleContext = sample.getContext("2d", { willReadFrequently: true });
      if (!sampleContext) throw new Error("canvas-unavailable");
      sampleContext.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, sample.width, sample.height);
      const image = sampleContext.getImageData(0, 0, sample.width, sample.height);
      const gray = grayscale(image);
      const contrastStdDev = standardDeviation(gray.values, gray.mean);
      const blurVariance = laplacianVariance(gray.values, sample.width, sample.height);
      const estimatedSampleTextHeight = estimateTextHeight(
        gray.values,
        sample.width,
        sample.height,
        gray.mean - Math.max(10, contrastStdDev * 0.25),
      );
      sample.width = 0;
      sample.height = 0;
      return {
        width: crop.width,
        height: crop.height,
        contrastStdDev,
        blurVariance,
        estimatedTextHeightPx: estimatedSampleTextHeight === undefined
          ? undefined
          : estimatedSampleTextHeight / Math.max(sampleScale, 0.001),
      };
    },
    renderPreview(maxWidth = 1600) {
      return render(crop, "original", maxWidth, 1).then((asset) => asset.blob);
    },
    renderChunk(chunk, variant, upscaleFactor = 1) {
      return render(chunk.rect, variant, 2600, upscaleFactor).then((asset) => asset.blob);
    },
    renderChunkAsset(chunk, variant, upscaleFactor = 1) {
      return render(chunk.rect, variant, 2600, upscaleFactor);
    },
    renderCell(rect, variant, upscaleFactor = 1) {
      return render(rect, variant, 2400, upscaleFactor, 4, true);
    },
    readPixels() {
      requireOpen();
      throwIfAborted(signal);
      return context.getImageData(0, 0, canvas.width, canvas.height);
    },
    toOriginalRect(rect) {
      requireOpen();
      // Inverse of the EXIF-oriented decode -> centered rotate/scale above.
      const points = [[rect.x,rect.y],[rect.x+rect.width,rect.y],[rect.x,rect.y+rect.height],[rect.x+rect.width,rect.y+rect.height]]
        .map(([x,y]) => { const dx=x-canvas.width/2,dy=y-canvas.height/2; return {
          x:clamp((dx*Math.cos(radians)+dy*Math.sin(radians))/scale+originalWidth/2,0,originalWidth),
          y:clamp((-dx*Math.sin(radians)+dy*Math.cos(radians))/scale+originalHeight/2,0,originalHeight),
        }; });
      const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
      return {x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y};
    },
    close() {
      if (closed) return;
      closed = true;
      decoded.close();
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
