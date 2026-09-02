import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { filterSearchOptions, sortAlphabetically } from "../src/utils/search-core.mjs";
import { parseMeasurement } from "../src/features/measurement-core.mjs";
import { screenPhiText } from "../src/features/phi-screening-core.mjs";

test("alphabetical sorting is case-insensitive and does not mutate input", () => {
  const source = [{ label: "vanA/B" }, { label: "CTX-M" }, { label: "mecA/C" }];
  assert.deepEqual(sortAlphabetically(source, (item) => item.label).map((item) => item.label), ["CTX-M", "mecA/C", "vanA/B"]);
  assert.equal(source[0].label, "vanA/B");
});

test("search finds scientific names, aliases, and descriptions", () => {
  const options = [{ value: "ecoli", label: "Escherichia coli", aliases: ["E. coli"], description: "Enterobacterales" }];
  assert.equal(filterSearchOptions(options, "e coli").length, 1);
  assert.equal(filterSearchOptions(options, "enterobacterales").length, 1);
});

test("MIC operators are preserved and parsed", () => {
  assert.deepEqual(parseMeasurement("<= 1"), { operator: "<=", value: 1 });
  assert.deepEqual(parseMeasurement("≥64"), { operator: ">=", value: 64 });
  assert.deepEqual(parseMeasurement("no value"), {});
});

test("image workflow keeps the PHI gate and human confirmation contract", async () => {
  const source = await readFile(new URL("../src/features/ImageConcordanceAnalyzer.tsx", import.meta.url), "utf8");
  assert.match(source, /contains no PHI/);
  assert.match(source, /Checking image privacy/);
  assert.match(source, /phiScreen\.status !== "clear"/);
  assert.match(source, /disabled=\{!phiAcknowledged\}/);
  assert.match(source, /Human confirmation required/);
  assert.match(source, /no permanent storage before screening/);
  assert.match(source, /image\/jpeg,image\/png,image\/webp/);
});

test("PHI screening rejects identifiers and passes AST-only text", () => {
  for (const text of ["Patient: Jane Smith", "MRN: 12345678", "DOB: 05/17/1982", "Phone 312-555-1212", "jane@example.com", "Accession # AB-12345", "123 Main Street"]) assert.notEqual(screenPhiText(text).status, "clear", text);
  assert.equal(screenPhiText("Escherichia coli\nCeftriaxone <=1 S\nMeropenem >=16 R\nCTX-M detected").status, "clear");
  assert.equal(screenPhiText("", { barcode: true }).status, "phi-detected");
  assert.equal(screenPhiText("", { face: true }).status, "phi-detected");
  assert.equal(screenPhiText("", { ocrFailure: true }).status, "unable-to-screen");
  assert.equal(screenPhiText("", { scannerUnavailable: true }).status, "unable-to-screen");
  assert.equal(screenPhiText("Report date 05/17/2026").status, "possible-phi");
});

