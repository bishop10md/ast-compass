import { antibiotics, intrinsicPatterns, mechanisms, organisms } from "../data";

export type AstPhenotypeCategory = "S" | "I" | "R" | "SDD" | "NS" | "Unknown";
export type AstPhenotypeRow = { id: string; antimicrobialId: string; measurement: string; category: AstPhenotypeCategory };
export type CompatibilityLevel = "Highly compatible" | "Compatible" | "Possible" | "Low compatibility" | "Insufficient data";
type PatternExpectation = "resistant" | "susceptible" | "nonsusceptible";
type SignaturePattern = { antimicrobialIds?: string[]; classIncludes?: string[]; expectation: PatternExpectation; weight: number; label: string };

export type PhenotypeSignature = {
  id: string;
  organisms: string[];
  organismGroups?: string[];
  mechanismId: string;
  candidateMarkerIds?: string[];
  expectedPatterns: SignaturePattern[];
  contradictoryPatterns?: SignaturePattern[];
  minimumEvidence: number;
  alternativeMechanismIds?: string[];
  limitations: string[];
  sourceIds: string[];
  reviewStatus: "Draft" | "Reviewed" | "Verified";
};

export type PhenotypeCandidate = {
  signatureId: string; mechanismId: string; mechanismName: string; compatibility: CompatibilityLevel;
  candidateMarkers: string[]; supporting: string[]; against: string[]; limitations: string[];
  alternativeMechanismIds: string[]; sourceIds: string[]; reviewStatus: PhenotypeSignature["reviewStatus"];
};

export type PhenotypeAnalysis = { organismId: string; reviewedRows: number; intrinsicFindings: string[]; candidates: PhenotypeCandidate[]; insufficient: boolean; combinedPossible: boolean };

const enterobacterales = ["enterobacterales","ecoli","shigella","salmonella","kpneumo","koxytoca","eaerogenes","ecloacae","cfreundii","cdiversus","smarcescens","pmirabilis","providencia","morganella"];
const ampcRisk = ["ecloacae","eaerogenes","cfreundii","smarcescens","morganella","providencia"];

