import { useMemo, useState } from "react";
import { bcidForecasts, mechanisms, references, type ForecastPrediction } from "../data";

const order: ForecastPrediction[] = ["Resistance strongly expected", "Activity may be retained", "Cannot infer", "Mechanism-dependent caution"];
const tone: Record<ForecastPrediction, string> = { "Resistance strongly expected": "resistance", "Activity may be retained": "retained", "Cannot infer": "unknown", "Mechanism-dependent caution": "caution" };

export default function BcidForecast() {
  const contexts = [...new Set(bcidForecasts.map((r) => r.organism || r.organismGroup))];
  const [context, setContext] = useState(contexts[0]);
  const contextualRows = bcidForecasts.filter((r) => (r.organism || r.organismGroup) === context);
  const markers = [...new Set(contextualRows.map((r) => r.markerLabel))];
  const [marker, setMarker] = useState(markers[0]);
  const activeMarker = markers.includes(marker) ? marker : markers[0];
  const rows = useMemo(() => contextualRows.filter((r) => r.markerLabel === activeMarker), [context, activeMarker]);
  const first = rows[0];
  const mechanism = first ? mechanisms.find((m) => m.id === first.mechanismId) : null;
  const classes = [...new Set(rows.map((r) => r.antimicrobialClass))];
  const changeContext = (next: string) => {
    setContext(next);
    const nextRow = bcidForecasts.find((r) => (r.organism || r.organismGroup) === next);
    if (nextRow) setMarker(nextRow.markerLabel);
  };
  return <>
    <div className="page-head"><p className="eyebrow">Rapid blood-culture reasoning</p><h1>BCID Resistance Forecast</h1><p>Translate a resistance marker into species-aware, pre-AST expectations without inventing categorical results or patient-specific therapy.</p></div>
    <div className="preast-banner"><b>PRE-AST EXPECTATION ONLY</b><span>Do not substitute for validated AST or patient-specific antimicrobial selection.</span></div>
    <div className="workspace-grid"><aside className="filter-panel"><label>Organism context<select value={context} onChange={(e) => changeContext(e.target.value)}>{contexts.map((o) => <option key={o}>{o}</option>)}</select></label><label>BCID resistance marker<select value={activeMarker || ""} onChange={(e) => setMarker(e.target.value)}>{markers.map((m) => <option key={m}>{m}</option>)}</select></label><div className="bench-tip"><b>Panel boundary</b><span>A detected marker may not belong to the organism causing disease. A negative marker never proves susceptibility because resistance mechanisms outside the panel may be present.</span></div><div className="forecast-chain"><span>Organism</span><i>↓</i><span>Marker</span><i>↓</i><span>Mechanism</span><i>↓</i><span>Expected phenotype</span><i>↓</i><span>AST confirmation</span></div></aside>
      <section className="panel forecast-panel">{first ? <><div className="result-title"><div><p className="eyebrow">{context}</p><h2>{activeMarker}</h2><span>{mechanism?.name} · {first.guidanceVersion}</span></div><span className="demo-stamp">PRE-AST</span></div>
        <div className="forecast-classes">{classes.map((className) => <section className="forecast-class" key={className}><h3>{className}</h3><div className="forecast-groups">{order.map((category) => { const group = rows.filter((r) => r.antimicrobialClass === className && r.prediction === category); return group.length ? <section className={`forecast-group ${tone[category]}`} key={category}><h4>{category}</h4>{group.map((row) => <article key={row.id}><div><b>{row.drugOrClass}</b><span>{row.confidence} confidence</span></div><p>{row.rationale}</p><small><strong>Important exception:</strong> {row.exceptions}</small></article>)}</section> : null; })}</div></section>)}</div>
        <section className="forecast-limit"><h3>What this marker does NOT tell you</h3><ul>{first.doesNotTellYou.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section className="why-matters"><h3>Why this matters before AST</h3><p>{first.whyItMatters}</p><strong>Activity may be retained only where the mechanism does not directly affect the class; phenotypic AST confirmation remains required.</strong></section>
        <div className="forecast-footer"><b>Sources and freshness</b><p>Last reviewed: {first.meta.lastReviewed}. Forecasts are educational mechanism expectations, not treatment recommendations.</p><div>{first.sourceIds.map((id) => { const ref = references.find((r) => r.id === id); return ref ? <a key={id} href={ref.url} target="_blank" rel="noreferrer">{ref.short} ↗</a> : null; })}</div></div></> : <div className="empty"><h2>No forecast record</h2><p>This organism–marker combination has not been reviewed. No inference is generated.</p></div>}</section>
    </div>
  </>;
}
