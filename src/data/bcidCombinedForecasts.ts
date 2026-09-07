import { bcidForecasts } from "./bcidForecasts";
import { bcid2Markers, bcid2Targets } from "./bcid2Panel";
import type { QualifiedReviewProvenance } from "./scientificGovernance";

export interface CombinedBcidForecast {
  organismId: string;
  markerIds: string[];
  reviewed: false;
  reviewStatus: "Draft";
  reviewProvenance?: QualifiedReviewProvenance;
  title: string;
  interpretation: string;
  individualForecasts: typeof bcidForecasts;
}

const combinedForecastNarratives: Record<string, string> = {
  "k-pneumoniae-group:ctx-m+kpc": "The carbapenemase mechanism is expected to dominate much of the beta-lactam phenotype, while CTX-M represents an additional ESBL mechanism. The complete phenotype cannot be predicted from molecular markers alone.",
};

export function getCombinedForecast(organismId: string, markerIds: string[]): CombinedBcidForecast {
  const organism = bcid2Targets.find((item) => item.id === organismId);
  const labels = markerIds.map((id) => bcid2Markers.find((item) => item.id === id)?.label).filter(Boolean) as string[];
  const individualForecasts = bcidForecasts.filter((row) => labels.includes(row.markerLabel) && (row.organism ? row.organism === organism?.name : row.organismGroup === organism?.name || (organism?.parentId === "enterobacterales" && row.organismGroup === "Enterobacterales")));
  const key = `${organismId}:${[...markerIds].sort().join("+")}`;
  const narrative = combinedForecastNarratives[key];
  return {
    organismId,
    markerIds,
    // Narrative presence, a citation or an editorial date is not human approval.
    // Future evidence-backed activation requires a separately authorized change.
    reviewed: false,
    reviewStatus: "Draft",
    title: `${organism?.name || "Selected organism"}: ${labels.join(" + ")}`,
    interpretation: narrative || "Multiple resistance mechanisms were detected. AST Compass can display the individual mechanism expectations, but no reviewed combined forecast is available for this exact marker combination. Phenotypic AST remains required.",
    individualForecasts,
  };
}
