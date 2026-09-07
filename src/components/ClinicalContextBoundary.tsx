import { clinicalContextBoundary } from "../data/scientificGovernance";

export default function ClinicalContextBoundary() {
  return <aside className="clinical-context-boundary"><p className="eyebrow">Clinical context boundary</p><p>{clinicalContextBoundary}</p></aside>;
}
