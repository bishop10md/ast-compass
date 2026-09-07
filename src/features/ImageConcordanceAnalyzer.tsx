import { useEffect,useMemo,useRef,useState } from "react";
import SearchableSelect from "../components/SearchableSelect";
import { markerOptions,parseAstText,parseMeasurement,summarizeConcordance,type AstCategory,type AstResultRow,type ConcordanceResult } from "./concordanceEngine";
import { analyzeConcordance } from "./coverageConcordance";
import { resolveAntimicrobial } from "../data/antibiotics";
import { imageAntimicrobialOptions as antimicrobialOptions, scientificOrganismOptions as organismOptions } from "../data/coverageOptions";
import { screenPhiText,type PhiScreeningResult } from "./phi-screening-core.mjs";
import { captureError,trackEvent } from "../lib/telemetry";
import { createAstOcrWorker, type AstOcrRecognition, type AstOcrWorker } from "../lib/ocr";
import { validateAstImageFile } from "../security/image-validation-core.mjs";
import SatisfactionPrompt from "../components/SatisfactionPrompt";
import { createImageWorkspace } from "./image-concordance-image";
import ExtractionSourceReview from "../components/ExtractionSourceReview";
import { REVIEW_FIELDS, INCOMPLETE_REVIEW_MESSAGE, reviewValue, isFieldVerified, canConfirmRow, inspectField, confirmField, confirmRow, humanReviewReadiness } from "./image-human-review.mjs";
import ImageExtractionWorkspace, {
  createManualImageRowReview,
  type ImageExtractionResult,
  type ImageFieldReview,
  type ImageReviewFieldKey,
  type ImageReviewMap,
} from "../components/ImageExtractionWorkspace";

type OcrProgress={status:string;progress:number};
declare global{interface Window{BarcodeDetector?:new()=>{detect:(source:ImageBitmap)=>Promise<unknown[]>};FaceDetector?:new()=>{detect:(source:ImageBitmap)=>Promise<unknown[]>}}}
export type ImagePipelineStatus="idle"|"validating-file"|"decoding-image"|"initializing-ocr"|"running-ocr"|"screening-phi"|"screening-barcode"|"screening-face"|"privacy-clear"|"privacy-cancelled"|"possible-phi"|"phi-detected"|"unable-to-screen"|"analysis-ready"|"ocr-failed"|"unsupported-format"|"image-too-poor"|"detector-unavailable"|"analysis-failed";
type Diagnostics={mimeType:string;fileSize:number;width:number;height:number;ocrInitialized:boolean;ocrConfidence:number|null;barcodeAvailable:boolean;faceAvailable:boolean;phiScore:number|null;state:ImagePipelineStatus;errorCategory?:string};
type PrivacyScreenSession={controller:AbortController;worker:AstOcrWorker|null;workerPromise:Promise<AstOcrWorker>|null;releasePromise:Promise<void>|null};
const blankDiagnostics:Diagnostics={mimeType:"",fileSize:0,width:0,height:0,ocrInitialized:false,ocrConfidence:null,barcodeAvailable:false,faceAvailable:false,phiScore:null,state:"idle"};
const emptyRow=():AstResultRow=>({id:crypto.randomUUID(),antimicrobial:"",measurement:"",category:"Unknown",confidence:"High"});
const categories:AstCategory[]=["S","I","R","SDD","NS","Unknown"];
const log=(stage:ImagePipelineStatus,data:Partial<Diagnostics>={})=>{if(import.meta.env.DEV)console.info("[image-pipeline]",{stage,...data})};
const progressMessage=({status,progress}:OcrProgress)=>{const percent=progress>0?` · ${Math.round(progress*100)}%`:"";if(/language/i.test(status))return `Loading OCR language data${percent}`;if(/core|worker/i.test(status))return `Preparing the OCR engine${percent}`;if(/recogniz/i.test(status))return `Reading image text${percent}`;return `Preparing image analysis${percent}`};
const privacyAbortError=()=>new DOMException("Privacy screening was cancelled.","AbortError");
const ensurePrivacyScreenActive=(session:PrivacyScreenSession)=>{if(session.controller.signal.aborted)throw privacyAbortError()};
async function releasePrivacyWorker(session:PrivacyScreenSession){
 if(session.releasePromise)return session.releasePromise;
 session.releasePromise=(async()=>{
  let worker=session.worker;
  if(!worker&&session.workerPromise)try{worker=await session.workerPromise}catch{}
  session.worker=null;session.workerPromise=null;
  if(worker)try{await worker.terminate()}catch{}
 })();
 return session.releasePromise;
}
async function normalizeImage(source:File,signal?:AbortSignal){
 if(signal?.aborted)throw privacyAbortError();
 const workspace=await createImageWorkspace(source,{maxDimension:1600,signal});
 try{
  if(signal?.aborted)throw privacyAbortError();
  if(workspace.originalWidth<400||workspace.originalHeight<250)throw new Error("low-resolution");
  const metrics=workspace.measureQuality();
  if((metrics.contrastStdDev??0)<3)throw new Error("blank-image");
  const blob=await workspace.renderPreview(1600);
  if(signal?.aborted)throw privacyAbortError();
  return{file:new File([blob],"normalized-ast-image.png",{type:"image/png"}),width:workspace.originalWidth,height:workspace.originalHeight,ocrWidth:workspace.width,ocrHeight:workspace.height}
 }finally{workspace.close()}
}

