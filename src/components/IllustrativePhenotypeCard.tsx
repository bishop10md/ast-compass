import { references } from "../data/references";
import { trackReferenceViewed } from "../lib/productAnalytics";

export type IllustrativePhenotypeItem = { label: string; interpretation: string; indicator: "often" | "conditional" | "cannot-infer" };

export type IllustrativePhenotypeSpec = {
  title: string;
  sourceIds: string[];
  items: IllustrativePhenotypeItem[];
};

const indicatorText: Record<IllustrativePhenotypeItem["indicator"], string> = { often: "Often", conditional: "Context dependent", "cannot-infer": "Cannot infer" };

export default function IllustrativePhenotypeCard({ spec }: { spec: IllustrativePhenotypeSpec }) {
  const sources = spec.sourceIds.map((id) => references.find((source) => source.id === id)).filter((source): source is NonNullable<typeof source> => !!source);
  return <section className="illustrative-phenotype" aria-labelledby="illustrative-phenotype-title">
    <header><div><p className="eyebrow">Illustrative phenotype</p><h2 id="illustrative-phenotype-title">{spec.title}</h2></div><strong>NOT A PATIENT RESULT</strong></header>
    <div>{spec.items.map((item) => <article key={item.label}><span className={`phenotype-indicator ${item.indicator}`}><i aria-hidden="true">{item.indicator === "often" ? "●" : item.indicator === "conditional" ? "◆" : "—"}</i>{indicatorText[item.indicator]}</span><div><h3>{item.label}</h3><p>{item.interpretation}</p></div></article>)}</div>
    <footer><span>Source-linked educational illustration. Confirm every antimicrobial result using the applicable standard, method, and laboratory policy.</span><span className="phenotype-sources">Sources: {sources.map((source, index) => <span key={source.id}>{index > 0 && " · "}<a href={source.url} target="_blank" rel="noreferrer" onClick={() => trackReferenceViewed(source.id)}>{source.short}</a></span>)}</span></footer>
  </section>;
}
