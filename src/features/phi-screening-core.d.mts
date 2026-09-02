export type PhiFindingType = "person-name" | "medical-record-number" | "date-of-birth" | "patient-date" | "address" | "phone" | "email" | "account-number" | "health-plan-number" | "social-security-number" | "accession-or-specimen-identifier" | "barcode-or-qr-code" | "unique-identifier" | "face" | "other-potential-identifier";
export interface PhiFinding { type: PhiFindingType; confidence: number; detectedText?: never }
export interface PhiScreeningResult { status: "clear" | "possible-phi" | "phi-detected" | "unable-to-screen"; confidence: number; findings: PhiFinding[]; screeningVersion: string }
export const PHI_SCREENING_VERSION: string;
export function screenPhiText(text: string, signals?: { barcode?: boolean; face?: boolean; scannerUnavailable?: boolean; ocrFailure?: boolean; poorImageQuality?: boolean }): PhiScreeningResult;
