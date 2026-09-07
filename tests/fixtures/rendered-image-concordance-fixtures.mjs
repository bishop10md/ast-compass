/**
 * Deterministic, browser-renderable synthetic AST table fixtures.
 *
 * The cells are OCR test tokens only. They are deliberately not tied to an
 * organism, marker, breakpoint authority, or scientifically coherent profile.
 * Do not use these fixtures for clinical or scientific interpretation.
 */

const ROW_LABELS = Object.freeze([
  "Penicillin",
  "Ampicillin",
  "Amoxicillin",
  "Amoxicillin-clavulanate",
  "Ampicillin-sulbactam",
  "Piperacillin-tazobactam",
  "Oxacillin",
  "Cefoxitin",
  "Cefazolin",
  "Cefuroxime",
  "Cefotaxime",
  "Ceftriaxone",
  "Ceftazidime",
  "Cefepime",
  "Ceftaroline",
  "Aztreonam",
  "Ertapenem",
  "Imipenem",
  "Meropenem",
  "Doripenem",
  "Ceftazidime-avibactam",
  "Ceftolozane-tazobactam",
  "Meropenem-vaborbactam",
  "Imipenem-relebactam",
  "Cefiderocol",
  "Amikacin",
  "Gentamicin",
  "Tobramycin",
  "Plazomicin",
  "Ciprofloxacin",
  "Levofloxacin",
  "Moxifloxacin",
  "Nalidixic acid",
  "Trimethoprim-sulfamethoxazole",
  "Trimethoprim",
  "Tetracycline",
  "Doxycycline",
  "Minocycline",
  "Tigecycline",
  "Eravacycline",
]);

const MIC_TOKENS = Object.freeze(["<0.25", "≤0.5", "=1", "2", ">4", "≥8", "<=0.125", ">=64", "0.5", "16"]);
const CATEGORY_TOKENS = Object.freeze(["S", "I", "R", "SDD", "NS"]);

const scenario = (definition) => {
  const rows = ROW_LABELS.slice(0, definition.rowCount).map((label, index) => Object.freeze({
    index,
    label,
    mic: MIC_TOKENS[index % MIC_TOKENS.length],
    category: CATEGORY_TOKENS[index % CATEGORY_TOKENS.length],
  }));

  return Object.freeze({
    synthetic: true,
    scientificInterpretationAllowed: false,
    ...definition,
    tags: Object.freeze([...definition.tags]),
    rows: Object.freeze(rows),
  });
};

/**
 * The scenario label and metadata are kept outside the generated SVG. The SVG
 * itself contains only generic synthetic-table copy and test cells.
 */
