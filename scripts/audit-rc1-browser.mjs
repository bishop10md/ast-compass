// Local built-candidate UI regression, never production/user data.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const req=process.env.AST_AUDIT_PLAYWRIGHT?createRequire(path.join(process.env.AST_AUDIT_PLAYWRIGHT,'package.json')):createRequire(import.meta.url);
const {chromium}=req('playwright');const out=path.resolve('work/rc1');await fs.mkdir(out,{recursive:true});
const root=path.resolve('dist'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const server=http.createServer(async(request,response)=>{
 try{
  if(request.method!=='GET'){response.writeHead(405);response.end();return;}
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));
  if(file!==root&&!file.startsWith(root+path.sep))throw Error('Invalid path');
  let body;try{body=await fs.readFile(file);}catch{if(path.extname(file)){response.writeHead(404);response.end();return;}file=path.join(root,'index.html');body=await fs.readFile(file);}
  response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});response.end(body);
 }catch{response.writeHead(400);response.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
const receipt={at:new Date().toISOString(),browser:browser.version(),passed:false,physicalDevice:false,routes:[],geometry:[],search:[],errors:[],blocked:[]};
await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();receipt.blocked.push({host:u.host,method:route.request().method()});return route.abort();});
const page=await context.newPage();page.on('pageerror',error=>receipt.errors.push(error.message));page.setDefaultTimeout(15000);
const nav=['Home','Breakpoints','Mechanisms','Concordance','BCID','Learn','References','About'];
const routes={'/':'Home','/breakpoints':'Breakpoints','/resistance':'Mechanisms','/concordance':'Concordance','/concordance/image':'Concordance','/bcid-forecast':'BCID','/learn':'Learn','/learn/detective':'Learn','/references':'References','/about':'About','/references/coverage':'References'};
async function visit(route){await page.goto(origin+route);await page.locator('h1').first().waitFor();await page.waitForFunction(()=>!!document.querySelector('header nav a[aria-current="page"]')||location.pathname.includes('not-a'));}
try{
 for(const width of [320,375,390,430,768,1440]){
  await page.setViewportSize({width,height:900});
  for(const [route,active] of Object.entries(routes)){
   await visit(route);assert.equal(await page.locator('h1').count(),1,route+' one h1');
   const geo=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main *')].map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})).filter(e=>e.right>innerWidth+1||e.width>innerWidth).slice(0,12)}));receipt.geometry.push({route,...geo});assert.ok(geo.scroll<=width+1,route+' overflow at '+width+' '+JSON.stringify(geo.overflow));
   assert.equal(await page.locator('header nav a[aria-current=page]').innerText(),active,route+' active');
   assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://astcompass.com'+route);
   assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'),'https://astcompass.com'+route);
   assert.doesNotMatch(await page.locator('meta[name=robots]').getAttribute('content'),/noindex/);
   if(width===1440)receipt.routes.push({route,title:await page.title(),heading:await page.locator('h1').innerText()});
  }
  await visit('/');const menu=page.getByRole('button',{name:'Open navigation menu'});
  if(width<=1050){await menu.click();assert.equal(await page.getByRole('button',{name:'Close navigation menu'}).getAttribute('aria-expanded'),'true');}
  assert.deepEqual(await page.locator('header nav a').allTextContents(),nav);
  assert.ok(await page.locator('header nav').isVisible());
  const target=page.locator('header nav a').filter({hasText:/^References$/});await target.click();assert.equal(await page.locator('h1').innerText(),'References');
  if(width<=1050)assert.ok(!await page.locator('header nav').isVisible());
  await page.locator('footer').scrollIntoViewIfNeeded();
  for(const label of ['Privacy','Terms','Trust','Feedback'])assert.ok(await page.locator('footer').getByRole('link',{name:label,exact:true}).isVisible());
 }
 await page.setViewportSize({width:390,height:844});await visit('/');await page.keyboard.press('Control+k');await page.getByRole('dialog').waitFor();
 assert.equal(await page.getByRole('dialog').getAttribute('aria-modal'),'true');
 for(const [query,expected] of [['CRO','Ceftriaxone'],['CTX','Cefotaxime'],['CZA','Ceftazidime-avibactam'],['SXT','Trimethoprim-sulfamethoxazole'],['evidence','References'],['references','References'],['KPC','KPC']]){
  await page.getByLabel('Search AST Compass content',{exact:true}).fill(query);await page.locator('.search-results button').first().waitFor();
  const titles=await page.locator('.search-results button b').allTextContents();assert.ok(titles.some(t=>t.includes(expected)),query);receipt.search.push({query,titles});
 }
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Search AST Compass');
 assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Search AST Compass');
 await visit('/concordance');const rows=page.locator('.ast-observation-row'),counts=[];
 for(const target of [1,3,5,10,20]){while(await rows.count()<target)await page.getByRole('button',{name:'+ Add antimicrobial',exact:true}).click();assert.equal(await rows.count(),target);const geo=await page.evaluate(()=>document.documentElement.scrollWidth);assert.ok(geo<=391);counts.push(target);}
 assert.ok(await page.getByRole('button',{name:'Maximum 20 results'}).isDisabled());await page.getByRole('button',{name:'Remove antimicrobial result 20',exact:true}).click();assert.equal(await rows.count(),19);receipt.multiRows=counts;
 await page.screenshot({path:path.join(out,'mobile-concordance.png'),fullPage:false});
 for(const [legacy,expected] of [['/detective','/learn/detective'],['/learning','/learn/topics'],['/resistance/mechanisms','/resistance']]){await visit(legacy);assert.equal(new URL(page.url()).pathname,expected);}
 await page.goto(origin+'/not-a-public-route');await page.locator('h1').waitFor();assert.match(await page.locator('h1').innerText(),/not found/i);assert.match(await page.locator('meta[name=robots]').getAttribute('content'),/noindex/);
 assert.deepEqual(receipt.errors,[]);receipt.passed=true;console.log(JSON.stringify({passed:true,routes:receipt.routes.length,viewportRouteChecks:receipt.geometry.length,searchQueries:receipt.search.length,multiRowCounts:counts,errors:receipt.errors},null,2));
}catch(error){receipt.error=String(error);console.error(error);process.exitCode=1;}
finally{await fs.writeFile(path.join(out,'browser.json'),JSON.stringify(receipt,null,2));await browser.close();await new Promise(r=>server.close(r));}
