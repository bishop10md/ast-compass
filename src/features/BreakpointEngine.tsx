import { useMemo, useState } from "react";
import { antibiotics, breakpoints, organisms, references, standardCatalog, type Standard, type SusceptibilityDomain } from "../data";

const domains: SusceptibilityDomain[] = ["Bacteria", "Yeast", "Filamentous fungi", "Anaerobes", "Fastidious bacteria", "Rapid AST", "Mycobacteria"];
const refFor = (id: string) => references.find((r) => r.id === id);

export default function BreakpointEngine() {
  const [domain, setDomain] = useState<SusceptibilityDomain>("Bacteria");
  const [standard, setStandard] = useState<Standard>("EUCAST");
  const domainOrganisms = useMemo(() => organisms.filter((o) => o.domains?.includes(domain)), [domain]);
  const domainDrugs = useMemo(() => antibiotics.filter((a) => a.domains?.includes(domain) || (domain === "Rapid AST" && a.domains?.includes("Bacteria"))), [domain]);
  const [organismId, setOrganismId] = useState("ecoli");
  const [drugId, setDrugId] = useState("ciprofloxacin");
  const organism = domainOrganisms.find((o) => o.id === organismId) || domainOrganisms[0];
  const drug = domainDrugs.find((a) => a.id === drugId) || domainDrugs[0];
  const catalog = standardCatalog.filter((s) => s.domain === domain || (domain === "Anaerobes" && s.id === "eucast-161"));
  const record = breakpoints.find((b) => domain === "Bacteria" && b.standard === standard && b.organismId === organism?.id && b.antibioticId === drug?.id);
  const changeDomain = (next: SusceptibilityDomain) => {
    const firstOrganism = organisms.find((o) => o.domains?.includes(next));
    const firstDrug = antibiotics.find((a) => a.domains?.includes(next) || (next === "Rapid AST" && a.domains?.includes("Bacteria")));
    setDomain(next); if (firstOrganism) setOrganismId(firstOrganism.id); if (firstDrug) setDrugId(firstDrug.id);
  };
  return <>
    <div className="page-head"><p className="eyebrow">Public susceptibility reference directory</p><h1>Breakpoint Engine</h1><p>Navigate {organisms.length} organisms or groups and {antibiotics.length} antimicrobial agents across bacterial, fungal, anaerobic, fastidious, Rapid AST, and mycobacterial domains.</p></div>
    <div className="directory-stats"><div><b>{domainOrganisms.length}</b><span>organisms / groups in this domain</span></div><div><b>{domainDrugs.length}</b><span>antimicrobials in this domain</span></div><div><b>{catalog.length}</b><span>linked control-organization sources</span></div></div>
    <div className="domain-tabs" role="tablist">{domains.map((d) => <button role="tab" aria-selected={domain === d} className={domain === d ? "selected" : ""} onClick={() => changeDomain(d)} key={d}>{d}</button>)}</div>
    <section className="catalog-strip">{catalog.length ? catalog.map((entry) => <article key={entry.id}><div><span>{entry.authority}</span><b>{entry.document}</b><small>{entry.edition}</small></div><p>{entry.purpose}</p><a href={refFor(entry.sourceId)?.url} target="_blank" rel="noreferrer">Official source ↗</a><em>{entry.implementationStatus}</em></article>) : <article className="no-source"><b>Domain scaffolded</b><p>An authoritative dataset has not yet been licensed and reviewed for publication.</p></article>}</section>
    {domain === "Rapid AST" && <div className="rapid-warning"><b>Rapid AST uses separate criteria.</b><span>EUCAST states that standard breakpoint tables must not be used for direct-from-positive-blood-culture RAST. Use the linked dedicated RAST source.</span></div>}
    <div className="standard-hero"><div><span>Selected reference context</span><b>{domain} · {standard}</b><small>{standard === "EUCAST" ? "EUCAST I = susceptible, increased exposure." : standard === "CLSI" ? "CLSI values require authorized source access and local implementation verification." : "FDA STIC is a live regulatory source; verify the current record."}</small></div><div className="standard-buttons">{(["CLSI", "EUCAST", "FDA"] as Standard[]).map((s) => <button className={standard === s ? "selected" : ""} onClick={() => setStandard(s)} key={s}>{s}</button>)}</div></div>
    <div className="workspace-grid"><aside className="filter-panel"><label>Organism or reporting group<select value={organism?.id || ""} onChange={(e) => setOrganismId(e.target.value)}>{domainOrganisms.map((o) => <option value={o.id} key={o.id}>{o.name}</option>)}</select></label><label>Antimicrobial<select value={drug?.id || ""} onChange={(e) => setDrugId(e.target.value)}>{domainDrugs.map((a) => <option value={a.id} key={a.id}>{a.name} · {a.className}</option>)}</select></label><div className="selection-summary"><span>{organism?.group}</span><b>{organism?.name}</b><span>{drug?.className}</span><b>{drug?.name}</b></div><div className="warning-box"><b>LOCAL VALIDATION REQUIRED</b><p>The directory supports navigation and learning. A linked source is not equivalent to a validated laboratory implementation.</p></div></aside>
      {record ? <section className="panel result-panel"><div className="result-title"><div><p className="eyebrow">Illustrative interface record</p><h2>{organism?.name} · {drug?.name}</h2><span>{record.method} · {record.unit}</span></div><span className="demo-stamp">DEMO VALUES</span></div><div className="breakpoint-scale"><div className="sus"><span>S</span><b>{record.susceptible}</b><small>Susceptible</small></div><div className="int"><span>I / SDD</span><b>{record.intermediate}</b><small>{record.standard === "EUCAST" ? "Increased exposure" : "Intermediate / SDD"}</small></div><div className="res"><span>R</span><b>{record.resistant}</b><small>Resistant</small></div></div><div className="note"><b>Not validated</b><p>{record.footnote} These values remain interface fixtures and must not be used for patient-care decisions.</p></div></section>
      : <section className="no-breakpoint"><span>∅</span><div><p className="eyebrow">Source-aware availability state</p><h2>No reviewed breakpoint value published in AST Compass</h2><p><i>{organism?.name}</i> and {drug?.name} are available for navigation, but AST Compass has not ingested and independently reviewed an authorized {standard} breakpoint for this pair. This state must never be interpreted as susceptible, resistant, or “not tested.”</p><div className="source-actions">{catalog.filter((c) => c.authority === standard).map((c) => <a key={c.id} href={refFor(c.sourceId)?.url} target="_blank" rel="noreferrer">Check {c.authority} {c.document} ↗</a>)}<a href={refFor("ref-eucast-nobp")?.url} target="_blank" rel="noreferrer">No-breakpoint guidance ↗</a></div></div></section>}
    </div>
    <section className="directory-note"><div><p className="eyebrow">Coverage model</p><h2>Broad navigation now. Controlled values next.</h2></div><p>The organism and antimicrobial directories are intentionally broader than the published value set. EUCAST/FDA records can be imported after reuse review and independent checking. CLSI values remain source-linked until licensed content and a qualified reviewer are available.</p></section>
  </>;
}

