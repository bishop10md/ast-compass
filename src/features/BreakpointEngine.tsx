import { useEffect, useMemo, useRef, useState } from "react";
import { antibiotics, breakpoints, organisms, references, standardCatalog, type Antibiotic, type Breakpoint, type Organism, type Standard, type SusceptibilityDomain } from "../data";
import { sortAlphabetically } from "../utils/search";
import SearchableSelect from "../components/SearchableSelect";
import { loadedBreakpointScale, interpretLoadedMic, interpretDiskZone, matchingBreakpointRecords, type LoadedBreakpointScale } from "./breakpointPredicates";

const domains: SusceptibilityDomain[] = ["Bacteria", "Yeast", "Filamentous fungi", "Anaerobes", "Fastidious bacteria", "Rapid AST", "Mycobacteria"];
const refFor = (id: string) => references.find((r) => r.id === id);

const patternFor = (group = "", organism = "") => {
  if (group.includes("Enterobacterales")) return `${organism} may acquire ESBLs, AmpC enzymes, carbapenemases, target mutations, efflux, and aminoglycoside-modifying enzymes. Third-generation cephalosporin resistance can be compatible with ESBL or AmpC activity, but the complete antibiogram matters.`;
  if (organism.includes("Pseudomonas")) return "P. aeruginosa commonly combines low permeability, efflux, inducible AmpC, target mutations, and acquired β-lactamases. A single resistant result rarely identifies one mechanism.";
  if (organism.includes("Acinetobacter")) return "Acinetobacter resistance can reflect OXA carbapenemases, permeability changes, efflux, aminoglycoside enzymes, and target mutations. Multidrug patterns need organism-specific review.";
  if (organism.includes("Stenotrophomonas")) return "S. maltophilia has important intrinsic β-lactam resistance mechanisms and can also acquire efflux, target, and folate-pathway resistance. Carbapenem resistance is expected.";
  if (group.includes("Staphylococcus")) return "Staphylococcal patterns commonly involve mec-mediated altered PBPs, β-lactamase production, MLSB resistance, aminoglycoside enzymes, and fluoroquinolone target changes.";
  if (group.includes("Enterococcus")) return "Enterococci have important intrinsic patterns and may acquire van genes, high-level aminoglycoside resistance, and linezolid or daptomycin resistance mechanisms.";
  if (group.includes("Streptococcus")) return "Streptococcal resistance may involve altered PBPs, macrolide efflux or methylation, tetracycline resistance, and fluoroquinolone target changes.";
  if (group.includes("Neisseria")) return "Neisseria resistance can involve altered targets, β-lactamase production, efflux, and permeability changes. Species-specific methods and current criteria are essential.";
  if (group.includes("Anaerobic")) return "Anaerobic susceptibility is strongly species- and method-dependent. β-lactamases, target changes, nim genes, and MLS resistance may contribute.";
  if (group.includes("Candida") || group.includes("yeast") || group.includes("Aspergillus") || group.includes("molds")) return "Fungal resistance may involve azole target or efflux changes, echinocandin FKS alterations, and species-specific intrinsic patterns. Validated antifungal methods are essential.";
  if (group.includes("Mycobacteria")) return "Mycobacterial resistance frequently reflects target mutations, drug activation pathways, efflux, and cell-envelope biology. Organism identification and specialized susceptibility methods are essential.";
  return `Resistance in ${organism || "this organism"} can reflect intrinsic biology, acquired genes, expression, permeability, efflux, target modification, or technical factors. One MIC category does not establish the mechanism.`;
};

const isApplicable = (organism: Organism, drug: Antibiotic, domain: SusceptibilityDomain) => {
  if (domain === "Yeast" || domain === "Filamentous fungi" || domain === "Anaerobes" || domain === "Mycobacteria") return drug.domains?.includes(domain) ?? false;
  if (!["Bacteria", "Fastidious bacteria", "Rapid AST"].includes(domain)) return false;
  if (!drug.domains?.includes("Bacteria")) return false;
  const gramPositiveOnly = ["oxacillin", "cefoxitin", "ceftaroline", "vancomycin", "teicoplanin", "daptomycin", "linezolid", "tedizolid", "quinu_dalfo"];
  const gramNegativeOnly = ["aztreonam", "caz_avi", "cef_tol_tazo", "mero_vabor", "imi_rel", "cefiderocol", "colistin", "polymyxin_b"];
  if (organism.gram === "negative" && gramPositiveOnly.includes(drug.id)) return false;
  if (organism.gram === "positive" && gramNegativeOnly.includes(drug.id)) return false;
  if (organism.group.includes("Streptococcus") && ["nitrofurantoin", "fosfomycin", "ertapenem", "doripenem", "plazomicin"].includes(drug.id)) return false;
  return true;
};

