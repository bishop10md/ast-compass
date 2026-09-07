import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createAuditLoader } from './audit-module-loader.mjs';
const root = process.cwd();
if (!existsSync('dist/index.html') || !existsSync('dist/sw.js')) throw Error('Missing production build; run pnpm build before static acceptance');
function walk(path) { return readdirSync(path, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(path, e.name)) : [join(path, e.name)]); }
const firstParty = ['src', 'public', 'netlify', 'supabase'].filter(existsSync).flatMap(walk).filter(p => /\.(?:tsx?|m?js|sql|json|html|toml|txt|xml|webmanifest|css)$/i.test(p));
const patterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['github-token', /\b(?:ghp|github_pat)_[A-Za-z0-9_]{30,}/],
  ['aws-access-key', /\bAKIA[A-Z0-9]{16}\b/],
  ['secret-assignment', /(?:service_role_key|client_secret|secret_access_key)\s*[:=]\s*["'][^"'\r\n]{16,}["']/i],
];
const findings = [], demo = [], injection = [];
for (const path of firstParty) {
  const text = readFileSync(path, 'utf8'), lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [kind, pattern] of patterns) if (pattern.test(line)) findings.push({ path: relative(root, path), line: i + 1, kind });
    if (/demo/i.test(line)) demo.push({ path: relative(root, path), line: i + 1, occurrences: (line.match(/demo/gi) || []).length });
    if (/dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\s*\(|\bnew Function\s*\(/.test(line)) injection.push({ path: relative(root, path), line: i + 1 });
    for (const token of line.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
      try { if (JSON.parse(Buffer.from(token[1], 'base64url').toString()).role === 'service_role') findings.push({ path: relative(root, path), line: i + 1, kind: 'service-role-jwt' }); } catch {}
    }
  });
}
const load = createAuditLoader(root), refs = load('src/data/references.ts').references;
const distFiles = existsSync('dist') ? walk('dist') : [], sw = existsSync('dist/sw.js') ? readFileSync('dist/sw.js', 'utf8') : '';
const forbiddenArtifacts = distFiles.filter(file => /(?:^|[/\\])(?:work|research|tests|\.env[^/\\]*|model\.bin|model-index\.json|[^/\\]*\.(?:pem|key|map))(?:[/\\]|$)/i.test(file));
for (const file of distFiles.filter(p => /\.(?:js|mjs|html|json|css)$/.test(p))) {
  const body = readFileSync(file, 'utf8');
  for (const [kind, pattern] of patterns) if (pattern.test(body)) findings.push({path:relative(root,file),kind});
  if (/__syntheticOcrTrace|AST_OCR_RUN_ID|research\/v4|model-index\.json/.test(body)) forbiddenArtifacts.push(file);
}
const precache = JSON.parse(sw.match(/const PRECACHE = (\[[^\n]+\]);/)?.[1] || '[]');
if (!/const CACHE = 'ast-compass-[a-f0-9]{12}'/.test(sw) || !Array.isArray(precache) || !['/index.html','/offline.html','/manifest.webmanifest'].every(url => precache.includes(url))) throw Error('Invalid production service worker or empty precache');
const sitemap = [...readFileSync('public/sitemap.xml', 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
const result = {
  firstPartyTextFiles: firstParty.length, secretPatternFindings: findings, unsafeInjectionPatterns: injection, forbiddenArtifacts,
  limitations: 'Heuristic current-file scan only: not git-history scanning, penetration testing, exhaustive secret detection, or PHI OCR of bundled media.',
  referenceCount: refs.length, uniqueReferenceIds: new Set(refs.map(r => r.id)).size, nonHttpsReferences: refs.filter(r => !r.url.startsWith('https://')).map(r => r.id),
  sitemap: { count: sitemap.length, unique: new Set(sitemap).size, hosts: [...new Set(sitemap.map(u => new URL(u).host))] },
  build: { mapFiles: distFiles.filter(p => p.endsWith('.map')), cache: sw.match(/const CACHE = '([^']+)'/)?.[1], precacheUrls: precache.length, precacheBytes: precache.reduce((n, p) => n + (existsSync('dist' + p) ? statSync('dist' + p).size : 0), 0), missingPrecacheAssets: precache.filter(p => !existsSync('dist' + p)), ocrBytes: distFiles.filter(p => p.startsWith(join('dist', 'ocr'))).reduce((n, p) => n + statSync(p).size, 0) },
  retainedDemoSourceOccurrences: demo,
};
console.log(JSON.stringify(result, null, 2));
if (findings.length || injection.length || forbiddenArtifacts.length || result.build.mapFiles.length || result.build.missingPrecacheAssets.length) process.exitCode = 1;
