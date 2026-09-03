import { useEffect, useMemo, useRef, useState } from "react";
import SearchableSelect from "../components/SearchableSelect";
import { analyzeConcordance, antimicrobialOptions, markerOptions, organismOptions, parseAstText, parseMeasurement, summarizeConcordance, type AstCategory, type AstResultRow, type ConcordanceResult } from "./concordanceEngine";
import { screenPhiText, type PhiScreeningResult } from "./phi-screening-core.mjs";
import { captureError, trackEvent } from "../lib/telemetry";

declare global {
  interface Window {
    Tesseract?: { recognize: (image: File, language: string, options?: { logger?: (message: { status: string; progress: number }) => void }) => Promise<{ data: { text: string } }> };
  }
}

const emptyRow = (): AstResultRow => ({ id: crypto.randomUUID(), antimicrobial: "", measurement: "", category: "Unknown", confidence: "High" });
const categories: AstCategory[] = ["S", "I", "R", "SDD", "NS", "Unknown"];
const loadOcr = async () => {
  if (window.Tesseract) return window.Tesseract;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-ast-ocr="true"]');
    if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); existing.addEventListener("error", () => reject(new Error("OCR could not load.")), { once: true }); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.dataset.astOcr = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("OCR could not load."));
    document.head.appendChild(script);
  });
  if (!window.Tesseract) throw new Error("OCR is unavailable. Use manual entry instead.");
  return window.Tesseract;
};

