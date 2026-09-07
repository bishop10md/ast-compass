import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("www.astcompass.com is canonical across runtime and static metadata", () => {
  const app = read("src/App.tsx");
  const html = read("index.html");
  const sitemap = read("public/sitemap.xml");
  const robots = read("public/robots.txt");
  assert.match(app, /const canonicalPath = selectedTopic/);
  assert.match(app, /https:\/\/www\.astcompass\.com\$\{canonicalPath\}/);
  assert.match(html, /rel="canonical" href="https:\/\/www\.astcompass\.com\/"/);
  assert.doesNotMatch(sitemap, /<loc>https:\/\/astcompass\.com/);
  assert.match(sitemap, /<loc>https:\/\/www\.astcompass\.com\//);
  assert.match(robots, /Sitemap: https:\/\/www\.astcompass\.com\/sitemap\.xml/);
});

test("transition leaves apex/www forwarding to Netlify while retaining the Netlify-host redirect", () => {
  const redirects = read("public/_redirects");
  const netlify = read("netlify.toml");
  assert.doesNotMatch(redirects, /^https?:\/\/(?:www\.)?astcompass\.com\/\*/m);
  assert.match(redirects, /https:\/\/astcompass\.netlify\.app\/\* https:\/\/www\.astcompass\.com\/:splat 301!/);
  assert.doesNotMatch(netlify, /from = "https?:\/\/(?:www\.)?astcompass\.com\/\*"/);
  assert.match(netlify, /from = "https:\/\/astcompass\.netlify\.app\/\*"[\s\S]*?to = "https:\/\/www\.astcompass\.com\/:splat"/);
  assert.match(redirects, /\/\* \/index\.html 200/);
});
