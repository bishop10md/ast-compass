import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {locateCellPanels,segmentPhysicalRows,inspectCellInk,cellConsensus,deduplicatePhysicalRows,operatorShape,INCOMPLETE_TABLE_MESSAGE} from '../src/features/image-concordance-cell-core.mjs';
import {parseMicCell,matchAntimicrobial,createExtractionLifecycle} from '../src/features/image-concordance-extraction-core.mjs';
import {extractCellAwareTable} from '../src/features/image-concordance-cell-ocr.ts';
const word=(text,x,y,w=45)=>({text,bbox:{x0:x,y0:y,x1:x+w,y1:y+12}});
const headers=[word('Drug',20,10),word('MIC',210,10),word('Category',310,10)];
const region={x:0,y:0,width:400,height:200};
const ink=()=>({width:400,height:200,mask:new Uint8Array(80000),threshold:100});
const mark=(im,x,y,w=20,h=8)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)im.mask[j*im.width+i]=1;};
test('V3 physical bands precede recognition and retain a row without drug text',()=>{
  const panels=locateCellPanels(headers,region),im=ink();
  mark(im,24,44);mark(im,215,44,8);mark(im,315,44,5);
  mark(im,215,75,8); // drug/category unreadable, physical row still exists
  const rows=segmentPhysicalRows(im,panels);assert.equal(rows.length,2);assert.notEqual(rows[0].rowId,rows[1].rowId);
  assert.equal(inspectCellInk(im,rows[1].cells.antimicrobial).empty,true);
});
test('V3 repeated groups and unrelated columns have independent bounds',()=>{
  const words=[...headers,word('Drug',430,10),word('MIC',600,10),word('Cat',720,10),word('Note',270,10,25)];
  const p=locateCellPanels(words,{...region,width:850});assert.equal(p.length,2);assert.ok(p[0].columns.mic.right<270);assert.ok(p[0].right<p[1].columns.mic.left);
});
test('V3 source row identity does not deduplicate drug names or neighboring panels',()=>{
  const items=[{rowId:'panel-1-y40',drug:'Same'},{rowId:'panel-1-y40',drug:'OCR typo'},{rowId:'panel-1-y70',drug:'Same'},{rowId:'panel-2-y40',drug:'Same'}];
  const groups=deduplicatePhysicalRows(items);assert.deepEqual(groups.map(g=>g.length),[2,1,1]);
});
test('V3 conflicting cell values remain unresolved regardless of majority',()=>{
  const r=cellConsensus([{value:'≤0.5',score:.99},{value:'<0.5',score:.99},{value:'<0.5',score:.99}],{allowHigh:true});
  assert.equal(r.value,'');assert.equal(r.confidence.level,'LOW');assert.equal(r.alternatives.length,2);
});
test('V3 HIGH requires geometry, three strong agreements and explicit eligibility',()=>{
  const a=Array.from({length:3},()=>({value:'0.5',score:.99}));
  assert.notEqual(cellConsensus(a).confidence.level,'HIGH');
  assert.notEqual(cellConsensus(a,{allowHigh:true,geometry:false}).confidence.level,'HIGH');
  assert.notEqual(cellConsensus(a.slice(1),{allowHigh:true}).confidence.level,'HIGH');
  assert.equal(cellConsensus(a,{allowHigh:true}).confidence.level,'HIGH');
});
test('V3 required operator/decimal grammar is unrestricted by MIC example lists',()=>{
  for(const value of ['≤0.25','≤0.5','≤1','≥8','≥16','>64','<1','0.5','1','2','4','8','16','≤0.037','>1234.567'])assert.equal(parseMicCell(value).value,value);
});
test('V3 dictionary fuzziness remains a suggestion, not selected identity',()=>{
  const cell=matchAntimicrobial('CEFTR1AXONE',[{value:'CRO',label:'Ceftriaxone'}]);assert.equal(cell.dictionaryValue,undefined);assert.ok(cell.suggestions.length);
});
test('V3 tiny/blank operator geometry abstains',()=>{
  const im=ink();assert.equal(operatorShape(im,{x:0,y:0,width:10,height:10}),'');mark(im,10,10,1,4);assert.equal(operatorShape(im,{x:10,y:10,width:1,height:4}),'');
});
test('V3 ruled rows retain blank rows and merge a wrapped name into one physical row',()=>{
  const im=ink();im.rules=new Uint8Array(im.mask.length);
  const p=locateCellPanels(headers,region);p[0].left=0;p[0].right=400;
  for(const y of [40,80,120,160])for(let x=0;x<400;x++)im.rules[y*400+x]=1;
  mark(im,25,50);mark(im,25,66);mark(im,215,50,8);mark(im,25,133);
  const rows=segmentPhysicalRows(im,p);assert.equal(rows.length,3);assert.equal(inspectCellInk(im,rows[1].cells.antimicrobial).empty,true);
  assert.ok(rows[0].cells.mic.y+rows[0].cells.mic.height<rows[1].cells.mic.y+1);
});
test('V3 distant bands are retained rather than silently truncated',()=>{
  const im=ink();for(const y of [44,64,84,170])mark(im,25,y);
  assert.equal(segmentPhysicalRows(im,locateCellPanels(headers,region)).length,4);
});
test('V3 overlapping text across a grid boundary does not invent an extra physical row',()=>{
  const im=ink();im.rules=new Uint8Array(im.mask.length);const p=locateCellPanels(headers,region);p[0].left=0;p[0].right=400;
  for(const y of [40,70,100,130])for(let x=0;x<400;x++)im.rules[y*400+x]=1;
  mark(im,25,66,20,12);assert.equal(segmentPhysicalRows(im,p).length,3);
});
test('V3 full-cell bounds exclude persistent rules without using tight glyph thresholds',()=>{
  const im=ink();im.rules=new Uint8Array(im.mask.length);const p=locateCellPanels(headers,region);
  for(const x of [200,300,390])for(let y=30;y<180;y++)im.rules[y*400+x]=1;
  for(const y of [40,80,120,160])for(let x=5;x<395;x++)im.rules[y*400+x]=1;
  mark(im,215,50,8);const rows=segmentPhysicalRows(im,p);
  assert.equal(rows.length,3);assert.ok(rows[0].cells.mic.x>200);assert.ok(rows[0].cells.mic.x+rows[0].cells.mic.width<300);
});
test('V3 runner returns zero-row manual fallback safely instead of mutating frozen summary',async()=>{
  const im={width:400,height:200,data:new Uint8ClampedArray(320000).fill(255)};
  const workspace={crop:region,readPixels:()=>im,renderChunkAsset:async({rect})=>({blob:new Blob(),sourceRect:rect,outputWidth:400,outputHeight:200,scaleX:1,scaleY:1}),toOriginalRect:r=>r};
  const worker={setParameters:async()=>{},recognize:async()=>({data:{text:'',lines:[]}})};
  const result=await extractCellAwareTable({workspace,worker,dictionary:[],lifecycle:createExtractionLifecycle(),onProgress:()=>{}});
  assert.equal(result.rows.length,0);assert.equal(result.summary.status,'INCOMPLETE');assert.match(result.summary.message,/compare the extracted results/);
});
test('V3 runner keeps selected physical cells untrusted and source-mapped',async()=>{
  const im={width:400,height:200,data:new Uint8ClampedArray(320000).fill(255)};
  for(const x0 of [25,215,315])for(let y=44;y<52;y++)for(let x=x0;x<x0+8;x++){const i=(y*400+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=0;}
  const asset=rect=>({blob:Object.assign(new Blob(),{rect}),sourceRect:rect,outputWidth:rect.width,outputHeight:rect.height,scaleX:1,scaleY:1});
  const workspace={crop:region,readPixels:()=>im,renderChunkAsset:async({rect})=>asset(rect),renderCell:async rect=>asset(rect),toOriginalRect:r=>({...r,x:r.x*2,y:r.y*2,width:r.width*2,height:r.height*2})};
  let psm='';const worker={setParameters:async p=>{psm=p.tessedit_pageseg_mode;},recognize:async blob=>({data:psm==='11'?{text:'Drug MIC Category',lines:headers}:{text:blob.rect.x<100?'Ampicillin':blob.rect.x<280?'1':'R',confidence:99}})};
  const result=await extractCellAwareTable({workspace,worker,dictionary:[{value:'amp',label:'Ampicillin'}],lifecycle:createExtractionLifecycle(),onProgress:()=>{}});
  assert.equal(result.rows.length,1);assert.equal(result.rows[0].physical.coordinateFrame,'original-exif-oriented');assert.ok(result.rows[0].physical.topY>70);assert.notEqual(result.rows[0].confidence.level,'HIGH');
  assert.equal(result.rows[0].antimicrobial.canonical,'Ampicillin');assert.equal(result.rows[0].mic.value,'1');assert.equal(result.rows[0].category.value,'R');assert.equal(result.rows[0].status,'needs-verification');
});
test('V3 cancellation rejects subsequent cell stages and releases late resources',async()=>{
  const life=createExtractionLifecycle();await life.cancel();let closed=0;life.registerCleanup(()=>closed++);await new Promise(r=>setTimeout(r,0));assert.equal(closed,1);assert.throws(()=>life.checkpoint('ocr'));
});
test('V3 confidence cannot turn I/1/l/pipe into a category by scientific expectation',async()=>{
  const source=await fs.readFile('src/features/image-concordance-cell-ocr.ts','utf8');
  assert.match(source,/categoryValue=.*S\|I\|R\|SDD\|NS/);assert.match(source,/Unknown/);
  assert.doesNotMatch(source,/phenotypeMechanism|bcidForecast|geneData|breakpointData/);
  assert.match(INCOMPLETE_TABLE_MESSAGE,/complete susceptibility table/);
});