type TeachingScale = { method: "MIC"; susceptibleMax: number; resistantMin: number; unit: string; origin: "Organism–drug simulation profile"; note: string };
type BreakpointScale = TeachingScale | LoadedBreakpointScale;

const scaleFor = (record: Breakpoint | undefined, drug: Antibiotic, organism: Organism): BreakpointScale | null => {
  if (record) return loadedBreakpointScale(record);
  const c = drug.className.toLowerCase();
  const profile = (susceptibleMax: number, resistantMin: number, note: string, unit = "µg/mL"): TeachingScale => ({ method: "MIC", susceptibleMax, resistantMin, unit, origin: "Organism–drug simulation profile", note });
  if (c.includes("fluoroquinolone") || c.includes("quinolone")) return profile(organism.group.includes("Streptococcus") ? 1 : .25, organism.group.includes("Streptococcus") ? 4 : 1, "Low-range two-fold dilutions mimic typical fluoroquinolone AST panels.");
  if (c.includes("aminoglycoside")) return profile(4, 16, "The simulation uses the broader dilution range commonly encountered with aminoglycoside testing.");
  if (c.includes("carbapenem")) return profile(organism.id === "pseudomonas" ? 2 : 1, organism.id === "pseudomonas" ? 8 : 4, "The modeled range shifts for non-fermenters to demonstrate organism-dependent MIC behavior.");
  if (c.includes("cephalosporin") || c.includes("cephamycin") || c.includes("monobactam")) return profile(organism.id === "pseudomonas" ? 8 : 1, organism.id === "pseudomonas" ? 32 : 4, "The modeled range reflects different baseline permeability and β-lactamase contexts across organism groups.");
  if (c.includes("penicillin") || c.includes("β-lactam")) return profile(organism.group.includes("Streptococcus") ? .12 : 8, organism.group.includes("Streptococcus") ? 2 : 32, "The modeled dilution range varies between fastidious Gram-positive organisms and Gram-negative bacilli.");
  if (c.includes("glycopeptide")) return profile(organism.group.includes("Enterococcus") ? 4 : 2, organism.group.includes("Enterococcus") ? 32 : 8, "The model distinguishes staphylococcal and enterococcal glycopeptide ranges.");
  if (c.includes("macrolide") || c.includes("lincosamide")) return profile(.5, 2, "A low-range dilution series demonstrates susceptible and MLS-type resistant populations.");
  if (c.includes("tetracycline") || c.includes("glycylcycline") || c.includes("fluorocycline")) return profile(2, 8, "The modeled series can shift upward with efflux or ribosomal-protection scenarios.");
  if (c.includes("oxazolidinone") || c.includes("lipopeptide")) return profile(2, 8, "The model uses a narrow Gram-positive agent range and acquired-resistance shift.");
  if (c.includes("echinocandin")) return profile(organism.id === "candida_parapsilosis" ? 2 : .25, organism.id === "candida_parapsilosis" ? 8 : 1, "Species identity changes the simulated echinocandin MIC distribution.", "mg/L");
  if (c.includes("azole") || c.includes("antifungal")) return profile(organism.id === "candida_glabrata" ? 8 : 2, organism.id === "candida_glabrata" ? 32 : 8, "Species-specific baseline shifts are represented without asserting official antifungal breakpoints.", "mg/L");
  if (c.includes("antimycobacterial")) return profile(1, 4, "Specialized mycobacterial critical concentrations are not reproduced; only two-fold dilution behavior is simulated.");
  return profile(1, 4, "An organism–drug teaching profile replaces the previous one-size-fits-all scale.");
};

const dilutionSeries = [.002, .004, .008, .016, .03, .06, .12, .25, .5, 1, 2, 4, 8, 16, 32, 64, 128, 256];
const closestIndex = (value: number) => dilutionSeries.reduce((best, item, i) => Math.abs(Math.log2(item / value)) < Math.abs(Math.log2(dilutionSeries[best] / value)) ? i : best, 0);
const intrinsicShift = (organism: Organism, drug: Antibiotic) => (organism.id === "stenotrophomonas" && drug.className.includes("Carbapenem")) || (organism.group.includes("Enterococcus") && drug.className.includes("Cephalosporin"));
const simulateMic = (scale: Pick<TeachingScale, "susceptibleMax" | "resistantMin">, profile: "typical" | "acquired" | "intrinsic", organism: Organism, drug: Antibiotic) => {
  const effectiveProfile = intrinsicShift(organism, drug) ? "intrinsic" : profile;
  const center = effectiveProfile === "typical" ? Math.max(0, closestIndex(scale.susceptibleMax) - 2) : effectiveProfile === "acquired" ? closestIndex(scale.resistantMin) + 2 : closestIndex(scale.resistantMin) + 3;
  const jitter = Math.floor(Math.random() * 5) - 2;
  return dilutionSeries[Math.max(0, Math.min(dilutionSeries.length - 1, center + jitter))];
};

