import { useMemo, useState } from "react";
import { bcid2Panel, bcidForecasts, mechanisms, references, type BcidPanelTarget, type BcidResistanceMarker, type ForecastPrediction, type MarkerAssociation } from "../data";
import SearchableSelect from "../components/SearchableSelect";
import { sortAlphabetically } from "../utils/search";

const predictionOrder: ForecastPrediction[] = ["Resistance strongly expected", "Activity may be retained", "Mechanism-dependent caution", "Cannot infer"];
const predictionTone: Record<ForecastPrediction, string> = { "Resistance strongly expected": "resistance", "Activity may be retained": "retained", "Cannot infer": "unknown", "Mechanism-dependent caution": "caution" };
const categoryOrder = ["Gram-negative bacteria", "Gram-positive bacteria", "Yeast"] as const;
const markerOrder: BcidResistanceMarker["category"][] = ["ESBL", "Carbapenemase", "Colistin resistance", "Methicillin resistance", "Vancomycin resistance"];
const targetById = (id: string) => bcid2Panel.targets.find((target) => target.id === id);
const markerById = (id: string) => bcid2Panel.markers.find((marker) => marker.id === id);
const forecastMarkerLabel = (marker: BcidResistanceMarker) => marker.label;
const targetOptions = bcid2Panel.targets.map((target) => ({ value: target.id, label: target.name, aliases: target.aliases, group: target.category, description: target.parentId ? "Within " + targetById(target.parentId)?.name : target.targetType === "group" ? "Manufacturer group target" : target.targetType }));
const markerOptions = bcid2Panel.markers.map((marker) => ({ value: marker.id, label: marker.label, group: marker.category, description: marker.mechanismFamily || mechanisms.find((item) => item.id === marker.mechanismId)?.name }));

function associationFor(target: BcidPanelTarget, marker: BcidResistanceMarker): { association: MarkerAssociation; explanation: string; fallback: boolean } {
  const exact = bcid2Panel.associationRules.find((rule) => rule.organismId === target.id && rule.markerId === marker.id);
  if (exact) return { association: exact.association, explanation: exact.explanation, fallback: false };
  if (target.parentId) {
    const parent = bcid2Panel.associationRules.find((rule) => rule.organismId === target.parentId && rule.markerId === marker.id);
    if (parent) return { association: parent.association, explanation: "No species-specific association rule is available. The reviewed " + targetById(target.parentId)?.name + " rule is shown as a documented fallback. " + parent.explanation, fallback: true };
  }
  return { association: target.category === "Yeast" ? "Not applicable" : "Organism attribution uncertain", explanation: target.category === "Yeast" ? "BIOFIRE BCID2 includes no antifungal resistance marker targets." : "No reviewed organism–marker association rule is available for this combination. AST Compass will not assign the marker to this organism.", fallback: false };
}

function forecastsFor(target: BcidPanelTarget, marker: BcidResistanceMarker) {
  const label = forecastMarkerLabel(marker);
  const exact = bcidForecasts.filter((row) => row.organism === target.name && row.markerLabel === label);
  if (exact.length) return { rows: exact, source: "Species / exact target forecast" };
  if (target.targetType === "group") {
    const group = bcidForecasts.filter((row) => row.organismGroup === target.name && row.markerLabel === label);
    if (group.length) return { rows: group, source: "Group forecast" };
  }
  if (target.parentId) {
    const parent = targetById(target.parentId);
    const group = bcidForecasts.filter((row) => (row.organismGroup === parent?.name || row.organism === parent?.name) && row.markerLabel === label);
    if (group.length) return { rows: group, source: (parent?.name || "Parent group") + " documented fallback" };
  }
  return { rows: [], source: "No reviewed forecast available" };
}

