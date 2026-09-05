export type OcrProgress = { status: string; progress: number };
export type AstOcrWorker = { recognize(file: File): Promise<{ data: { text: string; confidence?: number } }>; terminate(): Promise<unknown> };

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
