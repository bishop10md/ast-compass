import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("feedback offers the governed categories and retains the No-PHI boundary", () => {
  const feedback = read("src/features/Feedback.tsx");
  const service = read("src/services/feedbackService.ts");
  for (const category of ["Scientific content / possible error", "Usability", "Missing organism/drug", "Missing resistance mechanism", "Breakpoint/standard request", "Feature request", "Privacy/security", "General feedback"]) assert.ok(feedback.includes(category));
  assert.match(feedback, /do not include patient information or PHI/i);
  assert.match(feedback, /AST image text, or private analysis content/);
  assert.match(read("supabase/migrations/20260906_feedback_governance.sql"), /add column if not exists category/);
  assert.match(service, /PGRST204/);
  assert.match(service, /42703/);
  assert.doesNotMatch(service, /if \(\/category\|content_id\|schema cache/i);
});

test("scientific issue reporting carries only public safe context", () => {
  const issue = read("src/components/ScientificIssueLink.tsx");
  assert.match(issue, /Scientific content \/ possible error/);
  assert.match(issue, /APP_VERSION/);
  assert.match(issue, /safeToken/);
  assert.doesNotMatch(issue, /MIC|patient|image content|analysis content/i);
});

test("mechanisms use progressive disclosure and only source-backed phenotype visuals", () => {
  const app = read("src/App.tsx");
  const meta = read("src/data/mechanismLiterature.ts");
  const visual = read("src/components/IllustrativePhenotypeCard.tsx");
  assert.match(app, /Typical phenotype \/ important pattern/);
  assert.match(app, /Explore mechanism/);
  assert.match(meta, /illustrativePhenotype/);
  assert.match(meta, /sourceIds: \["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-ctxm-review"\]/);
  assert.match(meta, /needsIllustrativePhenotypeReview: true/);
  assert.match(visual, /ILLUSTRATIVE PHENOTYPE|Illustrative phenotype/);
  assert.match(visual, /NOT A PATIENT RESULT/);
  assert.match(visual, /indicatorText/);
  assert.match(visual, /spec\.sourceIds/);
  assert.match(visual, /phenotype-sources/);
});

test("satisfaction is optional, aggregate, and non-modal", () => {
  const prompt = read("src/components/SatisfactionPrompt.tsx");
  const bcid = read("src/features/BcidForecast.tsx");
  const image = read("src/features/ImageConcordanceAnalyzer.tsx");
  assert.match(prompt, /Was this useful/);
  assert.match(prompt, /Not quite/);
  assert.match(prompt, /aggregate response only/);
  assert.match(prompt, /trackSatisfaction/);
  assert.doesNotMatch(prompt, /role="dialog"|modal/i);
  assert.match(bcid, /hasInteracted && organisms\.length > 0/);
  assert.match(image, /!!results\.length&&<>.*SatisfactionPrompt/s);
});

test("M45 is planning only and protected scientific engines are not imported by governance code", () => {
  const plan = read("M45_EXPANSION_PLAN.md");
  const governance = read("src/data/scientificGovernance.ts");
  const types = read("src/data/types.ts");
  assert.match(plan, /Do not populate|no breakpoint values|must not be populated/i);
  assert.match(plan, /licensed|licensing/i);
  assert.match(types, /interface BreakpointSourceIdentity/);
  assert.match(types, /sourceIdentity\?: BreakpointSourceIdentity/);
  assert.doesNotMatch(governance, /BreakpointEngine|concordanceEngine|bcidForecasts/);
});

test("footer exposes References and Trust without expanding primary navigation", () => {
  const app = read("src/App.tsx");
  assert.match(app, /\['references','References'\],\['trust','Trust'\]/);
  assert.doesNotMatch(app, /const nav = \[[^\n]*\["trust", "Trust"\]/i);
});
