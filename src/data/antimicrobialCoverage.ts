import { canonicalAntimicrobials, resolveAntimicrobial } from "./antibiotics";
import { breakpoints } from "./breakpoints";
import { intrinsicPatterns } from "./intrinsicPatterns";

export const requiredAntimicrobialIds = [
  "penicillin", "ampicillin", "amp_sulb", "pip_tazo", "cefazolin", "cefoxitin",
  "cefuroxime", "cefotaxime", "ceftazidime", "ceftriaxone", "cefepime", "aztreonam",
  "ertapenem", "meropenem", "mero_vabor", "caz_avi", "cef_tol_tazo", "amikacin",
  "gentamicin", "tobramycin", "ciprofloxacin", "levofloxacin", "trim_sulfa", "tigecycline",
] as const;

export const recognizedDrugWithoutRuleMessage = "Drug is recognized, but no interpretation rule is currently available for this organism/context.";

/**
 * A traceable inventory of existing educational records, NOT clinical coverage.
 * An empty set does not assert biological inactivity or absence from an external
 * standard. Synthetic records remain explicitly separate from authoritative data.
 */
export const antimicrobialCoverage = canonicalAntimicrobials.map((drug) => {
  const teachingRecords = breakpoints.filter((record) => resolveAntimicrobial(record.antibioticId)?.id === drug.id);
  const intrinsicRecords = intrinsicPatterns.filter((record) => resolveAntimicrobial(record.antibioticId)?.id === drug.id);
  return {
    antimicrobialId: drug.id,
    reviewStatus: "Draft" as const,
    breakpointAvailability: drug.breakpointAvailability,
    authoritativeBreakpointRecordIds: [] as string[],
    teachingBreakpointRecordIds: teachingRecords.map((record) => record.id),
    intrinsicPatternIds: intrinsicRecords.map((record) => record.id),
    educationalOrganismContexts: [...new Set([...teachingRecords, ...intrinsicRecords].map((record) => record.organismId))].sort(),
    sourceIds: [...new Set([...drug.sourceIds, ...teachingRecords.map((record) => record.sourceId), ...intrinsicRecords.flatMap((record) => record.sourceIds)])],
    notes: "Organism contexts enumerate only the linked educational breakpoint/status records and intrinsic-pattern records; they do not authorize interpretation or exhaust other learning/marker content.",
  };
});
