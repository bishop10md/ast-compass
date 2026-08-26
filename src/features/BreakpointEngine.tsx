import { useMemo, useState } from "react";
import { antibiotics, breakpoints, organisms, references, standardCatalog, type Breakpoint, type Standard, type SusceptibilityDomain } from "../data";

const domains: SusceptibilityDomain[] = ["Bacteria", "Yeast", "Filamentous fungi", "Anaerobes", "Fastidious bacteria", "Rapid AST", "Mycobacteria"];
const refFor = (id: string) => references.find((r) => r.id === id);

const patternFor = (group = "", organism = "") => {
  if (group.includes("Enterobacterales")) return `${organism} may acquire ESBLs, AmpC enzymes, carbapenemases, target mutations, efflux, and aminoglycoside-modifying enzymes. A ceftriaxone-resistant pattern can be compatible with ESBL or AmpC activity, but the complete antibiogram and confirmatory context matter.`;
  if (organism.includes("Pseudomonas")) return "P. aeruginosa commonly combines low permeability, efflux, inducible AmpC, target mutations, and acquired β-lactamases. Single-drug resistance rarely identifies one mechanism by itself.";
  if (organism.includes("Acinetobacter")) return "Acinetobacter resistance can reflect OXA carbapenemases, permeability changes, efflux, aminoglycoside enzymes, and target mutations. Multidrug patterns require organism-specific review.";
  if (group.includes("Staphylococcus")) return "Staphylococcal patterns commonly involve mec-mediated altered PBPs, β-lactamase production, MLSB resistance, aminoglycoside enzymes, and fluoroquinolone target changes.";
  if (group.includes("Enterococcus")) return "Enterococci have important intrinsic patterns and may acquire van genes, high-level aminoglycoside resistance, and linezolid or daptomycin resistance mechanisms.";
  if (group.includes("Streptococcus")) return "Streptococcal resistance patterns may involve altered PBPs, macrolide efflux or methylation, tetracycline resistance, and fluoroquinolone target changes.";
  if (group.includes("Anaerobic")) return "Anaerobic susceptibility is strongly species- and method-dependent. β-lactamases, target changes, nim genes, and MLS resistance may contribute, but validated anaerobic methods are essential.";
  if (group.includes("Candida") || group.includes("yeast")) return "Yeast resistance may involve azole target or efflux changes and echinocandin FKS alterations. Species identity and the validated antifungal method are essential.";
  return `Resistance in ${organism || "this organism"} can reflect intrinsic biology, acquired genes, expression, permeability, efflux, target modification, or technical factors. A single MIC category does not establish the mechanism.`;
};

function numericBoundary(value: string, side: "low" | "high") {
  const numbers = value.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  return side === "low" ? numbers[0] : numbers[numbers.length - 1];
}

function interpretMic(record: Breakpoint | undefined, mic: string) {
  const value = Number(mic);
  if (!record || mic.trim() === "" || Number.isNaN(value) || value < 0) return null;
  const susceptibleMax = numericBoundary(record.susceptible, "high");
  const resistantMin = numericBoundary(record.resistant, "low");
  if (susceptibleMax !== undefined && value <= susceptibleMax) return { category: "Susceptible", tone: "sus", explanation: `The entered MIC (${value} ${record.unit}) is at or below the demo susceptible threshold (${record.susceptible}).` };
  if (resistantMin !== undefined && value >= resistantMin) return { category: "Resistant", tone: "res", explanation: `The entered MIC (${value} ${record.unit}) is at or above the demo resistant threshold (${record.resistant}).` };
  return { category: record.standard === "EUCAST" ? "Susceptible, increased exposure (I)" : "Intermediate / SDD", tone: "int", explanation: `The entered MIC (${value} ${record.unit}) falls between the demo susceptible and resistant thresholds.` };
}

