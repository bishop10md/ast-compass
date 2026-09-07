import { useEffect } from "react";
import type { EducationalTopic } from "../data/educationalTopics";
import ScientificIssueLink from "../components/ScientificIssueLink";
import { trackReferenceViewed } from "../lib/productAnalytics";

type Source = { id: string; short: string; title: string; owner: string; url: string; note: string };

export default function EducationalTopicPage({ topic, sources, relatedTopics, onNavigate }: {
  topic: EducationalTopic;
  sources: Source[];
  relatedTopics: EducationalTopic[];
  onNavigate: (path: string) => void;
}) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.astTopic = topic.slug;
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": ["Article", "LearningResource"],
      headline: topic.title,
      description: topic.description,
      url: `https://astcompass.com/learn/topics/${topic.slug}`,
      isAccessibleForFree: true,
      educationalUse: ["self study", "professional education"],
      publisher: { "@type": "Organization", name: "AST Compass", url: "https://astcompass.com/" },
      citation: sources.map((source) => source.url),
      about: topic.aliases,
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [sources, topic]);

  return <article className="topic-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <a href="/learn" onClick={(event) => { event.preventDefault(); onNavigate("/learn"); }}>Learn</a>
      <span aria-hidden="true">/</span>
      <a href="/learn/topics" onClick={(event) => { event.preventDefault(); onNavigate("/learn/topics"); }}>Topics</a>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{topic.shortTitle}</span>
    </nav>
    <header className="topic-hero">
      <p className="eyebrow">{topic.eyebrow}</p>
      <h1>{topic.title}</h1>
      <p>{topic.description}</p>
      <div className="content-status" aria-label="Scientific content status: Demo">
        <span className="review-badge demo">DEMO</span>
        <span>Educational content; not validated for clinical use.</span>
      </div>
    </header>
    <section className="topic-summary" aria-labelledby="topic-summary-title">
      <div><p className="eyebrow">In brief</p><h2 id="topic-summary-title">Connect the finding to its context</h2><p>{topic.summary}</p></div>
      <aside><b>Key point</b><p>{topic.keyPoint}</p></aside>
    </section>
    <div className="topic-sections">
      {topic.sections.map((section) => <section key={section.heading}>
        <h2>{section.heading}</h2>
        {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
      </section>)}
    </div>
    <aside className="topic-boundary">
      <p className="eyebrow">Educational boundary</p>
      <h2>A compass, not an autopilot.</h2>
      <p>This guide supports learning and structured laboratory review. It does not provide patient-specific treatment guidance and does not replace current standards, manufacturer instructions, validated procedures, or institutional policy.</p>
    </aside>
    <section className="topic-sources" aria-labelledby="topic-sources-title">
      <div><p className="eyebrow">Traceable learning</p><h2 id="topic-sources-title">Sources and further reading</h2></div>
      <div>{sources.map((source) => <article key={source.id}><div><span>{source.short}</span><h3>{source.title}</h3><p>{source.owner}</p><small>{source.note}</small></div><a href={source.url} target="_blank" rel="noreferrer" onClick={() => trackReferenceViewed(source.id)}>View source ↗</a></article>)}</div>
    </section>
    <section className="related-topics" aria-labelledby="related-topics-title">
      <p className="eyebrow">Continue learning</p><h2 id="related-topics-title">Related AST Compass guides</h2>
      <div>{relatedTopics.map((related) => <a key={related.slug} href={`/learn/topics/${related.slug}`} onClick={(event) => { event.preventDefault(); onNavigate(`/learn/topics/${related.slug}`); }}><b>{related.title}</b><span>{related.description}</span><em>Read guide →</em></a>)}</div>
    </section>
    <div className="mechanism-actions"><ScientificIssueLink contentId={`learning-topic-${topic.slug}`} onNavigate={onNavigate}/></div>
  </article>;
}
