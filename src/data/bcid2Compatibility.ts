import type { BcidCompatibility, BcidCompatibilityRule, BcidPairAssessment } from "./rapidDiagnosticTypes";

const sources = ["ref-bcid2-ifu", "ref-idsa"];
const rule = (organismId: string, markerId: string, compatibility: BcidCompatibility = "primary", explanation = "Reviewed as a relevant BCID organism–marker interpretation context."): BcidCompatibilityRule => ({ organismId, markerId, compatibility, explanation, sourceIds: sources });

const enterobacterales = ["e-cloacae-complex", "e-coli", "k-aerogenes", "k-oxytoca", "k-pneumoniae-group", "proteus-spp", "salmonella-spp", "s-marcescens"];
const enterobacteralesMarkers = ["ctx-m", "imp", "kpc", "ndm", "oxa-48-like", "vim", "mcr-1"];

export const bcid2CompatibilityRules: BcidCompatibilityRule[] = [
  ...enterobacterales.flatMap((organismId) => enterobacteralesMarkers.map((markerId) => rule(organismId, markerId))),
  ...["imp", "kpc", "ndm", "vim"].map((markerId) => rule("p-aeruginosa", markerId)),
  rule("acb-complex", "ndm"),
  rule("acb-complex", "imp", "possible", "A detected metallo-beta-lactamase target may require qualified organism attribution and phenotypic confirmation in this BCID context."),
  rule("acb-complex", "vim", "possible", "A detected metallo-beta-lactamase target may require qualified organism attribution and phenotypic confirmation in this BCID context."),
  rule("s-aureus", "meca-c-mrej"),
  rule("s-epidermidis", "meca-c"),
  rule("s-lugdunensis", "meca-c", "possible", "BCID methicillin-resistance interpretation for S. lugdunensis is assay-specific and should be qualified rather than generalized from other coagulase-negative staphylococci."),
  rule("e-faecalis", "vana-b"),
  rule("e-faecium", "vana-b"),
];

const visible = (rule: BcidCompatibilityRule, includePossible: boolean) => rule.compatibility === "primary" || (includePossible && rule.compatibility === "possible");

export const getCompatibilityRule = (organismId: string, markerId: string) => bcid2CompatibilityRules.find((item) => item.organismId === organismId && item.markerId === markerId);
export const isCompatibleBcidPair = (organismId: string, markerId: string, includePossible = true) => {
  const match = getCompatibilityRule(organismId, markerId);
  return !!match && visible(match, includePossible);
};
export const getMarkersForOrganism = (organismId: string, includePossible = false) => bcid2CompatibilityRules.filter((item) => item.organismId === organismId && visible(item, includePossible)).map((item) => item.markerId);
export const getOrganismsForMarker = (markerId: string, includePossible = false) => bcid2CompatibilityRules.filter((item) => item.markerId === markerId && visible(item, includePossible)).map((item) => item.organismId);

export const assessBcidPairs = (organismIds: string[], markerIds: string[]): BcidPairAssessment[] => organismIds.flatMap((organismId) => markerIds.map((markerId) => {
  const match = getCompatibilityRule(organismId, markerId);
  const compatibleOrganisms = organismIds.filter((id) => isCompatibleBcidPair(id, markerId));
  if (!match || match.compatibility === "not-applicable") return { organismId, markerId, compatibility: "not-applicable", attribution: "not-applicable", explanation: "Not applicable in this BCID interpretation context." };
  return { organismId, markerId, compatibility: match.compatibility, attribution: compatibleOrganisms.length === 1 ? "clear-context" : "ambiguous", explanation: compatibleOrganisms.length === 1 ? "Among the selected organisms, this marker is relevant to this organism context." : "This marker is compatible with more than one selected organism; the multiplex result alone may not establish attribution." };
}));
