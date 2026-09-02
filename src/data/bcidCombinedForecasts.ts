import { bcidForecasts } from "./bcidForecasts";
import { bcid2Markers, bcid2Targets } from "./bcid2Panel";

export interface CombinedBcidForecast {
  organismId: string;
  markerIds: string[];
  reviewed: boolean;
  title: string;
  interpretation: string;
  individualForecasts: typeof bcidForecasts;
}

const reviewedCombined: Record<string, string> = {
  "k-pneumoniae-group:ctx-m+kpc": "The carbapenemase mechanism is expected to dominate much of the beta-lactam phenotype, while CTX-M represents an additional ESBL mechanism. The complete phenotype cannot be predicted from molecular markers alone.",
};

export function getCombinedForecast(organismId: string, markerIds: string[]): CombinedBcidForecast {
  const organism = bcid2Targets.find((item) => item.id === organismId);
  const labels = markerIds.map((id) => bcid2Markers.find((item) => item.id === id)?.label).filter(Boolean) as string[];
  const individualForecasts = bcidForecasts.filter((row) => labels.includes(row.markerLabel) && (row.organism === organism?.name || row.organismGroup === organism?.name || (!row.organism && organism?.parentId === "enterobacterales" && row.organismGroup === "Enterobacterales")));
  const key = `${organismId}:${[...markerIds].sort().join("+")}`;
  const reviewed = reviewedCombined[key];
  return {
    organismId,
    markerIds,
    reviewed: !!reviewed,
    title: `${organism?.name || "Selected organism"}: ${labels.join(" + ")}`,
    interpretation: reviewed || "Multiple resistance mechanisms were detected. AST Compass can display the individual mechanism expectations, but no reviewed combined forecast is available for this exact marker combination. Phenotypic AST remains required.",
    individualForecasts,
  };
}
