import type { AstMethodId, Breakpoint, BreakpointMeasurementType } from "../data/types";
import { references } from "../data/references";

export type AstMethodDefinition = {
  id: AstMethodId;
  label: string;
  shortLabel: string;
  measurementType: BreakpointMeasurementType;
  unit: "µg/mL" | "mm";
  recordMethod: Breakpoint["method"];
  description: string;
  limitation?: string;
  allowsTeachingSimulation: boolean;
};

export const DEFAULT_AST_METHOD: AstMethodId = "MIC_BROTH";

export const AST_METHODS: readonly AstMethodDefinition[] = [
  {
    id: "MIC_BROTH",
    label: "Broth microdilution / MIC",
    shortLabel: "Broth microdilution",
    measurementType: "MIC",
    unit: "µg/mL",
    recordMethod: "MIC",
    description: "Reference MIC-based susceptibility methodology.",
    allowsTeachingSimulation: true,
  },
  {
    id: "MIC_AUTOMATED",
    label: "Automated MIC",
    shortLabel: "Automated MIC",
    measurementType: "MIC",
    unit: "µg/mL",
    recordMethod: "MIC",
    description: "MIC result generated using an automated susceptibility platform.",
    limitation: "Automated susceptibility systems may have platform-specific ranges, limitations, or reporting rules. Interpretive criteria should follow the applicable validated standard and local laboratory procedure.",
    allowsTeachingSimulation: false,
  },
  {
    id: "MIC_GRADIENT",
    label: "Gradient diffusion / Etest",
    shortLabel: "Gradient diffusion / Etest",
    measurementType: "MIC",
    unit: "µg/mL",
    recordMethod: "MIC",
    description: "Gradient diffusion method producing an MIC estimate from the intersection of growth inhibition with the antimicrobial gradient strip.",
    limitation: "Gradient diffusion produces an MIC result. Method-specific limitations, instructions, and manufacturer/standards guidance may apply.",
    allowsTeachingSimulation: false,
  },
  {
    id: "DISK_DIFFUSION",
    label: "Disk diffusion / Kirby-Bauer",
    shortLabel: "Disk diffusion / Kirby-Bauer",
    measurementType: "Zone diameter",
    unit: "mm",
    recordMethod: "Disk",
    description: "Diffusion-based method interpreted using inhibition-zone diameter in millimeters.",
    limitation: "MIC and zone-diameter breakpoints are separate data types. AST Compass never converts one into the other.",
    allowsTeachingSimulation: false,
  },
] as const;

export function astMethodDefinition(id: AstMethodId): AstMethodDefinition {
  return AST_METHODS.find(method => method.id === id) ?? AST_METHODS[0];
}

export function astMethodFromSearch(search: string): AstMethodId {
  const value = new URLSearchParams(search).get("astMethod");
  return AST_METHODS.some(method => method.id === value) ? value as AstMethodId : DEFAULT_AST_METHOD;
}

export function updateAstMethodSearch(search: string, method: AstMethodId): string {
  const params = new URLSearchParams(search);
  if (method === DEFAULT_AST_METHOD) params.delete("astMethod");
  else params.set("astMethod", method);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const METHOD_APPLICABILITY_REVIEW_MESSAGE = "MIC result · Method-specific applicability under expert review";

export function requiresReviewedApplicability(method: AstMethodId): boolean {
  return method === "MIC_AUTOMATED" || method === "MIC_GRADIENT";
}

const sourceIds = new Set(references.map(reference => reference.id));
const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function hasReviewedApplicability(record: Breakpoint, method: AstMethodId): boolean {
  const entries = record.methodApplicability?.filter(entry => entry.method === method) ?? [];
  // Ambiguous grants, a generic record review label, and citations alone do not
  // establish applicability. Future grants require qualified owner/source review.
  if (entries.length !== 1 || entries[0].reviewStatus !== "Reviewed") return false;
  const review = entries[0].reviewProvenance;
  return !!review
    && review.contentId === `${record.id}:${method}`
    && review.contentVersion === record.version
    && hasText(review.approvalEvidenceId)
    && hasText(review.reviewer?.identity)
    && hasText(review.reviewer?.qualificationOrRole)
    && /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedOn)
    && Number.isFinite(Date.parse(review.reviewedOn))
    && Array.isArray(review.sources) && review.sources.length > 0
    && review.sources.every(source => sourceIds.has(source.sourceId)
      && hasText(source.editionOrVersion) && hasText(source.sectionOrLocator));
}

export function recordsForAstMethod(records: readonly Breakpoint[], method: AstMethodId): Breakpoint[] {
  const expected = astMethodDefinition(method).recordMethod;
  return records.filter(record => record.method === expected
    && (!requiresReviewedApplicability(method) || hasReviewedApplicability(record, method)));
}

export function measurementContextFor(method: AstMethodId, sourceUnit = ""): string {
  const definition = astMethodDefinition(method);
  return `${method}:${definition.measurementType}:${definition.unit}:${sourceUnit}`;
}