export default function BcidForecast() {
  const [primaryId, setPrimaryId] = useState("e-coli");
  const [multiple, setMultiple] = useState(false);
  const [additionalIds, setAdditionalIds] = useState<string[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [markerMode, setMarkerMode] = useState<"none" | "detected">("none");
  const [markerId, setMarkerId] = useState("ctx-m");
  const primary = targetById(primaryId) || bcid2Panel.targets[0];
  const marker = markerById(markerId) || bcid2Panel.markers[0];
  const selectedTargets = [primary, ...additionalIds.map(targetById).filter((target): target is BcidPanelTarget => !!target && target.id !== primary.id)];
  const association = associationFor(primary, marker);
  const forecast = useMemo(() => forecastsFor(primary, marker), [primary, marker]);
  const mechanism = mechanisms.find((item) => item.id === marker.mechanismId);
  const classes = sortAlphabetically([...new Set(forecast.rows.map((row) => row.antimicrobialClass))], (item) => item);
  const polymicrobial = multiple && selectedTargets.length > 1;
  const addOrganism = () => { if (candidateId && candidateId !== primaryId && !additionalIds.includes(candidateId)) setAdditionalIds((current) => [...current, candidateId]); setCandidateId(""); };
  const changePrimary = (id: string) => { setPrimaryId(id); setAdditionalIds((current) => current.filter((item) => item !== id)); };
  return <>
    <div className="bcid-page-head"><div><p className="eyebrow">Rapid blood-culture result review</p><h1>BIOFIRE BCID2 Resistance Forecast</h1><p>Translate organisms and antimicrobial-resistance markers detected on the BIOFIRE BCID2 Panel into structured pre-AST expectations.</p></div><div className="bcid-metadata"><b>BIOFIRE BCID2</b><strong>43 targets</strong><span>26 bacteria · 7 yeast · 10 AMR targets</span><small>Panel menu verified September 1, 2026</small></div></div>
    <div className="preast-banner"><b>PRE-AST EXPECTATION ONLY</b><span>AST Compass does not replace validated AST, laboratory policy, current authoritative standards, or patient-specific antimicrobial decision-making.</span></div>
    <div className="bcid-workflow">
      <aside className="panel bcid-input">
        <section><span className="step-number">STEP 1</span><h2>Organism detected</h2><p>What organism was detected?</p><SearchableSelect label="Detected organism" value={primary.id} onChange={changePrimary} options={targetOptions} placeholder="Search the complete BCID2 menu…"/>
          <label className="multiple-toggle"><input type="checkbox" checked={multiple} onChange={(event) => { setMultiple(event.target.checked); if (!event.target.checked) setAdditionalIds([]); }}/> More than one organism detected</label>
          {multiple && <div className="additional-organisms"><SearchableSelect label="Add another detected organism" value={candidateId} onChange={setCandidateId} options={targetOptions.filter((option) => option.value !== primary.id && !additionalIds.includes(option.value))} placeholder="Search another BCID2 target…"/><button className="secondary" type="button" disabled={!candidateId} onClick={addOrganism}>Add organism</button></div>}
          {selectedTargets.length > 1 && <div className="detected-chips">{selectedTargets.map((target, index) => <span key={target.id}>{target.name}{index > 0 && <button aria-label={"Remove " + target.name} onClick={() => setAdditionalIds((current) => current.filter((id) => id !== target.id))}>×</button>}</span>)}</div>}
        </section>
        <section><span className="step-number">STEP 2</span><h2>AMR marker</h2><p>Was a resistance marker detected?</p><div className="marker-mode"><label><input type="radio" name="marker-mode" checked={markerMode === "none"} onChange={() => setMarkerMode("none")}/> No resistance marker detected</label><label><input type="radio" name="marker-mode" checked={markerMode === "detected"} onChange={() => setMarkerMode("detected")}/> Yes — select marker</label></div>{markerMode === "detected" && <SearchableSelect label="Detected resistance marker" value={marker.id} onChange={setMarkerId} options={markerOptions} placeholder="Search all 10 BCID2 AMR targets…"/>}</section>
        <div className="forecast-chain"><span>BCID2 organism</span><i>+</i><span>BCID2 AMR marker</span><i>↓</i><span>Possible association</span><i>↓</i><span>Resistance mechanism</span><i>↓</i><span>Anticipated phenotype</span><i>↓</i><span>Phenotypic AST confirmation</span></div>
      </aside>
      <section className="panel forecast-panel">
        <div className="bcid-result-card"><span>BIOFIRE BCID2 RESULT</span><dl><div><dt>Organism detected</dt><dd>{selectedTargets.map((target) => target.name).join("; ")}</dd></div><div><dt>Resistance marker</dt><dd>{markerMode === "none" ? "No BCID2 marker detected" : marker.label}</dd></div><div><dt>Marker class</dt><dd>{markerMode === "none" ? "Not applicable" : marker.category}</dd></div><div><dt>Interpretation stage</dt><dd>Pre-AST molecular result</dd></div></dl></div>
        {markerMode === "none" ? <NoMarkerMessage/> : primary.category === "Yeast" ? <YeastMessage/> : <>
          {polymicrobial && <div className="attribution-warning"><b>GENE-TO-ORGANISM ATTRIBUTION CAUTION</b><p>More than one organism was detected. The resistance marker may not necessarily be attributable to a specific organism in this blood culture result.</p><span>Interpret the marker with organism identity, Gram stain, culture isolation, phenotypic AST, and laboratory policy. Forecast confidence is reduced.</span></div>}
          <div className={"association-card " + association.association.toLowerCase().replace(/\s+/g, "-")}><span>ORGANISM–MARKER ASSOCIATION</span><h2>{polymicrobial ? "Organism attribution uncertain" : association.association}</h2><p>{association.explanation}</p>{association.fallback && <small>Hierarchy used: exact target unavailable → parent-group rule.</small>}</div>
          <div className="result-title"><div><p className="eyebrow">ANTICIPATED PHENOTYPE</p><h2>{marker.label}</h2><span>Mechanism: {mechanism?.name || marker.category}</span></div><span className="demo-stamp">PRE-AST</span></div>
          {forecast.rows.length ? <><div className="forecast-source"><b>{forecast.source}</b><span>Prediction language remains pre-AST and does not establish susceptibility.</span></div><div className="forecast-classes">{classes.map((className) => <section className="forecast-class" key={className}><h3>{className}</h3><div className="forecast-groups">{predictionOrder.map((category) => { const group = forecast.rows.filter((row) => row.antimicrobialClass === className && row.prediction === category); return group.length ? <section className={"forecast-group " + predictionTone[category]} key={category}><h4>{category}</h4>{group.map((row) => <article key={row.id}><div><b>{row.drugOrClass}</b><span>{polymicrobial ? "Reduced" : row.confidence} confidence</span></div><p>{row.rationale}</p><small><strong>Important exception:</strong> {row.exceptions}</small></article>)}</section> : null; })}</div></section>)}</div><section className="forecast-limit"><h3>What this marker does NOT tell you</h3><ul>{forecast.rows[0].doesNotTellYou.map((item) => <li key={item}>{item}</li>)}</ul></section></> : <NoForecast/>}
        </>}
      </section>
    </div>
    <PanelBrowser/>
    <div className="bcid-manufacturer-note"><b>Independent educational resource</b><p>Panel target information is based on publicly available BIOFIRE BCID2 manufacturer documentation. AST Compass is not affiliated with or endorsed by bioMérieux.</p><div>{bcid2Panel.metadata.sourceIds.map((id) => { const reference = references.find((item) => item.id === id); return reference ? <a href={reference.url} target="_blank" rel="noreferrer" key={id}>{reference.short} ↗</a> : null; })}</div></div>
  </>;
}

function NoMarkerMessage() { return <div className="no-marker-message"><span>NO BCID2 RESISTANCE MARKER DETECTED</span><h2>Absence of a panel marker does not establish susceptibility.</h2><p>Resistance may result from mechanisms not targeted by BCID2, including other acquired genes, chromosomal mechanisms, porin changes, efflux, target mutations, AmpC expression, and other mechanisms.</p><b>Phenotypic AST remains required.</b></div>; }
function YeastMessage() { return <div className="yeast-message"><span>YEAST TARGET — IDENTIFICATION ONLY</span><h2>No antifungal resistance marker is included on the BIOFIRE BCID2 Panel for this target.</h2><p>Organism identification may provide important early microbiologic information, but antifungal susceptibility cannot be inferred from BCID2 resistance-marker results.</p><b>Phenotypic antifungal susceptibility testing and applicable current standards remain required when indicated.</b></div>; }
function NoForecast() { return <div className="no-reviewed-forecast"><span>NO REVIEWED FORECAST</span><h2>No reviewed organism–marker forecast is currently available.</h2><p>AST Compass will not infer a phenotype for an unreviewed combination. The complete panel menu remains available independently from the intentionally limited forecast knowledge base.</p></div>; }

function PanelBrowser() {
  return <details className="panel-browser"><summary>View BIOFIRE BCID2 Panel Menu <span>43 targets</span></summary><div className="panel-browser-grid">{categoryOrder.map((category) => <section key={category}><h2>{category}</h2><ul>{sortAlphabetically(bcid2Panel.targets.filter((target) => target.category === category && !target.parentId), (target) => target.name).map((target) => <li key={target.id}><b>{target.name}</b>{bcid2Panel.targets.some((child) => child.parentId === target.id) && <ul>{sortAlphabetically(bcid2Panel.targets.filter((child) => child.parentId === target.id), (child) => child.name).map((child) => <li key={child.id}>{child.name}</li>)}</ul>}</li>)}</ul></section>)}<section><h2>AMR markers</h2>{markerOrder.map((category) => <div key={category}><h3>{category}</h3><ul>{sortAlphabetically(bcid2Panel.markers.filter((marker) => marker.category === category), (marker) => marker.label).map((marker) => <li key={marker.id}>{marker.label}{marker.mechanismFamily && <small>{marker.mechanismFamily}</small>}</li>)}</ul></div>)}</section></div></details>;
}

