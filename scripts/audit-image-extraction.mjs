/** AUTOMATION ACCURACY R&D BENCHMARK. Strict thresholds unchanged.
 * Synthetic truth is used ONLY here, never by extraction. Not the human-review safety gate. */
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {renderedImageConcordanceScenarios as fixtures} from '../tests/fixtures/rendered-image-concordance-fixtures.mjs';
import {v3FullRowFixtures} from '../tests/fixtures/image-ocr-v3-fixtures.mjs';

console.log('AUTOMATION ACCURACY R&D BENCHMARK — not the human-reviewed production safety gate');
const runId=randomUUID(),env={...process.env,AST_OCR_RUN_ID:runId};
const buildSha256=createHash('sha256').update(await fs.readFile('dist/index.html')).digest('hex');
const originals=spawnSync(process.execPath,['scripts/generate-original-image-fixtures.mjs'],{stdio:'inherit',env});
if(originals.status!==0)throw Error('Frozen original fixture preparation failed; this is not an OCR accuracy result');
const generated=spawnSync(process.execPath,['scripts/generate-image-ocr-v3-fixtures.mjs'],{stdio:'inherit',env});
if(generated.status!==0)throw Error('V3 fixture generation unavailable');
const run=spawnSync(process.execPath,['scripts/image-extraction-diagnostics.mjs','release'],{stdio:'inherit',env});
if(run.error)throw run.error;
const receipt=JSON.parse(await fs.readFile('work/image-extraction-v2/release/receipt.json','utf8'));
if(receipt.runId!==runId||receipt.buildSha256!==buildSha256)throw Error('Missing/stale original-fixture receipt');
const additive=spawnSync(process.execPath,['scripts/image-extraction-diagnostics.mjs','v3-additive'],{stdio:'inherit',env});
const additiveReceipt=JSON.parse(await fs.readFile('work/image-extraction-v2/v3-additive/receipt.json','utf8'));
if(additiveReceipt.runId!==runId||additiveReceipt.buildSha256!==buildSha256)throw Error('Missing/stale V3 fixture receipt');
receipt.fixtures.push(...additiveReceipt.fixtures);
const normal=text=>String(text||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const operator=text=>String(text||'').match(/^(<=|>=|[<≤=≥>])/)?.[0]||'';
const results=[...fixtures,...v3FullRowFixtures].map(fixture=>{
  const measured=receipt.fixtures.find(item=>item.id===fixture.id);
  const rows=(measured?.rows||[]).filter(row=>row.drug||row.mic||row.category!=='Unknown');
  const canonical=text=>{
    const matches=(measured?.dictionary||[]).filter(option=>[option.label,...option.aliases].some(alias=>normal(alias)===normal(text)));
    return matches.length===1?normal(matches[0].label):normal(text);
  };
  const result={id:fixture.id,expected:fixture.rowCount,recovered:rows.length,exactDrugs:0,exactMic:0,exactOperators:0,expectedOperators:fixture.rows.filter(row=>operator(row.mic)).length,exactCategories:0,highErrors:0,mediumErrors:0,lowFields:0,missing:0,invented:0,duplicate:0,qualityBlocked:!!measured?.qualityBlocked,cellOperations:measured?.cellOperations,peakDimensions:measured?.peakDimensions,workerLifecycle:measured?.workerLifecycle,extractionMs:measured?.extractionMs||0,totalMs:measured?.totalMs||0,inputSha256:measured?.inputSha256,corrections:[],passed:false};
  for(const expected of fixture.rows){
    const found=rows.filter(row=>canonical(row.drug)===canonical(expected.label));
    if(found.length!==1){result.missing+=found.length===0?1:0;result.duplicate+=Math.max(0,found.length-1);result.corrections.push({expected,found});continue;}
    const actual=found[0];result.exactDrugs++;
    if(actual.mic===expected.mic)result.exactMic++;
    if(operator(expected.mic)&&operator(actual.mic)===operator(expected.mic))result.exactOperators++;
    if(actual.category===expected.category)result.exactCategories++;
    for(const [key,index] of [['mic',1],['category',2]])if(actual[key]!==expected[key]){
      if(/HIGH/.test(actual.confidence[index]||''))result.highErrors++;
      if(/MEDIUM/.test(actual.confidence[index]||''))result.mediumErrors++;
    }
    if(actual.mic!==expected.mic||actual.category!==expected.category)result.corrections.push({expected,actual});
  }
  for(const row of rows){
    result.lowFields+=row.confidence.filter(value=>/LOW|UNREADABLE/.test(value)).length;
    if(!fixture.rows.some(expected=>canonical(expected.label)===canonical(row.drug))){result.invented++;result.highErrors+=row.confidence.filter(value=>/HIGH/.test(value)).length;}
  }
  const conservative=fixture.qualityExpectation==='POOR'||fixture.partialCrop||fixture.tags.includes('low_contrast');
  result.acceptanceType=conservative?'CONSERVATIVE_ABSTENTION':'EXACT_RECONSTRUCTION';
  result.passed=!measured?.error&&!result.highErrors&&!result.invented&&!result.duplicate&&(conservative?(result.qualityBlocked||/compare|verification|unreadable/i.test(measured?.summary||'')):(result.recovered===result.expected&&result.exactDrugs===result.expected&&result.exactMic===result.expected&&result.exactCategories===result.expected&&result.exactOperators===result.expectedOperators));
  result.uiChecks=measured?.uiChecks;
  result.cancellation=measured?.cancellation;
  if(measured?.cancellation&&Object.values(measured.cancellation).some(value=>value!==true))result.passed=false;
  if(measured?.uiChecks?.some(check=>check.overflow||!check.sourceVisible)||measured?.editRevokesVerification===false)result.passed=false;
  return result;
});
const isolated=spawnSync(process.execPath,['scripts/audit-image-cells-v3.mjs'],{stdio:'inherit',env});
const summary={at:new Date().toISOString(),runId,buildSha256,syntheticOnly:true,passed:run.status===0&&additive.status===0&&isolated.status===0&&results.every(result=>result.passed),results};
await fs.writeFile('work/image-extraction-v2/benchmark.json',JSON.stringify(summary,null,2));
for(const result of results)console.log(JSON.stringify({...result,corrections:result.corrections.length}));
console.log(summary.passed?'AUTOMATION ACCURACY R&D BENCHMARK: PASS':'AUTOMATION ACCURACY R&D BENCHMARK: FAIL — autonomous extraction is not approved');
process.exitCode=summary.passed?0:1;