function interpretMic(scale: BreakpointScale, mic: string, standard: Standard) {
  if (scale.method !== "MIC") return null;
  if (scale.origin === "Loaded demo record") return interpretLoadedMic(scale, mic, standard);
  const value = Number(mic);
  if (mic.trim() === "" || !Number.isFinite(value) || value < 0) return null;
  if (value <= scale.susceptibleMax) return { category: "Susceptible", tone: "sus", explanation: `The entered MIC (${value} ${scale.unit}) is at or below the teaching susceptible threshold (≤ ${scale.susceptibleMax}).` };
  if (value >= scale.resistantMin) return { category: "Resistant", tone: "res", explanation: `The entered MIC (${value} ${scale.unit}) is at or above the teaching resistant threshold (≥ ${scale.resistantMin}).` };
  return { category: standard === "EUCAST" ? "Susceptible, increased exposure (I)" : "Intermediate / SDD", tone: "int", explanation: `The entered MIC (${value} ${scale.unit}) falls between the teaching susceptible and resistant thresholds.` };
}

function interpretMeasurement(scale: BreakpointScale, input: string, standard: Standard) {
  return scale.method === "Disk" ? interpretDiskZone(scale, input, standard) : interpretMic(scale, input, standard);
}

function CriteriaScale({ scale, standard }: { scale: BreakpointScale; standard: Standard }) {
  const loaded = scale.origin === "Loaded demo record";
  const susceptible = loaded ? scale.susceptible.text : `≤ ${scale.susceptibleMax}`;
  const resistant = loaded ? scale.resistant.text : `≥ ${scale.resistantMin}`;
  const intermediate = loaded ? scale.intermediate?.text : `> ${scale.susceptibleMax} to < ${scale.resistantMin}`;
  return <><div className="breakpoint-scale"><div className="sus"><span>S</span><b>{susceptible}</b><small>Teaching susceptible</small></div>{intermediate && <div className="int"><span>I / SDD</span><b>{intermediate}</b><small>{standard === "EUCAST" ? "Susceptible, increased exposure" : "Intermediate / SDD"}</small></div>}<div className="res"><span>R</span><b>{resistant}</b><small>Teaching resistant</small></div></div>{loaded && !intermediate && <p>No intermediate category is defined in this loaded record.</p>}</>;
}

