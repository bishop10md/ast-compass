import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const governance = read("src/data/scientificGovernance.ts");
const trust = read("src/features/TrustPage.tsx");
const issueLink = read("src/components/ScientificIssueLink.tsx");

test("scientific governance model captures provenance, review, verification, and change control", () => {
  for (const field of [
    "contentId",
    "contentType",
    "sourceIds",
    "standardOrGuideline",
    "editionOrVersion",
    "publicationOrUpdateDate",
    "astCompassContentVersion",
    "reviewStatus",
    "lastReviewedDate",
    "reviewerQualificationOrRole",
    "independentVerifier",
    "verificationDate",
    "changeHistory",
    "previousVersion",
    "newVersion",
    "reasonForChange",
    "affectedOrganismIds",
    "affectedAntimicrobialIds",
    "affectedModules",
  ]) assert.match(governance, new RegExp(`\\b${field}\\b`));
  assert.match(governance, /status: "Demo"/);
  assert.match(governance, /status: "Reviewed"/);
  assert.match(governance, /status: "Verified"/);
});

test("Trust Center explains sourcing and does not overstate review", () => {
  assert.match(trust, /Scientific Review &amp; Governance/);
  assert.match(trust, /How scientific content is sourced/);
  assert.match(trust, /Source inclusion does not itself mean/);
  assert.match(trust, /unless real review metadata exists/);
  assert.doesNotMatch(trust, /all (?:content|records) (?:is|are) (?:reviewed|verified)/i);
});

test("Trust Center distinguishes standards and provides unsupported-standard guidance", () => {
  assert.match(trust, /Supported Standards &amp; Scope/);
  assert.match(trust, /does not treat them as interchangeable/);
  assert.match(trust, /does not convert values between standards/);
  assert.match(trust, /Source: \{standard\.sourceLabel\}/);
  assert.match(governance, /This standard is not currently represented in AST Compass/);
  assert.match(governance, /locally authorized standard, validated laboratory procedure, and institutional policy/);
});

test("AI, update, clinical, privacy, and issue-reporting boundaries are explicit", () => {
  assert.match(governance, /AI is not the scientific source of truth for AST Compass/);
  assert.match(governance, /Scientific review/);
  assert.match(governance, /Versioned release/);
  assert.match(governance, /does not provide patient-specific treatment recommendations/);
  assert.match(trust, /Privacy &amp; No-PHI policy/);
  assert.match(issueLink, /Report a scientific issue/);
  assert.match(trust, /ScientificIssueLink contentId="trust-center"/);
  assert.match(issueLink, /category: "Scientific content \/ possible error"/);
  assert.doesNotMatch(issueLink, /patient(Name|Data)|micTable|imageContent/);
});