export const renderedImageConcordanceScenarios = Object.freeze([
  scenario({
    id: "clean-screen-5",
    label: "Clean screenshot",
    tags: ["clean_screenshot"],
    rowCount: 5,
    width: 1100,
    height: 430,
    columnGroups: 1,
    rowHeight: 42,
    fontSize: 18,
    foreground: "#102f2b",
    grid: "#9bb8b1",
    background: "#ffffff",
  }),
  scenario({
    id: "handheld-capture-10",
    label: "Phone-photo simulation",
    tags: ["phone_photo_simulation"],
    rowCount: 10,
    width: 1200,
    height: 720,
    columnGroups: 1,
    rowHeight: 43,
    fontSize: 18,
    foreground: "#173733",
    grid: "#a9bbb6",
    background: "#e9ece8",
    phonePhotoSimulation: true,
    rotationDegrees: 1.4,
    skewDegrees: 0.8,
    blurStdDeviation: 0.35,
    glare: true,
  }),
  scenario({
    id: "slight-rotation-skew-10",
    label: "Slight rotation and skew",
    tags: ["rotation", "skew"],
    rowCount: 10,
    width: 1200,
    height: 720,
    columnGroups: 1,
    rowHeight: 43,
    fontSize: 18,
    foreground: "#102f2b",
    grid: "#9bb8b1",
    background: "#f7f8f5",
    rotationDegrees: 2.25,
    skewDegrees: 1.25,
  }),
  scenario({
    id: "low-contrast-10",
    label: "Low contrast",
    tags: ["low_contrast"],
    rowCount: 10,
    width: 1200,
    height: 690,
    columnGroups: 1,
    rowHeight: 43,
    fontSize: 18,
    foreground: "#7f8986",
    grid: "#d0d7d4",
    background: "#f4f5f3",
    contentOpacity: 0.64,
  }),
  scenario({
    id: "small-text-20",
    label: "Small text",
    tags: ["small_text", "long_table"],
    rowCount: 20,
    width: 1200,
    height: 790,
    columnGroups: 1,
    rowHeight: 29,
    fontSize: 10,
    foreground: "#102f2b",
    grid: "#a8bbb6",
    background: "#ffffff",
  }),
  scenario({
    id: "long-report-20",
    label: "20-row report",
    tags: ["long_table", "row_count_20"],
    rowCount: 20,
    width: 1200,
    height: 1050,
    columnGroups: 1,
    rowHeight: 40,
    fontSize: 16,
    foreground: "#102f2b",
    grid: "#9bb8b1",
    background: "#ffffff",
  }),
  scenario({
    id: "long-report-30",
    label: "30-row report",
    tags: ["long_table", "row_count_30"],
    rowCount: 30,
    width: 1200,
    height: 1410,
    columnGroups: 1,
    rowHeight: 39,
    fontSize: 15,
    foreground: "#102f2b",
    grid: "#9bb8b1",
    background: "#ffffff",
  }),
  scenario({
    id: "long-report-40",
    label: "40-row report",
    tags: ["long_table", "row_count_40"],
    rowCount: 40,
    width: 1200,
    height: 1720,
    columnGroups: 1,
    rowHeight: 36,
    fontSize: 14,
    foreground: "#102f2b",
    grid: "#9bb8b1",
    background: "#ffffff",
  }),
  scenario({
    id: "mic-operators-10",
    label: "MIC operators",
    tags: ["mic_operators"],
    rowCount: 10,
    width: 1200,
    height: 690,
    columnGroups: 1,
    rowHeight: 43,
    fontSize: 18,
    foreground: "#102f2b",
    grid: "#9bb8b1",
    background: "#ffffff",
    requiredMicTokens: MIC_TOKENS,
  }),
  scenario({
    id: "repeated-columns-30",
    label: "Repeated, multiple column groups",
    tags: ["multiple_columns", "repeated_headers", "row_count_30"],
    rowCount: 30,
    width: 1600,
    height: 910,
    columnGroups: 2,
    rowHeight: 42,
    fontSize: 15,
    foreground: "#102f2b",
    grid: "#9bb8b1",
    background: "#ffffff",
    repeatedHeaders: true,
  }),
  scenario({
    id: "poor-quality-10",
    label: "Poor quality",
    tags: ["poor_quality", "blur", "low_contrast"],
    rowCount: 10,
    width: 720,
    height: 510,
    columnGroups: 1,
    rowHeight: 31,
    fontSize: 9,
    foreground: "#89918f",
    grid: "#d5d9d7",
    background: "#f2f2f0",
    contentOpacity: 0.48,
    rotationDegrees: 3.5,
    skewDegrees: 2.25,
    blurStdDeviation: 1.45,
    qualityExpectation: "POOR",
  }),
  scenario({
    id: "partial-crop-10",
    label: "Partial crop",
    tags: ["partial_crop"],
    rowCount: 10,
    width: 1100,
    height: 518,
    columnGroups: 1,
    rowHeight: 40,
    fontSize: 17,
    foreground: "#102f2b",
    grid: "#9bb8b1",
    background: "#ffffff",
    partialCrop: true,
    expectedPartiallyVisibleRows: 1,
  }),
]);

export const renderedScenarioById = (id) => renderedImageConcordanceScenarios.find((candidate) => candidate.id === id);

const escapeXml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const groupRows = (fixture) => {
  if (fixture.columnGroups === 1) return [fixture.rows];
  const perGroup = Math.ceil(fixture.rows.length / fixture.columnGroups);
  return Array.from({ length: fixture.columnGroups }, (_, groupIndex) => fixture.rows.slice(groupIndex * perGroup, (groupIndex + 1) * perGroup));
};

const renderTableGroup = ({ fixture, rows, groupIndex, x, y, width }) => {
  const headerHeight = 40;
  const tableHeight = headerHeight + rows.length * fixture.rowHeight;
  const drugWidth = width * 0.58;
  const micWidth = width * 0.22;
  const micX = x + drugWidth;
  const categoryX = micX + micWidth;
  const headerY = y + 26;
  const textInset = Math.max(10, fixture.fontSize * 0.8);
  const lines = [];

  lines.push(`<g data-role="table-group" data-group="${groupIndex + 1}">`);
  lines.push(`<rect x="${x}" y="${y}" width="${width}" height="${tableHeight}" rx="8" fill="#ffffff" stroke="${fixture.grid}" stroke-width="2"/>`);
  lines.push(`<rect x="${x}" y="${y}" width="${width}" height="${headerHeight}" rx="8" fill="#dfece7"/>`);
  lines.push(`<line x1="${micX}" y1="${y}" x2="${micX}" y2="${y + tableHeight}" stroke="${fixture.grid}"/>`);
  lines.push(`<line x1="${categoryX}" y1="${y}" x2="${categoryX}" y2="${y + tableHeight}" stroke="${fixture.grid}"/>`);
  lines.push(`<text data-role="header-drug" x="${x + textInset}" y="${headerY}" font-size="${Math.max(11, fixture.fontSize - 1)}" font-weight="700">ANTIMICROBIAL</text>`);
  lines.push(`<text data-role="header-mic" x="${micX + textInset}" y="${headerY}" font-size="${Math.max(11, fixture.fontSize - 1)}" font-weight="700">MIC / ZONE</text>`);
  lines.push(`<text data-role="header-category" x="${categoryX + textInset}" y="${headerY}" font-size="${Math.max(11, fixture.fontSize - 1)}" font-weight="700">CATEGORY</text>`);

  for (const [localIndex, row] of rows.entries()) {
    const rowTop = y + headerHeight + localIndex * fixture.rowHeight;
    const baseline = rowTop + fixture.rowHeight * 0.68;
    if (localIndex % 2 === 1) lines.push(`<rect x="${x}" y="${rowTop}" width="${width}" height="${fixture.rowHeight}" fill="#f4f8f6"/>`);
    lines.push(`<line x1="${x}" y1="${rowTop}" x2="${x + width}" y2="${rowTop}" stroke="${fixture.grid}"/>`);
    lines.push(`<text data-role="drug" data-row="${row.index + 1}" x="${x + textInset}" y="${baseline}" font-size="${fixture.fontSize}">${escapeXml(row.label)}</text>`);
    lines.push(`<text data-role="mic" data-row="${row.index + 1}" x="${micX + textInset}" y="${baseline}" font-size="${fixture.fontSize}">${escapeXml(row.mic)}</text>`);
    lines.push(`<text data-role="category" data-row="${row.index + 1}" x="${categoryX + textInset}" y="${baseline}" font-size="${fixture.fontSize}">${escapeXml(row.category)}</text>`);
  }
  lines.push("</g>");
  return lines.join("\n");
};

