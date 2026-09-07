/** Entry-admission policy only. No OCR, biology, categories, or breakpoint inference. */
export const REVIEW_FIELDS = Object.freeze(['antimicrobial', 'measurement', 'category']);
export const INCOMPLETE_REVIEW_MESSAGE = 'AST Compass may not have extracted the complete susceptibility table. Compare the extracted results with the source image and add any missing rows.';
export const reviewValue = (row, key) => String(row[key] ?? '');
export const isFieldVerified = (row, review, key) => review?.fields?.[key]?.verified === true && review.fields[key].confirmedValue === reviewValue(row, key);
export const canConfirmRow = (row, review) => REVIEW_FIELDS.every(key => review?.fields?.[key]?.inspectedValue === reviewValue(row, key));
export function inspectField(review, row, key) {
  if (!review || !REVIEW_FIELDS.includes(key)) return review;
  return {...review, fields: {...review.fields, [key]: {...review.fields[key], inspectedValue: reviewValue(row, key)}}};
}
export function confirmField(review, row, key, verified) {
  if (!review || !REVIEW_FIELDS.includes(key)) return review;
  return {...review, fields: {...review.fields, [key]: {...review.fields[key], verified,
    inspectedValue: reviewValue(row, key), confirmedValue: verified ? reviewValue(row, key) : undefined}}};
}
export function confirmRow(review, row) {
  if (!canConfirmRow(row, review)) return review;
  return REVIEW_FIELDS.reduce((next, key) => confirmField(next, row, key, true), review);
}
export function humanReviewReadiness(rows, review, context) {
  const unverifiedFields = rows.reduce((count, row) => count + REVIEW_FIELDS.filter(key => !isFieldVerified(row, review[row.id], key)).length, 0);
  const rowsNeedingReview = rows.filter(row => REVIEW_FIELDS.some(key => !isFieldVerified(row, review[row.id], key))).length;
  const missing = [];
  if (context.busy) missing.push('wait for image processing to finish');
  if (context.hasImage && !context.privacyPassed) missing.push('complete full-image privacy screening');
  if (context.hasImage && !context.acknowledged) missing.push('confirm that this image is de-identified and contains no PHI');
  if (!context.organismId) missing.push('select an organism');
  if (!context.marker) missing.push('select a resistance marker');
  if (!rows.length) missing.push('add an antimicrobial row');
  if (rows.some(row => !row.antimicrobial.trim() || row.category === 'Unknown')) missing.push('correct every included antimicrobial and reported category, or remove unreadable rows; do not guess');
  if (context.duplicates) missing.push('remove or reconcile duplicate antimicrobial rows');
  if (unverifiedFields) missing.push('verify every included antimicrobial, MIC/zone (or its absence), and category');
  if (!context.confirmed) missing.push('confirm the overall review and check for missing rows');
  return {ready: missing.length === 0, missing, unverifiedFields, rowsNeedingReview};
}
