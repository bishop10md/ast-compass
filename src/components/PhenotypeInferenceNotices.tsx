import { references } from "../data";
import type { PhenotypeAbstention } from "../features/phenotypeMechanismEngine";

export default function PhenotypeInferenceNotices({ abstentions }: { abstentions: PhenotypeAbstention[] }) {
  return <>{abstentions.map(item => <section className="panel phenotype-notice" role="status" aria-label="Scientific inference availability" key={item.signatureId}>
    <h2>Inference paused pending scientific review</h2>
    <p>{item.explanation}</p>
    <p>This is not a negative mechanism result or evidence of susceptibility. Scientific status: {item.reviewStatus}.</p>
    <p>Review the entered AST results and supporting references for additional context.</p>
    <p>These references provide educational context; they do not validate the AST Compass scoring model.</p>
    <ul>{item.sourceIds.map(id => {
      const source = references.find(reference => reference.id === id);
      return source ? <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.short} ↗</a></li> : null;
    })}</ul>
  </section>)}</>;
}