/**
 * Return a self-contained SVG with no scripts, external resources, or runtime
 * dependencies. SVG output is deterministic for a given fixture.
 */
export function renderImageConcordanceFixtureSvg(fixture) {
  if (!fixture || fixture.synthetic !== true || !Array.isArray(fixture.rows)) throw new TypeError("A rendered fixture scenario is required.");
  const margin = 44;
  const tableTop = 92;
  const groupGap = 28;
  const groups = groupRows(fixture);
  const groupWidth = (fixture.width - margin * 2 - groupGap * (groups.length - 1)) / groups.length;
  const rotate = fixture.rotationDegrees ?? 0;
  const skew = fixture.skewDegrees ?? 0;
  const transform = rotate || skew
    ? ` transform="rotate(${rotate} ${fixture.width / 2} ${fixture.height / 2}) skewX(${skew})"`
    : "";
  const filterId = fixture.blurStdDeviation ? `soften-${fixture.id}` : "";
  const filter = filterId
    ? `<filter id="${filterId}" x="-8%" y="-8%" width="116%" height="116%"><feGaussianBlur stdDeviation="${fixture.blurStdDeviation}"/></filter>`
    : "";
  const photoGradient = fixture.phonePhotoSimulation
    ? '<linearGradient id="capture-light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8ddd8"/><stop offset="0.56" stop-color="#f6f3e9"/><stop offset="1" stop-color="#cdd4ce"/></linearGradient>'
    : "";
  const tableMarkup = groups.map((rows, groupIndex) => renderTableGroup({
    fixture,
    rows,
    groupIndex,
    x: margin + groupIndex * (groupWidth + groupGap),
    y: tableTop,
    width: groupWidth,
  })).join("\n");
  const foreground = fixture.foreground ?? "#102f2b";
  const contentOpacity = fixture.contentOpacity ?? 1;
  const backgroundFill = fixture.phonePhotoSimulation ? "url(#capture-light)" : fixture.background;
  const glare = fixture.glare
    ? `<path d="M${fixture.width * 0.62} 0 L${fixture.width * 0.92} 0 L${fixture.width * 0.56} ${fixture.height} L${fixture.width * 0.35} ${fixture.height} Z" fill="#ffffff" opacity="0.16" pointer-events="none"/>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fixture.width}" height="${fixture.height}" viewBox="0 0 ${fixture.width} ${fixture.height}" role="img" aria-labelledby="fixture-title fixture-description" data-synthetic="true">`,
    '<title id="fixture-title">Synthetic OCR benchmark table</title>',
    '<desc id="fixture-description">Synthetic antimicrobial rows for local rendering tests only.</desc>',
    `<defs>${filter}${photoGradient}</defs>`,
    `<rect width="${fixture.width}" height="${fixture.height}" fill="${backgroundFill}"/>`,
    `<g fill="${foreground}" font-family="Arial, Helvetica, sans-serif" opacity="${contentOpacity}"${transform}${filterId ? ` filter="url(#${filterId})"` : ""}>`,
    '<text x="44" y="38" font-size="22" font-weight="700" letter-spacing="1.5">SYNTHETIC OCR BENCHMARK</text>',
    '<text x="44" y="66" font-size="14" letter-spacing="0.8">TEST CELLS ONLY — DO NOT INTERPRET</text>',
    tableMarkup,
    "</g>",
    glare,
    "</svg>",
  ].join("\n");
}
