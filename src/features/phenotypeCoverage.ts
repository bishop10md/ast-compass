import { resolveAntimicrobial } from "../data/antibiotics";
import { imageAntimicrobialOptions } from "../data/coverageOptions";
import { intrinsicPatterns } from "../data/intrinsicPatterns";
import { organisms } from "../data/organisms";
import { recognizedDrugWithoutRuleMessage } from "../data/antimicrobialCoverage";
import { reconstructAstTable } from "./image-concordance-extraction-core.mjs";
import { getPhenotypeAbstentions, phenotypeSignatures, type AstPhenotypeRow } from "./phenotypeMechanismEngine";

export type PhenotypeReviewRow = AstPhenotypeRow & {
  rawAntimicrobial?: string;
  extractionIssues?: string[];
};

/** Same conservative dictionary/reconstruction as Image Concordance; never a substring drug match. */
export function parsePhenotypeAstText(text: string): PhenotypeReviewRow[] {
  const extracted = reconstructAstTable({ rawOcrText: text, dictionary: imageAntimicrobialOptions });
  return extracted.rows.map(row => {
    const exact = row.antimicrobial.matchStatus === "EXACT" || row.antimicrobial.matchStatus === "ALIAS";
    const drug = exact ? resolveAntimicrobial(row.antimicrobial.dictionaryValue || row.antimicrobial.canonical || "") : undefined;
    return {
      id: row.id,
      antimicrobialId: drug?.id || "",
      rawAntimicrobial: row.antimicrobial.raw,
      measurement: row.mic.raw,
      category: row.category.value,
      extractionIssues: row.issues.map(issue => issue.message),
    };
  });
}

/** Existing rule-context inventory only; does not judge the row's category or create a rule. */
export function phenotypeRowCoverage(organismId: string, row: AstPhenotypeRow) {
  const organism = organisms.find(item => item.id === organismId);
  const drug = resolveAntimicrobial(row.antimicrobialId);
  const signatures = organism && drug ? phenotypeSignatures.filter(signature =>
    signature.availability === "active" &&
    (signature.organisms.includes(organism.id) || signature.organismGroups?.includes(organism.group)) &&
    [...signature.expectedPatterns, ...(signature.contradictoryPatterns || [])].some(pattern =>
      pattern.antimicrobialIds?.includes(drug.id) || pattern.classIncludes?.some(value => drug.className.toLowerCase().includes(value.toLowerCase())),
    ),
  ) : [];
  const intrinsic = organism && drug ? intrinsicPatterns.filter(pattern => pattern.organismId === organism.id && pattern.antibioticId === drug.id) : [];
  const hasRuleContext = signatures.length > 0 || intrinsic.length > 0;
  const paused = getPhenotypeAbstentions(organismId, [row]);
  return {
    rowId: row.id,
    antimicrobialId: drug?.id,
    displayName: drug?.displayName,
    recognized: !!drug,
    hasRuleContext,
    pausedSignatureIds: paused.map(item => item.signatureId),
    signatureIds: signatures.map(signature => signature.id),
    intrinsicPatternIds: intrinsic.map(pattern => pattern.id),
    message: !drug ? "Confirm the full antimicrobial name before interpretation."
      : !organism ? "Select an organism to check whether an existing rule context applies."
      : hasRuleContext ? "An existing educational rule context includes this drug; the full phenotype and rule conditions still apply."
      : paused.length ? "Inference paused pending scientific review. This row is retained but does not contribute to the paused mechanism inference."
      : recognizedDrugWithoutRuleMessage,
  };
}
