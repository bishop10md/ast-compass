/** Pixel/text geometry only. No organism, gene, phenotype, or expected MIC data. */
export const INCOMPLETE_TABLE_MESSAGE = 'AST Compass may not have extracted the complete susceptibility table. Please compare the extracted results with the source image.';
const median = values => { const a=[...values].sort((x,y)=>x-y); return a.length?a[Math.floor(a.length/2)]:0; };
const role = text => {
  const t=text.toLowerCase().replace(/[^a-z]/g,'');
  return /^(antimicrobial|antibiotic|drug|agent)$/.test(t)?'antimicrobial':/^(mic|result)$/.test(t)?'mic':/^(interpretation|category|cat|interp)$/.test(t)?'category':null;
};
const box = b => b && ('x0' in b?b:{x0:b.x,y0:b.y,x1:b.x+b.width,y1:b.y+b.height});
export function locateCellPanels(lines, region) {
  const words=lines.flatMap(l=>l.words?.length?l.words:[l]).filter(w=>w.bbox).map(w=>({...w,bbox:box(w.bbox)}));
  const headers=words.filter(w=>role(w.text||''));
  const drugs=headers.filter(w=>role(w.text)==='antimicrobial').sort((a,b)=>a.bbox.y0-b.bbox.y0);
  const panels=[];
  for(const drug of drugs) {
    const h=Math.max(5,drug.bbox.y1-drug.bbox.y0);
    if(panels.some(p=>Math.abs(p.left-drug.bbox.x0)<h*2))continue; // repeated chunk heading
    const near=headers.filter(w=>w.bbox.x0>=drug.bbox.x0 && Math.abs(w.bbox.y0-drug.bbox.y0)<Math.max(h*3,(w.bbox.x0-drug.bbox.x0)*.08));
    const next=near.filter(w=>role(w.text)==='antimicrobial'&&w!==drug&&w.bbox.x0>drug.bbox.x1).sort((a,b)=>a.bbox.x0-b.bbox.x0)[0];
    const right=next?next.bbox.x0-h*1.5:region.x+region.width;
    const mic=near.find(w=>role(w.text)==='mic'&&w.bbox.x0<right);
    const cat=near.find(w=>role(w.text)==='category'&&w.bbox.x0<right);
    if(!mic||!cat)continue;
    const sorted=[drug,mic,cat].sort((a,b)=>a.bbox.x0-b.bbox.x0);
    const slope=Math.max(-.08,Math.min(.08,((cat.bbox.y0+cat.bbox.y1)-(drug.bbox.y0+drug.bbox.y1))/2/(cat.bbox.x0-drug.bbox.x0)));
    const left=Math.max(region.x,drug.bbox.x0-h*.9);
    const headerBottom=Math.max(...sorted.map(w=>w.bbox.y1-slope*(w.bbox.x0-left)))+h*.6;
    const columns={};
    for(let i=0;i<sorted.length;i++) {
      const w=sorted[i],start=Math.max(left,w.bbox.x0-h*.8);
      let end=i+1<sorted.length?sorted[i+1].bbox.x0-h*.8:right;
      // An unrelated, aligned header bounds a field too; it is not OCR'd as MIC/category.
      const extra=words.filter(v=>/^(note|notes|method|instrument|comment|comments|code)$/i.test(v.text||'')&&v.bbox.x0>w.bbox.x1+h&&v.bbox.x0<end&&Math.abs(v.bbox.y0-slope*(v.bbox.x0-left)-(drug.bbox.y0-slope*(drug.bbox.x0-left)))<h*.5).sort((a,b)=>a.bbox.x0-b.bbox.x0)[0];
      if(extra)end=extra.bbox.x0-h*.8;
      columns[role(w.text)]={left:start,right:end};
    }
    panels.push({id:`panel-${Math.round(left)}`,left,right,top:headerBottom,bottom:region.y+region.height,slope,columns,headerHeight:h});
  }
  return panels.sort((a,b)=>a.left-b.left);
}

