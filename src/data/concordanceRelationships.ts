import { bcidForecasts } from "./bcidForecasts";
import { organisms } from "./organisms";
import type { BcidForecast } from "./types";
import type { QualifiedReviewProvenance } from "./scientificGovernance";

type Scope = { kind: "exact"; organismId: string } | { kind: "group"; groupId: keyof typeof concordanceGroups };
export type ConcordanceRelationship = {
  forecastId: string;
  scope: Scope;
  antimicrobialIds: readonly string[];
  use: "authored-expectation" | "relevance-only";
  reviewStatus: "Draft";
  sourceIds: string[];
  caveat?: string;
  reviewProvenance?: QualifiedReviewProvenance;
};

// Explicit existing group membership, never inferred from a substring/name match.
export const concordanceGroups = {
  enterobacterales: { authoredName: "Enterobacterales", organismIds: ["enterobacterales", "ecoli", "shigella", "salmonella", "kpneumo", "koxytoca", "ecloacae", "eaerogenes", "cfreundii", "cdiversus", "smarcescens", "pmirabilis", "providencia", "morganella", "yersinia"] },
  enterococci: { authoredName: "Enterococcus spp.", organismIds: ["efaecalis", "efaecium"] },
  cons: { authoredName: "Coagulase-negative Staphylococcus", organismIds: ["cons"] },
} as const;

const enterobacterales: Scope = { kind: "group", groupId: "enterobacterales" };
const exact = (organismId: string): Scope => ({ kind: "exact", organismId });
const carbapenems = ["ertapenem", "imipenem", "meropenem", "doripenem"];
const thirdGenerationCephalosporins = ["cefotaxime", "ceftriaxone", "ceftazidime"];
const mecCaveat = "The mec-related oxacillin/cefoxitin relationship is recognized, but a categorical concordance rule has not completed source review for this species and method. Confirm species, assay marker-to-organism association (including MREJ when applicable), test method and laboratory policy. No susceptibility/resistance category is assigned from this relationship.";
const relation = (forecastId: string, scope: Scope, antimicrobialIds: string[], use: ConcordanceRelationship["use"] = "authored-expectation", caveat?: string): ConcordanceRelationship => ({ forecastId, scope, antimicrobialIds, use, caveat, reviewStatus: "Draft", sourceIds: [...(bcidForecasts.find(f => f.id === forecastId)?.sourceIds || [])] });

/** Conservative explicit projection of existing authored records, not expanded
 * clinical coverage. Missing/broad/ambiguous mappings return Cannot infer.
 * Inhibitor combinations, cefepime/novel cephalosporin class inheritance and
 * K. pneumoniae-group→species substitution await source/scope review.
 */
export const concordanceRelationships: readonly ConcordanceRelationship[] = [
  relation("ctxm-1", enterobacterales, [...thirdGenerationCephalosporins, "aztreonam"]),
  relation("ctxm-ecoli", exact("ecoli"), thirdGenerationCephalosporins),
  relation("ctxm-ecloacae", exact("ecloacae"), thirdGenerationCephalosporins),
  relation("ctxm-2", enterobacterales, carbapenems),
  relation("ctxm-3", enterobacterales, ["ciprofloxacin", "levofloxacin", "moxifloxacin", "amikacin", "gentamicin", "tobramycin", "plazomicin", "trim_sulfa"]),
  relation("kpc-ent", enterobacterales, [...carbapenems, "aztreonam"]),
  relation("mbl-1", enterobacterales, carbapenems),
  relation("mbl-2", enterobacterales, ["aztreonam"]),
  relation("vim-1", exact("pseudomonas"), ["imipenem", "meropenem", "doripenem"]),
  relation("imp-1", exact("pseudomonas"), ["imipenem", "meropenem", "doripenem"]),
  relation("oxa48-1", enterobacterales, carbapenems),
  relation("meca-1", exact("staph_aureus"), ["oxacillin", "cefoxitin"], "relevance-only", mecCaveat),
  relation("meca-cons", { kind: "group", groupId: "cons" }, ["oxacillin", "cefoxitin"], "relevance-only", mecCaveat),
  relation("vana-1", { kind: "group", groupId: "enterococci" }, ["vancomycin"]),
  relation("vana-efaecalis", exact("efaecalis"), ["vancomycin"]),
  relation("vana-efaecium", exact("efaecium"), ["vancomycin"]),
  relation("mcr-1", enterobacterales, ["colistin"]),
];

export function relationshipFits(relationship: ConcordanceRelationship, forecast: BcidForecast, organismId: string): boolean {
  const organism = organisms.find(o => o.id === organismId);
  if (!organism || relationship.forecastId !== forecast.id) return false;
  // Explicit species content never falls through to its broad group field.
  if (forecast.organism && forecast.organism !== organism.name) return false;
  if (relationship.scope.kind === "exact") return relationship.scope.organismId === organismId && (forecast.organism || forecast.organismGroup) === organism.name;
  const group = concordanceGroups[relationship.scope.groupId];
  return !forecast.organism && forecast.organismGroup === group.authoredName && (group.organismIds as readonly string[]).includes(organismId);
}

export function contextualRelationships(organismId: string, marker: string, forecasts: readonly BcidForecast[] = bcidForecasts, relationships: readonly ConcordanceRelationship[] = concordanceRelationships) {
  return relationships.flatMap(relationship => {
    const forecast = forecasts.find(f => f.id === relationship.forecastId);
    return forecast && forecast.markerLabel === marker && relationshipFits(relationship, forecast, organismId) ? [{ relationship, forecast }] : [];
  });
}

export function matchingConcordanceRelationships(organismId: string, marker: string, antimicrobialId: string, forecasts: readonly BcidForecast[] = bcidForecasts, relationships: readonly ConcordanceRelationship[] = concordanceRelationships) {
  const candidates = contextualRelationships(organismId, marker, forecasts, relationships).filter(item => item.relationship.antimicrobialIds.includes(antimicrobialId));
  const exactMatches = candidates.filter(item => item.relationship.scope.kind === "exact");
  // Specificity applies per drug, not globally per marker. Ambiguity is refused by caller.
  return (exactMatches.length ? exactMatches : candidates).sort((a, b) => a.forecast.id.localeCompare(b.forecast.id));
}