export default function ImageConcordanceAnalyzer(){
 const[workflow,setWorkflow]=useState<"image"|"manual">("image"),[organismId,setOrganismId]=useState(""),[marker,setMarker]=useState(""),[ack,setAck]=useState(false),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(""),[message,setMessage]=useState(""),[phi,setPhi]=useState<PhiScreeningResult|null>(null),[status,setStatus]=useState<ImagePipelineStatus>("idle"),[rows,setRows]=useState<AstResultRow[]>([]),[confirmed,setConfirmed]=useState(false),[analysisNotice,setAnalysisNotice]=useState(""),[results,setResults]=useState<ConcordanceResult[]>([]),[diagnostics,setDiagnostics]=useState<Diagnostics>(blankDiagnostics),[selfTest,setSelfTest]=useState("");
 const[extractionSummary,setExtractionSummary]=useState<ImageExtractionResult["summary"]|null>(null);
 const[privacyOcr,setPrivacyOcr]=useState<AstOcrRecognition|null>(null),[privacyImageSize,setPrivacyImageSize]=useState({width:0,height:0}),[imageReview,setImageReview]=useState<ImageReviewMap>({}),[imageExtracting,setImageExtracting]=useState(false);
 const inputRef=useRef<HTMLInputElement>(null),cameraRef=useRef<HTMLInputElement>(null),previewUrlRef=useRef(""),privacySessionRef=useRef<PrivacyScreenSession|null>(null);
 const replaceSourcePreview=(url="")=>{if(previewUrlRef.current)URL.revokeObjectURL(previewUrlRef.current);previewUrlRef.current=url;setPreview(url)};
 useEffect(()=>()=>{if(previewUrlRef.current)URL.revokeObjectURL(previewUrlRef.current);previewUrlRef.current="";const active=privacySessionRef.current;privacySessionRef.current=null;if(active){active.controller.abort("component-unmounted");void releasePrivacyWorker(active)}},[]);
 const privacyScreening=["validating-file","decoding-image","initializing-ocr","running-ocr","screening-phi","screening-barcode","screening-face"].includes(status);
 const summary=useMemo(()=>summarizeConcordance(results),[results]),lowConfidence=rows.filter(r=>r.confidence==="Low"||Object.values(imageReview[r.id]?.fields||{}).some(field=>field.confidence==="LOW")).length,busy=imageExtracting||privacyScreening;
 const privacyPassed=phi?.status==="clear"&&["privacy-clear","detector-unavailable","analysis-ready","analysis-failed"].includes(status);
 const getReadiness=()=>{const names=rows.map(row=>resolveAntimicrobial(row.antimicrobial)?.id||row.antimicrobial.trim().toLowerCase());return humanReviewReadiness(rows,imageReview,{busy,hasImage:!!file,privacyPassed,acknowledged:ack,organismId,marker,duplicates:new Set(names).size!==names.length,confirmed})};
 const readiness=getReadiness();
 const stage=(next:ImagePipelineStatus,data:Partial<Diagnostics>={})=>{setStatus(next);setDiagnostics(old=>({...old,...data,state:next}));log(next,data)};
 const resetAnalysis=()=>{setConfirmed(false);setResults([])};
 const resetExtraction=()=>{setExtractionSummary(null);setRows([]);setImageReview({});setAnalysisNotice("");resetAnalysis()};
 const removeImage=()=>{const active=privacySessionRef.current;privacySessionRef.current=null;if(active){active.controller.abort("image-removed");void releasePrivacyWorker(active)}replaceSourcePreview();setFile(null);setMessage("");setPhi(null);setPrivacyOcr(null);setPrivacyImageSize({width:0,height:0});setAck(false);setImageExtracting(false);resetExtraction();setStatus("idle");setDiagnostics(blankDiagnostics);if(inputRef.current)inputRef.current.value="";if(cameraRef.current)cameraRef.current.value=""};
 const cancelPrivacyScreen=async()=>{
  const active=privacySessionRef.current;if(!active)return;
  privacySessionRef.current=null;active.controller.abort("user-cancelled");void releasePrivacyWorker(active);
  replaceSourcePreview();setFile(null);setPhi(null);setPrivacyOcr(null);setPrivacyImageSize({width:0,height:0});setAck(false);resetExtraction();stage("privacy-cancelled",{errorCategory:"user-cancelled"});setMessage("Privacy screening cancelled. Temporary OCR cleanup was requested; any worker still initializing will be released when initialization settles. The image was not cleared, and AST extraction did not run.");if(inputRef.current)inputRef.current.value="";if(cameraRef.current)cameraRef.current.value="";
 };
 const processFile=async(next:File)=>{
  const prior=privacySessionRef.current;
  if(prior){prior.controller.abort("screen-replaced");void releasePrivacyWorker(prior)}
  const session:PrivacyScreenSession={controller:new AbortController(),worker:null,workerPromise:null,releasePromise:null};
  privacySessionRef.current=session;
  const ensureCurrent=()=>{ensurePrivacyScreenActive(session);if(privacySessionRef.current!==session)throw privacyAbortError()};
  replaceSourcePreview();setFile(null);setMessage("");setPhi(null);setAck(false);setExtractionSummary(null);setRows([]);setImageReview({});setPrivacyOcr(null);setPrivacyImageSize({width:0,height:0});resetAnalysis();
  stage("validating-file",{mimeType:next.type,fileSize:next.size,errorCategory:undefined});
  const heic=/\.hei[cf]$/i.test(next.name)||/heic|heif/i.test(next.type);
  if(heic){if(privacySessionRef.current===session)privacySessionRef.current=null;session.controller.abort("unsupported-format");stage("unsupported-format",{errorCategory:"heic"});setMessage("HEIC images are not currently supported. Please convert to JPEG or PNG.");return}
  try{
   const validation=await validateAstImageFile(next);
   ensureCurrent();
   if(!validation.valid){stage("unsupported-format",{errorCategory:validation.reason||"format"});setMessage(validation.reason==="size"?"This image is larger than 10 MB. Please crop or export a smaller copy.":validation.reason==="signature"?"The file contents do not match the selected image format. Use an original JPEG, PNG, or WEBP image.":"This image format is not supported. Use JPEG, PNG, or WEBP.");return}
   stage("decoding-image");setMessage("Preparing a temporary full-image copy for privacy screening...");
   const normalized=await normalizeImage(next,session.controller.signal);
   ensureCurrent();
   setFile(next);
   stage("initializing-ocr",{width:normalized.width,height:normalized.height});setMessage("Preparing the OCR engine...");
   session.workerPromise=createAstOcrWorker(event=>{if(!session.controller.signal.aborted&&privacySessionRef.current===session)setMessage(progressMessage(event))});
   const worker=await session.workerPromise;
   if(session.controller.signal.aborted||privacySessionRef.current!==session){await releasePrivacyWorker(session);throw privacyAbortError()}
   session.workerPromise=null;session.worker=worker;
   setDiagnostics(old=>({...old,ocrInitialized:true}));stage("running-ocr");setMessage("Reading image text...");
   const response=await worker.recognize(normalized.file,{rotateAuto:true},{text:true,blocks:true}),text=response.data.text||"",confidence=Number.isFinite(response.data.confidence)?response.data.confidence!:null;
   ensureCurrent();
   stage("screening-phi",{ocrConfidence:confidence});setMessage("Screening recognized text for identifiers...");
   if(text.trim().length<8){stage("unable-to-screen",{errorCategory:"insufficient-text"});setMessage("Privacy screening could not confidently clear this image. Use a clearer de-identified image. There is no override.");return}
   const barcodeAvailable=!!window.BarcodeDetector,faceAvailable=!!window.FaceDetector;let barcode=false,face=false;
   if(barcodeAvailable){stage("screening-barcode",{barcodeAvailable,faceAvailable});const bitmap=await createImageBitmap(normalized.file);try{ensureCurrent();barcode=(await new window.BarcodeDetector!().detect(bitmap)).length>0;ensurePrivacyScreenActive(session)}finally{bitmap.close()}}
   if(faceAvailable){stage("screening-face",{barcodeAvailable,faceAvailable});const bitmap=await createImageBitmap(normalized.file);try{ensureCurrent();face=(await new window.FaceDetector!().detect(bitmap)).length>0;ensurePrivacyScreenActive(session)}finally{bitmap.close()}}
   ensureCurrent();
   const result=screenPhiText(text,{barcode,face});setPhi(result);setDiagnostics(old=>({...old,barcodeAvailable,faceAvailable,phiScore:result.confidence}));
   if(result.status!=="clear"){
    const blockedStatus=result.status==="phi-detected"?"phi-detected":result.status==="possible-phi"?"possible-phi":"unable-to-screen";
    stage(blockedStatus);setMessage(result.status==="phi-detected"?"This image cannot be processed because patient-identifying information appears to be present.":result.status==="possible-phi"?"Potential patient-identifying information was detected. Crop or redact it before trying again.":"Privacy screening could not confidently clear this image. There is no override.");
    trackEvent("phi_screen_blocked",{page:"/concordance/image",feature_name:"image_concordance",success_or_failure:"blocked"});return
   }
   setPrivacyOcr(response);setPrivacyImageSize({width:normalized.ocrWidth,height:normalized.ocrHeight});
   replaceSourcePreview(URL.createObjectURL(next));
   if(!barcodeAvailable||!faceAvailable){stage("detector-unavailable",{barcodeAvailable,faceAvailable});setMessage("Some automated privacy checks are unavailable in this browser. Text-based privacy screening completed, but additional image checks could not run.")}
   else{stage("privacy-clear",{barcodeAvailable,faceAvailable});setMessage("Available privacy checks completed. Confirm de-identification before continuing.")}
   trackEvent("phi_screen_passed",{page:"/concordance/image",feature_name:"image_concordance",success_or_failure:"success"})
  }catch(error){
   if(session.controller.signal.aborted)return;
   if(privacySessionRef.current!==session)return;
   captureError(error,{feature_name:"image_concordance",success_or_failure:"failure"});const kind=error instanceof Error?error.message:"unknown";
   if(/low-resolution|blank-image|canvas|decode/.test(kind)){stage("image-too-poor",{errorCategory:/low-resolution/.test(kind)?"low-resolution":/blank-image/.test(kind)?"blank-image":"image-decoding"});setMessage("The image is too unclear for reliable analysis.")}
   else{stage("ocr-failed",{errorCategory:"ocr-initialization-or-worker"});setMessage("Image analysis could not start. Please try again.")}
  }finally{await releasePrivacyWorker(session);if(privacySessionRef.current===session)privacySessionRef.current=null}
 };
 const applyExtraction=(extraction:ImageExtractionResult)=>{setExtractionSummary(extraction.summary);const fallback=extraction.rows.length?null:emptyRow(),nextRows=fallback?[fallback]:extraction.rows,nextReview=fallback?{[fallback.id]:createManualImageRowReview(fallback)}:extraction.review;setRows(nextRows);setImageReview(nextReview);stage(extraction.rows.length?"analysis-ready":"analysis-failed",{errorCategory:extraction.rows.length?undefined:"no-rows"});setMessage(extraction.rows.length?extraction.summary.message+" Review and verify every field below.":"AST extraction failed after privacy screening. Enter results manually or try a clearer crop.");resetAnalysis()};
 const updateRow=(id:string,change:Partial<AstResultRow>,field?:ImageReviewFieldKey)=>{setRows(old=>old.map(row=>row.id===id?{...row,...change}:row));if(field)setImageReview(old=>{const review=old[id];if(!review)return old;const value=String(field==="antimicrobial"?change.antimicrobial??"":field==="measurement"?change.measurement??"":change.category??"");return{...old,[id]:{...review,status:"needs-verification",issues:review.issues.filter(issue=>issue.field!==field),fields:{...review.fields,[field]:{...review.fields[field],raw:value,confidence:"LOW",score:0,reasons:["User edited this field after extraction. Verify it against the source image."],suggestions:[],conflicts:[],unreadable:!value.trim()||(field==="category"&&value==="Unknown"),verified:false,confirmedValue:undefined,inspectedValue:undefined,userEdited:true}}}}});setAnalysisNotice("");resetAnalysis()};
 const inspectRowField=(id:string,field:ImageReviewFieldKey)=>{const row=rows.find(r=>r.id===id);if(row)setImageReview(old=>({...old,[id]:inspectField(old[id],row,field)}))};
 const verifyField=(id:string,field:ImageReviewFieldKey,verified:boolean)=>{const row=rows.find(r=>r.id===id);if(row)setImageReview(old=>({...old,[id]:confirmField(old[id],row,field,verified)}));setAnalysisNotice("");resetAnalysis()};
 const verifyRow=(id:string)=>{const row=rows.find(r=>r.id===id);if(row)setImageReview(old=>({...old,[id]:confirmRow(old[id],row)}));setAnalysisNotice("");resetAnalysis()};
 const applySuggestion=(id:string,suggestion:ImageFieldReview["suggestions"][number])=>updateRow(id,{antimicrobial:suggestion.label},"antimicrobial");
 const removeRow=(id:string)=>{setRows(old=>old.filter(row=>row.id!==id));setImageReview(old=>{const next={...old};delete next[id];return next});setAnalysisNotice("");resetAnalysis()};
 const addRow=()=>{const row=emptyRow();setRows(old=>[...old,row]);setImageReview(old=>({...old,[row.id]:createManualImageRowReview(row)}));setAnalysisNotice("");resetAnalysis()};
 const analyze=()=>{const current=getReadiness();if(!current.ready){setAnalysisNotice(`Before analyzing, ${current.missing.join(", ")}.`);return}setAnalysisNotice("");const next=analyzeConcordance(organismId,marker,rows);setResults(next);trackEvent("image_concordance_completed",{page:"/concordance/image",feature_name:"image_concordance",result_count:next.length,success_or_failure:"success"})};
 const runSelfTest=async()=>{const canvas=!!document.createElement("canvas").getContext("2d"),parser=typeof parseAstText==="function",scanner=typeof screenPhiText==="function";let ocr=false,worker:AstOcrWorker|null=null;try{worker=await createAstOcrWorker();ocr=!!worker}catch{}finally{if(worker)try{await worker.terminate()}catch{}}setSelfTest(!canvas||!parser||!scanner||!ocr?"FAILED":window.BarcodeDetector&&window.FaceDetector?"READY":"DEGRADED")};
 const failed=["unsupported-format","ocr-failed","image-too-poor","analysis-failed"].includes(status),blocked=["possible-phi","phi-detected","unable-to-screen"].includes(status);
 return <><div className="page-head"><p className="eyebrow">Image + manual review workflow</p><h1>Image-Assisted Concordance</h1><p>AST Compass can assist with extracting de-identified susceptibility results from an image. Review and confirm all extracted values before analysis.</p><p className="assistive-principle">The source image is evidence. OCR is a draft transcription. You confirm the data; then AST Compass analyzes it.</p></div><div className="concordance-safety"><b>EDUCATIONAL SUPPORT ONLY — NOT FOR AUTOMATIC CLINICAL INTERPRETATION</b><span>Always verify the organism, marker, extracted values, current breakpoints, method, and laboratory policy.</span></div><section className="analyzer-setup panel"><div className="workflow-tabs" role="tablist"><button role="tab" aria-selected={workflow==="image"} className={workflow==="image"?"selected":""} disabled={busy} onClick={()=>{setWorkflow("image");resetAnalysis()}}>Upload image</button><button role="tab" aria-selected={workflow==="manual"} className={workflow==="manual"?"selected":""} disabled={busy} onClick={()=>{setWorkflow("manual");resetAnalysis();if(!rows.length){const row=emptyRow();setRows([row]);setImageReview({[row.id]:createManualImageRowReview(row)})}}}>Manual entry</button></div><div className="analyzer-context"><SearchableSelect label="Organism" required value={organismId} onChange={value=>{setOrganismId(value);setAnalysisNotice("");resetAnalysis()}} options={organismOptions} placeholder="Search organism or alias…"/><SearchableSelect label="Resistance marker" required value={marker} onChange={value=>{setMarker(value);setAnalysisNotice("");resetAnalysis()}} options={markerOptions} placeholder="Search marker or alias…"/></div></section>
 {workflow==="image"&&<div className={`camera-source ${busy?"disabled":""}`}><label className="primary">Take photo<input ref={cameraRef} className="camera-source-input" type="file" accept="image/*" capture="environment" disabled={busy} onChange={event=>{const next=event.target.files?.[0];if(next)void processFile(next)}}/></label><span>Opens the rear camera on supported Android devices. Use only for de-identified educational material.</span></div>}
 {workflow==="image"&&<section className="image-step panel">
  <div className="phi-notice"><b>IMPORTANT — DO NOT UPLOAD PHI</b><p>Only select de-identified educational material. Remove names, MRNs, dates of birth, specimen identifiers, addresses, phone numbers, barcodes, QR codes, labels, faces, and every other identifier.</p><small>Automated screening reduces risk but cannot certify de-identification. Full-image privacy screening always runs before crop or AST extraction.</small></div>
  <div className={`upload-zone ${busy?"disabled":""}`}><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" disabled={busy} onChange={e=>{const next=e.target.files?.[0];if(next)void processFile(next)}}/><b>{busy?"Analyzing image safely…":file?"Image retained in temporary session memory":"Select an AST image for privacy screening"}</b><span>JPG, JPEG, PNG, or WEBP · maximum 10 MB · no permanent storage before screening</span></div>
  {status!=="idle"&&<div className={`pipeline-message ${failed?"failure":blocked?"blocked":status==="detector-unavailable"||status==="privacy-cancelled"?"degraded":"success"}`} role="status"><b>{status.replace(/-/g," ").toUpperCase()}</b><p>{message}</p>{privacyScreening&&<button type="button" className="secondary" onClick={()=>void cancelPrivacyScreen()}>Cancel privacy screening</button>}{status==="ocr-failed"&&file&&<button type="button" className="primary" onClick={()=>void processFile(file)}>Retry analysis</button>}{(failed||blocked)&&<button type="button" className="secondary" onClick={removeImage}>Choose another image</button>}</div>}
  {phi&&blocked&&<div className={`phi-screen-result ${phi.status}`}><b>{status==="phi-detected"?"PHI DETECTED":status==="possible-phi"?"POSSIBLE PHI":"UNABLE TO CLEAR PRIVACY SCREEN"}</b><ul>{phi.findings.map(f=><li key={f.type}>{f.type.replace(/-/g," ")}</li>)}</ul><p>Remove, crop, or redact the identified regions and upload the edited image again. There is no override.</p></div>}
  {privacyPassed&&<label className="phi-confirm"><input type="checkbox" checked={ack} onChange={e=>{setAck(e.target.checked);setAnalysisNotice("");resetAnalysis()}}/> I confirm that this image is de-identified and contains no PHI.</label>}
  {preview&&privacyPassed&&<button type="button" className="primary" disabled={!ack} onClick={()=>document.getElementById("crop-to-ast-table")?.scrollIntoView({behavior:"smooth"})}>Continue to AST extraction</button>}
  {file&&preview&&privacyOcr&&privacyImageSize.width>0&&privacyPassed&&ack&&<ImageExtractionWorkspace file={file} sourcePreview={preview} privacyOcr={privacyOcr} privacyImageSize={privacyImageSize} acknowledged={ack} onExtraction={applyExtraction} onReset={resetExtraction} onRemove={removeImage} onBusyChange={setImageExtracting} onMessage={setMessage}/>}
  {import.meta.env.DEV&&<details className="image-diagnostics"><summary>Image Diagnostics</summary><dl>{Object.entries(diagnostics).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{String(value??"not available")}</dd></div>)}</dl><button type="button" className="secondary" onClick={()=>void runSelfTest()}>Run Image Pipeline Self-Test</button>{selfTest&&<b>{selfTest}</b>}</details>}
  {file&&privacyPassed&&ack&&!busy&&<button type="button" className="secondary" onClick={()=>{if(!rows.length)addRow();document.querySelector('.review-step')?.scrollIntoView({behavior:'auto'});}}>Enter results manually — keep this image</button>}
 </section>}
{(workflow==="manual"||rows.length>0)&&<>{file&&privacyPassed&&ack&&<section className="human-review-summary panel" aria-label="Extraction and review summary"><h2>Extraction &amp; review</h2><div className="summary-grid"><div><b>{extractionSummary?.rowsDetected??"Not determined"}</b><span>Rows detected (estimate)</span></div><div><b>{extractionSummary?.rowsReconstructed??0}</b><span>Rows reconstructed</span></div><div><b>{readiness.rowsNeedingReview}</b><span>Rows needing review now</span></div><div><b>{extractionSummary?.unreadable??"Not determined"}</b><span>Unreadable at extraction</span></div></div><p role="note">{INCOMPLETE_REVIEW_MESSAGE}</p><small>Counts cannot establish completeness. Removed rows are excluded from analysis. Never guess missing values.</small><a href="#source-image-review" className="source-review-link">Compare source image ↓</a></section>}<div className={file&&privacyPassed&&ack?"extraction-review-layout":""}>{file&&privacyPassed&&ack&&<ExtractionSourceReview file={file}/>}<ReviewTable rows={rows} review={imageReview} updateRow={updateRow} verifyField={verifyField} applySuggestion={applySuggestion} removeRow={removeRow} addRow={addRow} lowConfidence={lowConfidence} inspectField={inspectRowField} verifyRow={verifyRow}/></div><section className="confirmation-step panel"><label><input type="checkbox" checked={confirmed} onChange={e=>{setConfirmed(e.target.checked);setAnalysisNotice("");setResults([])}}/> I reviewed the image (if used), organism, marker, every antimicrobial name, every MIC/zone string, every category, and every extraction warning. I compared the complete source and added any missing rows.</label><button type="button" className="primary" aria-describedby="analysis-readiness" disabled={!readiness.ready} onClick={analyze}>Analyze Concordance →</button><small id="analysis-readiness" className={analysisNotice?"analysis-readiness error":"analysis-readiness"} role={analysisNotice?"alert":undefined}>{analysisNotice||(readiness.ready?"All included rows explicitly verified. Ready for educational analysis.":`Before analyzing, ${readiness.missing.join(", ")}.`)}</small></section></>}{!!results.length&&<><AnalysisResults results={results} summary={summary}/><section className="panel save-work session-only-note"><h2>Session-only analysis</h2><p>This analysis is processed for the current session and is not added to a persistent personal history.</p><small>Uploaded images are not permanently saved.</small></section><SatisfactionPrompt workflow="image_concordance"/></>}<div className="concordance-safety bottom"><b>VERIFY BEFORE USE</b><span>Image-assisted extraction and educational concordance are not susceptibility interpretation.</span></div></>}