export default function ImageConcordanceAnalyzer() {
  const [workflow, setWorkflow] = useState<"image" | "manual">("image");
  const [organismId, setOrganismId] = useState("");
  const [marker, setMarker] = useState("");
  const [phiAcknowledged, setPhiAcknowledged] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [phiScreen, setPhiScreen] = useState<PhiScreeningResult | null>(null);
  const [screening, setScreening] = useState(false);
  const [rows, setRows] = useState<AstResultRow[]>([emptyRow()]);
  const [confirmed, setConfirmed] = useState(false);
  const [results, setResults] = useState<ConcordanceResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const summary = useMemo(() => summarizeConcordance(results), [results]);
  const lowConfidence = rows.filter((row) => row.confidence === "Low").length;
  const validRows = rows.filter((row) => row.antimicrobial && row.category !== "Unknown");

  const resetAnalysis = () => { setConfirmed(false); setResults([]); };
  const updateRow = (id: string, change: Partial<AstResultRow>) => { setRows((current) => current.map((row) => row.id === id ? { ...row, ...change } : row)); resetAnalysis(); };
  const removeImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null); setPreviewUrl(""); setOcrText(""); setOcrStatus(""); setPhiScreen(null); setPhiAcknowledged(false); setRows([emptyRow()]); resetAnalysis();
    if (inputRef.current) inputRef.current.value = "";
  };
  const selectFile = async (next: File | null) => {
    if (!next) return;
    if (!/^image\/(jpeg|png|webp)$/.test(next.type)) { setOcrStatus("Choose a JPG, JPEG, PNG, or WEBP image."); return; }
    if (next.size > 10 * 1024 * 1024) { setOcrStatus("Image rejected. Maximum size is 10 MB."); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null); setPreviewUrl(""); setPhiScreen(null); setPhiAcknowledged(false); setScreening(true); setOcrStatus("Checking image privacy…"); setRows([]); setOcrText(""); resetAnalysis();
    try {
      const ocr = await loadOcr();
      const response = await ocr.recognize(next, "eng", { logger: (message) => { if (message.progress) setOcrStatus(`Checking image privacy · ${Math.round(message.progress * 100)}%`); } });
      let barcode = false, face = false;
      const image = await createImageBitmap(next);
      const BarcodeDetectorClass = (window as unknown as { BarcodeDetector?: new () => { detect: (source: ImageBitmap) => Promise<unknown[]> } }).BarcodeDetector;
      const FaceDetectorClass = (window as unknown as { FaceDetector?: new () => { detect: (source: ImageBitmap) => Promise<unknown[]> } }).FaceDetector;
      if (BarcodeDetectorClass) barcode = (await new BarcodeDetectorClass().detect(image)).length > 0;
      if (FaceDetectorClass) face = (await new FaceDetectorClass().detect(image)).length > 0;
      image.close();
      const result = screenPhiText(response.data.text, { barcode, face, poorImageQuality: response.data.text.trim().length < 8 });
      setPhiScreen(result);
      if (result.status !== "clear") { trackEvent("phi_screen_blocked", { page: "/concordance/image", feature_name: "image_concordance", success_or_failure: "blocked" }); setOcrStatus("Image rejected before analysis. Choose a cropped or fully redacted image."); if (inputRef.current) inputRef.current.value = ""; return; }
      trackEvent("phi_screen_passed", { page: "/concordance/image", feature_name: "image_concordance", success_or_failure: "success" });
      setFile(next); setPreviewUrl(URL.createObjectURL(next)); setOcrText(response.data.text); setOcrStatus("Privacy screen passed. Confirm the image is de-identified before continuing.");
    } catch (error) { captureError(error, { feature_name: "image_concordance", success_or_failure: "failure" }); setPhiScreen(screenPhiText("", { ocrFailure: true })); setOcrStatus("Image cannot be verified. Screening failed closed; choose another clear, de-identified image."); if (inputRef.current) inputRef.current.value = ""; }
    finally { setScreening(false); }
  };
  const extract = async () => {
    if (!file) return;
    setOcrStatus("Loading local image text recognition…");
    try {
      const ocr = await loadOcr();
      const response = await ocr.recognize(file, "eng", { logger: (message) => { if (message.progress) setOcrStatus(`${message.status} · ${Math.round(message.progress * 100)}%`); } });
      setOcrText(response.data.text);
      const parsed = parseAstText(response.data.text);
      setRows(parsed.length ? parsed : [emptyRow()]);
      setOcrStatus(parsed.length ? `${parsed.length} possible AST row${parsed.length === 1 ? "" : "s"} found. Review every field below.` : "No complete rows were recognized. Edit the extracted text or enter results manually.");
      resetAnalysis();
    } catch (error) { captureError(error, { feature_name: "image_concordance", success_or_failure: "failure" }); setOcrStatus(error instanceof Error ? error.message : "OCR is unavailable. Use manual entry instead."); }
  };
  const parseEditedText = () => { const parsed = parseAstText(ocrText); setRows(parsed.length ? parsed : [emptyRow()]); setOcrStatus(parsed.length ? `${parsed.length} possible row${parsed.length === 1 ? "" : "s"} parsed. Human review is required.` : "No known antimicrobial rows found. Continue with manual entry."); resetAnalysis(); };
  const analyze = () => { if (!confirmed || !organismId || !marker || !validRows.length) return; const next = analyzeConcordance(organismId, marker, validRows); setResults(next); trackEvent("image_concordance_completed", { page: "/concordance/image", feature_name: "image_concordance", result_count: next.length, success_or_failure: "success" }); };

  return <>
    <div className="page-head"><p className="eyebrow">Image + manual review workflow</p><h1>AST Image Concordance Analyzer</h1><p>Convert a deidentified AST image or manually entered result table into a human-reviewed educational concordance exercise.</p></div>
    <div className="concordance-safety"><b>EDUCATIONAL SUPPORT ONLY — NOT FOR AUTOMATIC CLINICAL INTERPRETATION</b><span>Always verify the organism, marker, extracted values, current breakpoints, method, and laboratory policy. This tool does not select therapy or authorize reporting.</span></div>
    <section className="analyzer-setup panel">
      <div className="workflow-tabs" role="tablist"><button role="tab" aria-selected={workflow === "image"} className={workflow === "image" ? "selected" : ""} onClick={() => { setWorkflow("image"); resetAnalysis(); }}>Upload image</button><button role="tab" aria-selected={workflow === "manual"} className={workflow === "manual" ? "selected" : ""} onClick={() => { setWorkflow("manual"); if (!rows.length) setRows([emptyRow()]); resetAnalysis(); }}>Manual entry</button></div>
      <div className="analyzer-context"><SearchableSelect label="Organism" required value={organismId} onChange={(value) => { setOrganismId(value); resetAnalysis(); }} options={organismOptions} placeholder="Search organism or alias…"/><SearchableSelect label="Resistance marker" required value={marker} onChange={(value) => { setMarker(value); resetAnalysis(); }} options={markerOptions} placeholder="Search marker or alias…"/></div>
    </section>
    {workflow === "image" && <section className="image-step panel">
      <div className="phi-notice"><b>IMPORTANT — DO NOT UPLOAD PHI</b><p>Only select de-identified educational or training material. Remove patient names, MRNs, dates of birth, patient-associated dates, accession/specimen identifiers, addresses, phone numbers, barcodes, QR codes, labels, faces, and every other identifier.</p><small>Automated screening reduces risk but cannot guarantee detection of every identifier. It is not a legal de-identification certification.</small></div>
      <div className={`upload-zone ${screening ? "disabled" : ""}`}><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={screening} onChange={(event) => void selectFile(event.target.files?.[0] || null)}/><b>{screening ? "Checking image privacy…" : file ? file.name : "Select an AST image for privacy screening"}</b><span>JPG, JPEG, PNG, or WEBP · maximum 10 MB · no permanent storage before screening</span></div>
      {phiScreen && <div className={`phi-screen-result ${phiScreen.status}`} aria-live="polite"><b>{phiScreen.status === "clear" ? "PRIVACY SCREEN PASSED" : phiScreen.status === "unable-to-screen" ? "IMAGE CANNOT BE VERIFIED" : "IMAGE REJECTED — POSSIBLE PHI DETECTED"}</b>{phiScreen.findings.length > 0 && <><p>Detected risk categories:</p><ul>{phiScreen.findings.map((finding) => <li key={finding.type}>{finding.type.replace(/-/g, " ")}</li>)}</ul></>}<p>{phiScreen.status === "clear" ? "No obvious patient identifiers were detected. You must still confirm de-identification." : "Remove, crop, or redact the identified regions and choose the modified image again. There is no override."}</p>{phiScreen.status !== "clear" && <button className="secondary" type="button" onClick={removeImage}>Choose another image</button>}</div>}
      {phiScreen?.status === "clear" && <label className="phi-confirm"><input type="checkbox" checked={phiAcknowledged} onChange={(event) => setPhiAcknowledged(event.target.checked)}/> I confirm that this image is de-identified and contains no PHI.</label>}
      {previewUrl && <div className="image-review"><div><img src={previewUrl} alt="Local preview of the selected deidentified AST result"/><button className="secondary" type="button" onClick={removeImage}>Remove image</button></div><div><button className="primary" type="button" disabled={!phiAcknowledged} onClick={extract}>Continue to AST extraction</button><p className="ocr-status" aria-live="polite">{ocrStatus}</p><label>Extracted text<textarea value={ocrText} onChange={(event) => { setOcrText(event.target.value); resetAnalysis(); }} placeholder="OCR text appears here. You may correct it before parsing."/></label><button className="secondary" type="button" disabled={!phiAcknowledged} onClick={parseEditedText}>Parse edited text</button></div></div>}
    </section>}
    <ReviewTable rows={rows} updateRow={updateRow} removeRow={(id) => { setRows((current) => current.filter((row) => row.id !== id)); resetAnalysis(); }} addRow={() => { setRows((current) => [...current, emptyRow()]); resetAnalysis(); }} lowConfidence={lowConfidence}/>
    <section className="confirmation-step panel"><label><input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setResults([]); }}/> I reviewed the image (if used), organism, marker, antimicrobial names, MIC/zone strings, and categories. The table is accurate for this learning exercise.</label><button className="primary" disabled={!confirmed || !organismId || !marker || !validRows.length} onClick={analyze}>Analyze confirmed results →</button>{(!organismId || !marker) && <small>Select both an organism and resistance marker before analysis.</small>}</section>
    {!!results.length && <><AnalysisResults results={results} summary={summary}/><section className="panel save-work session-only-note"><h2>Session-only analysis</h2><p>This analysis is processed for the current session and is not added to a persistent personal history.</p><small>Uploaded images are not permanently saved. Client-side screening cannot authorize permanent storage, and the PHI screening safeguards remain active.</small></section></>}
    <div className="concordance-safety bottom"><b>VERIFY BEFORE USE</b><span>Educational concordance is not susceptibility interpretation. EUCAST “I” means susceptible, increased exposure; category meaning depends on the selected current standard and method.</span></div>
  </>;
}

