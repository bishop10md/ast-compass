/** Oracle-geometry isolated glyph diagnostic. NOT PHI/workflow/release acceptance. */
import fs from 'node:fs/promises';import http from 'node:http';import path from 'node:path';import {createRequire} from 'node:module';
import {v3IsolatedCells} from '../tests/fixtures/image-ocr-v3-fixtures.mjs';
import {cellConsensus} from '../src/features/image-concordance-cell-core.mjs';
const req=process.env.AST_AUDIT_PLAYWRIGHT?createRequire(path.join(process.env.AST_AUDIT_PLAYWRIGHT,'package.json')):createRequire(import.meta.url);
const {chromium}=req('playwright');const root=path.resolve('dist');
const mime={'.js':'text/javascript','.wasm':'application/wasm','.html':'text/html'};
const server=http.createServer(async(q,r)=>{try{const p=path.resolve(root,'.'+new URL(q.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))throw Error('path');const b=await fs.readFile(p);r.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});r.end(b);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({serviceWorkers:'block'});
await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const page=await context.newPage();const results=[];
try{
 await page.goto(origin+'/index.html');await page.addScriptTag({url:origin+'/ocr/tesseract.min.js'});
 await page.evaluate(async()=>{window.__cellWorker=await window.Tesseract.createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang'});});
 for(const fixture of v3IsolatedCells){
  const bytes=await fs.readFile(`work/image-ocr-v3/fixtures/${fixture.id}.png`);
  const started=Date.now();const readings=await page.evaluate(async({base64,field})=>{
   const blob=await(await fetch('data:image/png;base64,'+base64)).blob(),bitmap=await createImageBitmap(blob);
   const source=document.createElement('canvas');source.width=bitmap.width;source.height=bitmap.height;const ctx=source.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();
   const pixels=ctx.getImageData(0,0,source.width,source.height);let x0=source.width,y0=source.height,x1=0,y1=0;
   for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){const i=(y*source.width+x)*4;if(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2]<690){x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}}
   if(x1<=x0){source.width=source.height=0;return [];}
   const readings=[];
   try{for(const scale of [1,2,4]){
    const canvas=document.createElement('canvas');canvas.width=(x1-x0)*scale+24;canvas.height=(y1-y0)*scale+24;const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(source,x0,y0,x1-x0,y1-y0,12,12,(x1-x0)*scale,(y1-y0)*scale);
    await window.__cellWorker.setParameters({tessedit_pageseg_mode:field==='category'?'10':'7',tessedit_char_whitelist:''});
    const result=await window.__cellWorker.recognize(canvas,{rotateAuto:false},{text:true,blocks:false,hocr:false,tsv:false});
    readings.push({value:result.data.text.trim(),score:result.data.confidence/100,scale,width:canvas.width,height:canvas.height});canvas.width=canvas.height=0;
   }}finally{source.width=source.height=0;}
   return readings;
  },{base64:bytes.toString('base64'),field:fixture.field});
  const consensus=cellConsensus(readings.map(r=>({...r,value:fixture.field==='drug'?r.value:r.value.replace(/\s+/g,'')})));
  const result={id:fixture.id,field:fixture.field,expected:fixture.text,actual:consensus.value,confidence:consensus.confidence.level,exact:consensus.value===fixture.text,readings,ms:Date.now()-started};results.push(result);
 }
}finally{await page.evaluate(async()=>{await window.__cellWorker?.terminate();delete window.__cellWorker;}).catch(()=>{});await context.close();await browser.close();await new Promise(r=>server.close(r));}
const summary={at:new Date().toISOString(),syntheticOnly:true,oracleGeometryOnly:true,externalRequestsBlocked:true,rows:results,exact:results.filter(r=>r.exact).length,total:results.length,workers:1,terminated:true};
await fs.writeFile('work/image-ocr-v3/isolated-cell-results.json',JSON.stringify(summary,null,2));console.log(`Isolated exact consensus ${summary.exact}/${summary.total}; this does NOT establish full-table acceptance.`);
if(summary.exact!==summary.total)process.exitCode=1;
