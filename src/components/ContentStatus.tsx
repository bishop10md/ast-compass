import type { ContentReviewMeta } from "../data/contentReview";

/** Present the educational boundary without promoting the stored review status. */
export default function ContentStatus({ meta }: { meta: ContentReviewMeta }) {
  return <div className="content-status" aria-label={`Scientific content status: ${meta.status}`}>
    {meta.status !== "Demo" && <span className={`review-badge ${meta.status.toLowerCase()}`}>{meta.status.toUpperCase()}</span>}
    <span>{meta.status === "Demo"
      ? "Educational content; not validated for clinical use."
      : meta.status === "Reviewed"
        ? "Checked against cited authoritative sources."
        : "Independently checked by an additional qualified reviewer."}</span>
    {meta.lastReviewed && <small>Last reviewed: {meta.lastReviewed}</small>}
    {meta.reviewedBy && <small>Reviewed by: {meta.reviewedBy}</small>}
  </div>;
}
