export type OcrProgress = { status: string; progress: number };

export type AstOcrBbox = { x0: number; y0: number; x1: number; y1: number };
export type AstOcrWord = { text: string; confidence: number; bbox?: AstOcrBbox };
export type AstOcrLine = { text: string; confidence: number; bbox?: AstOcrBbox; words?: AstOcrWord[] };
export type AstOcrSource = File | Blob | HTMLCanvasElement | ImageData | OffscreenCanvas;
export type AstOcrOptions = {
  rectangle?: { left: number; top: number; width: number; height: number };
  rotateAuto?: boolean;
  rotateRadians?: number;
};
export type AstOcrOutput = {
  text?: boolean;
  blocks?: boolean;
  tsv?: boolean;
  hocr?: boolean;
};
export type AstOcrRecognition = {
  data: {
    text: string;
    confidence?: number;
    lines?: AstOcrLine[];
    words?: AstOcrWord[];
    rotateRadians?: number | null;
    tsv?: string | null;
  };
};
export type AstOcrWorker = {
  recognize(source: AstOcrSource, options?: AstOcrOptions, output?: AstOcrOutput): Promise<AstOcrRecognition>;
  setParameters?(parameters: Record<string, string>): Promise<unknown>;
  terminate(): Promise<unknown>;
};

type TesseractBrowserApi = {
  createWorker(language: string, oem?: number, options?: {
    logger?: (event: OcrProgress) => void;
    workerPath?: string;
    corePath?: string;
    langPath?: string;
  }): Promise<AstOcrWorker>;
};

declare global { interface Window { Tesseract?: TesseractBrowserApi } }

let apiPromise: Promise<TesseractBrowserApi> | null = null;
function loadFirstPartyOcr() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!apiPromise) apiPromise = new Promise<TesseractBrowserApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/ocr/tesseract.min.js";
    script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("ocr-unavailable"));
    script.onerror = () => reject(new Error("ocr-load"));
    document.head.appendChild(script);
  }).catch(error => { apiPromise = null; throw error; });
  return apiPromise;
}

/** Create OCR exclusively from version-pinned assets served by astcompass.com. */
export async function createAstOcrWorker(logger?: (event: OcrProgress) => void): Promise<AstOcrWorker> {
  const api = await loadFirstPartyOcr();
  return api.createWorker("eng", 1, { logger, workerPath: "/ocr/worker.min.js", corePath: "/ocr/core", langPath: "/ocr/lang" });
}
