import test from 'node:test';
import assert from 'node:assert/strict';
import {reconstructAstTable,parseMicCell,mergeChunkRows,reconcileExtractionPasses,summarizeExtraction} from '../src/features/image-concordance-extraction-core.mjs';

const dictionary=[{value:'CRO',label:'Ceftriaxone'},{value:'SAM',label:'Ampicillin-sulbactam'}];
const word=(text,x,y,width=70)=>({text,confidence:0.96,bbox:{x0:x,y0:y,x1:x+width,y1:y+15}});
test('fragmented and column-major OCR cells regroup by source geometry',()=>{
  const tokens=[word('Drug',20,10),word('MIC',330,10),word('Category',500,10),word('Ceftriaxone',20,45,120),word('≥8',330,45),word('S',500,45),word('Ampicillin-sulbactam',20,80,220),word('≤0.25',330,80),word('R',500,80)];
  const shuffled=tokens.filter((_,i)=>i%2).concat(tokens.filter((_,i)=>!(i%2))).map(w=>({text:w.text,words:[w]}));
  const rows=reconstructAstTable({lines:shuffled,dictionary}).rows;
  assert.deepEqual(rows.map(r=>[r.antimicrobial.canonical,r.mic.value,r.category.value]),[['Ceftriaxone','≥8','S'],['Ampicillin-sulbactam','≤0.25','R']]);
});
test('syntax does not establish MIC/operator accuracy or repair a digit',()=>{
  for(const text of ['28','≥8','≤0.25','>64','<1','0.5','16']){
    const cell=parseMicCell(text,99);
    assert.equal(cell.raw,text);assert.equal(cell.value,text);assert.notEqual(cell.confidence.level,'HIGH');
  }
  assert.equal(parseMicCell('28',0).confidence.level,'LOW');
  assert.equal(parseMicCell('28',99).operator,undefined);
});
const row=(mic,category,chunk)=>reconstructAstTable({lines:[{text:`Ceftriaxone | ${mic} | ${category}`,bbox:{x0:10,y0:100,x1:600,y1:120}}],chunkId:`chunk-${chunk}-of-3`,dictionary}).rows[0];
test('all three-pass overlap permutations retain unresolved LOW conflicts',()=>{
  const rows=[row('≥8','S',1),row('28','R',2),row('28','R',3)];
  for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){
    const merged=mergeChunkRows(order.map(i=>rows[i])).rows;
    assert.equal(merged.length,1);const r=merged[0];
    assert.equal(r.status,'conflict');assert.equal(r.mic.value,'');assert.equal(r.mic.valid,false);
    assert.equal(r.category.value,'Unknown');assert.equal(r.confidence.level,'LOW');
    assert.equal(r.mic.confidence.level,'LOW');assert.equal(r.category.confidence.level,'LOW');
    assert.equal(r.sourceRefs.length,3);assert.deepEqual([...r.mic.conflictCandidates].sort(),['28','≥8']);
  }
});
test('same-chunk preprocessing disagreement is not discarded',()=>{
  const merged=reconcileExtractionPasses([[row('≥8','S',1)],[row('28','S',1)],[row('28','S',1)]]);
  assert.equal(merged.length,1);assert.equal(merged[0].mic.value,'');assert.equal(merged[0].mic.confidence.level,'LOW');
});
test('zero and partial recovery cannot claim a complete table',()=>{
  for(const count of [undefined,0,40])assert.equal(summarizeExtraction([],count).status,'INCOMPLETE');
  const result=summarizeExtraction([],40);assert.equal(result.unreadable,40);assert.equal(result.complete,0);
  assert.match(result.message,/could not reliably reconstruct/);
  assert.match(summarizeExtraction([row('16','S',1)],40).message,/may not have extracted the complete table/);
});
test('mixed geometry retains text-only observations and neighboring columns',()=>{
  const lines=[{text:'Ceftriaxone 1 S',words:[word('Ceftriaxone',10,40),word('1',180,40),word('S',240,40)]},{text:'Ampicillin-sulbactam | 8 | R',bbox:{x0:10,y0:80,x1:500,y1:95}}];
  const result=reconstructAstTable({lines,dictionary});
  assert.equal(result.rows.length,2);assert.equal(result.rows[1].antimicrobial.canonical,'Ampicillin-sulbactam');
  const a=structuredClone(row('16','S',1)),b=structuredClone(row('8','R',1));
  a.sourceRefs[0].bbox={x0:0,y0:100,x1:290,y1:120};b.sourceRefs[0].bbox={x0:310,y0:100,x1:600,y1:120};
  assert.equal(reconcileExtractionPasses([[a,b]]).length,2);
  assert.equal(reconcileExtractionPasses([[a,b],[a,b]]).length,2);
});
