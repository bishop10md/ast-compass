import type { ContentReviewStatus } from "./contentReview";
import { references } from "./references";
import { standardCatalog } from "./standardCatalog";

export type ScientificContentType =
  | "breakpoint"
  | "resistance mechanism"
  | "molecular marker"
  | "phenotype expectation"
  | "concordance rule"
  | "BCID forecast"
  | "learning content"
  | "reference"
  | "other scientific content";

export type ScientificStandardReference = {
  organization: string;
  document: string;
  editionOrVersion?: string;
  publicationOrUpdateDate?: string;
};

/** Future documented human review, not proof supplied by an automated check.
 * Never bundle private review notes/documents. Public attribution requires consent.
 * No current record is granted approval merely by adding this optional schema.
 */
export type QualifiedReviewProvenance = {
  contentId: string;
  contentVersion: string;
  sources: { sourceId: string; editionOrVersion: string; sectionOrLocator: string }[];
  reviewer: { identity: string; qualificationOrRole: string; publicAttributionApproved: boolean };
  reviewedOn: string;
  approvalEvidenceId: string;
  independentVerification?: {
    reviewer: { identity: string; qualificationOrRole: string; publicAttributionApproved: boolean };
    contentVersion: string;
    verifiedOn: string;
    approvalEvidenceId: string;
  };
};

export type ScientificChangeHistoryEntry = {
  previousVersion?: string;
  newVersion: string;
  sourceIds: string[];
  reasonForChange: string;
  dateChanged: string;
  reviewer?: string;
  affectedOrganismIds?: string[];
  affectedAntimicrobialIds?: string[];
  affectedModules?: string[];
};

/**
 * Reusable provenance and review metadata for scientific records.
 * Reviewer fields and notes are optional so draft records never imply review.
 * Private notes must not be rendered by public-facing components.
 */
export type ScientificGovernanceRecord = {
  contentId: string;
  contentType: ScientificContentType;
  sourceIds: string[];
  standardOrGuideline?: ScientificStandardReference;
  astCompassContentVersion: string;
  reviewStatus: ContentReviewStatus;
  reviewProvenance?: QualifiedReviewProvenance;
  lastReviewedDate?: string;
  reviewer?: string;
  reviewerQualificationOrRole?: string;
  independentVerifier?: string;
  verificationDate?: string;
  notes?: string;
  changeHistory: ScientificChangeHistoryEntry[];
};

export type GovernedScientificContent<T> = T & {
  governance: ScientificGovernanceRecord;
};

export const scientificReviewStatusDefinitions: ReadonlyArray<{
  status: ContentReviewStatus;
  publicLabel: "DRAFT / EDUCATIONAL" | "REVIEWED" | "VERIFIED";
  meaning: string;
}> = [
  {
    status: "Demo",
    publicLabel: "DRAFT / EDUCATIONAL",
    meaning: "Educational, example, or developmental content that has not completed the documented AST Compass human-review process and is not validated for clinical use.",
  },
  {
    status: "Reviewed",
    publicLabel: "REVIEWED",
    meaning: "Content checked by a documented human reviewer against the cited authoritative source. This does not mean independent verification unless that is separately recorded.",
  },
  {
    status: "Verified",
    publicLabel: "VERIFIED",
    meaning: "Reviewed content independently checked by an additional qualified reviewer, with that verification documented.",
  },
];

export const scientificSourceHierarchy = [
  "Recognized antimicrobial-susceptibility standards and regulatory criteria",
  "Peer-reviewed scientific literature",
  "Manufacturer instructions and technical documentation",
  "Authoritative clinical microbiology references",
] as const;

export const representedStandardScopes = standardCatalog
  .filter((entry) => entry.implementationStatus === "Architecture ready")
  .map((entry) => {
    const source = references.find((reference) => reference.id === entry.sourceId);
    return {
      id: entry.id,
      organization: entry.authority,
      document: entry.document,
      editionOrVersion: entry.edition,
      sourceId: entry.sourceId,
      sourceLabel: source?.short ?? entry.sourceId,
      sourceUrl: source?.url,
      scope: entry.purpose,
    };
  });

export const unsupportedStandardMessage = "This standard is not currently represented in AST Compass. Refer to your locally authorized standard, validated laboratory procedure, and institutional policy.";

export const aiScientificContentStatement = "AI is not the scientific source of truth for AST Compass. Scientific content is derived from identifiable standards, peer-reviewed literature, manufacturer documentation, and other authoritative references. AI-assisted tools may support development, organization, coding, or quality-control workflows, but scientific claims should remain source-linked and subject to appropriate human review before being represented as reviewed content.";

export const clinicalContextBoundary = "AST interpretation is one component of clinical decision-making. Infection site, specimen type, organism, antimicrobial exposure, patient factors, pharmacokinetics/pharmacodynamics, local epidemiology, and institutional guidance may affect clinical interpretation. AST Compass does not provide patient-specific treatment recommendations.";

export const scientificUpdateWorkflow = [
  "New standard or guidance",
  "Change identified",
  "Impact assessment",
  "Source data updated",
  "Scientific review",
  "Tests",
  "Versioned release",
  "Changelog",
] as const;
