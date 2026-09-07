import { useEffect, useState } from "react";
import SearchableSelect from "../components/SearchableSelect";
import { canonicalAntimicrobials } from "../data/antibiotics";
import { antimicrobialCoverage } from "../data/antimicrobialCoverage";
import { antimicrobialIdOptions } from "../data/coverageOptions";
import { getOrganismStandardMessage, organismCoverage, organismCoverageSources } from "../data/organismCoverage";
import { astDetectiveQuestions } from "../data/astDetectiveQuestions";
import { references } from "../data/references";
import { phenotypeSignatures } from "./phenotypeMechanismEngine";
import "../coverage.css";

const organismOptions = organismCoverage.map(o => ({ value: o.id, label: o.name, aliases: o.aliases, description: o.coverageStatus }));

export default function CoverageDirectory() {
  const params = new URLSearchParams(location.search);
  const [organismId, setOrganismId] = useState(params.get("organism") || "");
  const [drugId, setDrugId] = useState(params.get("drug") || "");
  const [sourceKey, setSourceKey] = useState("");
  useEffect(() => {
    const restoreSelection = () => {
      const restored = new URLSearchParams(location.search);
      setOrganismId(restored.get("organism") || "");
      setDrugId(restored.get("drug") || "");
      setSourceKey("");
    };
    addEventListener("popstate", restoreSelection);
    return () => removeEventListener("popstate", restoreSelection);
  }, []);
  const organism = organismCoverage.find(o => o.id === organismId);
  const drug = canonicalAntimicrobials.find(a => a.id === drugId);
  const coverage = antimicrobialCoverage.find(a => a.antimicrobialId === drugId);
  const relatedCases = astDetectiveQuestions.filter(q => (drug ? q.antimicrobialIds?.includes(drug.id) : false) || (organism?.existingOrganismId ? q.organismIds?.includes(organism.existingOrganismId) : false));
  const signatures = drug ? phenotypeSignatures.filter(s => [...s.expectedPatterns, ...(s.contradictoryPatterns || [])].some(p => p.antimicrobialIds?.includes(drug.id))) : [];

  return <div className="coverage-directory">
    <p><a href="/references">References</a> / Coverage</p>
    <div className="page-head"><p className="eyebrow">Recognition, scope, and limitations</p><h1>Organism &amp; antimicrobial coverage</h1><p>Find a canonical name, inspect its source context, and see what AST Compass does—and does not—currently implement.</p></div>
    <p>Educational content; not validated for clinical use.</p>
    <aside className="coverage-boundary" role="note"><b>A catalog entry is not an interpretation rule.</b><p>No authoritative breakpoint dataset was added in this expansion. Existing breakpoint teaching values remain simulated. New reference-only organisms are not added to scientific selectors or assigned another organism’s rules.</p></aside>
    <section className="panel coverage-selectors" aria-label="Coverage lookup">
      <SearchableSelect label="Organism" options={organismOptions} value={organismId} onChange={value => { setOrganismId(value); setSourceKey(""); }} placeholder="Search canonical name or alias…"/>
      <SearchableSelect label="Antimicrobial" options={antimicrobialIdOptions} value={drugId} onChange={setDrugId} placeholder="Search name or abbreviation…"/>
    </section>
    {!organism && !drug && <p>Select an organism or antimicrobial to inspect its coverage. Abbreviations can be ambiguous: CFZ finds both cefazolin and clofazimine; select the full name.</p>}
    <div className="coverage-details">
      {organism && <section className="panel" aria-label="Organism coverage">
        <p className="eyebrow">{organism.coverageStatus}</p><h2>{organism.name}</h2><p>{organism.group}</p>
        <p><b>Metadata review status:</b> {organism.reviewStatus}</p><p><b>Breakpoint dataset:</b> {organism.breakpointAvailability}</p>
        <p>{organism.note}</p>
        {organism.aliases.length > 0 && <p><b>Search aliases:</b> {organism.aliases.join(" · ")}</p>}
        <h3>Why this organism is represented</h3><ul>{organism.relevance.map(reason => <li key={reason}>{reason}</li>)}</ul>
        <h3>Source-specific scope</h3><p>Public source scope is not proof that numerical criteria have been licensed, transcribed, reviewed, or implemented here.</p>
        <label>Check a standard<select value={sourceKey} onChange={event => setSourceKey(event.target.value)}><option value="">Select a source…</option>{Object.entries(organismCoverageSources).filter(([, source]) => source.organization === "CLSI" || source.organization === "EUCAST").map(([key, source]) => <option key={key} value={key}>{source.organization} {source.document} · {source.editionOrVersion}</option>)}</select></label>
        {sourceKey && <p role="status" className="coverage-boundary">{getOrganismStandardMessage(organism.id, sourceKey)}</p>}
        <ul className="coverage-source-list">{organism.standardSupport.map((support, index) => { const source = organismCoverageSources[support.sourceKey]; return <li key={`${support.sourceKey}-${index}`}><b>{source ? `${source.organization} ${source.document} · ${source.editionOrVersion}` : support.sourceKey}</b><small>{support.applicability.replace(/-/g, " ")}</small><p>{support.note}</p>{source && <a href={source.scopeUrl || source.url} target="_blank" rel="noreferrer">View source scope ↗</a>}</li>; })}</ul>
        {organism.bcidTargetId && <p>Represented in the existing BCID reference scope. <a href="/bcid-forecast">Open BCID workflow →</a> Marker compatibility and attribution still require review.</p>}
      </section>}
      {drug && coverage && <section className="panel" aria-label="Antimicrobial coverage">
        <p className="eyebrow">Recognized antimicrobial</p><h2>{drug.displayName}</h2><p>{drug.abbreviation} · {drug.drugClass}</p>
        <p><b>Metadata review status:</b> {drug.reviewStatus}</p><p><b>Breakpoint dataset:</b> {coverage.breakpointAvailability}</p>
        <p><b>Search aliases:</b> {drug.aliases.join(" · ")}</p>
        <ul>{drug.notes.map(note => <li key={note}>{note}</li>)}</ul>
        <h3>Existing educational material</h3>
        <p>{coverage.teachingBreakpointRecordIds.length} illustrative breakpoint/status records · {coverage.intrinsicPatternIds.length} expected-pattern records. These are not counts of reviewed clinical criteria.</p>
        {coverage.educationalOrganismContexts.length > 0 && <p><b>Linked record contexts:</b> {coverage.educationalOrganismContexts.map(id => organismCoverage.find(o => o.existingOrganismId === id)?.name || id).join("; ")}</p>}
        {signatures.length > 0 && <><p>Explicitly named in these existing draft phenotype signatures:</p><ul>{signatures.map(signature => <li key={signature.id}><a href={`/resistance/mechanisms/${signature.mechanismId.replace(/_/g, "-")}`}>{signature.id.replace(/-/g, " ")}</a> · Draft{signature.availability === "paused-pending-review" && <span> · Inference paused pending scientific review; educational literature remains available.</span>}</li>)}</ul></>}
        <p>These links do not establish eligibility for every organism, marker, method, or standard. Unsupported contexts must remain uninterpreted.</p>
        <h3>Source documentation</h3><ul>{coverage.sourceIds.map(id => { const source = references.find(r => r.id === id); return source ? <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.short} — {source.title} ↗</a></li> : null; })}</ul>
      </section>}
    </div>
    {relatedCases.length > 0 && <section className="panel"><h2>Related AST Detective material</h2><p>{relatedCases.length} existing questions explicitly reference the selected organism or antimicrobial. The question bank and its scientific review status are unchanged.</p><details><summary>View question titles</summary><ul>{relatedCases.map(q => <li key={q.id}>{q.title}</li>)}</ul></details><p><a href="/learn/detective">Open AST Detective →</a></p></section>}
    <section className="panel"><h2>Coverage boundaries</h2><p>CLSI M100 and M45 are distinct documents. Fastidious-domain membership alone does not identify the controlling standard. M45 numerical content remains pending authorized source access and scientific review.</p><p>BCID retains its existing bacterial and AMR-marker scope. Learning and mechanism links point only to existing material; no new resistance rules or clinical-use claims were added.</p><p><a href="/trust">Scientific review and governance →</a></p></section>
  </div>;
}
