import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const topicSource = await readFile(new URL("../src/data/educationalTopics.ts", import.meta.url), "utf8");
const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
const breakpointSource = await readFile(new URL("../src/features/BreakpointEngine.tsx", import.meta.url), "utf8");
const referencesSource = await readFile(new URL("../src/data/references.ts", import.meta.url), "utf8");

const slugs = [
  "kpc-resistance-mechanism",
  "ctx-m-expected-phenotype",
  "meca-pbp2a-interpretation",
  "vana-versus-vanb",
  "bcid-resistance-markers",
  "gene-phenotype-discordance",
  "mic-breakpoint-interpretation",
];

test("seven distinct, indexable educational guides are defined", () => {
  for (const slug of slugs) {
    assert.match(topicSource, new RegExp(`slug: ["']${slug}["']`));
    assert.match(sitemap, new RegExp(`https://www\\.astcompass\\.com/learn/topics/${slug}`));
  }
  assert.equal((topicSource.match(/slug: "/g) || []).length, 7);
});

test("guides preserve educational boundaries and source provenance", () => {
  assert.match(topicSource, /sourceIds:/);
  assert.match(topicSource, /does not provide patient-specific treatment guidance|does not independently determine a treatment choice/);
  assert.match(appSource, /Learning guides/);
  assert.match(appSource, /educationalTopicBySlug/);
  assert.match(topicSource, /ref-mcm13/);
  assert.match(topicSource, /ref-cmph5/);
  assert.match(referencesSource, /Manual of Clinical Microbiology, 4 Volume Set, 13th Edition/);
  assert.match(referencesSource, /Clinical Microbiology Procedures Handbook, Multi-Volume, 5th Edition/);
  assert.match(referencesSource, /pubmed\.ncbi\.nlm\.nih\.gov\/33441396/);
  assert.match(referencesSource, /doi:10\.1128\/JCM\.00138-20/);
});

test("breakpoint engine remains separate from educational topic implementation", () => {
  assert.doesNotMatch(breakpointSource, /educationalTopics|EducationalTopicPage/);
});
