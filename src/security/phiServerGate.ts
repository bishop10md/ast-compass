export type QuarantineStatus = "pending" | "approved" | "rejected" | "unable-to-screen";

export interface PhiServerGateResult {
  uploadId: string;
  status: QuarantineStatus;
  screeningVersion: string;
  reviewedAt?: string;
}

/**
 * Permanent image storage must call a trusted server boundary that quarantines
 * the upload and returns an approval. Client-side OCR is never sufficient.
 */
export async function requestServerPhiScreening(_file: File): Promise<PhiServerGateResult> {
  throw new Error("Server-side PHI screening is not configured.");
}