test("account architecture is optional, provider-backed, and owner scoped", async () => {
  const account = await readFile(new URL("../src/features/AccountWorkspace.tsx", import.meta.url), "utf8");
  const auth = await readFile(new URL("../src/auth/AuthContext.tsx", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20260901_private_workspace.sql", import.meta.url), "utf8");
  assert.match(account, /Continue as a guest for full educational access/);
  assert.match(account, /Continue with Google/);
  assert.match(auth, /signInWithPassword/);
  assert.match(auth, /resetPasswordForEmail/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(migration, /ast-images/);
  assert.match(migration, /phi_screening_status.*'clear'/s);
});

test("Supabase client and services never expose a service-role credential", async () => {
  const client = await readFile(new URL("../src/lib/supabase.ts", import.meta.url), "utf8");
  const env = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  const analysis = await readFile(new URL("../src/services/analysisService.ts", import.meta.url), "utf8");
  const image = await readFile(new URL("../src/services/imageService.ts", import.meta.url), "utf8");
  assert.match(client, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(`${client}\n${env}\n${analysis}\n${image}`, /VITE_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(analysis, /requireAuthenticatedUser/);
  assert.match(image, /phi\.status !== "clear"/);
  assert.match(image, /createSignedUrl\(storagePath, 300\)/);
  assert.match(image, /crypto\.randomUUID\(\)/);
});

test("BCID2 panel definition contains the complete 43-target manufacturer menu", async () => {
  const source = await readFile(new URL("../src/data/bcid2Panel.ts", import.meta.url), "utf8");
  const organismRows = source.match(/^  target\(.*$/gm) || [];
  const markerRows = source.match(/^  marker\(/gm) || [];
  assert.equal(organismRows.length, 33);
  assert.equal(organismRows.filter((row) => row.includes('"Gram-negative bacteria"')).length, 15);
  assert.equal(organismRows.filter((row) => row.includes('"Gram-positive bacteria"')).length, 11);
  assert.equal(organismRows.filter((row) => row.includes('"Yeast"')).length, 7);
  assert.equal(markerRows.length, 10);
  assert.match(source, /totalTargets: 43/);
  assert.match(source, /bacterialTargets: 26/);
  assert.match(source, /yeastTargets: 7/);
  assert.match(source, /resistanceTargets: 10/);
});

test("BCID2 group hierarchy and five distinct carbapenemases are preserved", async () => {
  const source = await readFile(new URL("../src/data/bcid2Panel.ts", import.meta.url), "utf8");
  for (const parent of ["enterobacterales", "staphylococcus-spp", "streptococcus-spp"]) assert.match(source, new RegExp('"' + parent + '"'));
  for (const marker of ["IMP", "KPC", "NDM", "OXA-48-like", "VIM"]) assert.match(source, new RegExp('"' + marker + '"'));
  assert.match(source, /Metallo-beta-lactamase/);
  assert.match(source, /Serine carbapenemase/);
});

test("BCID workflow uses panel targets and keeps conservative result boundaries", async () => {
  const source = await readFile(new URL("../src/features/BcidForecast.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/concordance.css", import.meta.url), "utf8");
  assert.match(source, /bcid2Panel\.targets\.map/);
  assert.doesNotMatch(source, /new Set\(bcidForecasts\.map/);
  assert.match(source, /Absence of a panel marker does not establish susceptibility/);
  assert.match(source, /NO ORGANISM-SPECIFIC BCID2 AMR MARKER AVAILABLE/);
  assert.match(source, /No reviewed forecast is available for this exact combination/);
  assert.match(source, /GENE-TO-ORGANISM ATTRIBUTION CAUTION/);
  const forecastLookup = source.slice(source.indexOf("function forecastsFor"), source.indexOf("export default function"));
  assert.ok(forecastLookup.indexOf("const exact = bcidForecasts.filter") < forecastLookup.indexOf("const parent = target.parentId"));
  assert.match(css, /@media\(max-width:760px\).*bcid-workflow\{grid-template-columns:1fr\}/s);
});

test("BCID2 compatibility is a dedicated bidirectional data layer", async () => {
  const compatibility = await readFile(new URL("../src/data/bcid2Compatibility.ts", import.meta.url), "utf8");
  const panel = await readFile(new URL("../src/data/bcid2Panel.ts", import.meta.url), "utf8");
  const forecasts = await readFile(new URL("../src/data/bcidForecasts.ts", import.meta.url), "utf8");
  assert.match(compatibility, /getMarkersForOrganism/);
  assert.match(compatibility, /getOrganismsForMarker/);
  assert.match(compatibility, /isCompatibleBcidPair/);
  assert.doesNotMatch(panel, /getMarkersForOrganism/);
  assert.doesNotMatch(forecasts, /getMarkersForOrganism/);
});

test("BCID2 compatibility excludes biologically unrelated selector combinations", async () => {
  const source = await readFile(new URL("../src/data/bcid2Compatibility.ts", import.meta.url), "utf8");
  assert.match(source, /rule\("s-aureus", "meca-c-mrej"\)/);
  assert.match(source, /rule\("s-epidermidis", "meca-c"\)/);
  assert.match(source, /rule\("e-faecium", "vana-b"\)/);
  assert.match(source, /\["imp", "kpc", "ndm", "vim"\].*"p-aeruginosa"/s);
  assert.doesNotMatch(source, /rule\("e-coli", "meca-c/);
  assert.doesNotMatch(source, /rule\("e-coli", "vana-b"/);
  assert.doesNotMatch(source, /rule\("s-aureus", "ctx-m"/);
  assert.doesNotMatch(source, /rule\("e-faecium", "kpc"/);
  assert.doesNotMatch(source, /rule\("s-pneumoniae",/);
});

test("BCID selector supports reverse filtering and smart incompatible resets", async () => {
  const source = await readFile(new URL("../src/features/BcidForecast.tsx", import.meta.url), "utf8");
  assert.match(source, /Start with/i);
  assert.match(source, /getOrganismsForMarker/);
  assert.match(source, /getMarkersForOrganism/);
  assert.match(source, /setMarkerIds\(\(current\) => current\.filter\(\(id\) => allowed\.has\(id\)\)\)/);
  assert.match(source, /Show advanced\/conditional marker associations/);
  assert.match(source, /NO ORGANISM-SPECIFIC BCID2 AMR MARKER AVAILABLE/);
  assert.match(source, /Absence of a panel marker does not establish susceptibility/);
  assert.doesNotMatch(source, />Susceptible</);
});

test("BCID multiplex workflow supports many-to-many results without forced attribution", async () => {
  const ui = await readFile(new URL("../src/features/BcidForecast.tsx", import.meta.url), "utf8");
  const compatibility = await readFile(new URL("../src/data/bcid2Compatibility.ts", import.meta.url), "utf8");
  const combined = await readFile(new URL("../src/data/bcidCombinedForecasts.ts", import.meta.url), "utf8");
  assert.match(ui, /useState<string\[\]>\(\["e-coli"\]\)/);
  assert.match(ui, /Detected organism\(s\)/);
  assert.match(ui, /Detected resistance marker\(s\)/);
  assert.match(ui, /MULTIPLEX ATTRIBUTION CAUTION/);
  assert.match(ui, /Attribution matrix/);
  assert.match(ui, /Primary · uncertain attribution/);
  assert.match(ui, /Showing the union of BCID2 markers relevant to all selected organisms/);
  assert.match(compatibility, /assessBcidPairs/);
  assert.match(compatibility, /compatibleOrganisms\.length === 1/);
  assert.match(combined, /getCombinedForecast/);
  assert.match(combined, /k-pneumoniae-group:ctx-m\+kpc/);
  assert.match(combined, /no reviewed combined forecast is available/i);
});
