/**
 * Synthetic AST-table extraction fixtures.
 *
 * These fixtures contain no patient, specimen, accession, date, facility, or
 * other identifying data. Their category tokens are arbitrary OCR test cells;
 * they are not clinically coherent profiles and must never be interpreted.
 */

const antimicrobialRows = [
  ["penicillin", "Penicillin"],
  ["ampicillin", "Ampicillin"],
  ["amoxicillin", "Amoxicillin"],
  ["amox_clav", "Amoxicillin-clavulanate"],
  ["amp_sulb", "Ampicillin-sulbactam"],
  ["pip_tazo", "Piperacillin-tazobactam"],
  ["oxacillin", "Oxacillin"],
  ["cefoxitin", "Cefoxitin"],
  ["cefazolin", "Cefazolin"],
  ["cefuroxime", "Cefuroxime"],
  ["cefotaxime", "Cefotaxime"],
  ["ceftriaxone", "Ceftriaxone"],
  ["ceftazidime", "Ceftazidime"],
  ["cefepime", "Cefepime"],
  ["ceftaroline", "Ceftaroline"],
  ["aztreonam", "Aztreonam"],
  ["ertapenem", "Ertapenem"],
  ["imipenem", "Imipenem"],
  ["meropenem", "Meropenem"],
  ["doripenem", "Doripenem"],
  ["caz_avi", "Ceftazidime-avibactam"],
  ["cef_tol_tazo", "Ceftolozane-tazobactam"],
  ["mero_vabor", "Meropenem-vaborbactam"],
  ["imi_rel", "Imipenem-cilastatin-relebactam"],
  ["cefiderocol", "Cefiderocol"],
  ["amikacin", "Amikacin"],
  ["gentamicin", "Gentamicin"],
  ["tobramycin", "Tobramycin"],
  ["plazomicin", "Plazomicin"],
  ["ciprofloxacin", "Ciprofloxacin"],
  ["levofloxacin", "Levofloxacin"],
  ["moxifloxacin", "Moxifloxacin"],
  ["nalidixic", "Nalidixic acid"],
  ["trim_sulfa", "Trimethoprim-sulfamethoxazole"],
  ["trimethoprim", "Trimethoprim"],
  ["tetracycline", "Tetracycline"],
  ["doxycycline", "Doxycycline"],
  ["minocycline", "Minocycline"],
  ["tigecycline", "Tigecycline"],
  ["eravacycline", "Eravacycline"],
];

const measurements = ["<0.25", "≤0.5", "=1", "2", ">4", "≥8", "<=0.125", ">=64"];
const categories = ["S", "I", "R", "SDD", "NS"];

function expectedRows(rowCount) {
  return antimicrobialRows.slice(0, rowCount).map(([antimicrobialId, antimicrobial], index) => ({
    antimicrobialId,
    antimicrobial,
    mic: measurements[index % measurements.length],
    category: categories[index % categories.length],
  }));
}

function renderSingleColumn(rows, headings = ["Antimicrobial", "MIC", "Category"], partialCrop = false) {
  const body = rows.map((row, index) => partialCrop && index === rows.length - 1
    ? `${row.antimicrobial} |`
    : `${row.antimicrobial} | ${row.mic} | ${row.category}`);
  return ["SYNTHETIC AST TABLE", headings.join(" | "), ...body].join("\n");
}

function renderTwoColumns(rows) {
  const midpoint = Math.ceil(rows.length / 2);
  const left = rows.slice(0, midpoint);
  const right = rows.slice(midpoint);
  const body = left.map((row, index) => {
    const other = right[index];
    const first = `${row.antimicrobial} | ${row.mic} | ${row.category}`;
    return other ? `${first} || ${other.antimicrobial} | ${other.mic} | ${other.category}` : first;
  });
  return ["SYNTHETIC AST TABLE", "Drug | Result | Interpretation || Drug | Result | Interpretation", ...body].join("\n");
}

function fixture({ id, rowCount, sourceKind, width, height, qualityExpectation, columnCount = 1, rotationDegrees = 0, skewDegrees = 0, partialCrop = false, headings, blurVariance = 125, contrastStdDev = 34, estimatedTextHeightPx = 16 }) {
  const rows = expectedRows(rowCount);
  return Object.freeze({
    id,
    description: `Synthetic ${rowCount}-row extraction fixture`,
    synthetic: true,
    scientificInterpretationAllowed: false,
    metadata: Object.freeze({
      sourceKind,
      width,
      height,
      qualityExpectation,
      columnCount,
      rotationDegrees,
      rotationConfidence: rotationDegrees ? 0.9 : 1,
      skewDegrees,
      skewConfidence: 0.9,
      blurVariance,
      contrastStdDev,
      estimatedTextHeightPx,
      partialCrop,
    }),
    expectedIncompleteRows: partialCrop ? 1 : 0,
    rawOcrText: columnCount === 2 ? renderTwoColumns(rows) : renderSingleColumn(rows, headings, partialCrop),
    expectedRows: Object.freeze(rows.map(Object.freeze)),
  });
}

export const imageConcordanceFixtures = Object.freeze([
  fixture({ id: "clean-screen-5", rowCount: 5, sourceKind: "clean_screenshot", width: 1200, height: 900, qualityExpectation: "GOOD" }),
  fixture({ id: "phone-photo-10", rowCount: 10, sourceKind: "phone_photo", width: 3024, height: 4032, qualityExpectation: "FAIR", rotationDegrees: 1.5, skewDegrees: 0.8, blurVariance: 78, contrastStdDev: 22, estimatedTextHeightPx: 12, headings: ["Antibiotic", "MIC", "Interpretation"] }),
  fixture({ id: "dense-small-text-20", rowCount: 20, sourceKind: "small_text", width: 1600, height: 2200, qualityExpectation: "FAIR", estimatedTextHeightPx: 9, headings: ["Antimicrobial", "Result", "Category"] }),
  fixture({ id: "rotated-multi-column-30", rowCount: 30, sourceKind: "rotated_report", width: 2400, height: 3200, qualityExpectation: "FAIR", columnCount: 2, rotationDegrees: 7, skewDegrees: 2.5 }),
  fixture({ id: "dense-multi-column-40", rowCount: 40, sourceKind: "dense_report", width: 3000, height: 4200, qualityExpectation: "FAIR", columnCount: 2, estimatedTextHeightPx: 11 }),
  fixture({ id: "poor-quality-5", rowCount: 5, sourceKind: "poor_quality", width: 480, height: 320, qualityExpectation: "POOR", skewDegrees: 4, blurVariance: 20, contrastStdDev: 8, estimatedTextHeightPx: 5 }),
  fixture({ id: "partial-crop-10", rowCount: 10, sourceKind: "partially_cropped", width: 900, height: 1100, qualityExpectation: "FAIR", partialCrop: true, blurVariance: 85, contrastStdDev: 24, estimatedTextHeightPx: 11 }),
]);

export const fixtureById = (id) => imageConcordanceFixtures.find((fixtureRecord) => fixtureRecord.id === id);
