// Local visual receipt for the built method-expansion candidate. Synthetic/demo state only.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const req = process.env.AST_AUDIT_PLAYWRIGHT
  ? createRequire(path.join(process.env.AST_AUDIT_PLAYWRIGHT, 'package.json'))
  : createRequire(import.meta.url);
const { chromium } = req('playwright');
const root = path.resolve('dist');
const out = path.resolve('work/ast-method-expansion/screenshots');
await fs.mkdir(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const server = http.createServer(async (request, response) => {
  try {
    let file = path.resolve(root, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Invalid path');
    let body;
    try { body = await fs.readFile(file); }
    catch { file = path.join(root, 'index.html'); body = await fs.readFile(file); }
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(400); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const receipt = { generatedAt: new Date().toISOString(), productionChanged: false, screenshots: [], checks: [], errors: [] };

async function selectSearchable(page, label, value) {
  const input = page.getByRole('combobox', { name: label });
  await input.fill(value);
  await input.press('Enter');
}

async function capture(name, viewport, method, configure) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => receipt.errors.push({ name, error: error.message }));
  await page.goto(`${origin}/breakpoints?astMethod=${method}`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Breakpoint Engine' }).waitFor();
  if (configure) await configure(page);
  await page.locator('.method-learning').waitFor();
  const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, method: document.querySelector('#ast-method')?.value, resultType: document.querySelector('.directory-stats>div:last-child b')?.textContent, unit: document.querySelector('.measurement-unit')?.textContent, visualTitle: document.querySelector('.ast-method-diagram title')?.textContent }));
  receipt.checks.push({ name, ...geometry, pass: geometry.scrollWidth <= geometry.width + 1 });
  const file = path.join(out, `${name}.png`);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: file, fullPage: true });
  receipt.screenshots.push(path.relative(process.cwd(), file).replaceAll('\\', '/'));
  if (name === 'breakpoint-mic-desktop') {
    const comparison = path.join(out, 'compare-ast-methods-desktop.png');
    await page.locator('.method-comparison').screenshot({ path: comparison });
    receipt.screenshots.push(path.relative(process.cwd(), comparison).replaceAll('\\', '/'));
  }
  await context.close();
}

try {
  await capture('breakpoint-mic-desktop', { width: 1440, height: 900 }, 'MIC_BROTH');
  await capture('breakpoint-gradient-desktop', { width: 1440, height: 900 }, 'MIC_GRADIENT');
  await capture('breakpoint-disk-desktop', { width: 1440, height: 900 }, 'DISK_DIFFUSION', async page => {
    await selectSearchable(page, 'Organism', 'Staphylococcus aureus');
    await selectSearchable(page, 'Applicable antimicrobial', 'Cefoxitin');
  });
  await capture('breakpoint-disk-mobile', { width: 390, height: 844 }, 'DISK_DIFFUSION', async page => {
    await selectSearchable(page, 'Organism', 'Staphylococcus aureus');
    await selectSearchable(page, 'Applicable antimicrobial', 'Cefoxitin');
  });
  receipt.passed = receipt.checks.every(check => check.pass) && receipt.errors.length === 0;
  console.log(JSON.stringify({ passed: receipt.passed, screenshots: receipt.screenshots.length, checks: receipt.checks, errors: receipt.errors }, null, 2));
  if (!receipt.passed) process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