/** Adaptive dark-ink mask; keeps faint strokes. Long rules are ignored only in projection. */
export function createInkMask(image) {
  const {width,height,data}=image;const histogram=new Uint32Array(256);
  for(let i=0;i<data.length;i+=4)histogram[Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114)]++;
  const total=width*height;
  const quantile=q=>{let n=0;for(let i=0;i<256;i++){n+=histogram[i];if(n>=total*q)return i;}return 255;};
  const low=quantile(.005),high=quantile(.8),threshold=low+(high-low)*.38;
  const mask=new Uint8Array(total),rules=new Uint8Array(total);
  for(let i=0,j=0;i<data.length;i+=4,j++){const gray=data[i]*.299+data[i+1]*.587+data[i+2]*.114;mask[j]=gray<threshold?1:0;rules[j]=gray<high*.89?1:0;}
  return {width,height,mask,rules,threshold};
}
function runs(values,minimum=1,gap=0) {
  const out=[];let start=-1,last=-1;
  for(let i=0;i<=values.length+gap;i++) {
    if(values[i]>=minimum){if(start<0)start=i;last=i;}
    else if(start>=0&&i-last>gap){out.push({start,end:last+1});start=-1;}
  }
  return out;
}
export function segmentPhysicalRows(ink,panels) {
  const rows=[];const {width,height,mask}=ink;
  for(const panel of panels) {
    const left=Math.max(0,Math.floor(panel.left)),right=Math.min(width,Math.ceil(panel.right));
    if(ink.rules&&Math.abs(panel.slope)<.006){
      const vertical=new Uint32Array(width),streak=new Uint32Array(width),longest=new Uint32Array(width);
      for(let y=Math.ceil(panel.top);y<Math.min(height,panel.bottom);y++)for(let x=left;x<right;x++){
        if(ink.rules[y*width+x]){vertical[x]++;streak[x]++;longest[x]=Math.max(longest[x],streak[x]);}else streak[x]=0;
      }
      // Alternating row fills may occlude a rule. Require a long continuous
      // segment as well as occupancy so aligned glyph stems are not fences.
      for(let x=left;x<right;x++)if(longest[x]<Math.max(20,panel.headerHeight*1.8))vertical[x]=0;
      const fences=runs(vertical,Math.max(30,(Math.min(height,panel.bottom)-panel.top)*.2)).filter(r=>r.end-r.start<=3);
      // Only persistent, thin rules across many rows may bound full-cell views.
      // This never suppresses a short operator/equality/decimal glyph.
      for(const col of Object.values(panel.columns)){
        const before=fences.filter(f=>f.end<=col.left).at(-1),after=fences.find(f=>f.start>col.left&&f.start<=col.right);
        if(before&&col.left-before.end<panel.headerHeight*2)col.left=before.end+1;
        if(after)col.right=after.start-1;
      }
    }
    const counts=new Uint32Array(height);
    for(let y=Math.max(0,Math.floor(panel.top));y<Math.min(height,panel.bottom);y++) {
      let rowInk=0;for(let x=left;x<right;x++)rowInk+=mask[y*width+x];
      if(rowInk>(right-left)*.65)continue; // full-width rule, not a short operator stroke
      for(let x=left;x<right;x++)if(mask[y*width+x]) {
        const cy=Math.round(y-panel.slope*(x-left));
        if(cy>=panel.top&&cy<height)counts[cy]++;
      }
    }
    let bands=runs(counts,Math.max(3,(right-left)*.006),1).filter(b=>b.end-b.start>=2);
    // Thin, regularly spaced full-panel rules can identify blank rows and wrapped names.
    // This is independent of OCR/drug identity and is optional for unruled tables.
    if(ink.rules&&Math.abs(panel.slope)<.006){
      const grid=new Uint32Array(height);
      for(let y=Math.ceil(panel.top);y<Math.min(height,panel.bottom);y++)for(let x=left+3;x<right-3;x++)grid[y]+=ink.rules[y*width+x];
      const boundaries=runs(grid,(right-left)*.82).filter(r=>r.end-r.start<=3);
      const spacing=median(boundaries.slice(1).map((b,i)=>b.start-boundaries[i].start));
      if(boundaries.length>=4&&spacing>=12&&boundaries.slice(1).every((b,i)=>Math.abs(b.start-boundaries[i].start-spacing)<spacing*.25)){
        const ruled=boundaries.slice(1).map((b,i)=>({start:boundaries[i].end+1,end:b.start-1}));
        const inside=ruled.filter(r=>r.end>r.start).map(r=>({...r,ruled:true}));
        const outside=bands.filter(b=>!inside.some(r=>b.start<r.end&&b.end>r.start));
        bands=[...inside,...outside].sort((a,b)=>a.start-b.start);
      }
    }
    for(const [index,band] of bands.entries()) {
      const previous=bands[index-1],next=bands[index+1];
      const pad=band.ruled?0:Math.max(0,Math.floor(Math.min(6,(band.end-band.start)*.3,previous?(band.start-previous.end)/2:6,next?(next.start-band.end)/2:6)));
      const cells={};
      for(const [field,col]of Object.entries(panel.columns)) {
        const shift0=panel.slope*(col.left-panel.left),shift1=panel.slope*(col.right-panel.left);
        const y=Math.max(0,Math.ceil(panel.top),Math.floor(band.start+Math.min(shift0,shift1)-pad));
        const bottom=Math.min(height,Math.floor(panel.bottom),Math.ceil(band.end+Math.max(shift0,shift1)+pad));
        cells[field]={x:col.left,y,width:col.right-col.left,height:bottom-y};
      }
      const top=Math.min(...Object.values(cells).map(c=>c.y)),bottom=Math.max(...Object.values(cells).map(c=>c.y+c.height));
      rows.push({rowId:`${panel.id}-y${band.start}-${band.end}`,panelId:panel.id,topY:top,bottomY:bottom,centerY:(top+bottom)/2,cells,rect:{x:panel.left,y:top,width:panel.right-panel.left,height:bottom-top}});
    }
  }
  return rows;
}
/** Tight ink bounds with padding; projection groups join vertically separated equality strokes. */
export function inspectCellInk(ink,rect) {
  const {width,height,mask}=ink;
  const x0=Math.max(0,Math.ceil(rect.x)),x1=Math.min(width,Math.floor(rect.x+rect.width));
  const y0=Math.max(0,Math.ceil(rect.y)),y1=Math.min(height,Math.floor(rect.y+rect.height));
  const xs=new Uint32Array(Math.max(0,x1-x0));let top=y1,bottom=y0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(mask[y*width+x]){xs[x-x0]++;top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
  const components=runs(xs,1).filter(r=>r.end-r.start>=1).map(r=>({x:x0+r.start,y:top,width:r.end-r.start,height:bottom-top}));
  if(!components.length)return {empty:true,rect,components:[]};
  const left=components[0].x,right=components.at(-1).x+components.at(-1).width;
  const pad=3;
  return {empty:false,rect:{x:Math.max(x0,left-pad),y:Math.max(y0,top-pad),width:Math.min(x1,right+pad)-Math.max(x0,left-pad),height:Math.min(y1,bottom+pad)-Math.max(y0,top-pad)},components};
}
export function cellConsensus(readings,{geometry=true,allowHigh=false}={}) {
  const normalized=readings.map(r=>({...r,value:String(r.value||'').trim()}));
  const values=[...new Set(normalized.map(r=>r.value).filter(Boolean))];
  const agreed=values.length===1&&normalized.filter(r=>r.value===values[0]).length>=2;
  const score=normalized.length?Math.min(...normalized.map(r=>r.score||0)):0;
  const high=allowHigh&&geometry&&agreed&&normalized.length>=3&&normalized.every(r=>r.value===values[0]&&r.score>=.93);
  return {value:agreed?values[0]:'',alternatives:values,confidence:{score:high?score:Math.min(score,agreed?.84:.49),level:high?'HIGH':agreed&&geometry?'MEDIUM':'LOW',reasons:[!geometry?'Cell geometry is uncertain.':agreed?'Independent cell views agree; verify against the original.':'Cell views are missing or disagree; no automatic selection.']}};
}
/** Angle/equality strokes, not numeric plausibility. Too-small/ambiguous glyphs abstain. */
export function operatorShape(ink,rect) {
  const {width,mask}=ink;const rows=[];
  for(let y=Math.max(0,Math.floor(rect.y));y<Math.min(ink.height,Math.ceil(rect.y+rect.height));y++) {
    const xs=[];for(let x=Math.max(0,Math.floor(rect.x));x<Math.min(width,Math.ceil(rect.x+rect.width));x++)if(mask[y*width+x])xs.push(x);
    if(xs.length)rows.push({y,left:xs[0],right:xs.at(-1),center:xs.reduce((a,b)=>a+b,0)/xs.length,n:xs.length});
  }
  if(rows.length<4||rect.width<4)return '';
  const bars=rows.filter(r=>r.right-r.left>=rect.width*.7&&r.n>=rect.width*.7);
  const barGroups=runs(Array.from({length:ink.height},(_,y)=>bars.some(r=>r.y===y)?1:0));
  if(barGroups.length===2&&rows.every(r=>bars.includes(r)) && barGroups[1].start-barGroups[0].end>=1)return '=';
  const bottomBar=barGroups.at(-1);
  const angle=bottomBar&&bottomBar.start>rows[0].y+3?rows.filter(r=>r.y<bottomBar.start-1):rows;
  if(angle.length<4)return '';
  const top=angle.slice(0,Math.max(1,Math.floor(angle.length*.25))),mid=angle.slice(Math.floor(angle.length*.4),Math.ceil(angle.length*.6)),bottom=angle.slice(-Math.max(1,Math.floor(angle.length*.25)));
  const mean=a=>a.reduce((s,r)=>s+r.center,0)/a.length;
  const a=mean(top)-mean(mid),b=mean(bottom)-mean(mid),margin=Math.max(1,rect.width*.18);
  const sign=a>margin&&b>margin?'<':a< -margin&&b< -margin?'>':'';
  return sign ? (bottomBar&&angle!==rows&&bars.some(r=>r.y>=bottomBar.start)?(sign==='<'?'≤':'≥'):sign) : '';
}
export function deduplicatePhysicalRows(rows) {
  // Identity has a panel component: equal y in neighboring panels is NOT a duplicate.
  const groups=new Map();
  for(const row of rows){const key=row.rowId;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
  return [...groups.values()];
}
