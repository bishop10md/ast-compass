import {createInkMask,locateCellPanels,segmentPhysicalRows,inspectCellInk,cellConsensus,operatorShape,INCOMPLETE_TABLE_MESSAGE,type Field,type PhysicalRow} from './image-concordance-cell-core.mjs';
import {mapOcrLinesToSource,planVerticalChunks,matchAntimicrobial,parseMicCell,summarizeExtraction,type AntimicrobialDictionaryEntry,type ExtractedAstRow,type ExtractionLifecycle,type OcrLine,type PixelRect,type CellConfidence} from './image-concordance-extraction-core.mjs';
import type {ImageWorkspace,OcrVariantId} from './image-concordance-image';
import type {AstOcrWorker,AstOcrRecognition} from '../lib/ocr';

type Reading={value:string;score:number};
export type CellAwareRow=ExtractedAstRow & {physical:{rowId:string;panelId:string;topY:number;bottomY:number;centerY:number;coordinateFrame:'original-exif-oriented';rect:PixelRect;cells:Record<Field,PixelRect>;completeness:'COMPLETE'|'PARTIAL'|'UNREADABLE'}};
export type CellOcrMetrics={layoutOperations:number;cellOperations:number;physicalRows:number;peakWidth:number;peakHeight:number;peakPixels:number;elapsedMs:number;workers:1;maxConcurrentRecognitions:1};
const clean=(text:string)=>text.replace(/\s+/g,' ').trim();
const compact=(text:string)=>text.replace(/\s+/g,'');
const percent=(n?:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n!/100)):0;
const lower=(reasons:string[]):CellConfidence=>({level:'LOW',score:.35,reasons});
const linesFrom=(r:AstOcrRecognition,id:string):OcrLine[]=>(r.data.lines||[]).map((line,i)=>({...line,lineIndex:i,chunkId:id,confidence:percent(line.confidence),words:line.words?.map(w=>({...w,confidence:percent(w.confidence)}))}));