export default function BreakpointEngine() {
  const [domain, setDomain] = useState<SusceptibilityDomain>("Bacteria");
  const [standard, setStandard] = useState<Standard>("CLSI");
  const [organismId, setOrganismId] = useState("ecoli");
  const [drugId, setDrugId] = useState("ceftriaxone");
  const [mic, setMic] = useState("5");
  const [isolateProfile, setIsolateProfile] = useState<"typical" | "acquired" | "intrinsic">("typical");
  const [simulationNote, setSimulationNote] = useState("Manual MIC entry");
  const domainOrganisms = useMemo(() => sortAlphabetically(organisms.filter((o) => o.domains?.includes(domain)), (item) => item.name), [domain]);
  const organism = domainOrganisms.find((o) => o.id === organismId) || domainOrganisms[0];
  const domainDrugs = useMemo(() => organism ? sortAlphabetically(antibiotics.filter((a) => isApplicable(organism, a, domain)), (item) => item.name) : [], [organism, domain]);
  const drug = domainDrugs.find((a) => a.id === drugId) || domainDrugs[0];
  const catalog = standardCatalog.filter((s) => s.domain === domain || (domain === "Anaerobes" && s.id === "eucast-161"));
  const matchingRecords = matchingBreakpointRecords(breakpoints, standard, organism?.id, drug?.id);
  const record = matchingRecords.length === 1 ? matchingRecords[0] : undefined;
  const scale = matchingRecords.length > 1 ? null : drug && organism ? scaleFor(record, drug, organism) : null;
  const isDisk = scale?.method === "Disk";
  const measurementContext = `${scale?.method || "MIC"}:${scale?.unit || ""}`;
  const previousMeasurementContext = useRef(measurementContext);
  // Do not render an old MIC as a diameter, even before the reset effect runs.
  const measurementInput = previousMeasurementContext.current === measurementContext ? mic : "";
  const interpretation = scale ? interpretMeasurement(scale, measurementInput, standard) : null;
  useEffect(() => { if (previousMeasurementContext.current !== measurementContext) { setMic(""); setSimulationNote("Manual measurement entry"); previousMeasurementContext.current = measurementContext; } }, [measurementContext]);
  const selectOrganism = (id: string) => {
    const next = organisms.find((o) => o.id === id); setOrganismId(id);
    if (next) { const first = antibiotics.find((a) => isApplicable(next, a, domain)); if (first) setDrugId(first.id); }
  };
  const changeDomain = (next: SusceptibilityDomain) => {
    const firstOrganism = organisms.find((o) => o.domains?.includes(next)); setDomain(next); setMic("");
    if (firstOrganism) { setOrganismId(firstOrganism.id); const firstDrug = antibiotics.find((a) => isApplicable(firstOrganism, a, next)); if (firstDrug) setDrugId(firstDrug.id); }
  };
  const generateIsolate = () => {
    if (!scale || scale.method !== "MIC" || !organism || !drug) return;
    const forcedIntrinsic = intrinsicShift(organism, drug);
    const simulationScale = scale.origin === "Loaded demo record" ? { susceptibleMax: scale.susceptible.value, resistantMin: scale.resistant.value } : scale;
    const value = simulateMic(simulationScale, isolateProfile, organism, drug); setMic(String(value));
    setSimulationNote(forcedIntrinsic ? "Intrinsic-resistance pattern overrode the selected profile" : `${isolateProfile === "typical" ? "Typical / wild-type-like" : isolateProfile === "acquired" ? "Acquired-resistance" : "Intrinsic-resistance"} simulated isolate`);
  };
  return <>
    <div className="page-head"><p className="eyebrow">Interactive educational interpretation</p><h1>Breakpoint Engine</h1><p>{isDisk ? "Enter a zone diameter in mm to inspect the loaded disk-diffusion criteria. No MIC simulation is applied to this record." : "Choose any listed organism, select an applicable antimicrobial, and enter any non-negative MIC to practice category logic and resistance-pattern reasoning."}</p></div>
    <div className="directory-stats"><div><b>{organisms.length}</b><span>organisms / groups</span></div><div><b>{antibiotics.length}</b><span>antimicrobials</span></div><div><b>{isDisk ? "Zone diameter" : "Any MIC"}</b><span>{isDisk ? "whole millimeters · loaded criteria only" : "non-negative numeric input"}</span></div></div>
    <div className="simulation-ticker" role="note" aria-label="Simulation safety notice"><div className="ticker-track"><span className="ticker-message"><b>REAL-WORLD-LIKE SIMULATION</b> Two-fold dilution MICs and organism–drug profiles mimic bench behavior. Outputs remain synthetic—not surveillance data or official breakpoints—and must never be used for clinical reporting.</span><span className="ticker-message" aria-hidden="true"><b>REAL-WORLD-LIKE SIMULATION</b> Two-fold dilution MICs and organism–drug profiles mimic bench behavior. Outputs remain synthetic—not surveillance data or official breakpoints—and must never be used for clinical reporting.</span></div></div>
    <div className="domain-tabs" role="tablist">{domains.map((d) => <button role="tab" aria-selected={domain === d} className={domain === d ? "selected" : ""} onClick={() => changeDomain(d)} key={d}>{d}</button>)}</div>
    <section className="catalog-strip">{catalog.map((entry) => <article key={entry.id}><div><span>{entry.authority}</span><b>{entry.document}</b><small>{entry.edition}</small></div><p>{entry.purpose}</p><a href={refFor(entry.sourceId)?.url} target="_blank" rel="noreferrer">Official source ↗</a></article>)}</section>
    <div className="standard-hero"><div><span>Selected teaching context</span><b>{domain} · {standard}</b><small>{standard === "EUCAST" ? "EUCAST I is displayed as susceptible, increased exposure." : "The selected authority label does not convert synthetic thresholds into official criteria."}</small></div><div className="standard-buttons">{(["CLSI", "EUCAST", "FDA"] as Standard[]).map((s) => <button className={standard === s ? "selected" : ""} onClick={() => setStandard(s)} key={s}>{s}</button>)}</div></div>
    <div className="workspace-grid"><aside className="filter-panel"><SearchableSelect label="Organism" value={organism?.id || ""} onChange={selectOrganism} options={domainOrganisms.map((item) => ({ value: item.id, label: item.name, aliases: item.aliases, description: item.group }))} placeholder="Search organism or alias…"/><SearchableSelect label="Applicable antimicrobial" value={drug?.id || ""} onChange={setDrugId} options={domainDrugs.map((item) => ({ value: item.id, label: item.name, aliases: [item.short], description: item.className }))} placeholder="Search antimicrobial or class…"/>{scale?.method === "MIC" && <div className="isolate-simulator"><b>Generate a simulated isolate</b><label>Population profile<select value={isolateProfile} onChange={(e) => setIsolateProfile(e.target.value as typeof isolateProfile)}><option value="typical">Typical / wild-type-like</option><option value="acquired">Acquired resistance</option><option value="intrinsic">Intrinsic resistance</option></select></label><button type="button" onClick={generateIsolate}>Generate two-fold MIC</button><small>{simulationNote}</small></div>}<label>{isDisk ? "Zone diameter (mm)" : `MIC (${scale?.unit || "units"})`}<input className="field mic-input" type="number" min="0" step={isDisk ? "1" : "any"} value={measurementInput} disabled={!scale} onChange={(e) => { setMic(e.target.value); setSimulationNote(isDisk ? "Manual zone diameter entry" : "Manual MIC entry"); }} placeholder={isDisk ? "Enter zone diameter" : "Enter any MIC"}/></label><div className="selection-summary"><span>Organism group</span><b>{organism?.group}</b><span>Drug class</span><b>{drug?.className}</b><span>Teaching source</span><b>{scale?.origin}</b></div></aside>
      {scale && drug ? <section className="panel result-panel"><div className="result-title"><div><p className="eyebrow">{organism?.name} · {drug.name}</p><h2>{isDisk ? "Disk diffusion teaching result" : "MIC interpretation simulation"}</h2><span>{record?.method || "MIC"} · {scale.unit} · {scale.origin}</span></div><span className="demo-stamp">NOT CLINICAL</span></div>{record?.availability && <div className={`criteria-status ${record.availability === "Clinical breakpoint available" ? "available" : "unavailable"}`}><span>Selected-standard record status</span><b>{record.availability}</b><p>{record.categoryMeaning}</p></div>}<CriteriaScale scale={scale} standard={standard}/>{interpretation ? <div className={`mic-answer ${interpretation.tone}`}><span>Generated teaching interpretation</span><h3>{interpretation.category}</h3><p>{interpretation.explanation}</p></div> : <div className="mic-empty">{isDisk ? "Enter a whole zone diameter in mm to inspect the loaded criteria." : "Enter a valid non-negative MIC to generate a teaching interpretation."}</div>}<div className="pattern-explainer"><b>How to reason about this organism’s resistance patterns</b><p>{patternFor(organism?.group, organism?.name)}</p><small>The category describes the simulated phenotype. It does not prove a mechanism or predict patient outcome.</small></div><div className="note"><b>{scale.origin}</b><p>{scale.note}</p>{record && <><p><strong>Standard/version:</strong> {record.standard} · {record.version}</p><p><strong>Last verified:</strong> {record.lastVerified || record.meta.lastReviewed}</p>{isDisk && <p><strong>Disk content:</strong> {record.diskContent}</p>}<p><strong>Restrictions:</strong> {record.siteRestriction} · {record.specimenRestriction || "No specimen restriction recorded"}</p><a href={refFor(record.sourceId)?.url} target="_blank" rel="noreferrer">Open supporting source ↗</a></>}</div></section> : <section className="no-breakpoint"><span>∅</span><div><h2>{matchingRecords.length > 1 ? "Ambiguous loaded breakpoint records" : record ? record.availability && record.availability !== "Clinical breakpoint available" ? record.availability : "Loaded criteria unavailable for interpretation" : "No applicable teaching combination"}</h2><p>{matchingRecords.length > 1 ? "More than one record matches this organism, antimicrobial and standard. Method/source selection needs review; no record or simulation is selected automatically." : record ? "No categorical result is generated from unavailable, malformed, or unsupported loaded criteria. " + record.footnote : "This organism domain currently has no mapped antimicrobial options."}</p>{record && <><p>{record.dosageNote}</p><a href={refFor(record.sourceId)?.url} target="_blank" rel="noreferrer">Open supporting source ↗</a></>}</div></section>}
    </div>
  </>;
}

