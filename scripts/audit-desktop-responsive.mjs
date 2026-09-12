// Local responsive visual/geometry audit. Uses only the built candidate and synthetic navigation.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const phase = process.argv[2] || 'after';
if (!['before', 'after'].includes(phase)) throw new Error('Usage: node scripts/audit-desktop-responsive.mjs before|after');
const req = process.env.AST_AUDIT_PLAYWRIGHT
  ? createRequire(path.join(process.env.AST_AUDIT_PLAYWRIGHT, 'package.json'))
  : createRequire(import.meta.url);
const { chromium } = req('playwright');

const root = path.resolve('dist');
const out = path.resolve('work/desktop-responsive', phase);
await fs.mkdir(out, { recursive: true });
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
};
const server = http.createServer(async (request, response) => {
  try {
    if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
    let file = path.resolve(root, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Invalid path');
    let body;
    try { body = await fs.readFile(file); }
    catch {
      if (path.extname(file)) { response.writeHead(404); response.end(); return; }
      file = path.join(root, 'index.html'); body = await fs.readFile(file);
    }
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(400); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const routes = ['/', '/breakpoints', '/bcid-forecast', '/concordance', '/concordance/image', '/resistance', '/learn', '/learn/detective', '/references', '/about', '/feedback'];
const viewports = [
  [320, 720], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768],
  [1280, 720], [1366, 768], [1440, 900], [1536, 864], [1600, 900], [1680, 1050],
  [1920, 1080], [2560, 1440],
];
const screenshotViewports = new Set(['430x932', '768x1024', '1366x768', '1440x900', '1920x1080', '2560x1440']);
const intentionalOverflow = [
  '.review-table-wrap', '.matrix-scroll', '.table-scroll', '.comparison-table-wrap', '.reference-tabs',
  '.standard-buttons', '.investigation-flow', '.honeypot',
];
const result = {
  phase, generatedAt: new Date().toISOString(), browser: browser.version(), routes, viewports: [],
  windows125: [], zoom: [], consoleErrors: [], failedRequests: [], passed: false,
};

async function inspect(page, route, width, height, label) {
  await page.goto(origin + route, { waitUntil: 'networkidle' });
  await page.locator('h1').first().waitFor();
  await page.evaluate(() => document.fonts?.ready);
  const geometry = await page.evaluate(({ intentionalOverflow }) => {
    const rect = el => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: +r.left.toFixed(1), right: +r.right.toFixed(1), top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1) };
    };
    const visible = el => {
      const style = getComputedStyle(el); const r = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    const exempt = el => {
      if (intentionalOverflow.some(selector => el.closest(selector))) return true;
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const overflowX = getComputedStyle(parent).overflowX;
        if ((overflowX === 'auto' || overflowX === 'scroll') && parent.scrollWidth > parent.clientWidth + 1) return true;
      }
      return false;
    };
    const overflow = [...document.querySelectorAll('body *')]
      .filter(visible)
      .filter(el => !exempt(el))
      .map(el => ({ tag: el.tagName, className: typeof el.className === 'string' ? el.className : '', ...rect(el) }))
      .filter(item => item.left < -1 || item.right > innerWidth + 1 || item.width > innerWidth + 1)
      .slice(0, 20);
    const navLinks = [...document.querySelectorAll('header nav a')].filter(visible);
    const navLines = [...new Set(navLinks.map(el => Math.round(el.getBoundingClientRect().top)))];
    const grid = selector => {
      const el = document.querySelector(selector); if (!el || !visible(el)) return null;
      const columns = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean);
      return { selector, columns: columns.length, template: columns.join(' '), rect: rect(el) };
    };
    const firstParagraph = document.querySelector('.clarity-hero p, .hero p, .page-head p, main p');
    return {
      innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      overflow,
      header: rect(document.querySelector('.app > header')),
      nav: rect(document.querySelector('header nav')),
      navLines: navLines.length,
      navVisible: !!document.querySelector('header nav') && visible(document.querySelector('header nav')),
      main: rect(document.querySelector('.app > main')),
      hero: rect(document.querySelector('.clarity-hero, .hero, .page-head')),
      firstParagraph: rect(firstParagraph),
      grids: ['.primary-starts > div:last-child', '.secondary-tools > div:last-child', '.tool-grid', '.learning-grid', '.mechanism-library > div:last-child', '.mechanism-grid', '.reference-list', '.panel-browser-grid'].map(grid).filter(Boolean),
    };
  }, { intentionalOverflow });
  const key = `${width}x${height}`;
  if (route === '/' && screenshotViewports.has(key)) {
    await page.screenshot({ path: path.join(out, `home-${key}.png`), fullPage: true });
  }
  return { label, route, width, height, ...geometry, pass: geometry.scrollWidth <= width + 1 && geometry.overflow.length === 0 && geometry.navLines <= 1 };
}

try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => result.consoleErrors.push({ viewport: `${width}x${height}`, error: error.message }));
    page.on('requestfailed', request => {
      if (new URL(request.url()).origin === origin) result.failedRequests.push({ viewport: `${width}x${height}`, url: request.url(), error: request.failure()?.errorText });
    });
    for (const route of routes) result.viewports.push(await inspect(page, route, width, height, 'viewport'));
    await context.close();
  }

  // Windows 125% display scaling: physical pixels become a 1536x864 CSS viewport on 1920x1080 hardware.
  for (const [physicalWidth, physicalHeight] of [[1920, 1080], [2560, 1440]]) {
    const width = Math.round(physicalWidth / 1.25); const height = Math.round(physicalHeight / 1.25);
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1.25, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const route of routes) {
      result.windows125.push({ physicalWidth, physicalHeight, scale: 1.25, ...(await inspect(page, route, width, height, 'windows-125')) });
      if (route === '/') await page.screenshot({ path: path.join(out, `home-windows-${physicalWidth}x${physicalHeight}-125.png`), fullPage: true });
    }
    await context.close();
  }

  // Browser-zoom layout equivalents on a 1536x864 logical desktop viewport.
  for (const zoom of [90, 100, 110, 125]) {
    const width = Math.round(1536 / (zoom / 100)); const height = Math.round(864 / (zoom / 100));
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const route of routes) result.zoom.push({ zoom, nominalViewport: '1536x864', ...(await inspect(page, route, width, height, 'zoom-equivalent')) });
    await context.close();
  }

  result.passed = [...result.viewports, ...result.windows125, ...result.zoom].every(item => item.pass) && result.consoleErrors.length === 0 && result.failedRequests.length === 0;
  const summary = {
    phase, passed: result.passed, checks: result.viewports.length + result.windows125.length + result.zoom.length,
    failed: [...result.viewports, ...result.windows125, ...result.zoom].filter(item => !item.pass).length,
    overflows: [...result.viewports, ...result.windows125, ...result.zoom].filter(item => item.scrollWidth > item.width + 1 || item.overflow.length).length,
    navWraps: [...result.viewports, ...result.windows125, ...result.zoom].filter(item => item.navLines > 1).length,
    consoleErrors: result.consoleErrors.length, failedRequests: result.failedRequests.length,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!result.passed) process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
