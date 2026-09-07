import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { knownCatalogId, knownSatisfactionResponse, knownWorkflowId } from "../src/lib/product-analytics-core.mjs";

test("structured analytics accepts exact catalog IDs and rejects arbitrary text", () => {
  const known = ["ecoli", "kpneumo"];
  assert.equal(knownCatalogId("ecoli", known), "ecoli");
  assert.equal(knownCatalogId("E. coli", known), null);
  assert.equal(knownCatalogId("ecoli patient 12345", known), null);
  assert.equal(knownCatalogId("MRN-123456", known), null);
  assert.equal(knownCatalogId(null, known), null);
});

test("satisfaction analytics uses closed aggregate response and workflow sets", () => {
  assert.equal(knownSatisfactionResponse("yes"), "yes");
  assert.equal(knownSatisfactionResponse("not_quite"), "not_quite");
  assert.equal(knownSatisfactionResponse("free-form explanation"), null);
  assert.equal(knownWorkflowId("bcid", ["bcid", "breakpoints"]), "bcid");
  assert.equal(knownWorkflowId("patient-specific workflow", ["bcid", "breakpoints"]), null);
});

test("product analytics exposes every requested aggregate event through privacy-safe helpers", async () => {
  const source = await readFile(new URL("../src/lib/productAnalytics.ts", import.meta.url), "utf8");
  for (const event of [
    "organism_searched",
    "antimicrobial_searched",
    "marker_searched",
    "mechanism_viewed",
    "breakpoint_lookup",
    "reference_viewed",
    "search_no_results",
    "satisfaction",
  ]) assert.match(source, new RegExp(`\\"${event}\\"`));
  assert.match(source, /knownCatalogId/);
  assert.match(source, /trackSearchNoResults\(\)/);
  assert.doesNotMatch(source, /trackSearchNoResults\([^)]*(query|searchText|term)/i);
  assert.doesNotMatch(source, /query_text|search_term|raw_query|free_text/i);
});

test("telemetry allows only the structured analytics fields, not raw-query fields", async () => {
  const source = await readFile(new URL("../src/lib/telemetry.ts", import.meta.url), "utf8");
  for (const field of [
    "organism_id",
    "antimicrobial_id",
    "marker_id",
    "mechanism_id",
    "reference_id",
    "standard_id",
    "workflow_id",
    "satisfaction_response",
  ]) assert.match(source, new RegExp(`\\"${field}\\"`));
  assert.match(source, /STRUCTURED_ID_PROPERTIES/);
  assert.match(source, /SAFE_STRUCTURED_ID/);
  assert.doesNotMatch(source, /"query"|"query_text"|"search_term"|"free_text"/i);
});

test("telemetry preserves antimicrobial IDs while blocking actual MIC fields", async () => {
  const source = await readFile(new URL("../src/lib/telemetry.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\|mic\|/i);
  assert.match(source, /\(\?:\^\|_\)mic/);
  assert.match(source, /"antimicrobial_id"/);
});
