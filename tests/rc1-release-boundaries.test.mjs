import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const baseline=JSON.parse(read('docs/release/rc1-production-content-sha256.json'));
test('RC1 preserves numerical, primary scientific, PHI and dependency content from production',()=>{
 for(const file of ['src/data/breakpoints.ts','src/data/genes.ts','src/data/bcidForecasts.ts','src/data/organisms.ts','src/data/bcid2Panel.ts','src/data/references.ts','src/data/astDetectiveQuestions.ts','src/data/intrinsicPatterns.ts','src/data/contentReview.ts','pnpm-lock.yaml']){
  // Git checkout line endings vary by OS; no other content is normalized.
  // The separate reconciliation gate retains the original raw-byte comparisons.
  assert.equal(createHash('sha256').update(read(file).replace(/\r\n/g,'\n')).digest('hex'),baseline.hashes[file],file);
 }
});
test('RC1 has no V4 or harness imports in runtime source',()=>{
 for(const file of readdirSync(new URL('../src',import.meta.url),{recursive:true}).filter(f=>/\.(?:mjs|ts|tsx)$/.test(f))){
  assert.doesNotMatch(read('src/'+file),/(?:from|import\s*\()\s*["'][^"']*(?:research\/v4|tests\/fixtures|scripts\/audit|model-index\.json|model\.bin)/i,file);
 }
});
test('both image gates prepare frozen originals and diagnostics refuse replaced difficult rasters',()=>{
 assert.match(read('scripts/audit-image-extraction.mjs'),/generate-original-image-fixtures/);
 assert.match(read('scripts/audit-image-human-review-safety.mjs'),/generate-original-image-fixtures/);
 assert.match(read('scripts/image-extraction-diagnostics.mjs'),/original-image-raster-sha256\.json/);
 assert.match(read('scripts/image-extraction-diagnostics.mjs'),/Original difficult raster changed/);
 const hashes=JSON.parse(read('tests/fixtures/original-image-raster-sha256.json'));assert.equal(Object.keys(hashes).length,12);
 assert.equal(hashes['clean-screen-5.png'],'8fa848f988a9f58e9fec3654c8315f8c344260401a9ad09078666372dc3269e6');
});
test('R&D exact accuracy thresholds remain explicit and do not replace human review',()=>{
 const script=read('scripts/audit-image-extraction.mjs');
 for(const term of ['result.exactDrugs===result.expected','result.exactMic===result.expected','result.exactCategories===result.expected','result.exactOperators===result.expectedOperators'])assert.ok(script.includes(term),term);
 assert.match(script,/process.exitCode=summary.passed\?0:1/);
 assert.match(read('scripts/predeploy-static-audit.mjs'),/Missing production build/);
});
