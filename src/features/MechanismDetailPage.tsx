import { PRODUCTION_ORIGIN } from "../config/production";
import { useEffect } from "react";
import type { Gene, Mechanism } from "../data";
import type { MechanismLiteratureMeta } from "../data/mechanismLiterature";
import IllustrativePhenotypeCard from "../components/IllustrativePhenotypeCard";
import ScientificIssueLink from "../components/ScientificIssueLink";
import { trackMechanismViewed, trackReferenceViewed } from "../lib/productAnalytics";
import { APP_VERSION } from "../config/version";
import ClinicalContextBoundary from "../components/ClinicalContextBoundary";
import ContentStatus from "../components/ContentStatus";
import { contentReviewMeta } from "../data/contentReview";

type Source = { id: string; short: string; title: string; owner: string; url: string; note: string };

export default function MechanismDetailPage({ mechanism, meta, genes, sources, onNavigate }: {
  mechanism: Mechanism;
  meta: MechanismLiteratureMeta;
  genes: Gene[];
  sources: Source[];
  onNavigate: (path: string) => void;
}) {
  const slug = mechanism.id.replace(/_/g, "-");
  useEffect(() => { trackMechanismViewed(mechanism.id); }, [mechanism.id]);
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.astMechanism = mechanism.id;
    script.text = JSON.stringify({ "@context": "https://schema.org", "@type": ["Article", "LearningResource"], headline: mechanism.name, description: mechanism.summary, url: `${PRODUCTION_ORIGIN}/resistance/mechanisms/${slug}`, isAccessibleForFree: true, educationalUse: ["self study", "professional education"], publisher: { "@type": "Organization", name: "AST Compass", url: `${PRODUCTION_ORIGIN}/` }, citation: sources.map((source) => source.url) });
    document.head.appendChild(script);
    return () => script.remove();
  }, [mechanism, slug, sources]);

  return <article className="mechanism-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><a href="/resistance" onClick={(event) => { event.preventDefault(); onNavigate("/resistance"); }}>Mechanisms</a><span aria-hidden="true">/</span><span aria-current="page">{mechanism.name}</span></nav>
    <header className="topic-hero"><p className="eyebrow">{mechanism.family}</p><h1>{mechanism.name}</h1><p>{mechanism.summary}</p><ContentStatus meta={contentReviewMeta.resistanceLibrary}/></header>
    <dl className="governance-meta"><div><dt>Standard / guideline</dt><dd>Source specific; see linked literature</dd></div><div><dt>Edition / version</dt><dd>Shown with each applicable source</dd></div><div><dt>Source</dt><dd>{sources.length} linked {sources.length === 1 ? "reference" : "references"} below</dd></div><div><dt>Content status</dt><dd>Draft / educational</dd></div><div><dt>Last reviewed</dt><dd>Not recorded — Draft content</dd></div><div><dt>AST Compass content version</dt><dd>{APP_VERSION}</dd></div></dl>
    <section className="mechanism-overview">
      <div><p className="eyebrow">Laboratory context</p><h2>Interpret the mechanism with the phenotype</h2><p>{meta.laboratoryContext}</p></div>
      <aside><b>Affected classes</b><div>{mechanism.affectedClasses.map((item) => <span key={item}>{item}</span>)}</div></aside>
    </section>
    <section className="mechanism-markers"><p className="eyebrow">Associated content in AST Compass</p><h2>Markers linked to this mechanism</h2>{genes.length ? <div>{genes.map((gene) => <article key={gene.id}><h3>{gene.name}</h3><p>{gene.phenotype}</p><small>{gene.caveat}</small></article>)}</div> : <p className="mechanism-empty">No specific molecular-marker record is currently assigned in the AST Compass dataset. This does not mean that molecular determinants do not exist.</p>}</section>
    {meta.illustrativePhenotype && <IllustrativePhenotypeCard spec={meta.illustrativePhenotype}/>}
    <aside className="topic-boundary"><p className="eyebrow">Interpretation boundary</p><h2>Mechanism is not category.</h2><p>A mechanism can help explain or anticipate a phenotype, but it does not generate an MIC, assign a susceptibility category, or provide patient-specific treatment guidance. Confirm results using current standards, validated procedures, and laboratory policy.</p></aside>
    <ClinicalContextBoundary/>
    <section className="topic-sources" aria-labelledby="mechanism-sources-title"><div><p className="eyebrow">Selected literature</p><h2 id="mechanism-sources-title">Books, standards, and publications</h2><p>These sources support deeper study. Inclusion does not mean AST Compass content has completed independent expert review.</p></div><div>{sources.map((source) => <article key={source.id}><div><span>{source.short}</span><h3>{source.title}</h3><p>{source.owner}</p><small>{source.note}</small></div><a href={source.url} target="_blank" rel="noreferrer" onClick={() => trackReferenceViewed(source.id)}>View source ↗</a></article>)}</div></section>
    <div className="mechanism-actions">{meta.relatedGuideSlug && <a href={`/learn/topics/${meta.relatedGuideSlug}`} onClick={(event) => { event.preventDefault(); onNavigate(`/learn/topics/${meta.relatedGuideSlug}`); }}>Read the focused learning guide →</a>}<a href="/references" onClick={(event) => { event.preventDefault(); onNavigate("/references"); }}>Browse all references →</a><ScientificIssueLink contentId={`mechanism-${mechanism.id}`} onNavigate={onNavigate}/></div>
  </article>;
}
