/** Local production-candidate safety gate, not an OCR accuracy benchmark.
 * Scripted worker responses below test UI boundaries, not detection accuracy.
 * A separate real-OCR smoke lane uses the unchanged difficult raster fixture. */
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const out=path.resolve('work/image-human-review');await fs.mkdir(out,{recursive:true});
const receipt={at:new Date().toISOString(),runId:randomUUID(),passed:false,classification:'HUMAN-REVIEW PRODUCTION SAFETY GATE',syntheticOnly:true,checks:[]};
async function run(name,args){
 let text='';const child=spawn(process.execPath,args,{env:process.env,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>{text+=d;process.stdout.write(d);});child.stderr.on('data',d=>{text+=d;process.stderr.write(d);});
 const status=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
 await fs.writeFile(path.join(out,name+'.log'),text);assert.equal(status,0,name+' failed');
}
const req=process.env.AST_AUDIT_PLAYWRIGHT?createRequire(path.join(process.env.AST_AUDIT_PLAYWRIGHT,'package.json')):createRequire(import.meta.url);
const {chromium}=req('playwright');
const check=(name,actual)=>{assert.ok(actual,name);receipt.checks.push({name,passed:true});};
const root=path.resolve('dist');
let server,browser;
try{
 await run('fixture-preparation',['scripts/generate-original-image-fixtures.mjs','clean-screen-5']);
 await run('behavior-tests',['--test','tests/image-human-review.test.mjs','tests/predeploy-security.test.mjs','tests/image-concordance-runtime-contract.test.mjs','tests/lookup-and-image-concordance.test.mjs']);
 const html=await fs.readFile(path.join(root,'index.html'));receipt.buildSha256=createHash('sha256').update(html).digest('hex');
 // Refuse a stale UI build; the gate never silently tests an older candidate.
 const buildTime=(await fs.stat(path.join(root,'index.html'))).mtimeMs;
 for(const file of ['src/features/ImageConcordanceAnalyzer.tsx','src/features/image-human-review.mjs','src/components/ImageExtractionWorkspace.tsx','src/components/ExtractionSourceReview.tsx','src/concordance.css'])assert.ok((await fs.stat(file)).mtimeMs<=buildTime,'Run pnpm build before the safety gate: '+file);
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.wasm':'application/wasm','.webmanifest':'application/manifest+json'};
 server=http.createServer(async(request,response)=>{
  try{if(request.method!=='GET'){response.writeHead(405);response.end();return;}
   let file=path.resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));
   if(file!==root&&!file.startsWith(root+path.sep))throw Error('outside dist');
   let bytes;try{bytes=await fs.readFile(file);}catch{if(path.extname(file)){response.writeHead(404);response.end();return;}file=path.join(root,'index.html');bytes=html;}
   response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});response.end(bytes);
  }catch{response.writeHead(400);response.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,channel:'chrome'});receipt.browser=browser.version();
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
 const outbound=[];await context.route('**/*',route=>{const request=route.request();if(new URL(request.url()).origin===origin)return route.continue();outbound.push({method:request.method(),body:request.postData()});return route.abort();});
 await context.addInitScript(()=>{
  // Test-library boundary only: application code and PHI rules are unmodified.
  window.__safety={mode:'clear',workers:[],held:[],released:0};
  window.Tesseract={createWorker:async()=>{
   const record={terminated:0,calls:0};window.__safety.workers.push(record);
   return {setParameters:async()=>{},terminate:async()=>{record.terminated++;},recognize:async()=>{
    record.calls++;const mode=window.__safety.mode;
    if(mode==='hold')return new Promise(resolve=>window.__safety.held.push(()=>{window.__safety.released++;resolve({data:{text:'Cefepime MIC 1 S',confidence:99}});}));
    if(mode==='fail')throw Error('SYNTHETIC_OCR_PRIVATE_CANARY');
    return {data:{text:mode==='phi'?'MRN: SYNTHETIC123456\nCefepime 1 S':mode==='possible'?'Synthetic 09/07/2026\nCefepime 1 S':mode==='short'?'?':'Antimicrobial MIC Category\nCeftriaxone 1 R\nCefepime 2 S',confidence:99,lines:[]}};
   }};
  }};
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const buffer=await fs.readFile('work/infra-acceptance/clean-screen-5.png');
 receipt.syntheticImageSha256=createHash('sha256').update(buffer).digest('hex');
 const upload=()=>page.locator('.upload-zone input[type=file]').setInputFiles({name:'synthetic-only.png',mimeType:'image/png',buffer});
 const consent=()=>page.getByRole('checkbox',{name:'I confirm that this image is de-identified and contains no PHI.',exact:true});
 const analyze=()=>page.getByRole('button',{name:'Analyze Concordance →',exact:true});
 const finalConfirm=()=>page.locator('.confirmation-step input[type=checkbox]');
 const first=()=>page.locator('.review-table tbody tr').first();
 const chooseContext=async()=>{for(const [name,value] of [['Organism','Escherichia coli'],['Resistance marker','CTX-M']]){const input=page.getByRole('combobox',{name:new RegExp('^'+name)});await input.fill(value);await input.press('ArrowDown');await input.press('Enter');}};
 const fillRow=async()=>{await first().getByLabel('Antimicrobial name',{exact:true}).fill('Ceftriaxone');await first().getByLabel('MIC or zone',{exact:true}).fill('≤0.5');await first().getByLabel('Susceptibility category',{exact:true}).selectOption('R');};
 for(const [mode,status] of [['phi','PHI DETECTED'],['possible','POSSIBLE PHI'],['short','UNABLE TO SCREEN'],['fail','OCR FAILED']]){
  await page.goto(origin+'/concordance/image');await page.evaluate(mode=>window.__safety.mode=mode,mode);await upload();await page.locator('.pipeline-message>b').filter({hasText:status}).waitFor();
  check(mode+' cannot expose extraction, comparison, or attestation',(await page.locator('.extraction-workspace,.extraction-source,.phi-confirm').count())===0);
 }
 await page.goto(origin+'/concordance/image');await upload();await consent().waitFor();
 check('clearance alone cannot expose crop or source',await page.locator('.extraction-workspace,.extraction-source').count()===0);await consent().check();
 const extract=page.getByRole('button',{name:'Extract AST table',exact:true});await page.waitForFunction(()=>!document.querySelector('.extraction-workspace .primary')?.disabled&&!!document.querySelector('.quality-badge'));
 // Force an extraction-only failure AFTER actual full-image screening.
 await page.evaluate(()=>window.__safety.mode='fail');await extract.click();await page.getByText('AST extraction failed after privacy screening. Enter results manually or try a clearer crop.',{exact:true}).first().waitFor();
 await page.getByRole('button',{name:'Enter results manually — keep this image',exact:true}).click();await fillRow();await chooseContext();
 check('extraction failure retains editable correction and original image',await first().isVisible()&&await page.locator('.extraction-source img').evaluate(img=>img.complete&&img.naturalWidth>0));
 await finalConfirm().check();check('overall checkbox cannot bypass unverified fields',await analyze().isDisabled());
 // Removing disabled in DevTools must not bypass the handler guard.
  await analyze().evaluate(el=>el.disabled=false);await analyze().click();check('DOM-enabled button cannot admit unverified analysis',await page.locator('.analysis-step').count()===0);
 check('Confirm row cannot bypass unopened fields',await first().getByRole('button',{name:'Confirm row',exact:true}).isDisabled());
 for(const name of ['Review antimicrobial','Review MIC / zone','Review category'])await first().getByRole('button',{name,exact:true}).click();
 check('inspection alone is not confirmation',await first().locator('.field-verification input:checked').count()===0);
 await first().getByRole('button',{name:'Confirm row',exact:true}).click();await finalConfirm().check();check('explicitly reviewed row permits analysis',!(await analyze().isDisabled()));await analyze().click();await page.locator('.analysis-step').waitFor();
 await first().getByLabel('MIC or zone',{exact:true}).fill('<0.5');check('MIC operator edit revokes field and overall confirmation',!(await first().locator('.field-verification input').nth(1).isChecked())&&!(await finalConfirm().isChecked())&&await analyze().isDisabled());
 await first().locator('.field-verification input').nth(1).check();await finalConfirm().check();
 await page.getByRole('button',{name:'+ Add antimicrobial',exact:true}).click();check('added partial row blocks rather than silently disappearing',await analyze().isDisabled()&&await page.locator('.review-table tbody tr').count()===2);
 await page.locator('.review-table tbody tr').last().getByRole('button',{name:'Remove row',exact:true}).click();await finalConfirm().check();check('removing excluded row permits remaining verified data',!(await analyze().isDisabled()));
 check('missing-table disclosure present',(await page.locator('.human-review-summary').innerText()).includes('add any missing rows'));
 receipt.viewports=[];
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});await page.locator('.extraction-source').scrollIntoViewIfNeeded();
  const details=page.locator('.extraction-source details');await details.evaluate(el=>el.open=true);
  check('source comparison loaded at '+width,await page.locator('.extraction-source img').evaluate(img=>img.complete&&img.naturalWidth>0));
  check('no document overflow at '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const zoom=page.getByRole('slider',{name:'Image zoom'});
  await zoom.fill('8');check('small source text can be enlarged at '+width,await page.locator('.extraction-source img').evaluate(img=>img.style.width==='800%'));await zoom.fill('1');
  await page.screenshot({path:path.join(out,'review-'+width+'.png')});
  await page.locator('.extraction-source summary').click();check('source can collapse at '+width,!(await details.getAttribute('open')!==null));
  await page.locator('.extraction-source summary').click();
  if(width<=1000){await first().getByLabel('MIC or zone',{exact:true}).scrollIntoViewIfNeeded();check('sticky source toggle stays below navigation at '+width,await page.locator('.extraction-source summary').evaluate(el=>el.getBoundingClientRect().top>=64));await page.locator('.extraction-source summary').click();await first().getByLabel('MIC or zone',{exact:true}).click();await page.locator('.extraction-source summary').click();}
  receipt.viewports.push(width);
 }
 await page.setViewportSize({width:1440,height:1000});await consent().uncheck();check('revoked PHI attestation hides image and blocks analysis',await page.locator('.extraction-source,.extraction-workspace').count()===0&&await analyze().isDisabled());
 // Delayed full-image OCR from a cancelled upload must not clear a later image.
 await page.goto(origin+'/concordance/image');await page.evaluate(()=>window.__safety.mode='hold');await upload();await page.waitForFunction(()=>window.__safety.held.length===1);await page.getByRole('button',{name:'Cancel privacy screening',exact:true}).click();
 await page.evaluate(()=>window.__safety.mode='phi');await upload();await page.locator('.pipeline-message>b').filter({hasText:'PHI DETECTED'}).waitFor();
 await page.evaluate(()=>window.__safety.held[0]());await page.waitForFunction(()=>window.__safety.released===1&&window.__safety.workers[0].terminated===1);
 check('late cancelled OCR cannot clear replacement PHI image',await page.locator('.phi-confirm,.extraction-source,.extraction-workspace').count()===0&&(await page.locator('.pipeline-message>b').innerText())==='PHI DETECTED');
 await page.reload();check('reload restores no image or personal history',await page.locator('.extraction-source,.review-table,.analysis-step').count()===0);
 check('no OCR canary enters browser storage',!(await page.evaluate(()=>JSON.stringify([localStorage,sessionStorage]))).includes('SYNTHETIC_OCR_PRIVATE_CANARY'));
 check('outbound requests contain no image, OCR, or MIC payload',outbound.every(r=>!r.body||!/SYNTHETIC_OCR_PRIVATE_CANARY|synthetic-only|Ceftriaxone|≤0\.5|data:image|multipart\/form-data/i.test(r.body)));
 receipt.outboundRequests=outbound.length;receipt.telemetryNote='Browser providers may be unconfigured; executable fake-provider unit tests require two serialized requests and prove payload sanitization.';
 await context.close();await browser.close();browser=null;await new Promise(r=>server.close(r));server=null;
 // Real unchanged OCR, raster bytes and PHI gate. Accuracy is NOT asserted here.
 console.log('Running one real local-OCR safety smoke fixture (not an exact-accuracy claim)…');
 await run('real-ocr-smoke',['scripts/image-extraction-diagnostics.mjs','human-review','clean-screen-5']);
 const real=JSON.parse(await fs.readFile('work/image-extraction-v2/human-review/receipt.json','utf8')).fixtures[0];
 check('real OCR leaves all extracted fields unverified and analysis disabled',real.initialFieldChecks===0&&real.initialAnalysisDisabled===true&&real.rows.length>0);
 check('real OCR source comparison and mobile layout',real.uiChecks.every(r=>!r.overflow&&r.sourceVisible));
 check('real OCR field edit revokes confirmation',real.editRevokesVerification===true);
 check('real extraction cancellation isolates late work',Object.values(real.cancellation).every(v=>v===true));
 receipt.realOcr={rows:real.rows.length,inputSha256:real.inputSha256,extractionMs:real.extractionMs,accuracyClaim:false};
 receipt.passed=true;
}catch(error){receipt.error=String(error);process.exitCode=1;console.error(error);}
finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));}
console.log(`HUMAN-REVIEW PRODUCTION SAFETY GATE: ${receipt.passed?'PASS':'FAIL'} — no deployment performed`);
