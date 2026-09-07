import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {REVIEW_FIELDS, reviewValue, inspectField, confirmField, confirmRow, canConfirmRow, humanReviewReadiness, INCOMPLETE_REVIEW_MESSAGE} from '../src/features/image-human-review.mjs';
import {parseMeasurement} from '../src/features/measurement-core.mjs';
const source = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const row = (id='one') => ({id,antimicrobial:'Ceftriaxone',measurement:'≤0.5',category:'R',confidence:'High'});
const context = {busy:false,hasImage:true,privacyPassed:true,acknowledged:true,organismId:'ecoli',marker:'CTX-M',duplicates:false,confirmed:true};
const draft = level => ({fields:Object.fromEntries(REVIEW_FIELDS.map(key=>[key,{verified:false,confidence:level}]))});
const verified = row => REVIEW_FIELDS.reduce((meta,key)=>confirmField(meta,row,key,true),draft('HIGH'));
const ready = (rows,reviews,ctx={}) => humanReviewReadiness(rows,reviews,{...context,...ctx});

test('human review: HIGH, MEDIUM and LOW confidence never admit unverified OCR',()=>{
 for(const level of ['HIGH','MEDIUM','LOW']) { const r=row();const gate=ready([r],{one:draft(level)});assert.equal(gate.ready,false);assert.equal(gate.unverifiedFields,3); }
 assert.equal(ready([row()],{}).ready,false);
 assert.equal(ready([row()],{one:{fields:Object.fromEntries(REVIEW_FIELDS.map(key=>[key,{verified:true}]))}}).ready,false,'legacy booleans without value snapshots fail closed');
});
test('human review: explicit field confirmation is required even for missing MIC',()=>{
 const r={...row(),measurement:''};let meta=draft('HIGH');
 for(const key of ['antimicrobial','category'])meta=confirmField(meta,r,key,true);
 assert.equal(ready([r],{one:meta}).ready,false);
 meta=confirmField(meta,r,'measurement',true);assert.equal(ready([r],{one:meta}).ready,true);
});
test('human review: every field edit, including an operator alone, invalidates its snapshot',()=>{
 const r=row(),meta=verified(r);
 for(const change of [{antimicrobial:'Cefepime'},{measurement:'<0.5'},{measurement:''},{category:'S'}]){
  const gate=ready([{...r,...change}],{one:meta});assert.equal(gate.ready,false);assert.equal(gate.unverifiedFields,1);
 }
});
test('human review: row confirmation requires deliberate inspection of every current field',()=>{
 const r=row();let meta=draft('HIGH');assert.equal(canConfirmRow(r,meta),false);assert.deepEqual(confirmRow(meta,r),meta);
 for(const key of REVIEW_FIELDS){meta=inspectField(meta,r,key);assert.equal(ready([r],{one:meta}).ready,false);}
 assert.equal(canConfirmRow(r,meta),true);meta=confirmRow(meta,r);assert.equal(ready([r],{one:meta}).ready,true);
 assert.equal(canConfirmRow({...r,measurement:'1'},meta),false);
});
test('human review: partial rows never disappear from admission and manual correction works',()=>{
 const r=row(),partial={...row('two'),antimicrobial:'',category:'Unknown',measurement:''};
 const reviews={one:verified(r),two:verified(partial)};
 assert.equal(ready([r,partial],reviews).ready,false);
 const corrected={...partial,antimicrobial:'Cefepime',category:'S'};
 assert.equal(ready([r,corrected],reviews).ready,false);
 reviews.two=verified(corrected);assert.equal(ready([r,corrected],reviews).ready,true);
 assert.equal(ready([r],reviews).ready,true);
});
test('human review: every included row is gated at 1,3,5,10,20,30 rows without truncation',()=>{
 for(const count of [1,3,5,10,20,30]){
  const rows=Array.from({length:count},(_,i)=>({...row(String(i)),antimicrobial:'Synthetic drug '+i}));
  const reviews=Object.fromEntries(rows.map(r=>[r.id,verified(r)]));assert.equal(ready(rows,reviews).ready,true);
  delete reviews[rows.at(-1).id];assert.equal(ready(rows,reviews).ready,false);
 }
});
test('human review: privacy, attestation, context, duplicates, busy and final confirmation fail closed',()=>{
 const r=row(),reviews={one:verified(r)};
 for(const override of [{privacyPassed:false},{acknowledged:false},{busy:true},{confirmed:false},{organismId:''},{marker:''},{duplicates:true}])assert.equal(ready([r],reviews,override).ready,false);
 assert.equal(ready([r],reviews,{hasImage:false,privacyPassed:false,acknowledged:false}).ready,true,'no image required for manual entry');
 assert.equal(ready([],{}).ready,false);
});
test('human review: correction clears stale numeric metadata and all edits revoke confirmation',()=>{
 const text=source('src/features/ImageConcordanceAnalyzer.tsx');
 assert.match(text,/operator:undefined,value:undefined,\.\.\.parseMeasurement\(e.target.value\)/);
 const r={...row(),operator:'>=',value:8};
 for(const value of ['', 'unreadable']){const changed={...r,measurement:value,operator:undefined,value:undefined,...parseMeasurement(value)};assert.equal(changed.value,undefined);assert.equal(changed.operator,undefined);}
 const update=text.slice(text.indexOf('const updateRow='),text.indexOf('const inspectRowField='));
 assert.match(update,/verified:false,confirmedValue:undefined,inspectedValue:undefined/);assert.match(update,/resetAnalysis\(\)/);
});
test('human review: summary discloses estimated completeness, retains source comparison, no auto-certification',()=>{
 assert.equal(INCOMPLETE_REVIEW_MESSAGE,'AST Compass may not have extracted the complete susceptibility table. Compare the extracted results with the source image and add any missing rows.');
 const text=source('src/features/ImageConcordanceAnalyzer.tsx'), workspace=source('src/components/ImageExtractionWorkspace.tsx');
 for(const label of ['Rows detected (estimate)','Rows reconstructed','Rows needing review now','Unreadable at extraction','INCOMPLETE_REVIEW_MESSAGE'])assert.ok(text.includes(label));
 assert.match(text,/file&&privacyPassed&&ack&&<ExtractionSourceReview/);
 assert.match(source('src/components/ExtractionSourceReview.tsx'),/URL.revokeObjectURL\(next\)/);
 assert.match(workspace,/verified: false/);
 assert.doesNotMatch(workspace,/confidence.*verified:\s*true/);
 assert.match(text,/disabled=\{!readiness.ready\}/);
 assert.match(text,/const current=getReadiness\(\);if\(!current.ready\)/);
 assert.match(text,/analyzeConcordance\(organismId,marker,rows\)/);
});

