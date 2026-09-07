/** Synthetic-only local test instrumentation. Never imported by the app. */
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { renderedImageConcordanceScenarios } from '../tests/fixtures/rendered-image-concordance-fixtures.mjs';
import {v3FullRowFixtures} from '../tests/fixtures/image-ocr-v3-fixtures.mjs';

const req = process.env.AST_AUDIT_PLAYWRIGHT ? createRequire(path.join(process.env.AST_AUDIT_PLAYWRIGHT, 'package.json')) : createRequire(import.meta.url);
const { chromium } = req('playwright');
const phase = process.argv[2] || 'baseline';
if (!/^[a-z0-9-]+$/.test(phase)) throw Error('Invalid local receipt phase');
const out = path.resolve('work/image-extraction-v2', phase); await fs.mkdir(out, { recursive: true });
const requested = process.argv.slice(3);
const originalHashes=JSON.parse(await fs.readFile('tests/fixtures/original-image-raster-sha256.json','utf8'));
const fixtures = (phase==='v3-additive'?v3FullRowFixtures:renderedImageConcordanceScenarios).filter(f => requested.length ? requested.includes(f.id) : true);
if(!fixtures.length || requested.some(id=>!fixtures.some(f=>f.id===id)))throw Error('Unknown or empty fixture selection');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const root = path.resolve('dist');
const server = http.createServer(async (request, response) => {
  try {
    if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) throw Error('Invalid path');
    let bytes; try { bytes = await fs.readFile(file); } catch {
      if (path.extname(file)) { response.writeHead(404); response.end(); return; }
      file = path.join(root, 'index.html'); bytes = await fs.readFile(file);
    }
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(bytes);
  } catch { response.writeHead(500); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
const receipt = { at: new Date().toISOString(), phase, browser: browser.version(), syntheticOnly: true, fixtures: [] };
receipt.runId=process.env.AST_OCR_RUN_ID||null;
receipt.buildSha256=createHash('sha256').update(await fs.readFile(path.join(root,'index.html'))).digest('hex');
const page = await context.newPage(); page.setDefaultTimeout(60000);
try {
  for (const fixture of fixtures) {
    // Reuse EXACT previously failed raster bytes, not a redrawn/easier fixture.
    const buffer = await fs.readFile(path.resolve(phase==='v3-additive'?'work/image-ocr-v3/fixtures':'work/infra-acceptance', fixture.id + '.png'));
    const current = { id: fixture.id, inputSha256: createHash('sha256').update(buffer).digest('hex'), expected: fixture.rows, expectedRows: fixture.rowCount };
    if(phase!=='v3-additive'&&current.inputSha256!==originalHashes[fixture.id+'.png'])throw Error('Original difficult raster changed: '+fixture.id);
    const started = Date.now();
    try {
      await page.goto(origin + '/concordance/image');
      await page.addScriptTag({ url: origin + '/ocr/tesseract.min.js' });
      await page.evaluate(() => {
        window.__syntheticOcrTrace = [];
        window.__syntheticWorkers = [];
        const create = window.Tesseract.createWorker;
        window.Tesseract.createWorker = async (...args) => {
          const worker = await create(...args), recognize = worker.recognize.bind(worker);
          const id=window.__syntheticWorkers.length, life={id,terminated:false};window.__syntheticWorkers.push(life);
          let parameters={};const set=worker.setParameters.bind(worker),terminate=worker.terminate.bind(worker);
          worker.setParameters=async p=>{parameters={...parameters,...p};return set(p);};
          worker.terminate=async()=>{try{return await terminate();}finally{life.terminated=true;}};
          worker.recognize = async (source, options, output) => {
            const start = performance.now();
            const result = await recognize(source, options, output);
            const token = w => ({ text: w.text, confidence: w.confidence, bbox: w.bbox, symbols: w.symbols?.map(s => ({ text: s.text, confidence: s.confidence, bbox: s.bbox })) });
            const entry = { workerId:id,parameters:{...parameters},options, output, ms: performance.now() - start, text: result.data.text, confidence: result.data.confidence,
              lines: result.data.lines?.map((l, i) => ({ text: l.text, confidence: l.confidence, bbox: l.bbox, lineIndex: i, blockId: l.block?.id, paragraphId: l.paragraph?.id, words: l.words?.map(token) })),
              words: result.data.words?.map(token) };
            if (source instanceof Blob) {
              const bitmap = await createImageBitmap(source); entry.width = bitmap.width; entry.height = bitmap.height; bitmap.close();
              if(window.__syntheticOcrTrace.length<18)entry.raster = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(source); });
            }
            window.__syntheticOcrTrace.push(entry);
            return result;
          };
          return worker;
        };
      });
      if (phase === 'probe') {
        current.probe = await page.evaluate(async (base64) => {
          const blob = await (await fetch('data:image/png;base64,' + base64)).blob();
          const bitmap = await createImageBitmap(blob), canvas = document.createElement('canvas');
          canvas.width = bitmap.width * 2; canvas.height = bitmap.height * 2;
          canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
          const enlarged = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          canvas.width = canvas.height = 0;
          const worker = await window.Tesseract.createWorker('eng', 1, {workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang'});
          const result = [];
          try { for (const mode of ['6','11','3']) {
            await worker.setParameters({tessedit_pageseg_mode:mode,preserve_interword_spaces:'1'});
            const response = await worker.recognize(enlarged, {rotateAuto:false}, {text:true,blocks:true,hocr:false,tsv:false});
            result.push({mode,text:response.data.text});
          }} finally { await worker.terminate(); }
          return result;
        }, buffer.toString('base64'));
      } else {
      await page.locator('.upload-zone input[type=file]').setInputFiles({ name: 'synthetic-ast.png', mimeType: 'image/png', buffer });
      const consent = page.getByRole('checkbox', { name: 'I confirm that this image is de-identified and contains no PHI.', exact: true });
      await consent.waitFor(); current.privacyMs = Date.now() - started;
      await consent.check();
      const extract = page.getByRole('button', { name: 'Extract AST table', exact: true });
      await page.waitForFunction(() => document.querySelector('.quality-poor') || (document.querySelector('.quality-badge') && !document.querySelector('.extraction-workspace .primary')?.disabled),null,{timeout:30000});
      current.crop = await page.locator('.crop-controls input').evaluateAll(items => items.map(i => ({ value: i.value, max: i.max })));
      current.quality = await page.locator('.quality-badge').innerText();
      if (await extract.isDisabled()) { current.qualityBlocked=true; current.rows=[]; }
      else {
      const extracting = Date.now(); await extract.click(); await page.locator('.extraction-completeness').waitFor({timeout:240000});
      current.extractionMs = Date.now() - extracting;
      current.summary = await page.locator('.extraction-completeness').innerText();
      current.rows = await page.locator('.review-table tbody tr').evaluateAll(rows => rows.map(row => ({ drug: row.querySelector('[aria-label="Antimicrobial name"]').value, mic: row.querySelector('[aria-label="MIC or zone"]').value, category: row.querySelector('[aria-label="Susceptibility category"]').value, confidence: [...row.querySelectorAll('.field-confidence')].map(c => c.textContent.trim()) })));
      current.initialFieldChecks = await page.locator('.field-verification input:checked').count();
      current.initialAnalysisDisabled = await page.locator('.confirmation-step button.primary').isDisabled();
      current.dictionary=await page.locator('#antimicrobial-list option').evaluateAll(options=>options.map(option=>({label:option.value,aliases:option.label.split(' · ')})));
      current.completedRunTraceCount=await page.evaluate(()=>window.__syntheticOcrTrace.length);
      if (fixture.id==='clean-screen-5') {
        current.uiChecks=[];
        for (const width of [320,390,1280]) {
          await page.setViewportSize({width,height:900});
          await page.locator('.extraction-review-layout').scrollIntoViewIfNeeded();
          current.uiChecks.push({width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),sourceVisible:await page.locator('.extraction-source').isVisible()});
          await page.screenshot({path:path.join(out,`review-${width}.png`)});
        }
        const first=page.locator('.review-table tbody tr').first(), verification=first.locator('.field-verification input').nth(1);
        await verification.check(); await first.getByLabel('MIC or zone',{exact:true}).fill('≤0.125');
        current.editRevokesVerification=!(await verification.isChecked());
        await page.setViewportSize({width:1280,height:900});
        // Exercise actual cancellation after a new worker reaches cell recognition.
        await extract.click();
        await page.waitForFunction(()=>document.querySelector('.extraction-workspace')?.textContent.includes('Reading cells in row'),null,{timeout:30000});
        await page.getByRole('button',{name:'Cancel extraction',exact:true}).click();
        await page.waitForFunction(()=>window.__syntheticWorkers.every(w=>w.terminated),null,{timeout:10000});
        await page.waitForTimeout(300);
        current.cancellation={noLateSummary:await page.locator('.extraction-completeness').count()===0,retryEnabled:!(await extract.isDisabled()),workersTerminated:await page.evaluate(()=>window.__syntheticWorkers.every(w=>w.terminated))};
      }
      }
      }
    } catch (error) { current.error = String(error); current.pageText=(await page.locator('main').innerText().catch(()=>'')); }
    const traces = await page.evaluate(() => window.__syntheticOcrTrace || []);
    current.workerLifecycle=await page.evaluate(()=>window.__syntheticWorkers||[]);
    current.cellOperations=traces.slice(0,current.completedRunTraceCount??traces.length).filter(t=>t.output?.blocks===false).length;
    current.peakDimensions=traces.reduce((best,t)=>(t.width||0)*(t.height||0)>best.pixels?{width:t.width,height:t.height,pixels:t.width*t.height}:best,{pixels:0});
    for (const [index, trace] of traces.entries()) {
      if (trace.raster) { await fs.writeFile(path.join(out, `${fixture.id}-pass-${index}.png`), Buffer.from(trace.raster, 'base64')); delete trace.raster; }
    }
    current.ocr = traces;
    current.totalMs = Date.now() - started;
    receipt.fixtures.push(current);
    await fs.writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify({ id: current.id, recovered: current.rows?.length, passes: traces.length, cellOperations:current.cellOperations, peak:current.peakDimensions, ms: current.totalMs, error: current.error }));
  }
} finally { await context.close(); await browser.close(); await new Promise(resolve => server.close(resolve)); }
console.log('Synthetic diagnostic receipt:', path.join(out, 'receipt.json'));
if (receipt.fixtures.some(f => f.error)) process.exitCode = 1;