export default function BreakpointEngine() {
  const [domain, setDomain] = useState<SusceptibilityDomain>("Bacteria");
  const [standard, setStandard] = useState<Standard>("CLSI");
  const [organismId, setOrganismId] = useState("ecoli");
  const [drugId, setDrugId] = useState("ceftriaxone");
  const [mic, setMic] = useState("5");
  const domainOrganisms = useMemo(() => organisms.filter((o) => o.domains?.includes(domain)), [domain]);
  const domainDrugs = useMemo(() => antibiotics.filter((a) => a.domains?.includes(domain) || (domain === "Rapid AST" && a.domains?.includes("Bacteria"))), [domain]);
  const organism = domainOrganisms.find((o) => o.id === organismId) || domainOrganisms[0];
  const drug = domainDrugs.find((a) => a.id === drugId) || domainDrugs[0];
  const catalog = standardCatalog.filter((s) => s.domain === domain || (domain === "Anaerobes" && s.id === "eucast-161"));
  const record = breakpoints.find((b) => domain === "Bacteria" && b.standard === standard && b.organismId === organism?.id && b.antibioticId === drug?.id);
  const interpretation = interpretMic(record, mic);
  const changeDomain = (next: SusceptibilityDomain) => {
    const firstOrganism = organisms.find((o) => o.domains?.includes(next));
    const firstDrug = antibiotics.find((a) => a.domains?.includes(next) || (next === "Rapid AST" && a.domains?.includes("Bacteria")));
    setDomain(next); if (firstOrganism) setOrganismId(firstOrganism.id); if (firstDrug) setDrugId(firstDrug.id); setMic("");
  };
  return <>
    <div className="page-head"><p className="eyebrow">Interactive educational interpretation</p><h1>Breakpoint Engine</h1><p>Select an organism and antimicrobial, enter an MIC, and see how category logic works when a demo teaching record is available.</p></div>
    <div className="directory-stats"><div><b>{organisms.length}</b><span>organisms / groups</span></div><div><b>{antibiotics.length}</b><span>antimicrobials</span></div><div><b>Demo</b><span>never for clinical reporting</span></div></div>
    <div className="domain-tabs" role="tablist">{domains.map((d) => <button role="tab" aria-selected={domain === d} className={domain === d ? "selected" : ""} onClick={() => changeDomain(d)} key={d}>{d}</button>)}</div>
    <section className="catalog-strip">{catalog.map((entry) => <article key={entry.id}><div><span>{entry.authority}</span><b>{entry.document}</b><small>{entry.edition}</small></div><p>{entry.purpose}</p><a href={refFor(entry.sourceId)?.url} target="_blank" rel="noreferrer">Official source ↗</a><em>{entry.implementationStatus}</em></article>)}</section>
    {domain === "Rapid AST" && <div className="rapid-warning"><b>Rapid AST uses separate criteria.</b><span>Standard breakpoint tables must not be substituted for direct-from-positive-blood-culture RAST criteria.</span></div>}
    <div className="standard-hero"><div><span>Selected demo context</span><b>{domain} · {standard}</b><small>{standard === "EUCAST" ? "EUCAST I = susceptible, increased exposure." : standard === "CLSI" ? "CLSI values shown here are teaching fixtures, not licensed clinical data." : "FDA STIC must be checked at the live regulatory source."}</small></div><div className="standard-buttons">{(["CLSI", "EUCAST", "FDA"] as Standard[]).map((s) => <button className={standard === s ? "selected" : ""} onClick={() => setStandard(s)} key={s}>{s}</button>)}</div></div>
    <div className="workspace-grid"><aside className="filter-panel"><label>Organism<select value={organism?.id || ""} onChange={(e) => setOrganismId(e.target.value)}>{domainOrganisms.map((o) => <option value={o.id} key={o.id}>{o.name}</option>)}</select></label><label>Antimicrobial<select value={drug?.id || ""} onChange={(e) => setDrugId(e.target.value)}>{domainDrugs.map((a) => <option value={a.id} key={a.id}>{a.name} · {a.className}</option>)}</select></label><label>MIC ({record?.unit || "units per selected method"})<input className="field mic-input" type="number" min="0" step="any" value={mic} onChange={(e) => setMic(e.target.value)} placeholder="Enter MIC, e.g. 5"/></label><div className="warning-box"><b>EDUCATIONAL CALCULATOR</b><p>Only demo records generate a category. Always use your laboratory’s current authorized standard for real isolates.</p></div></aside>
      {record ? <section className="panel result-panel"><div className="result-title"><div><p className="eyebrow">{organism?.name} · {drug?.name}</p><h2>MIC interpretation demo</h2><span>{record.method} · {record.unit}</span></div><span className="demo-stamp">DEMO</span></div><div className="breakpoint-scale"><div className="sus"><span>S</span><b>{record.susceptible}</b><small>Susceptible</small></div><div className="int"><span>I / SDD</span><b>{record.intermediate}</b><small>{record.standard === "EUCAST" ? "Increased exposure" : "Intermediate / SDD"}</small></div><div className="res"><span>R</span><b>{record.resistant}</b><small>Resistant</small></div></div>{interpretation ? <div className={`mic-answer ${interpretation.tone}`}><span>Generated teaching answer</span><h3>{interpretation.category}</h3><p>{interpretation.explanation}</p></div> : <div className="mic-empty">Enter a valid MIC to generate a teaching answer.</div>}<div className="pattern-explainer"><b>How to think about this resistance pattern</b><p>{patternFor(organism?.group, organism?.name)}</p><small>A categorical result describes the tested phenotype. It does not, by itself, prove a specific resistance mechanism.</small></div><div className="note"><b>Source status</b><p>{record.footnote} This record is deliberately marked unvalidated.</p></div></section>
      : <section className="no-breakpoint"><span>∅</span><div><p className="eyebrow">No teaching threshold loaded</p><h2>No demo interpretation is generated</h2><p><i>{organism?.name}</i> and {drug?.name} remain navigable, but AST Compass does not have an authorized or demo threshold for this exact pair and standard. The app will not guess a category.</p><div className="pattern-explainer"><b>Organism-specific reasoning</b><p>{patternFor(organism?.group, organism?.name)}</p></div><div className="source-actions">{catalog.filter((c) => c.authority === standard).map((c) => <a key={c.id} href={refFor(c.sourceId)?.url} target="_blank" rel="noreferrer">Check {c.authority} {c.document} ↗</a>)}</div></div></section>}
    </div>
  </>;
}

