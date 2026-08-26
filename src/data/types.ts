export type Standard = "CLSI" | "EUCAST" | "FDA";
export type ReviewStatus = "Draft" | "Reviewed" | "Validated" | "Retired";

export interface ReviewMeta {
  status: ReviewStatus;
  lastReviewed: string;
  nextReview: string;
  reviewer: string;
  sourceIds: string[];
}

export interface Organism {
  id: string;
  name: string;
  group: string;
  gram: "positive" | "negative";
  aliases: string[];
}

export interface Antibiotic {
  id: string;
  name: string;
  className: string;
  short: string;
}

export interface Mechanism {
  id: string;
  name: string;
  family: string;
  summary: string;
  affectedClasses: string[];
}

export interface Gene {
  id: string;
  name: string;
  aliases: string[];
  mechanismId: string;
  commonHosts: string[];
  phenotype: string;
  caveat: string;
  meta: ReviewMeta;
}

export interface Breakpoint {
  id: string;
  organismId: string;
  antibioticId: string;
  standard: Standard;
  version: string;
  effectiveDate: string;
  method: "MIC" | "Disk";
  unit: string;
  diskContent?: string;
  susceptible: string;
  intermediate: string;
  resistant: string;
  table: string;
  footnote: string;
  siteRestriction: string;
  dosageNote: string;
  sourceId: string;
  meta: ReviewMeta;
}

export type SusceptibilityDomain = "Bacteria" | "Yeast" | "Filamentous fungi" | "Anaerobes" | "Fastidious bacteria" | "Rapid AST" | "Mycobacteria";

export interface StandardCatalogEntry {
  id: string;
  domain: SusceptibilityDomain;
  authority: Standard;
  document: string;
  edition: string;
  effectiveDate: string;
  purpose: string;
  sourceId: string;
  implementationStatus: "Architecture ready" | "Planned";
}

export type ForecastPrediction = "Resistance strongly expected" | "Activity may be retained" | "Cannot infer" | "Mechanism-dependent caution";

export interface BcidForecast {
  id: string;
  organismGroup: string;
  geneId: string;
  markerLabel: string;
  mechanismId: string;
  drugOrClass: string;
  prediction: ForecastPrediction;
  confidence: "High" | "Moderate" | "Context dependent";
  rationale: string;
  exceptions: string;
  requiresAst: true;
  sourceIds: string[];
  guidanceVersion: string;
  meta: ReviewMeta;
}

export interface IntrinsicPattern {
  id: string;
  organismId: string;
  antibioticId: string;
  expectation: "Expected susceptible" | "Expected resistant" | "Variable / context dependent";
  rationale: string;
  sourceIds: string[];
}

export interface CaseStudy {
  id: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
  learningPoint: string;
}

