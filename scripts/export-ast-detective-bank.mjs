import { readFileSync, writeFileSync } from "node:fs";
const source=readFileSync(new URL("../src/data/astDetectiveQuestions.ts",import.meta.url),"utf8");
const rows=source.split(/\r?\n/).map(x=>x.trim()).filter(x=>x.startsWith('["AD')&&(x.endsWith('],')||x.endsWith(']'))).map(x=>JSON.parse(x.endsWith(',')?x.slice(0,-1):x));
const escape=value=>`"${String(value).replaceAll('"','""')}"`;
const header=["Question ID","Topic","Difficulty","Type","Title","Stem","Choices","Correct answer","Explanation","Teaching point","Source IDs","Review status"];
const csv=[header,...rows.map(([id,topic,difficulty,type,title,stem,choices,correct,explanation,teachingPoint,sources])=>[id,topic,difficulty,type,title,stem,choices.join(" | "),choices[correct],explanation,teachingPoint,sources.join(" | "),"Draft"])].map(row=>row.map(escape).join(",")).join("\n");
writeFileSync(new URL("../AST_DETECTIVE_REVIEW_EXPORT.csv",import.meta.url),csv,"utf8");
console.log(`Exported ${rows.length} questions to AST_DETECTIVE_REVIEW_EXPORT.csv`);