function ReviewTable({ rows, updateRow, removeRow, addRow, lowConfidence }: { rows: AstResultRow[]; updateRow: (id: string, change: Partial<AstResultRow>) => void; removeRow: (id: string) => void; addRow: () => void; lowConfidence: number }) {
  return <section className="review-step panel"><div className="review-heading"><div><p className="eyebrow">Human confirmation required</p><h2>Review and correct every row</h2></div>{lowConfidence > 0 && <span className="confidence-alert">{lowConfidence} low-confidence row{lowConfidence === 1 ? "" : "s"}</span>}</div>
    <div className="review-table-wrap"><table className="review-table"><thead><tr><th>Antimicrobial</th><th>MIC / zone (preserved)</th><th>Category</th><th>Extraction confidence</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((row) => <tr className={row.confidence === "Low" ? "low-confidence" : ""} key={row.id}><td><input list="antimicrobial-list" value={row.antimicrobial} onChange={(event) => updateRow(row.id, { antimicrobial: event.target.value })} placeholder="e.g., Ceftriaxone"/></td><td><input value={row.measurement} onChange={(event) => updateRow(row.id, { measurement: event.target.value, ...parseMeasurement(event.target.value) })} placeholder="e.g., <=1 or >=64"/></td><td><select value={row.category} onChange={(event) => updateRow(row.id, { category: event.target.value as AstCategory })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></td><td><select value={row.confidence} onChange={(event) => updateRow(row.id, { confidence: event.target.value as AstResultRow["confidence"] })}><option>High</option><option>Moderate</option><option>Low</option></select></td><td><button type="button" aria-label={`Remove ${row.antimicrobial || "row"}`} onClick={() => removeRow(row.id)}>×</button></td></tr>)}</tbody></table></div>
    <datalist id="antimicrobial-list">{antimicrobialOptions.map((option) => <option key={option.value} value={option.label}/>)}</datalist><button className="secondary add-row" type="button" onClick={addRow}>+ Add result row</button>
  </section>;
}

