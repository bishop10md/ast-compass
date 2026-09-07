// Regenerate immutable synthetic regression inputs, never acceptance results.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {renderedImageConcordanceScenarios,renderImageConcordanceFixtureSvg} from '../tests/fixtures/rendered-image-concordance-fixtures.mjs';
const req=process.env.AST_AUDIT_PLAYWRIGHT?createRequire(path.join(process.env.AST_AUDIT_PLAYWRIGHT,'package.json')):createRequire(import.meta.url);
const {chromium}=req('playwright');
const expected=JSON.parse(await fs.readFile(new URL('../tests/fixtures/original-image-raster-sha256.json',import.meta.url),'utf8'));
assert.deepEqual(Object.keys(expected).sort(),renderedImageConcordanceScenarios.map(f=>f.id+'.png').sort(),'Frozen original fixture manifest');
const requested=process.argv.slice(2),fixtures=renderedImageConcordanceScenarios.filter(f=>!requested.length||requested.includes(f.id));
assert.ok(fixtures.length&&requested.every(id=>fixtures.some(f=>f.id===id)),'Unknown fixture');
const out=path.resolve('work/infra-acceptance');await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
 await context.route('**/*',route=>route.abort());const renderer=await context.newPage();
 for(const fixture of fixtures){
  const name=fixture.id+'.png',target=path.join(out,name);let existing;
  try{existing=await fs.readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(existing){assert.equal(hash(existing),expected[name],'Existing original changed: '+name);console.log('VERIFIED '+name);continue;}
  const svg=renderImageConcordanceFixtureSvg(fixture);
  // Exact historical Chrome-canvas renderer; no resizing or alternate rasterizer.
  const base64=await renderer.evaluate(async svg=>{const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url;});const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);return c.toDataURL('image/png').split(',')[1];}finally{URL.revokeObjectURL(url);}},svg);
  const bytes=Buffer.from(base64,'base64');assert.equal(hash(bytes),expected[name],`Renderer differs for ${name}; do not refresh frozen hash. Chrome ${browser.version()}, historical Chrome152.0.7977.76 on Windows.`);
  await fs.writeFile(target,bytes,{flag:'wx'});console.log('REGENERATED AND VERIFIED '+name);
 }
}finally{await browser?.close();}