export const phenotypeSignatures: PhenotypeSignature[] = [
  {id:"esbl-like",organisms:enterobacterales,mechanismId:"esbl",candidateMarkerIds:["CTX-M"],expectedPatterns:[
    {antimicrobialIds:["ceftriaxone","cefotaxime","ceftazidime"],expectation:"resistant",weight:2,label:"Expanded-spectrum cephalosporin resistance"},
    {antimicrobialIds:["ertapenem","meropenem","imipenem"],expectation:"susceptible",weight:2,label:"Carbapenem activity retained"}],contradictoryPatterns:[
    {antimicrobialIds:["ertapenem","meropenem","imipenem"],expectation:"resistant",weight:2,label:"Carbapenem nonsusceptibility broadens the differential"}],minimumEvidence:2,alternativeMechanismIds:["ampc","serine_carb","mbl"],limitations:["Phenotypic AST cannot establish that CTX-M is present.","Other ESBL enzymes, AmpC, permeability changes, or combined mechanisms may produce a similar phenotype."],sourceIds:["ref-clsi","ref-idsa"],reviewStatus:"Draft"},
  {id:"ampc-like",organisms:ampcRisk,mechanismId:"ampc",expectedPatterns:[
    {antimicrobialIds:["cefoxitin"],expectation:"resistant",weight:2,label:"Cephamycin resistance"},
    {antimicrobialIds:["ceftriaxone","cefotaxime","ceftazidime"],expectation:"resistant",weight:2,label:"Expanded-spectrum cephalosporin resistance"},
    {antimicrobialIds:["meropenem","imipenem"],expectation:"susceptible",weight:1,label:"Carbapenem activity retained"}],minimumEvidence:2,alternativeMechanismIds:["esbl","serine_carb"],limitations:["Chromosomal AmpC expression or derepression may contribute in this organism context.","Routine BCID panels do not provide a general AmpC marker; phenotype does not establish a specific gene."],sourceIds:["ref-clsi","ref-idsa"],reviewStatus:"Draft"},
  {id:"carbapenemase-like",organisms:[...enterobacterales,"pseudomonas","acinetobacter"],mechanismId:"serine_carb",candidateMarkerIds:["KPC","NDM","VIM","IMP","OXA-48-like"],expectedPatterns:[
    {antimicrobialIds:["ertapenem","meropenem","imipenem","doripenem"],expectation:"nonsusceptible",weight:2,label:"Carbapenem nonsusceptibility"},
    {antimicrobialIds:["ceftriaxone","ceftazidime","cefepime","aztreonam"],expectation:"resistant",weight:1,label:"Broader beta-lactam resistance"}],contradictoryPatterns:[
    {antimicrobialIds:["meropenem","imipenem"],expectation:"susceptible",weight:2,label:"Key carbapenem activity retained"}],minimumEvidence:3,alternativeMechanismIds:["mbl","ampc","esbl"],limitations:["Phenotypic AST alone generally cannot determine the specific carbapenemase gene.","ESBL or AmpC combined with permeability loss may mimic a carbapenemase phenotype."],sourceIds:["ref-clsi","ref-idsa"],reviewStatus:"Draft"},
  {id:"mbl-like",organisms:[...enterobacterales,"pseudomonas","acinetobacter"],mechanismId:"mbl",candidateMarkerIds:["NDM","VIM","IMP"],expectedPatterns:[
    {antimicrobialIds:["meropenem","imipenem"],expectation:"nonsusceptible",weight:2,label:"Carbapenem nonsusceptibility"},
    {antimicrobialIds:["aztreonam"],expectation:"susceptible",weight:2,label:"Aztreonam activity retained"}],minimumEvidence:3,alternativeMechanismIds:["serine_carb"],limitations:["Co-produced serine beta-lactamases may remove the expected aztreonam distinction.","Phenotype cannot confidently distinguish NDM, VIM, and IMP."],sourceIds:["ref-clsi","ref-idsa"],reviewStatus:"Draft"},
  {id:"mrsa-like",organisms:["staph_aureus","cons","slugdunensis"],mechanismId:"pbp2a",candidateMarkerIds:["mecA","mecC"],expectedPatterns:[
    {antimicrobialIds:["cefoxitin","oxacillin"],expectation:"resistant",weight:3,label:"Methicillin-resistance surrogate is resistant"}],minimumEvidence:3,limitations:["Phenotype is compatible with altered PBP-mediated resistance but does not establish mecA or mecC.","Apply organism- and method-specific validated interpretive procedures."],sourceIds:["ref-clsi"],reviewStatus:"Draft"},
  {id:"vre-like",organisms:["efaecalis","efaecium"],mechanismId:"van_target",candidateMarkerIds:["vanA","vanB"],expectedPatterns:[
    {antimicrobialIds:["vancomycin"],expectation:"resistant",weight:3,label:"Vancomycin resistance"},
    {antimicrobialIds:["teicoplanin"],expectation:"resistant",weight:1,label:"Glycopeptide co-resistance"}],minimumEvidence:3,limitations:["Phenotype alone does not identify vanA versus vanB.","Intrinsic and non-panel glycopeptide-resistance mechanisms remain organism dependent."],sourceIds:["ref-clsi"],reviewStatus:"Draft"},
  {id:"mlsb-like",organisms:["staph_aureus","cons","slugdunensis","spneumo","bhs","vgs"],mechanismId:"mlsb",expectedPatterns:[
    {antimicrobialIds:["erythromycin"],expectation:"resistant",weight:2,label:"Macrolide resistance"},
    {antimicrobialIds:["clindamycin"],expectation:"resistant",weight:2,label:"Lincosamide resistance"}],minimumEvidence:3,limitations:["Inducible expression may require an appropriate validated phenotypic test.","Efflux and drug-specific inactivation can create alternative patterns."],sourceIds:["ref-clsi"],reviewStatus:"Draft"},
  {id:"quinolone-like",organisms:organisms.filter(o=>o.gram!=="fungal"&&o.gram!=="acid-fast").map(o=>o.id),mechanismId:"quinolone",expectedPatterns:[
    {antimicrobialIds:["ciprofloxacin","levofloxacin","moxifloxacin","nalidixic"],expectation:"resistant",weight:1,label:"Fluoroquinolone or quinolone resistance"}],minimumEvidence:2,limitations:["Multiple target, protection, efflux, and permeability mechanisms can overlap.","A single resistant fluoroquinolone is insufficient for a gene-level inference."],sourceIds:["ref-clsi","ref-idsa"],reviewStatus:"Draft"}
];

