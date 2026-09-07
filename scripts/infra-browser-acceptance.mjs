/**
 * Local-only browser acceptance. Never contacts or deploys to production.
 * Requires an installed Chrome, Playwright module and locally generated TLS key.
 * Receipts/PNGs under ignored work/ contain synthetic data only.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { createRequire } from 'node:module';
import { X509Certificate, createHash } from 'node:crypto';
import { renderedImageConcordanceScenarios, renderImageConcordanceFixtureSvg } from '../tests/fixtures/rendered-image-concordance-fixtures.mjs';
const req = process.env.AST_AUDIT_PLAYWRIGHT ? createRequire(path.join(process.env.AST_AUDIT_PLAYWRIGHT,'package.json')) : createRequire(import.meta.url);
const { chromium } = req('playwright');
const out = path.resolve('work/infra-acceptance'); await fs.mkdir(out, {recursive:true});
const mode = process.argv[2] || 'pwa';
assert.ok(['pwa','images'].includes(mode), 'Use pwa or images');
function assessRasterAcceptance(fixtures = []) {
  // These intact synthetic tables should not lose or invent cells. This is an
  // OCR software criterion, not a clinical/scientific scoring rule.
  const required = ['clean-screen-5','handheld-capture-10','slight-rotation-skew-10','long-report-20','long-report-30','long-report-40','mic-operators-10','repeated-columns-30'];
  const failures = required.filter(id => {
    const f = fixtures.find(item => item.id === id);
    return !f || f.privacy !== 'cleared' || !['drug','mic','category'].every(key => f.matches?.[key] === f.expectedRows);
  });
  if (fixtures.find(f => f.id === 'synthetic-phi-rejection')?.privacy !== 'blocked') failures.push('synthetic-phi-rejection');
  return {passed:failures.length === 0,failures};
}
if (process.argv[3] === '--review-receipt') {
  assert.equal(mode, 'images');
  const recorded = JSON.parse(await fs.readFile(path.join(out,'images.json'),'utf8'));
  const assessment = assessRasterAcceptance(recorded.fixtures);
  console.log(JSON.stringify(assessment,null,2));
  process.exit(assessment.passed ? 0 : 1);
}
const receipt = {at:new Date().toISOString(), mode, physicalDevice:false, checks:[], failures:[]};
const save = () => fs.writeFile(path.join(out,mode+'.json'),JSON.stringify(receipt,null,2));
const check = async (name, fn) => {try {const result=await fn();receipt.checks.push({name,status:'PASS',result});console.log('PASS',name,JSON.stringify(result??''));} catch(e) {receipt.failures.push({name,error:String(e)});console.log('FAIL',name,String(e));} await save();};
const cert=await fs.readFile(path.join(out,'local-cert.pem')), key=await fs.readFile(path.join(out,'local-key.pem'));
const spki=createHash('sha256').update(new X509Certificate(cert).publicKey.export({type:'spki',format:'der'})).digest('base64');
let updateWorker=false;
let rejectNetwork=false;
const originalWorker=await fs.readFile('dist/sw.js','utf8');
const baseCache=originalWorker.match(/const CACHE = '([^']+)'/)[1], nextCache=baseCache+'-acceptance-update';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json','.wasm':'application/wasm','.png':'image/png','.woff2':'font/woff2','.gz':'application/gzip'};
const server=https.createServer({cert,key},async(request,response)=>{
  if(rejectNetwork){request.socket.destroy();return;}
  try {
    const pathname=decodeURIComponent(new URL(request.url,'https://localhost').pathname);
    if(request.method!=='GET'){response.writeHead(405);response.end();return;}
    if(pathname==='/sw.js'){response.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store','Service-Worker-Allowed':'/'});response.end(updateWorker?originalWorker.replace(baseCache,nextCache):originalWorker);return;}
    let file=path.resolve('dist','.'+(pathname==='/'?'/index.html':pathname));
    const root=path.resolve('dist')+path.sep;
    if(!file.startsWith(root)){response.writeHead(403);response.end();return;}
    let bytes;try{bytes=await fs.readFile(file);}catch{if(path.extname(pathname)){response.writeHead(404);response.end();return;}file=path.resolve('dist/index.html');bytes=await fs.readFile(file);}
    response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});response.end(bytes);
  }catch{response.writeHead(500);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='https://localhost:'+server.address().port;
const context=await chromium.launchPersistentContext(path.join(out,'profile-'+mode+'-'+Date.now()),{headless:true,channel:'chrome',args:['--ignore-certificate-errors-spki-list='+spki],viewport:{width:1280,height:900}});
const browser=context.browser();
receipt.browser=browser.version(); receipt.origin=origin; receipt.cacheVersion=baseCache;
const blocked=[];
await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(/^https?:$/.test(u.protocol)&&u.origin!==origin){blocked.push({host:u.hostname,method:route.request().method()});await route.abort('blockedbyclient');}else await route.continue();
});
let page=await context.newPage();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const waitUntil=async(fn,limit=30000)=>{const end=Date.now()+limit;while(Date.now()<end){const value=await fn();if(value)return value;await pause(250);}throw new Error('Timed out after '+limit+' ms');};
const goto=async route=>{await page.goto(origin+route);await page.locator('h1').first().waitFor();};
try {
 if(mode==='pwa') {
  await check('manifest, actual worker registration and browser installability',async()=>{
    await goto('/'); await page.evaluate(()=>navigator.serviceWorker.ready);
    await waitUntil(()=>page.evaluate(()=>!!navigator.serviceWorker.controller));
    const manifest=await page.evaluate(async()=>fetch('/manifest.webmanifest').then(r=>r.json()));
    assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');
    assert.ok(manifest.icons.some(i=>i.purpose?.includes('maskable')));
    for(const icon of manifest.icons)assert.equal(await page.evaluate(async src=>(await fetch(src)).status,icon.src),200);
    const cdp=await context.newCDPSession(page); const installability=await cdp.send('Page.getInstallabilityErrors');await cdp.detach();
    assert.deepEqual(installability.installabilityErrors,[]);
    return {manifest,installability,controller:await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL)};
  });
  await check('seven offline educational routes render with third parties blocked',async()=>{
    await context.setOffline(true); rejectNetwork=true; const routes=[];
    for(const route of ['/','/learn','/learn/detective','/resistance','/about','/privacy','/terms']) {
      const response=await page.goto(origin+route);await page.locator('h1').first().waitFor();
      const h1=await page.locator('h1').allTextContents();assert.ok(h1.join('').length>0);assert.ok(response.fromServiceWorker());
      routes.push({route,h1,fromServiceWorker:response.fromServiceWorker(),navigatorOnline:await page.evaluate(()=>navigator.onLine),offlineNotice:await page.locator('.offline-indicator').count()});
    } rejectNetwork=false;await context.setOffline(false);return routes;
  });
  await check('waiting update preserves current session, signals update, and activates only after closing clients',async()=>{
    await goto('/');await page.evaluate(()=>sessionStorage.setItem('synthetic-in-memory-check','keep'));
    updateWorker=true;
    await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
    await waitUntil(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),45000);
    await page.getByText(/An AST Compass update is ready/).waitFor();
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('synthetic-in-memory-check')),'keep');
    const before=await page.evaluate(()=>caches.keys());assert.ok(before.includes(baseCache)&&before.includes(nextCache));
    await context.setOffline(true);
    await page.locator('footer').scrollIntoViewIfNeeded();
    const geometry=await page.locator('.offline-indicator').evaluateAll(nodes=>nodes.map(n=>({top:n.getBoundingClientRect().top,bottom:n.getBoundingClientRect().bottom})));
    assert.equal(geometry.length,2);assert.ok(geometry[1].top>=geometry[0].bottom-1);
    await page.screenshot({path:path.join(out,'offline-with-update.png')});
    await context.setOffline(false);
    const workerSnapshot=async()=>({pages:context.pages().map(p=>p.url()),workers:await Promise.all(context.serviceWorkers().map(async worker=>{try{return await worker.evaluate(async()=>({version:typeof CACHE==='string'?CACHE:null,active:self.registration.active?.state,waiting:self.registration.waiting?.state,clients:(await self.clients.matchAll({type:'window',includeUncontrolled:true})).map(c=>({url:c.url,id:c.id})),caches:await caches.keys()}));}catch(error){return {destroyed:String(error)};}}))});
    receipt.updateLifecycle={beforeClose:await workerSnapshot(),afterClose:null,beforeReopen:null};
    // A fixed delay did not prove zero old clients: reopening too soon can make
    // the old worker control another page and correctly defer activation again.
    for(const client of context.pages().filter(p=>p.url().startsWith(origin)))await client.close();
    receipt.updateLifecycle.afterClose=await workerSnapshot();
    await waitUntil(async()=>{
      const snapshot=await workerSnapshot();receipt.updateLifecycle.beforeReopen=snapshot;
      return snapshot.workers.some(w=>w.version===nextCache&&w.active==='activated'&&w.caches.includes(nextCache)&&!w.caches.includes(baseCache));
    },30000);
    page=await context.newPage();await goto('/');
    await waitUntil(async()=>{const names=await page.evaluate(()=>caches.keys());return names.includes(nextCache)&&!names.includes(baseCache);});
    assert.equal(await page.getByText(/An AST Compass update is ready/).count(),0);
    return {oldCache:baseCache,newCache:nextCache,before,after:await page.evaluate(()=>caches.keys()),noticeGeometry:geometry};
  });
  await check('core routes render while all non-first-party browser requests are blocked',async()=>{
    const routes=[];for(const route of ['/','/breakpoints','/resistance','/concordance','/bcid-forecast','/learn','/references','/about','/concordance/image']){await goto(route);routes.push({route,h1:await page.locator('h1').allTextContents(),canonical:await page.locator('link[rel=canonical]').getAttribute('href')});}return {routes,blocked};
  });
  await check('offline Feedback cannot transmit and preserves input',async()=>{
    await goto('/feedback');await page.getByRole('textbox',{name:'Additional comments'}).fill('SYNTHETIC LOCAL ACCEPTANCE ONLY');
    await context.setOffline(true);await page.getByRole('button',{name:/Send private feedback/}).click();
    await page.locator('.form-error').waitFor({timeout:25000});assert.equal(await page.getByRole('textbox',{name:'Additional comments'}).inputValue(),'SYNTHETIC LOCAL ACCEPTANCE ONLY');
    const error=await page.locator('.form-error').innerText();await context.setOffline(false);return {error};
  });
  await check('cache inventory excludes private paths, submissions, images and query-bearing entries',async()=>{
    const entries=await page.evaluate(async()=>{const all=[];for(const k of await caches.keys()){const c=await caches.open(k);for(const r of await c.keys())all.push({cache:k,url:r.url,method:r.method});}return all;});
    for(const r of entries){const u=new URL(r.url);assert.equal(r.method,'GET');assert.equal(u.origin,origin);assert.equal(u.search,'');assert.ok(!/^\/(?:feedback|auth|api|upload|storage|dashboard|history)/.test(u.pathname));assert.ok(!u.protocol.startsWith('blob'));}
    receipt.cacheEntries=entries;return {count:entries.length};
  });
 } else if(mode==='images') {
   receipt.fixtures=[];
   const renderer=await context.newPage();
   for(const fixture of [...renderedImageConcordanceScenarios,{id:'synthetic-phi-rejection',rowCount:0,width:1000,height:500,phi:true}]){
    const result={id:fixture.id,expectedRows:fixture.rowCount,physicalPhoto:false};const start=Date.now();
    try {
      const svg=fixture.phi?'<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500"><rect width="1000" height="500" fill="white"/><g font-family="Arial" font-size="34" fill="black"><text x="45" y="100">SYNTHETIC PRIVACY TEST</text><text x="45" y="180">Patient Name: SYNTHETIC PERSON</text><text x="45" y="250">MRN: 123456789</text><text x="45" y="320">Date of Birth: 01/01/1900</text></g></svg>':renderImageConcordanceFixtureSvg(fixture);
      const base64=await renderer.evaluate(async svg=>{const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url;});const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);return c.toDataURL('image/png').split(',')[1];}finally{URL.revokeObjectURL(url);}},svg);
      const buffer=Buffer.from(base64,'base64');await fs.writeFile(path.join(out,fixture.id+'.png'),buffer);
      await goto('/concordance/image');
      await page.locator('.upload-zone input[type=file]').setInputFiles({name:fixture.id+'.png',mimeType:'image/png',buffer});
      assert.equal(await page.locator('.extraction-workspace').count(),0);
      const consent=page.getByRole('checkbox',{name:'I confirm that this image is de-identified and contains no PHI.',exact:true});
      const privacy=await waitUntil(async()=>{if(await consent.count())return 'cleared'; if(await page.locator('.pipeline-message.blocked').count())return 'blocked';if(await page.locator('.pipeline-message.failure').count())return 'failed';return false;},120000);
      result.privacy=privacy;result.privacyMs=Date.now()-start;result.privacyMessage=await page.locator('.pipeline-message').innerText();
      if(fixture.phi){assert.equal(privacy,'blocked');assert.equal(await consent.count(),0);assert.equal(await page.locator('.extraction-workspace').count(),0);result.status='PASS: synthetic PHI rejected';}
      else if(privacy!=='cleared'){result.status='STOPPED AT PRIVACY GATE';}
      else {
        assert.equal(await page.locator('.extraction-workspace').count(),0);await consent.check();
        const extract=page.getByRole('button',{name:'Extract AST table',exact:true});
        await waitUntil(async()=>{if(await extract.isEnabled())return true;return !!(await page.locator('.quality-poor').count());});
        result.quality=await page.locator('.quality-badge').innerText();
        if(!(await extract.isEnabled())){result.status='QUALITY BLOCKED';result.detectedRows=0;}
        else{
          const extractionStart=Date.now();await extract.click();
          await waitUntil(async()=>{if(await page.locator('.extraction-completeness').count())return true;return (await extract.count())&&await extract.isEnabled();},180000);
          result.extractionMs=Date.now()-extractionStart;result.summary=await page.locator('.extraction-completeness').count()?await page.locator('.extraction-completeness').innerText():await page.locator('.pipeline-message').innerText();
          result.observed=await page.locator('.review-table tbody tr').evaluateAll(rows=>rows.map(row=>({drug:row.querySelector('[aria-label="Antimicrobial name"]').value,mic:row.querySelector('[aria-label="MIC or zone"]').value,category:row.querySelector('[aria-label="Susceptibility category"]').value,confidence:[...row.querySelectorAll('.field-confidence')].map(n=>n.textContent.trim()),verified:row.querySelectorAll('.field-verification input:checked').length})));
          result.reviewRows=result.observed.length;
          result.detectedRows=result.observed.filter(row=>row.drug||row.mic||row.category!=='Unknown').length;
          const norm=s=>s.toLowerCase().replace(/[–−]/g,'-').trim();
          result.matches={drug:0,mic:0,category:0,operatorExact:0};result.corrections=[];
          for(const expected of fixture.rows){const actual=result.observed.find(row=>norm(row.drug)===norm(expected.label));
            if(actual){result.matches.drug++;if(actual.mic===expected.mic){result.matches.mic++;if(/^[<>=≤≥]/.test(expected.mic))result.matches.operatorExact++;}if(actual.category===expected.category)result.matches.category++;}
            if(!actual||actual.mic!==expected.mic||actual.category!==expected.category)result.corrections.push({expected,actual:actual||null});
          }
          result.lowConfidenceFields=result.observed.reduce((n,row)=>n+row.confidence.filter(c=>/LOW|UNREADABLE/.test(c)).length,0);
          assert.ok(result.observed.every(row=>row.verified===0));
          result.status=result.detectedRows?'EXTRACTION COMPLETED; HUMAN VERIFICATION REQUIRED':'EXTRACTION FAILED; NO ROWS';
          if(result.detectedRows && fixture.id==='clean-screen-5'){
            const row=page.locator('.review-table tbody tr').first();const verify=row.locator('.field-verification input').nth(1);
            await verify.check();assert.equal(await verify.isChecked(),true);
            const mic=row.getByLabel('MIC or zone');await mic.fill('≤0.125');assert.equal(await verify.isChecked(),false);assert.equal(await mic.inputValue(),'≤0.125');
            result.manualEdit='PASS: entered MIC retained; prior field verification revoked';await mic.fill(result.observed[0].mic);
          }
        }
      }
      await page.screenshot({path:path.join(out,fixture.id+'-review.png'),fullPage:false});
    }catch(e){result.status='TEST FAILURE';result.error=String(e);}
    result.totalMs=Date.now()-start;receipt.fixtures.push(result);console.log('FIXTURE',JSON.stringify({...result,observed:undefined,corrections:result.corrections?.length}));await save();
   }
   await renderer.close();receipt.blocked=blocked;
 } else throw new Error('Unsupported mode');
} finally {if(mode==='images')receipt.rasterAcceptance=assessRasterAcceptance(receipt.fixtures);await save();await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
console.log('RECEIPT',path.join(out,mode+'.json'));
if(receipt.failures.length||receipt.fixtures?.some(f=>f.status==='TEST FAILURE')||receipt.rasterAcceptance?.passed===false)process.exitCode=1;
