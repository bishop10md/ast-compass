// RC1 preservation gate. Read-only scientific evaluation; no runtime imports.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAuditLoader} from './audit-module-loader.mjs';
const baseline=JSON.parse(await fs.readFile('docs/release/rc1-pre-reconciliation.json','utf8'));
const changedAllowed=new Set([
 'src/data/antibiotics.ts','src/data/bcid2Compatibility.ts','src/data/bcidCombinedForecasts.ts','src/data/rapidDiagnosticTypes.ts','src/data/scientificGovernance.ts','src/data/types.ts',
 'src/features/BcidForecast.tsx','src/features/BreakpointEngine.tsx','src/features/EducationalTopicPage.tsx','src/features/Feedback.tsx','src/features/ImageConcordanceAnalyzer.tsx','src/features/MechanismDetailPage.tsx','src/features/PhenotypeMechanismAnalyzer.tsx','src/features/PromoPhone.tsx','src/features/TrustPage.tsx','src/features/concordanceEngine.ts','src/features/image-concordance-extraction-core.mjs','src/features/phenotypeMechanismEngine.ts','src/lib/ocr.ts','src/lib/platform.ts','src/lib/telemetry.ts','src/services/feedbackService.ts'
]);
const sha=b=>createHash('sha256').update(b).digest('hex'),unchanged=[],approvedDifferences=[];
for(const [file,before] of Object.entries(baseline.protected)){
 const after=sha(await fs.readFile(file));
 if(after===before)unchanged.push({file,sha256:after});
 else{assert.ok(changedAllowed.has(file),'Unexpected protected change: '+file);approvedDifferences.push({file,before,after});}
}
// Byte identity above protects the primary numerical/gene/reference/case corpus.
// Semantic comparison with production is optional only when its checkout exists;
// the release record explicitly distinguishes it from portable byte checks.
let semanticProduction=null;
if(process.env.AST_RC1_PRODUCTION){
 const before=createAuditLoader(path.resolve(process.env.AST_RC1_PRODUCTION)),after=createAuditLoader();
 const legacy=before('src/data/antibiotics.ts').antibiotics,now=after('src/data/antibiotics.ts').antibiotics;
 assert.deepEqual(now,legacy,'Legacy antimicrobial records must not change');
 const oldSignatures=before('src/features/phenotypeMechanismEngine.ts').phenotypeSignatures;
 const signatures=after('src/features/phenotypeMechanismEngine.ts').phenotypeSignatures;
 assert.deepEqual(signatures.map(({availability,pauseReason,...scientific})=>scientific),oldSignatures,'Only availability/abstention metadata may differ');
 assert.deepEqual(signatures.filter(s=>s.availability!=='active').map(s=>s.id),['quinolone-like']);
 semanticProduction={legacyAntibiotics:legacy.length,unchangedPhenotypeScientificRecords:signatures.length,quinoloneThreshold:signatures.find(s=>s.id==='quinolone-like').minimumEvidence};
}
const files=await fs.readdir('dist',{recursive:true});
assert.ok(!files.some(f=>/(?:^|[/\\])(?:research|work|tests|model\.bin|model-index\.json)(?:[/\\]|$)/i.test(f)),'Forbidden output');
const result={at:new Date().toISOString(),baseline:baseline.productionHead,passed:true,unchanged,approvedDifferences,semanticProduction};
await fs.mkdir('work/rc1',{recursive:true});await fs.writeFile('work/rc1/integrity.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:true,byteIdentical:unchanged.length,approvedDifferences:approvedDifferences.map(x=>x.file),semanticProduction},null,2));