const isR=(c:AstPhenotypeCategory)=>c==="R"||c==="NS";
const isNS=(c:AstPhenotypeCategory)=>c==="R"||c==="I"||c==="SDD"||c==="NS";
const match=(category:AstPhenotypeCategory,expectation:PatternExpectation)=>expectation==="susceptible"?category==="S":expectation==="resistant"?isR(category):isNS(category);
const rowLabel=(row:AstPhenotypeRow)=>`${antibiotics.find(a=>a.id===row.antimicrobialId)?.name||row.antimicrobialId} ${row.category}`;
const applicable=(signature:PhenotypeSignature,organismId:string)=>signature.organisms.includes(organismId)||signature.organismGroups?.includes(organisms.find(o=>o.id===organismId)?.group||"");

function evidenceFor(pattern:SignaturePattern,rows:AstPhenotypeRow[]){return rows.filter(row=>{const drug=antibiotics.find(a=>a.id===row.antimicrobialId);return !!drug&&(pattern.antimicrobialIds?.includes(row.antimicrobialId)||pattern.classIncludes?.some(c=>drug.className.toLowerCase().includes(c.toLowerCase())))&&match(row.category,pattern.expectation)})}
function level(score:number,evidence:number,minimum:number,against:number):CompatibilityLevel{if(evidence<minimum)return"Insufficient data";if(score>=5&&against===0)return"Highly compatible";if(score>=3)return"Compatible";if(score>=1)return"Possible";return"Low compatibility"}

export function analyzePhenotype(organismId:string,input:AstPhenotypeRow[]):PhenotypeAnalysis{
 const rows=input.filter(r=>r.antimicrobialId&&r.category!=="Unknown"),intrinsicFindings:string[]=[];
 const intrinsicIds=new Set<string>();
 for(const rule of intrinsicPatterns.filter(p=>p.organismId===organismId)){const row=rows.find(r=>r.antimicrobialId===rule.antibioticId);if(row&&((rule.expectation==="Expected resistant"&&isR(row.category))||(rule.expectation==="Expected susceptible"&&row.category==="S"))){intrinsicIds.add(row.antimicrobialId);intrinsicFindings.push(`${rowLabel(row)} is consistent with an expected intrinsic pattern: ${rule.rationale}`)}}
 const scored=phenotypeSignatures.filter(s=>applicable(s,organismId)).map(signature=>{let score=0;const supporting:string[]=[],against:string[]=[];let evidence=0;
   for(const pattern of signature.expectedPatterns){const found=evidenceFor(pattern,rows.filter(r=>!intrinsicIds.has(r.antimicrobialId)));if(found.length){score+=pattern.weight;evidence+=pattern.weight;supporting.push(...found.map(r=>`${rowLabel(r)} — ${pattern.label}`))}}
   for(const pattern of signature.contradictoryPatterns||[]){const found=evidenceFor(pattern,rows);if(found.length){score-=pattern.weight;against.push(...found.map(r=>`${rowLabel(r)} — ${pattern.label}`))}}
   return{signatureId:signature.id,mechanismId:signature.mechanismId,mechanismName:mechanisms.find(m=>m.id===signature.mechanismId)?.name||signature.mechanismId,compatibility:level(score,evidence,signature.minimumEvidence,against.length),candidateMarkers:signature.candidateMarkerIds||[],supporting,against,limitations:signature.limitations,alternativeMechanismIds:signature.alternativeMechanismIds||[],sourceIds:signature.sourceIds,reviewStatus:signature.reviewStatus} satisfies PhenotypeCandidate;
 }).filter(c=>c.compatibility!=="Insufficient data"&&c.compatibility!=="Low compatibility").sort((a,b)=>["Highly compatible","Compatible","Possible"].indexOf(a.compatibility)-["Highly compatible","Compatible","Possible"].indexOf(b.compatibility));
 return{organismId,reviewedRows:rows.length,intrinsicFindings,candidates:scored,insufficient:scored.length===0,combinedPossible:scored.filter(c=>c.compatibility==="Highly compatible"||c.compatibility==="Compatible").length>1};
}