/** One worker, one recognition at a time. Called only AFTER the full-image PHI gate. */
export async function extractCellAwareTable({workspace,worker,dictionary,lifecycle,onProgress}:{workspace:ImageWorkspace;worker:AstOcrWorker;dictionary:readonly AntimicrobialDictionaryEntry[];lifecycle:ExtractionLifecycle;onProgress:(current:number,total:number,message:string)=>void}) {
  const started=performance.now();
  const metrics:CellOcrMetrics={layoutOperations:0,cellOperations:0,physicalRows:0,peakWidth:0,peakHeight:0,peakPixels:0,elapsedMs:0,workers:1,maxConcurrentRecognitions:1};
  const recognize=async(rect:PixelRect,variant:OcrVariantId,scale:number,psm:string,whitelist='',layout=false)=>{
    lifecycle.checkpoint('ocr');
    const asset=layout?await workspace.renderChunkAsset({rect},variant,scale):await workspace.renderCell(rect,variant,scale);lifecycle.checkpoint('ocr');
    metrics.peakWidth=Math.max(metrics.peakWidth,asset.outputWidth);metrics.peakHeight=Math.max(metrics.peakHeight,asset.outputHeight);metrics.peakPixels=Math.max(metrics.peakPixels,asset.outputWidth*asset.outputHeight);
    await worker.setParameters?.({tessedit_pageseg_mode:psm,tessedit_char_whitelist:whitelist,preserve_interword_spaces:'1'});lifecycle.checkpoint('ocr');
    const result=await worker.recognize(asset.blob,{rotateAuto:false},{text:true,blocks:layout,hocr:false,tsv:false});lifecycle.checkpoint('ocr');
    if(layout)metrics.layoutOperations++;else metrics.cellOperations++;
    await new Promise<void>(resolve=>setTimeout(resolve,0));lifecycle.checkpoint('ocr');
    return {result,asset,reading:{value:clean(result.data.text||''),score:percent(result.data.confidence)}};
  };
  // Sparse passes establish WHERE cells are, not the final field values.
  const chunks=planVerticalChunks({region:workspace.crop,maxChunkHeight:1150,overlapPx:120});
  const layoutLines:OcrLine[]=[];
  for(const chunk of chunks){
    onProgress(chunk.index,chunks.length,'Locating table headings and physical rows...');
    const {result,asset}=await recognize(chunk.rect,'original',2,'11','',true);
    layoutLines.push(...mapOcrLinesToSource(linesFrom(result,chunk.id),{offsetX:asset.sourceRect.x,offsetY:asset.sourceRect.y,scaleX:asset.scaleX,scaleY:asset.scaleY,chunkId:chunk.id}));
  }
  const panels=locateCellPanels(layoutLines,workspace.crop);
  const pixels=workspace.readPixels();const ink=createInkMask(pixels);
  lifecycle.checkpoint('region-detection');
  // Detect once globally: overlapping layout chunks cannot manufacture extra rows.
  const physical=segmentPhysicalRows(ink,panels);metrics.physicalRows=physical.length;
  const rows:CellAwareRow[]=[];
  const readViews=async(rect:PixelRect,field:Field,fullRect:PixelRect)=>{
    const psm='7'; // Full-token baseline includes SDD and NS, not only a single glyph.
    const views:Reading[]=[];
    // Full physical cells are independent of the threshold mask: faint operator,
    // decimal or suffix strokes must not be cut from every recognition view.
    for(const scale of [1,rect.height<25?4:2])views.push((await recognize(fullRect,'original',scale,psm)).reading);
    if(rect.height<25||!cellConsensus(views).value||views.some(v=>v.score<.85)){
      const singleGlyph=field==='category'&&inspectCellInk(ink,rect).components.length===1;
      views.push((await recognize(rect,rect.height<18?'adaptive-threshold':'table-contrast',4,singleGlyph?'10':psm)).reading);
    }
    return views;
  };
  for(const band of physical) {
    lifecycle.checkpoint('ocr');onProgress(rows.length,physical.length,`Reading cells in row ${rows.length+1} of ${physical.length}...`);
    const drugInk=inspectCellInk(ink,band.cells.antimicrobial),micInk=inspectCellInk(ink,band.cells.mic),catInk=inspectCellInk(ink,band.cells.category);
    const drugReads=await readViews(drugInk.rect,'antimicrobial',band.cells.antimicrobial);
    const matched=drugReads.map(r=>({reading:r,cell:matchAntimicrobial(r.value,dictionary,{ocrConfidence:r.score})}));
    const normalize=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
    const exact=matched.filter(m=>m.cell.dictionaryValue&&dictionary.filter(d=>[d.label,...d.aliases||[]].some(n=>normalize(n)===normalize(m.reading.value))).length===1);
    const ids=[...new Set(exact.map(m=>m.cell.dictionaryValue))];
    const drugConsensus=cellConsensus(matched.map(m=>({value:exact.includes(m)?m.cell.dictionaryValue!:(m.reading.value?'unresolved:'+m.reading.value:''),score:m.reading.score})));
    let drug=matchAntimicrobial(ids.length===1&&drugConsensus.value===ids[0]?exact[0].reading.value:(drugReads[0]?.value||''),dictionary,{ocrConfidence:drugConsensus.confidence.score});
    if(ids.length!==1||drugConsensus.value!==ids[0]){drug={...drug,canonical:undefined,dictionaryValue:undefined,matchStatus:drug.suggestions.length?'SUGGESTION':'UNMATCHED'};}
    drug.confidence=drug.dictionaryValue?drugConsensus.confidence:lower(['Drug identity is unreadable or ambiguous; dictionary entries are suggestions only.']);
    const micReads=(await readViews(micInk.rect,'mic',band.cells.mic)).map(r=>({...r,value:compact(r.value)}));
    const validReads=micReads.filter(r=>parseMicCell(r.value).valid);
    const micConsensus=cellConsensus(micReads);
    let mic=parseMicCell(micConsensus.value,micConsensus.confidence.score);
    mic.confidence=micConsensus.confidence;
    const candidates=new Set(micReads.map(r=>r.value).filter(Boolean));
    let operator='',numeric='';let splitSupported=false;
    if(!micInk.empty&&micInk.components.length) {
      const first=micInk.components[0];
      const padded=(r:PixelRect):PixelRect=>({x:Math.max(band.cells.mic.x,r.x-2),y:micInk.rect.y,width:Math.min(band.cells.mic.x+band.cells.mic.width,r.x+r.width+2)-Math.max(band.cells.mic.x,r.x-2),height:micInk.rect.height});
      const opRead=await recognize(padded(first),'original',4,'10','0123456789<>=≤≥');
      const shape=operatorShape(ink,first);
      const opText=compact(opRead.reading.value);
      const operatorDisputed=!!shape&&opText!==shape;
      operator=shape||(/^(?:[<≤=≥>])$/.test(opText)?opText:'');
      let splitIndex=operator?1:0;
      if((operator==='<'||operator==='>')&&micInk.components[1]&&operatorShape(ink,micInk.components[1])==='='){operator+='=';splitIndex=2;}
      const parts=micInk.components.slice(splitIndex);
      if(parts.length) {
        const last=parts[parts.length-1];
        const start=parts[0].x,end=last.x+last.width;
        const rect=padded({x:start,y:micInk.rect.y,width:end-start,height:micInk.rect.height});
        const nums:Reading[]=[];
        for(const variant of ['original','table-contrast'] as const)nums.push((await recognize(rect,variant,4,'7','0123456789.')).reading);
        const consensus=cellConsensus(nums.map(r=>({...r,value:compact(r.value)})));
        numeric=consensus.value;
        const numericOkay=/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(numeric)&&nums.every(n=>n.score>=.7);
        const absence=!operator&&/^\d$/.test(opText)&&micReads.length>=2&&micReads.every(r=>r.value===numeric);
        const wholeHasUnit=validReads.some(r=>!!parseMicCell(r.value).unit||r.value.includes(','));
        splitSupported=!wholeHasUnit&&!operatorDisputed&&numericOkay&&(absence||opText===operator&&opRead.reading.score>=.85);
        if(operator&&numeric)candidates.add(operator+numeric);
        if(operatorDisputed&&numeric&&/^[<≤=≥>]$/.test(opText))candidates.add(opText+numeric);
        if(splitSupported) {
          const reconstructed=operator+numeric;candidates.add(reconstructed);
          // Split evidence may recover a misread operator. Disagreement stays LOW and visible.
          mic=parseMicCell(candidates.size===1?reconstructed:'',Math.min(consensus.confidence.score,opRead.reading.score));
          mic.confidence=cellConsensus([...micReads,{value:reconstructed,score:Math.min(consensus.confidence.score,.85)}]).confidence;
          if(candidates.size>1)mic.confidence=lower(['Whole-cell and component readings disagree; verify the proposed component reconstruction.']);
        }
      }
    }
    if(!splitSupported) {
      // Whole-cell syntax alone cannot establish a reliable operator or its absence.
      mic.confidence=lower(['Operator/numeric sub-recognition did not independently agree. Verify the original cell.']);
      if(!micConsensus.value||candidates.size>1){mic=parseMicCell('',0);mic.confidence=lower(['Conflicting or unreadable MIC; enter it from the original.']);}
    }
    const catReads=await readViews(catInk.rect,'category',band.cells.category);
    const catConsensus=cellConsensus(catReads.map(r=>({...r,value:compact(r.value).toUpperCase()})));
    const categoryValue=/^(S|I|R|SDD|NS)$/.test(catConsensus.value)?catConsensus.value as 'S'|'I'|'R'|'SDD'|'NS':'Unknown';
    const category:ExtractedAstRow['category']={raw:catConsensus.value,value:categoryValue,confidence:categoryValue==='Unknown'?lower(['Blank or ambiguous category (including I/1/l/|); no category inferred.']):catConsensus.confidence};
    const original=workspace.toOriginalRect(band.rect);
    const cells=Object.fromEntries(Object.entries(band.cells).map(([k,v])=>[k,workspace.toOriginalRect(v)])) as Record<Field,PixelRect>;
    const sourceRefs=[{chunkId:band.rowId,lineIndex:rows.length,text:[drug.raw,mic.raw,category.raw].join(' | '),bbox:{x0:original.x,y0:original.y,x1:original.x+original.width,y1:original.y+original.height}}];
    const conflicts:ExtractedAstRow['conflicts']=[];
    if(!drug.dictionaryValue&&drugReads.length)conflicts.push({field:'antimicrobial',values:[...new Set(drugReads.map(r=>r.value).filter(Boolean))],sourceRefs});
    if(candidates.size>1)conflicts.push({field:'mic',values:[...candidates],sourceRefs});
    if(catConsensus.alternatives.length>1||categoryValue==='Unknown'&&catConsensus.alternatives.length)conflicts.push({field:'category',values:catConsensus.alternatives,sourceRefs});
    const complete=!!drug.dictionaryValue&&mic.valid&&categoryValue!=='Unknown'&&!conflicts.length;
    const unreadable=drugInk.empty&&micInk.empty&&catInk.empty;
    const physicalMeta={rowId:band.rowId,panelId:band.panelId,coordinateFrame:'original-exif-oriented' as const,rect:original,cells,topY:original.y,bottomY:original.y+original.height,centerY:original.y+original.height/2,completeness:unreadable?'UNREADABLE' as const:complete?'COMPLETE' as const:'PARTIAL' as const};
    const confidence=[drug.confidence,mic.confidence,category.confidence].sort((a,b)=>a.score-b.score)[0];
    rows.push({id:band.rowId,physical:physicalMeta,antimicrobial:drug,mic,category,confidence,status:conflicts.length?'conflict':unreadable?'unreadable':'needs-verification',issues:[{code:'CELL_VERIFICATION',field:'row',severity:'warning',message:`${physicalMeta.completeness} physical row; original image y=${Math.round(physicalMeta.topY)}–${Math.round(physicalMeta.bottomY)}. Verify every field.`}],sourceRefs,conflicts});
  }
  lifecycle.checkpoint('reconstruction');
  metrics.elapsedMs=performance.now()-started;
  const partial=rows.filter(r=>r.physical.completeness==='PARTIAL').length;
  const summary={...summarizeExtraction(rows,physical.length),partial};
  summary.complete=rows.filter(r=>r.physical.completeness==='COMPLETE').length;
  summary.message=`${physical.length} physical rows detected; ${rows.length} reconstructed; ${summary.complete} complete, ${partial} partial. All fields require verification. ${INCOMPLETE_TABLE_MESSAGE}`;
  // Even a complete geometric detection is not a certificate that no table was missed.
  if(partial||!panels.length||!rows.length){summary.status='INCOMPLETE';summary.message=INCOMPLETE_TABLE_MESSAGE;}
  return {rows,summary,metrics,partial};
}
