import { antibiotics, findAntimicrobialMatches, resolveAntimicrobial } from "../data/antibiotics";
import { contextualRelationships, matchingConcordanceRelationships } from "../data/concordanceRelationships";
import { analyzeConcordance as analyzeExistingConcordance, type AstResultRow, type ConcordanceResult } from "./concordanceEngine";

export const NO_CONCORDANCE_RULE_MESSAGE = "Drug is recognized, but no interpretation rule is currently available for this organism/context.";

/**
 * Coverage admission only: no new scientific rule or breakpoint is defined here.
 * Recognition never creates a rule. Use the same explicit scope ledger as the
 * engine; neither entry point can fall back to another species or prose class.
 */
function contextualForecasts(organismId: string, marker: string) {
  return contextualRelationships(organismId, marker).map(item => item.forecast);
}

export function hasConcordanceContext(organismId: string, marker: string): boolean {
  return contextualForecasts(organismId, marker).length > 0;
}

function cannotInfer(row: AstResultRow, rationale: string, reason: string): ConcordanceResult {
  return {
    ...row,
    assessment: "Cannot infer",
    rationale,
    troubleshooting: [
      reason,
      "Confirm the canonical organism and antimicrobial names and marker-to-organism association.",
      "Recognition in the coverage directory does not establish scientific support or susceptibility. Use validated AST and the applicable authoritative source.",
    ],
  };
}

/** Normalize exact aliases, then delegate only admitted rows to the existing engine. */
export function analyzeConcordance(organismId: string, marker: string, rows: AstResultRow[]): ConcordanceResult[] {
  const forecasts = contextualForecasts(organismId, marker);
  return rows.map((row) => {
    // Deliberately omit a guessed domain: CFZ can mean cefazolin or clofazimine.
    // A user can resolve this by selecting the full canonical scientific name.
    const antimicrobial = resolveAntimicrobial(row.antimicrobial);
    if (!antimicrobial) {
      const ambiguous = findAntimicrobialMatches(row.antimicrobial).length > 1;
      return cannotInfer(row,
        ambiguous
          ? "The antimicrobial abbreviation is ambiguous. Select the full antimicrobial name before interpretation."
          : "The antimicrobial name is not recognized. Confirm the full antimicrobial name before interpretation.",
        "Unrecognized or ambiguous names are not converted into scientific matches by fuzzy guessing.",
      );
    }
    const existingDrug = antibiotics.find((item) => item.id === antimicrobial.id);
    if (!forecasts.length || !existingDrug) {
      return cannotInfer(row, NO_CONCORDANCE_RULE_MESSAGE,
        "No exact existing organism/marker forecast context is mapped. Reference-only organisms and drugs are not assigned rules from another organism or drug class.",
      );
    }
    // A parent beta-lactam class must not stand in for a full inhibitor
    // combination. Recognition is not authorization to borrow its component's
    // resistance expectation, even when the marker and organism are mapped.
    if (["amox_clav", "amp_sulb", "pip_tazo", "mero_vabor", "caz_avi", "cef_tol_tazo", "imi_rel"].includes(existingDrug.id) &&
      !matchingConcordanceRelationships(organismId, marker, antimicrobial.id).length) {
      return cannotInfer(row, NO_CONCORDANCE_RULE_MESSAGE,
        "No existing forecast explicitly names this full beta-lactam/inhibitor combination for the selected organism and marker. Parent-drug and class-level rules are not substituted.",
      );
    }
    return analyzeExistingConcordance(organismId, marker, [{ ...row, antimicrobial: existingDrug.name }])[0];
  });
}
