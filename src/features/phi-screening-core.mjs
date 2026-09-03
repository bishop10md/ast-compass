export const PHI_SCREENING_VERSION = "1.1.0";

const rules = [
  ["medical-record-number", /\b(?:mrn|medical\s*record)\s*[:#-]?\s*[a-z0-9-]{4,}\b/i],
  ["date-of-birth", /\b(?:dob|date\s*of\s*birth)\s*[:#-]?\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/i],
  ["person-name", /\b(?:patient|patient\s*name|name)\s*:\s*[a-z][a-z' -]+(?:,|\s)[a-z][a-z' -]+/i],
  ["phone", /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/],
  ["email", /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i],
  ["social-security-number", /\b\d{3}-\d{2}-\d{4}\b/],
  ["accession-or-specimen-identifier", /\b(?:accession|specimen|case|lab|sample)\s*(?:id|#|number|no\.)?\s*[:#-]\s*[a-z0-9-]{4,}\b/i],
  ["account-number", /\b(?:account|member|health\s*plan)\s*(?:id|#|number|no\.)?\s*[:#-]\s*[a-z0-9-]{4,}\b/i],
  ["patient-date", /\b(?:collected|received|admission|discharge|date\s*of\s*service)\s*[:#-]?\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/i],
  ["address", /\b\d{1,6}\s+[a-z0-9.' -]+\s(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\b/i],
];

export function screenPhiText(text, signals = {}) {
  if (signals.scannerUnavailable || signals.ocrFailure || signals.poorImageQuality) return { status: "unable-to-screen", confidence: 0, findings: [], screeningVersion: PHI_SCREENING_VERSION };
  const normalized = String(text || "").replace(/[≥≤]/g, "").trim();
  const findings = rules.filter(([, pattern]) => pattern.test(normalized)).map(([type]) => ({ type, confidence: .94 }));
  if (signals.barcode) findings.push({ type: "barcode-or-qr-code", confidence: .99 });
  if (signals.face) findings.push({ type: "face", confidence: .99 });
  const astLine = /\b(?:S|I|R|SDD|NS)\b|\b(?:MIC|panel|well|instrument|cef|penem|cillin|floxacin|cycline|mycin|azole|CTX-M|KPC|NDM|VIM|IMP|mecA|vanA)\b/i;
  const ambiguousDate = !findings.length && /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/.test(normalized);
  if (ambiguousDate) findings.push({ type: "patient-date", confidence: .62 });
  const longNumber = !findings.length && /\b\d{7,14}\b/.test(normalized) && !normalized.split(/\r?\n/).some((line) => astLine.test(line) && /\b\d{7,14}\b/.test(line));
  if (longNumber) findings.push({ type: "other-potential-identifier", confidence: .55 });
  const definite = findings.some((item) => item.confidence >= .9);
  return { status: definite ? "phi-detected" : findings.length ? "possible-phi" : "clear", confidence: findings.length ? Math.max(...findings.map((item) => item.confidence)) : .86, findings, screeningVersion: PHI_SCREENING_VERSION };
}