function AnalysisResults({ results, summary }: { results: ConcordanceResult[]; summary: ReturnType<typeof summarizeConcordance> }) {
  const concordant = summary.Concordant + summary["Potentially concordant"], concern = summary.Discordant + summary.Investigate;
  const overall = concern > concordant ? "Potential discordance identified" : concordant > 0 ? "Largely concordant" : "Inference remains limited";
  return <section className="analysis-step"><div className="overall-summary panel"><p className="eyebrow">Overall concordance</p><h2>{overall}</h2><p>{results.length} antimicrobial result{results.length === 1 ? "" : "s"} reviewed</p><div className="summary-grid">{Object.entries(summary).filter(([, count]) => count > 0).map(([label, count]) => <div className={`summary-card ${label.toLowerCase().replace(/\s+/g, "-")}`} key={label}><b>{count}</b><span>{label}</span></div>)}</div></div><div className="panel"><div className="review-heading"><div><p className="eyebrow">Educational comparison</p><h2>Detailed concordance analysis</h2></div><span>{results.length} reviewed result{results.length === 1 ? "" : "s"}</span></div><div className="analysis-list">{results.map((result) => <article key={result.id}><div><div><b>{result.antimicrobial}</b><span>{result.measurement || "No measurement"} · {result.category}</span></div><strong className={`assessment ${result.assessment.toLowerCase().replace(/\s+/g, "-")}`}>{result.assessment}</strong></div><p>{result.rationale}</p>{(result.assessment === "Discordant" || result.assessment === "Investigate") && <details><summary>Troubleshooting prompts</summary><ul>{result.troubleshooting.map((item) => <li key={item}>{item}</li>)}</ul></details>}</article>)}</div></div></section>;
}
