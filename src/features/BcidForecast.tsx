import { useMemo, useState } from "react";
import { bcidForecasts, mechanisms, references, type ForecastPrediction } from "../data";

const order: ForecastPrediction[] = ["Resistance strongly expected", "Activity may be retained", "Cannot infer", "Mechanism-dependent caution"];
const tone: Record<ForecastPrediction, string> = { "Resistance strongly expected": "resistance", "Activity may be retained": "retained", "Cannot infer": "unknown", "Mechanism-dependent caution": "caution" };

export default function BcidForecast() {
  const organismGroups = [...new Set(bcidForecasts.map((r) => r.organismGroup))];
  const [organism, setOrganism] = useState(organismGroups[0]);
  const available = bcidForecasts.filter((r) => r.organismGroup === organism);
  const markers = [...new Set(available.map((r) => r.markerLabel))];
  const [marker, setMarker] = useState(markers[0]);
  const activeMarker = markers.includes(marker) ? marker : markers[0];
  const rows = useMemo(() => available.filter((r) => r.markerLabel === activeMarker), [organism, activeMarker]);
  const first = rows[0];
  const mechanism = first ? mechanisms.find((m) => m.id === first.mechanismId) : null;
  return <>
    <div className="page-head"><p className="eyebrow">Rapid blood-culture reasoning</p><h1>BCID Resistance Forecast</h1><p>Translate a resistance marker into organism-aware, pre-AST expectations without inventing categorical results or patient-specific therapy.</p></div>
    <div className="preast-banner"><b>PRE-AST EXPECTATION ONLY</b><span>Do not substitute for validated AST or patient-specific antimicrobial selection.</span></div>
    <div className="workspace-grid"><aside className="filter-panel"><label>Organism context<select value={organism} onChange={(e) => { setOrganism(e.target.value); const next = bcidForecasts.find((r) => r.organismGroup === e.target.value); if (next) setMarker(next.markerLabel); }}>{organismGroups.map((o) => <option key={o}>{o}</option>)}</select></label><label>BCID resistance marker<select value={activeMarker} onChange={(e) => setMarker(e.target.value)}>{markers.map((m) => <option key={m}>{m}</option>)}</select></label><div className="bench-tip"><b>Panel boundary</b><span>A detected marker may not belong to the organism causing disease. A negative marker never proves susceptibility because many mechanisms are outside the panel.</span></div><div className="forecast-chain"><span>Organism</span><i>↓</i><span>Marker</span><i>↓</i><span>Mechanism</span><i>↓</i><span>Forecast</span><i>↓</i><span>AST confirmation</span></div></aside><section className="panel forecast-panel">{first ? <><div className="result-title"><div><p className="eyebrow">{organism}</p><h2>{activeMarker}</h2><span>{mechanism?.name}</span></div></div><div className="forecast-groups">{order.map((category) => { const group = rows.filter((r) => r.prediction === category); return group.length ? <section className={`forecast-group ${tone[category]}`} key={category}><h3>{category}</h3>{group.map((row) => <article key={row.id}><div><b>{row.drugOrClass}</b><span>{row.confidence} confidence</span></div><p>{row.rationale}</p><small><strong>Important exception:</strong> {row.exceptions}</small></article>)}</section> : null; })}</div><div className="forecast-footer"><b>Why this forecast is bounded</b><p>It predicts mechanism-level expectations only. Infection source, severity, prior isolates, exposure, local epidemiology, dosing, patient factors, and the complete AST are deliberately outside this tool.</p><div>{first.sourceIds.map((id) => { const ref = references.find((r) => r.id === id); return ref ? <a key={id} href={ref.url} target="_blank" rel="noreferrer">{ref.short} ↗</a> : null; })}</div></div></> : <div className="empty"><h2>No forecast record</h2><p>This organism–marker combination has not been reviewed.</p></div>}</section></div>
  </>;
}

