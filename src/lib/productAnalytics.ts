import { antibiotics } from "../data/antibiotics";
import { genes } from "../data/genes";
import { mechanisms } from "../data/mechanisms";
import { organisms } from "../data/organisms";
import { references } from "../data/references";
import type { Standard } from "../data/types";
import { knownCatalogId, knownSatisfactionResponse, knownWorkflowId } from "./product-analytics-core.mjs";
import { trackEvent } from "./telemetry";

export type StructuredSearchKind = "organism" | "antimicrobial" | "marker" | "mechanism" | "reference";
export type SatisfactionResponse = "yes" | "not_quite";
export type SatisfactionWorkflow =
  | "breakpoints"
  | "gene_to_phenotype"
  | "phenotype_to_mechanism"
  | "bcid"
  | "concordance"
  | "image_concordance"
  | "learning"
  | "ast_detective";

const catalogIds = {
  organism: organisms.map(({ id }) => id),
  antimicrobial: antibiotics.map(({ id }) => id),
  marker: genes.map(({ id }) => id),
  mechanism: mechanisms.map(({ id }) => id),
  reference: references.map(({ id }) => id),
} satisfies Record<StructuredSearchKind, string[]>;

const satisfactionWorkflows: SatisfactionWorkflow[] = [
  "breakpoints",
  "gene_to_phenotype",
  "phenotype_to_mechanism",
  "bcid",
  "concordance",
  "image_concordance",
  "learning",
  "ast_detective",
];

const standardIds: Standard[] = ["CLSI", "EUCAST", "FDA"];

function trackKnownId(
  event: "organism_searched" | "antimicrobial_searched" | "marker_searched" | "mechanism_viewed" | "reference_viewed",
  property: "organism_id" | "antimicrobial_id" | "marker_id" | "mechanism_id" | "reference_id",
  value: unknown,
  knownIds: readonly string[],
) {
  const id = knownCatalogId(value, knownIds);
  if (!id) return false;
  trackEvent(event, { [property]: id });
  return true;
}

/** Track selection of a known organism; never pass the user's query to this function. */
export const trackOrganismSearched = (organismId: unknown) =>
  trackKnownId("organism_searched", "organism_id", organismId, catalogIds.organism);

/** Track selection of a known antimicrobial; never pass the user's query to this function. */
export const trackAntimicrobialSearched = (antimicrobialId: unknown) =>
  trackKnownId("antimicrobial_searched", "antimicrobial_id", antimicrobialId, catalogIds.antimicrobial);

/** Track selection of a known resistance marker; never pass the user's query to this function. */
export const trackMarkerSearched = (markerId: unknown) =>
  trackKnownId("marker_searched", "marker_id", markerId, catalogIds.marker);

export const trackMechanismViewed = (mechanismId: unknown) =>
  trackKnownId("mechanism_viewed", "mechanism_id", mechanismId, catalogIds.mechanism);

export const trackReferenceViewed = (referenceId: unknown) =>
  trackKnownId("reference_viewed", "reference_id", referenceId, catalogIds.reference);

export function trackStructuredSearchSelection(kind: StructuredSearchKind, contentId: unknown) {
  switch (kind) {
    case "organism": return trackOrganismSearched(contentId);
    case "antimicrobial": return trackAntimicrobialSearched(contentId);
    case "marker": return trackMarkerSearched(contentId);
    case "mechanism": return trackMechanismViewed(contentId);
    case "reference": return trackReferenceViewed(contentId);
  }
}

export function trackBreakpointLookup(input: { organismId: unknown; antimicrobialId: unknown; standard: unknown }) {
  const organismId = knownCatalogId(input.organismId, catalogIds.organism);
  const antimicrobialId = knownCatalogId(input.antimicrobialId, catalogIds.antimicrobial);
  const standard = knownCatalogId(input.standard, standardIds);
  if (!organismId || !antimicrobialId || !standard) return false;
  trackEvent("breakpoint_lookup", {
    organism_id: organismId,
    antimicrobial_id: antimicrobialId,
    standard_id: standard.toLowerCase(),
  });
  return true;
}
/**
 * Record an empty local-search outcome without accepting the query. Keeping this
 * signature argument-free prevents arbitrary or sensitive text from reaching telemetry.
 */
export function trackSearchNoResults() {
  trackEvent("search_no_results", { feature_name: "search" });
}

export function trackSatisfaction(workflow: unknown, response: unknown) {
  const workflowId = knownWorkflowId(workflow, satisfactionWorkflows);
  const satisfactionResponse = knownSatisfactionResponse(response);
  if (!workflowId || !satisfactionResponse) return false;
  trackEvent("satisfaction", {
    workflow_id: workflowId,
    satisfaction_response: satisfactionResponse,
  });
  return true;
}
