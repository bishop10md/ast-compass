import { useEffect, useMemo, useRef, useState } from "react";
import SearchableSelect from "../components/SearchableSelect";
import { analyzeConcordance, antimicrobialOptions, markerOptions, organismOptions, parseAstText, parseMeasurement, summarizeConcordance, type AstCategory, type AstResultRow, type ConcordanceResult } from "./concordanceEngine";

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
    setFile(null); setPreviewUrl(""); setOcrText(""); setOcrStatus(""); setRows([emptyRow()]); resetAnalysis();
    if (inputRef.current) inputRef.current.value = "";
  };
  const selectFile = (next: File | null) => {
    if (!next) return;
    if (!/^image\/(jpeg|png|webp)$/.test(next.type)) { setOcrStatus("Choose a JPG, JPEG, PNG, or WEBP image."); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next); setPreviewUrl(URL.createObjectURL(next)); setOcrStatus(""); setRows([]); setOcrText(""); resetAnalysis();
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
    } catch (error) { setOcrStatus(error instanceof Error ? error.message : "OCR is unavailable. Use manual entry instead."); }
  };
  const parseEditedText = () => { const parsed = parseAstText(ocrText); setRows(parsed.length ? parsed : [emptyRow()]); setOcrStatus(parsed.length ? `${parsed.length} possible row${parsed.length === 1 ? "" : "s"} parsed. Human review is required.` : "No known antimicrobial rows found. Continue with manual entry."); resetAnalysis(); };
  const analyze = () => { if (!confirmed || !organismId || !marker || !validRows.length) return; setResults(analyzeConcordance(organismId, marker, validRows)); };

  return <>
    <div className="page-head"><p className="eyebrow">Image + manual review workflow</p><h1>AST Image Concordance Analyzer</h1><p>Convert a deidentified AST image or manually entered result table into a human-reviewed educational concordance exercise.</p></div>
    <div className="concordance-safety"><b>EDUCATIONAL SUPPORT ONLY — NOT FOR AUTOMATIC CLINICAL INTERPRETATION</b><span>Always verify the organism, marker, extracted values, current breakpoints, method, and laboratory policy. This tool does not select therapy or authorize reporting.</span></div>
    <section className="analyzer-setup panel">
      <div className="workflow-tabs" role="tablist"><button role="tab" aria-selected={workflow === "image"} className={workflow === "image" ? "selected" : ""} onClick={() => { setWorkflow("image"); resetAnalysis(); }}>Upload image</button><button role="tab" aria-selected={workflow === "manual"} className={workflow === "manual" ? "selected" : ""} onClick={() => { setWorkflow("manual"); if (!rows.length) setRows([emptyRow()]); resetAnalysis(); }}>Manual entry</button></div>
      <div className="analyzer-context"><SearchableSelect label="Organism" required value={organismId} onChange={(value) => { setOrganismId(value); resetAnalysis(); }} options={organismOptions} placeholder="Search organism or alias…"/><SearchableSelect label="Resistance marker" required value={marker} onChange={(value) => { setMarker(value); resetAnalysis(); }} options={markerOptions} placeholder="Search marker or alias…"/></div>
    </section>
    {workflow === "image" && <section className="image-step panel">
      <div className="phi-notice"><b>STOP: use deidentified images only</b><p>Remove patient names, medical record numbers, dates of birth, accession numbers, barcodes, facility identifiers, and other protected health information before selecting a file. AST Compass cannot guarantee PHI detection.</p><label><input type="checkbox" checked={phiAcknowledged} onChange={(event) => setPhiAcknowledged(event.target.checked)}/> I confirm this image is deidentified and contains no PHI.</label></div>
      <div className={`upload-zone ${!phiAcknowledged ? "disabled" : ""}`}><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={!phiAcknowledged} onChange={(event) => selectFile(event.target.files?.[0] || null)}/><b>{file ? file.name : "Select an AST image"}</b><span>JPG, JPEG, PNG, or WEBP · held only for this browser session</span></div>
      {previewUrl && <div className="image-review"><div><img src={previewUrl} alt="Local preview of the selected deidentified AST result"/><button className="secondary" type="button" onClick={removeImage}>Remove image</button></div><div><button className="primary" type="button" onClick={extract}>Extract possible AST rows</button><p className="ocr-status" aria-live="polite">{ocrStatus}</p><label>Extracted text<textarea value={ocrText} onChange={(event) => { setOcrText(event.target.value); resetAnalysis(); }} placeholder="OCR text appears here. You may correct it before parsing."/></label><button className="secondary" type="button" onClick={parseEditedText}>Parse edited text</button></div></div>}
    </section>}
    <ReviewTable rows={rows} updateRow={updateRow} removeRow={(id) => { setRows((current) => current.filter((row) => row.id !== id)); resetAnalysis(); }} addRow={() => { setRows((current) => [...current, emptyRow()]); resetAnalysis(); }} lowConfidence={lowConfidence}/>
    <section className="confirmation-step panel"><label><input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setResults([]); }}/> I reviewed the image (if used), organism, marker, antimicrobial names, MIC/zone strings, and categories. The table is accurate for this learning exercise.</label><button className="primary" disabled={!confirmed || !organismId || !marker || !validRows.length} onClick={analyze}>Analyze confirmed results →</button>{(!organismId || !marker) && <small>Select both an organism and resistance marker before analysis.</small>}</section>
    {!!results.length && <AnalysisResults results={results} summary={summary}/>} 
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
  return <section className="analysis-step"><div className="summary-grid">{Object.entries(summary).map(([label, count]) => <div className={`summary-card ${label.toLowerCase().replace(/\s+/g, "-")}`} key={label}><b>{count}</b><span>{label}</span></div>)}</div><div className="panel"><div className="review-heading"><div><p className="eyebrow">Educational comparison</p><h2>Concordance analysis</h2></div><span>{results.length} reviewed result{results.length === 1 ? "" : "s"}</span></div><div className="analysis-list">{results.map((result) => <article key={result.id}><div><div><b>{result.antimicrobial}</b><span>{result.measurement || "No measurement"} · {result.category}</span></div><strong className={`assessment ${result.assessment.toLowerCase().replace(/\s+/g, "-")}`}>{result.assessment}</strong></div><p>{result.rationale}</p>{(result.assessment === "Discordant" || result.assessment === "Investigate") && <details><summary>Troubleshooting prompts</summary><ul>{result.troubleshooting.map((item) => <li key={item}>{item}</li>)}</ul></details>}</article>)}</div></div></section>;
}

