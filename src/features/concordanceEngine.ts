import { antibiotics, bcidForecasts, genes, mechanisms, organisms } from "../data";
import type { BcidForecast } from "../data/types";
import { normalizeSearch, sortAlphabetically } from "../utils/search";
import { parseMeasurement } from "./measurement-core.mjs";

export type AstCategory = "S" | "I" | "R" | "SDD" | "NS" | "Unknown";
export type ConcordanceCategory = "Concordant" | "Potentially concordant" | "Discordant" | "Cannot infer" | "Not relevant" | "Investigate";
export type ExtractionConfidence = "High" | "Moderate" | "Low";

export interface AstResultRow {
  id: string;
  antimicrobial: string;
  measurement: string;
  operator?: "<=" | ">=" | "<" | ">" | "=";
  value?: number;
  category: AstCategory;
  confidence: ExtractionConfidence;
  sourceText?: string;
}

export interface ConcordanceResult extends AstResultRow {
  assessment: ConcordanceCategory;
  rationale: string;
  troubleshooting: string[];
  forecast?: BcidForecast;
}

export const organismOptions = sortAlphabetically(organisms, (item) => item.name).map((item) => ({ value: item.id, label: item.name, aliases: item.aliases, description: item.group }));
export const antimicrobialOptions = sortAlphabetically(antibiotics, (item) => item.name).map((item) => ({ value: item.name, label: item.name, aliases: [item.id, item.short], description: item.className }));
export const markerOptions = sortAlphabetically([...new Map(bcidForecasts.map((item) => [item.markerLabel, item])).values()], (item) => item.markerLabel).map((item) => ({ value: item.markerLabel, label: item.markerLabel, aliases: genes.find((gene) => gene.id === item.geneId)?.aliases || [], description: mechanisms.find((mechanism) => mechanism.id === item.mechanismId)?.name }));

const classLinked = (forecast: BcidForecast, antimicrobial: string) => {
  const drug = antibiotics.find((item) => normalizeSearch(item.name) === normalizeSearch(antimicrobial) || normalizeSearch(item.short) === normalizeSearch(antimicrobial));
  const haystack = normalizeSearch(`${forecast.antimicrobialClass} ${forecast.drugOrClass}`);
  const candidates = [drug?.name, drug?.className, drug?.short, antimicrobial].filter(Boolean).map((item) => normalizeSearch(item!));
  if (candidates.some((candidate) => candidate.length > 3 && haystack.includes(candidate))) return true;
  if (drug && normalizeSearch(drug.className).includes("beta lactam") && haystack.includes("beta lactam")) return true;
  if (drug && normalizeSearch(drug.className).includes("cephalosporin") && haystack.includes("cephalosporin")) return true;
  if (drug && normalizeSearch(drug.className).includes("carbapenem") && haystack.includes("carbapenem")) return true;
  return false;
};

const contextFits = (forecast: BcidForecast, organismId: string) => {
  const organism = organisms.find((item) => item.id === organismId);
  if (!organism) return false;
  const context = normalizeSearch(`${organism.name} ${organism.group}`);
  return [forecast.organism, forecast.organismGroup].filter(Boolean).some((item) => context.includes(normalizeSearch(item!)) || normalizeSearch(item!).includes(normalizeSearch(organism.group)));
};