test('human review: actual privacy replacement cannot publish stale results during slow cleanup',async()=>{
 const text=source('src/features/ImageConcordanceAnalyzer.tsx');
 const start=text.indexOf('const processFile='),end=text.indexOf('const applyExtraction=',start);
 const js=ts.transpileModule(text.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const prior={controller:new AbortController()},privacySessionRef={current:prior},pending=[],published=[],releases=[];
 const noop=()=>{};
 const state={privacySessionRef,releasePrivacyWorker:s=>{releases.push(s);return new Promise(()=>{});},ensurePrivacyScreenActive:s=>{if(s.controller.signal.aborted)throw new DOMException('cancelled','AbortError');},privacyAbortError:()=>new DOMException('cancelled','AbortError'),replaceSourcePreview:noop,setFile:noop,setMessage:noop,setPhi:noop,setAck:noop,setExtractionSummary:noop,setRows:noop,setImageReview:noop,setPrivacyOcr:v=>{if(v)published.push(v);},setPrivacyImageSize:noop,resetAnalysis:noop,stage:noop,validateAstImageFile:()=>new Promise(resolve=>pending.push(resolve)),normalizeImage:async()=>({file:{},width:800,height:600}),createAstOcrWorker:async()=>({recognize:async()=>({data:{text:'Ceftriaxone 1 R'}}),terminate:async()=>{}}),setDiagnostics:noop,window:{},screenPhiText:()=>({status:'clear'}),URL:{createObjectURL:()=> 'blob:synthetic'},trackEvent:noop,captureError:()=>{throw Error('Stale errors must not be reported');},progressMessage:()=>''};
 const fn=new Function(...Object.keys(state),js+';return processFile;')(...Object.values(state));
 void fn({name:'b.png',type:'image/png',size:12});assert.equal(pending.length,1,'replacement is not stalled by old cleanup');const b=privacySessionRef.current;
 void fn({name:'c.png',type:'image/png',size:12});assert.equal(pending.length,2);const c=privacySessionRef.current;
 assert.equal(b.controller.signal.aborted,true);pending[0]({valid:true});await new Promise(r=>setImmediate(r));assert.equal(published.length,0);
 // Simulate unmount while C is awaiting validation: it must not start a worker.
 privacySessionRef.current=null;c.controller.abort('component-unmounted');pending[1]({valid:true});await new Promise(r=>setImmediate(r));assert.equal(published.length,0);
 assert.ok(releases.includes(prior));assert.ok(releases.includes(b));assert.ok(releases.includes(c));
});

test('human review: production telemetry serializes neither OCR/MIC content nor image errors',async()=>{
 const code=ts.transpileModule(source('src/lib/telemetry.ts').replaceAll('import.meta.env','testEnv'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={},requests=[],values=new Map();
 new Function('require','exports','testEnv','location','innerWidth','sessionStorage','fetch',code)(p=>p.includes('version')?{APP_VERSION:'test'}:{getAstPlatform:()=> 'web'},exports,{PROD:true,VITE_POSTHOG_KEY:'synthetic',VITE_SENTRY_DSN:'https://synthetic@synthetic.invalid/1'},{pathname:'/concordance/image'},900,{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},async(url,options)=>{requests.push({url,body:options.body});return {ok:true};});
 const canary='SYNTHETIC_PRIVATE_CANARY';exports.trackEvent('image_concordance_completed',{feature_name:'image_concordance',result_count:2,ocr:canary,mic:canary,image:canary,filename:canary,table:canary,analysis:canary});exports.captureError(new Error(canary),{feature_name:'image_concordance'});
 await new Promise(r=>setImmediate(r));assert.equal(requests.length,2);assert.doesNotMatch(JSON.stringify(requests),/SYNTHETIC_PRIVATE_CANARY/);assert.equal(JSON.parse(requests[0].body).properties.result_count,2);
});
