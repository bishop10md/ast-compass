import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const app = read('src/App.tsx');
test('actual route resolver handles bare mechanism hub, details, legacy paths and disabled accounts', () => {
  const raw = app.slice(app.indexOf('const routes:'), app.indexOf('const organismName'));
  const js = ts.transpileModule(raw + '\nconst answer = pageForPath(input);', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const run = input => new Function('input', 'ACCOUNT_FEATURES_ENABLED', 'mechanisms', 'educationalTopicBySlug', js + ';return answer;')(input, false, [{ id: 'esbl' }, { id: 'ampc' }], slug => slug === 'kpc-resistance-mechanism');
  for (const [path, page] of Object.entries({ '/resistance/mechanisms': 'resistance', '/resistance/mechanisms/ampc': 'mechanism', '/resistance/mechanisms/esbl': 'mechanism', '/learning': 'learning', '/detective': 'detective', '/references': 'references', '/references/coverage?drug=cro': 'coverage', '/auth/callback': 'notFound', '/signin': 'notFound', '/not-a-route': 'notFound' })) assert.equal(run(path), page, path);
});
test('dynamic detail paths update React state on internal navigation and browser back/forward', () => {
  assert.match(app, /\[routePath, setRoutePath\]/);
  assert.match(app, /mechanismForPath\(routePath\)/);
  assert.match(app, /cleanPath\(routePath\)/);
  assert.match(app, /const f = \(\) => \{ setPageState\(pageForPath\(location.pathname\)\); setRoutePath\(location.pathname\); \}; addEventListener\("popstate"/);
});
test('sitemap includes all intended public workflows without private or promo URLs', () => {
  const urls = [...read('public/sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]));
  assert.equal(urls.length, 36); assert.equal(new Set(urls.map(u => u.href)).size, 36);
  for (const path of ['/resistance/gene-to-phenotype', '/resistance/phenotype-to-mechanism', '/resistance/expected-phenotypes', '/concordance/image', '/learn/detective', '/learn/topics']) assert.ok(urls.some(u => u.pathname === path), path);
  assert.ok(urls.every(u => !/^\/(?:auth|admin|signin|create-account|dashboard|history|promo|changes)/.test(u.pathname)));
  assert.ok(urls.every(u => u.origin === 'https://astcompass.com'));
});
test('additional public workflows have distinct metadata and navigation honors reduced motion', () => {
  for (const page of ['genes', 'phenotype', 'expected', 'learning', 'feedback']) assert.match(app, new RegExp(`${page}: \\["[^"\\n]+", "[^"\\n]+"\\]`));
  assert.match(app, /accountPages.has\(page\).*"noindex,follow"/);
  assert.match(app, /prefers-reduced-motion: reduce/);
});
test('tablet navigation collapses before links overflow and footer links remain touch sized', () => {
  const css = read('src/styles.css');
  assert.match(css, /@media\(max-width:1050px\)\{\.app>header \.header-actions/);
  assert.match(css, /\.app>header nav\.nav-open\{display:flex\}/);
  assert.match(css, /\.app>footer nav a\{min-height:44px\}/);
  assert.match(css, /body\{min-width:0\}/);
});