function FieldEvidence({field,fieldKey,value,onInspect,onVerify,onSuggestion}:{field:ImageFieldReview;fieldKey:ImageReviewFieldKey;value:string;onInspect:()=>void;onVerify:(verified:boolean)=>void;onSuggestion?:(suggestion:ImageFieldReview["suggestions"][number])=>void}){
 const label=field.unreadable?"UNREADABLE":field.userEdited?"USER EDITED":field.confidence+" CONFIDENCE";
 const name=fieldKey==="measurement"?"MIC / zone":fieldKey,inspected=field.inspectedValue===value,verified=field.verified&&field.confirmedValue===value;
 return <div className="field-evidence"><small className="field-confidence">{label} · {verified?"Confirmed":"Needs verification"}</small>{field.suggestions.map(suggestion=><button type="button" className="secondary field-suggestion" key={suggestion.value} onClick={()=>onSuggestion?.(suggestion)}>Did you mean {suggestion.label}?</button>)}{!!field.conflicts.length&&<p className="analysis-readiness error field-conflict">Conflicting extraction — please verify. Candidates: {field.conflicts.join(" / ")}</p>}{!!field.reasons.length&&<details className="field-confidence-details"><summary>Why this confidence?</summary><ul>{field.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul></details>}
 <button type="button" className="secondary review-field" onClick={onInspect}>Review {name}</button>
 {inspected&&<output className="inspected-field">Reviewing: {value.trim()||"Not supplied — confirm absence; do not guess"}</output>}
 <label className="field-verification"><input type="checkbox" checked={verified} onChange={event=>onVerify(event.target.checked)}/> {value.trim()?("Verified "+name):"Confirmed absent / unreadable"}</label></div>
}
function ReviewTable({rows,review,updateRow,verifyField,inspectField,verifyRow,applySuggestion,removeRow,addRow,lowConfidence}:{rows:AstResultRow[];review:ImageReviewMap;updateRow:(id:string,change:Partial<AstResultRow>,field?:ImageReviewFieldKey)=>void;verifyField:(id:string,field:ImageReviewFieldKey,verified:boolean)=>void;inspectField:(id:string,field:ImageReviewFieldKey)=>void;verifyRow:(id:string)=>void;applySuggestion:(id:string,suggestion:ImageFieldReview["suggestions"][number])=>void;removeRow:(id:string)=>void;addRow:()=>void;lowConfidence:number}){
 return <section className="review-step panel"><div className="review-heading"><div><p className="eyebrow">Human confirmation required</p><h2>Review and correct every row</h2></div>{lowConfidence>0&&<span className="confidence-alert">{lowConfidence} low-confidence rows</span>}</div><p>Compare each value with your source. Confirm fields individually, or open each field with Review before using Confirm row. Confidence never confirms a value for you.</p><p>Use the reported category; do not derive it from the MIC. If a MIC is missing or unreadable, confirm its absence. Correct or remove rows without a readable antimicrobial and category.</p><div className="review-table-wrap"><table className="review-table"><thead><tr><th>Antimicrobial</th><th>MIC / zone</th><th>Category</th><th>Confidence / verification</th><th>Actions</th></tr></thead><tbody>{rows.map((row,index)=>{const metadata=review[row.id],verified=REVIEW_FIELDS.every(key=>isFieldVerified(row,metadata,key));return <tr key={row.id} aria-label={`Result row ${index+1}`} className={verified?"row-verified":"low-confidence"}>{REVIEW_FIELDS.map(key=><td key={key}>{key==="category"?<select id={row.id+"-"+key} aria-label="Susceptibility category" value={row.category} onChange={e=>updateRow(row.id,{category:e.target.value as AstCategory},key)}>{categories.map(c=><option key={c}>{c}</option>)}</select>:<input id={row.id+"-"+key} aria-label={key==="antimicrobial"?"Antimicrobial name":"MIC or zone"} list={key==="antimicrobial"?"antimicrobial-list":undefined} value={row[key]} onChange={e=>updateRow(row.id,key==="antimicrobial"?{antimicrobial:e.target.value}:{measurement:e.target.value,operator:undefined,value:undefined,...parseMeasurement(e.target.value)},key)}/>}<button type="button" className="edit-field" onClick={()=>document.getElementById(row.id+"-"+key)?.focus()}>Edit {key==="measurement"?"MIC / zone":key}</button>{metadata&&<FieldEvidence field={metadata.fields[key]} fieldKey={key} value={reviewValue(row,key)} onInspect={()=>inspectField(row.id,key)} onVerify={value=>verifyField(row.id,key,value)} onSuggestion={key==="antimicrobial"?suggestion=>applySuggestion(row.id,suggestion):undefined}/>}</td>)}<td><b className="row-review-status">{verified?"VERIFIED BY YOU":"NEEDS YOUR REVIEW"}</b><small>Transcription confirmation only; not scientific validation.</small>{!!metadata?.issues.length&&<details><summary>Extraction notes</summary><ul>{metadata.issues.map((issue,index)=><li key={index}>{issue.message}</li>)}</ul></details>}<button type="button" className="secondary confirm-row" disabled={!canConfirmRow(row,metadata)||verified} onClick={()=>verifyRow(row.id)}>Confirm row</button>{!canConfirmRow(row,metadata)&&<small>Open or confirm all three fields first, including missing values.</small>}</td><td><button type="button" aria-label="Remove row" onClick={()=>removeRow(row.id)}>×</button></td></tr>})}</tbody></table></div><datalist id="antimicrobial-list">{antimicrobialOptions.map(o=><option key={o.value} value={o.label} label={`${o.label} · ${(o.aliases||[]).join(" · ")}`}/>)}</datalist><button type="button" className="secondary add-row" onClick={addRow}>+ Add antimicrobial</button></section>
}
function AnalysisResults({results,summary}:{results:ConcordanceResult[];summary:ReturnType<typeof summarizeConcordance>}){const concordant=summary.Concordant+summary["Potentially concordant"],concern=summary.Discordant+summary.Investigate,overall=concern>0?"Potential discordance identified":concordant===results.length&&results.length>0?"Concordance review complete":"Inference remains limited";return <section className="analysis-step"><div className="overall-summary panel"><p className="eyebrow">Overall concordance</p><h2>{overall}</h2><p>{results.length} antimicrobial results reviewed</p><div className="summary-grid">{Object.entries(summary).filter(([,n])=>n>0).map(([label,n])=><div className="summary-card" key={label}><b>{n}</b><span>{label}</span></div>)}</div></div><div className="panel analysis-list">{results.map(r=><article key={r.id}><div><b>{r.antimicrobial}</b><strong className="assessment">{r.assessment}</strong></div><p>{r.rationale}</p></article>)}</div></section>}
