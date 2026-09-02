export type ContentReviewStatus = "Demo" | "Reviewed" | "Verified";

export type ContentReviewMeta = {
  status: ContentReviewStatus;
  sourceIds: string[];
  lastReviewed?: string;
  reviewedBy?: string;
  independentlyVerifiedBy?: string;
  notes?: string;
};

// Public labels must be evidence-backed. Current educational modules remain Demo
// until documented reviewer metadata is supplied.
export const contentReviewMeta: Record<string, ContentReviewMeta> = {
  bcidForecast: { status: "Demo", sourceIds: ["ref-bcid2", "ref-bcid2-ifu"] },
  concordance: { status: "Demo", sourceIds: ["ref-clsi", "ref-eucast"] },
  imageConcordance: { status: "Demo", sourceIds: ["ref-clsi", "ref-eucast"] },
  resistanceLibrary: { status: "Demo", sourceIds: ["ref-clsi", "ref-idsa"] },
  learningCenter: { status: "Demo", sourceIds: ["ref-clsi", "ref-eucast"] },
};

