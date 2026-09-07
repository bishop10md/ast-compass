import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {v3FullRowFixtures,v3IsolatedCells,isolatedCellSvg} from '../tests/fixtures/image-ocr-v3-fixtures.mjs';
import {renderImageConcordanceFixtureSvg} from '../tests/fixtures/rendered-image-concordance-fixtures.mjs';
const req=process.env.AST_AUDIT_PLAYWRIGHT?createRequire(path.join(process.env.AST_AUDIT_PLAYWRIGHT,'package.json')):createRequire(import.meta.url);
const sharp=req('sharp');const root='work/image-ocr-v3/fixtures';await fs.mkdir(root,{recursive:true});
const manifest=[];
for(const [kind,fixtures,render] of [['full',v3FullRowFixtures,renderImageConcordanceFixtureSvg],['isolated',v3IsolatedCells,isolatedCellSvg]])for(const fixture of fixtures){
  const file=path.join(root,fixture.id+'.png');
  // Add only; preserve already rendered bytes, and never write the original V2 raster directory.
  let png;try{png=await fs.readFile(file);}catch(error){if(error.code!=='ENOENT')throw error;png=await sharp(Buffer.from(render(fixture))).png().toBuffer();await fs.writeFile(file,png,{flag:'wx'});}
  manifest.push({id:fixture.id,kind,sha256:createHash('sha256').update(png).digest('hex')});
}
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));console.log(`Added/preserved ${manifest.length} synthetic V3 rasters (${v3FullRowFixtures.length} full tables, ${v3IsolatedCells.length} isolated cells).`);