export function analyzeConcordance(organismId: string, marker: string, rows: AstResultRow[]): ConcordanceResult[] {
  const markerForecasts = bcidForecasts.filter((forecast) => normalizeSearch(forecast.markerLabel) === normalizeSearch(marker));
  const contextual = markerForecasts.filter((forecast) => contextFits(forecast, organismId));
  const forecasts = contextual.length ? contextual : markerForecasts;
  return rows.map((row) => {
    const relevant = forecasts.filter((forecast) => classLinked(forecast, row.antimicrobial));
    const resistant = row.category === "R" || row.category === "NS";
    const susceptible = row.category === "S";
    const uncertain = row.category === "I" || row.category === "SDD" || row.category === "Unknown";
    const strong = relevant.find((forecast) => forecast.prediction === "Resistance strongly expected");
    const retained = relevant.find((forecast) => forecast.prediction === "Activity may be retained");
    const cannot = relevant.find((forecast) => forecast.prediction === "Cannot infer");
    const caution = relevant.find((forecast) => forecast.prediction === "Mechanism-dependent caution");
    const base = { ...row, troubleshooting: ["Confirm organism identification and marker-to-organism association.", "Review the complete AST pattern, test method, and current laboratory policy."] };
    if (!forecasts.length) return { ...base, assessment: "Cannot infer" as const, rationale: `AST Compass has no marker forecast for ${marker} in this organism context.` };
    if (!relevant.length) return { ...base, assessment: "Not relevant" as const, rationale: `${marker} does not directly predict this antimicrobial result; unrelated or additional mechanisms may be present.` };
    if (strong && resistant) return { ...base, assessment: "Concordant" as const, rationale: `The observed nonsusceptible category is consistent with the usual ${marker} resistance expectation, but does not prove causation.`, forecast: strong };
    if (strong && susceptible) return { ...base, assessment: "Discordant" as const, rationale: `The susceptible result differs from the usual ${marker} expectation and needs review before any conclusion.`, forecast: strong, troubleshooting: [...base.troubleshooting, "Check extraction/transcription, marker expression, mixed culture, and repeat/confirmatory-test policy."] };
    if (retained && susceptible) return { ...base, assessment: "Concordant" as const, rationale: `Activity may be retained for this marker–drug pairing; the observed susceptible category is plausible but still requires validated AST.`, forecast: retained };
    if (retained && resistant) return { ...base, assessment: "Investigate" as const, rationale: `Resistance may be real, but ${marker} alone is not a sufficient explanation for this drug. Consider co-mechanisms.`, forecast: retained };
    if (cannot) return { ...base, assessment: "Cannot infer" as const, rationale: `${marker} does not establish a categorical expectation for this antimicrobial.`, forecast: cannot };
    if (caution || uncertain) return { ...base, assessment: "Potentially concordant" as const, rationale: `The combination is plausible, but category, exposure, expression, co-mechanisms, and method context limit inference.`, forecast: caution || relevant[0] };
    return { ...base, assessment: "Investigate" as const, rationale: "The result needs structured review; the selected marker is not a complete explanation.", forecast: relevant[0] };
  });
}

export const summarizeConcordance = (results: ConcordanceResult[]) => results.reduce<Record<ConcordanceCategory, number>>((summary, result) => ({ ...summary, [result.assessment]: summary[result.assessment] + 1 }), { "Concordant": 0, "Potentially concordant": 0, "Discordant": 0, "Cannot infer": 0, "Not relevant": 0, "Investigate": 0 });

const categoryFrom = (value?: string): AstCategory => {
  const normalized = (value || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (normalized === "S" || normalized === "SUSCEPTIBLE") return "S";
  if (normalized === "I" || normalized === "INTERMEDIATE") return "I";
  if (normalized === "R" || normalized === "RESISTANT") return "R";
  if (normalized === "SDD") return "SDD";
  if (normalized === "NS" || normalized === "NONSUSCEPTIBLE") return "NS";
  return "Unknown";
};

export { parseMeasurement };

export function parseAstText(text: string): AstResultRow[] {
  const known = antimicrobialOptions;
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line, index) => {
    const normalized = normalizeSearch(line);
    const option = known.find((item) => [item.label, ...(item.aliases || [])].some((alias) => normalized.includes(normalizeSearch(alias))));
    if (!option) return [];
    const categoryToken = line.match(/(?:^|\s|\|)(S|I|R|SDD|NS|Susceptible|Intermediate|Resistant|Nonsusceptible)(?:\s|\||$)/i)?.[1];
    const measurementMatch = line.match(/(?:MIC\s*)?((?:<=|>=|<|>|=|≤|≥)?\s*\d+(?:\.\d+)?)(?:\s*(?:µg\/mL|ug\/mL|mcg\/mL|mm))?/i);
    const measurement = measurementMatch?.[1]?.trim() || "";
    return [{ id: `ocr-${index}-${Date.now()}`, antimicrobial: option.label, measurement, ...parseMeasurement(measurement), category: categoryFrom(categoryToken), confidence: categoryToken && measurement ? "High" : categoryToken || measurement ? "Moderate" : "Low", sourceText: line } as AstResultRow];
  });
}

