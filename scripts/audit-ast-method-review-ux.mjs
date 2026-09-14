// Local-only built-candidate interaction, responsive, and screenshot audit.
// It uses the bundled teaching state; it never submits feedback or contacts production.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = process.env.AST_AUDIT_PLAYWRIGHT
  ? createRequire(path.join(process.env.AST_AUDIT_PLAYWRIGHT, 'package.json'))
  : createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve('dist');
const out = path.resolve('work/ast-method-expansion/ux-polish');
await fs.access(path.join(root, 'index.html'));
await fs.mkdir(out, { recursive: true });

const methods = [
  {
    id: 'MIC_BROTH', name: 'Broth microdilution', screenshot: 'broth-interactive-diagram',
    entry: 'Enter the reported MIC in µg/mL.',
    labels: ['antimicrobial dilution series', 'visible growth', 'no visible growth', 'MIC endpoint', 'well/concentration relationship'],
  },
  {
    id: 'MIC_AUTOMATED', name: 'Automated MIC', screenshot: 'automated-interactive-diagram',
    entry: 'Enter the reported MIC in µg/mL. Platform-specific applicability remains under expert review.',
    labels: ['automated AST platform', 'test panel/well system', 'generated MIC result', 'platform-specific limitations'],
  },
  {
    id: 'MIC_GRADIENT', name: 'Gradient diffusion', screenshot: 'gradient-interactive-diagram',
    entry: 'Enter the MIC where the inhibition ellipse intersects the gradient scale.',
    labels: ['gradient strip', 'concentration scale', 'bacterial lawn', 'inhibition ellipse', 'MIC read point', 'ellipse/strip intersection'],
  },
  {
    id: 'DISK_DIFFUSION', name: 'Disk diffusion', screenshot: 'disk-interactive-diagram',
    entry: 'Enter the measured inhibition-zone diameter in millimeters (mm).',
    labels: ['antimicrobial disk', 'bacterial lawn', 'zone of inhibition', 'zone edge', 'zone diameter', 'measurement in millimeters'],
  },
];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.json': 'application/json' };
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
const receipt = {
  generatedAt: new Date().toISOString(), browser: browser.version(), origin,
  productionChanged: false, feedbackSubmitted: false,
  checks: [], responsive: [], screenshots: [], errors: [], failedRequests: [], passed: false,
  screenshotTreatment: 'Component-only captures temporarily hide the sticky site header to prevent it from covering the captured component. No application CSS or runtime behavior is changed; responsive/interaction checks run without this screenshot-only style.',
  windows125Note: 'Browser CSS viewport/device-scale-factor equivalent only; no physical Windows device performance or owner acceptance is claimed.',
};
const clean = value => value.replace(/\s+/g, ' ').trim();
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function check(name, action) {
  try { await action(); receipt.checks.push({ name, pass: true }); }
  catch (error) { receipt.checks.push({ name, pass: false, error: error.stack || error.message }); }
}

async function newPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce', ...options });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || route.request().method() !== 'GET') return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => receipt.errors.push(error.message));
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === origin) receipt.failedRequests.push({ url: request.url(), method: request.method(), error: request.failure()?.errorText });
  });
  return { context, page };
}

async function openMethod(page, method) {
  await page.goto(`${origin}/breakpoints?astMethod=${method.id}`, { waitUntil: 'networkidle' });
  await page.locator('.method-diagram-explorer').waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('#ast-method').inputValue(), method.id);
}

function hotspot(page, label) {
  // A visible numeric marker prefix is allowed, but the full semantic label must match.
  return page.locator('.method-hotspot-button').filter({ hasText: new RegExp(`^(?:\\d+[.\\s]*)?${escapeRegExp(label)}$`, 'i') });
}

async function assertOpen(page, control) {
  assert.equal(await control.getAttribute('aria-expanded'), 'true');
  const id = await control.getAttribute('aria-controls');
  assert.ok(id, 'Every hotspot must identify its explanation');
  const detail = page.locator('.method-hotspot-detail');
  await detail.waitFor({ state: 'visible' });
  assert.equal(await detail.getAttribute('id'), id);
  assert.ok(clean(await detail.innerText()).length > 35, 'An open label must expose a meaningful textual explanation');
  assert.equal(await page.getByRole('button', { name: 'Close explanation', exact: true }).count(), 1);
}

async function assertClosed(page, control) {
  await page.locator('.method-hotspot-detail').waitFor({ state: 'hidden' });
  assert.equal(await control.getAttribute('aria-expanded'), 'false');
  assert.equal(await control.evaluate(element => element === document.activeElement), true, 'Dismissal must restore focus to the invoking label');
}

async function screenshot(page, locator, name) {
  const file = path.join(out, `${name}.png`);
  await locator.screenshot({ path: file, animations: 'disabled', style: '.app > header { visibility: hidden !important; }' });
  receipt.screenshots.push(path.relative(process.cwd(), file).replaceAll('\\', '/'));
}

async function inspectResponsive(page, method, viewport, label) {
  await openMethod(page, method);
  // Keep the longest explanation open so the check covers expanded content.
  let longest = { index: 0, length: -1 };
  const buttons = page.locator('.method-hotspot-button');
  for (let index = 0; index < await buttons.count(); index++) {
    await buttons.nth(index).click();
    const length = (await page.locator('.method-hotspot-detail').innerText()).length;
    if (length > longest.length) longest = { index, length };
    await page.getByRole('button', { name: 'Close explanation', exact: true }).click();
  }
  await buttons.nth(longest.index).click();
  const geometry = await page.evaluate(() => {
    const visible = element => { const r = element.getBoundingClientRect(); const s = getComputedStyle(element); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
    const selectors = ['.method-learning', '.method-diagram-explorer', '.method-hotspot-button', '.method-hotspot-detail', '.method-entry-help', '.method-measurement-comparison', '.reviewer-callout'];
    const elements = [...document.querySelectorAll(selectors.join(','))].filter(visible).map(element => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, className: element.className, left: rect.left, right: rect.right, width: rect.width, height: rect.height, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, fontSize: getComputedStyle(element).fontSize };
    });
    const navLines = [...new Set([...document.querySelectorAll('header nav a')].filter(visible).map(element => Math.round(element.getBoundingClientRect().top)))];
    return {
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth, navLines: navLines.length,
      overflow: elements.filter(element => element.left < -1 || element.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 1),
      smallTouchTargets: elements.filter(element => String(element.className).includes('method-hotspot-button') && (element.width < 44 || element.height < 44)),
      detail: elements.find(element => String(element.className).includes('method-hotspot-detail')),
    };
  });
  const result = { method: method.id, viewport, label, ...geometry, pass: geometry.scrollWidth <= viewport.width + 1 && geometry.overflow.length === 0 && geometry.smallTouchTargets.length === 0 && geometry.navLines <= 1 };
  receipt.responsive.push(result);
  if (viewport.width === 390 && ['MIC_GRADIENT', 'DISK_DIFFUSION'].includes(method.id)) {
    await screenshot(page, page.locator('.method-learning'), method.id === 'MIC_GRADIENT' ? 'mobile-gradient-view' : 'mobile-disk-view');
  }
}

try {
  const { page, context } = await newPage();
  for (const method of methods) {
    await openMethod(page, method);
    await check(`${method.id}: method-specific result-entry help`, async () => {
      const card = page.locator('.method-entry-help');
      assert.equal(await card.getByRole('heading', { name: 'What result do I enter?', exact: true }).count(), 1);
      assert.ok(clean(await card.innerText()).includes(method.entry));
      assert.ok(clean(await page.locator('.method-learning').innerText()).toLowerCase().includes('educational overview · not clinical instructions'));
    });
    await check(`${method.id}: SVG has descriptive text alternatives and all requested native labels`, async () => {
      const svg = page.locator('.ast-method-diagram').first();
      assert.equal(await svg.getAttribute('role'), 'img');
      assert.ok(clean(await svg.locator('title').textContent()).length > 10);
      assert.ok(clean(await svg.locator('desc').textContent()).length > 35);
      assert.equal(await page.locator('.method-hotspot-button').count(), method.labels.length);
      for (const label of method.labels) {
        const button = hotspot(page, label);
        assert.equal(await button.count(), 1, `Missing or ambiguous label: ${label}`);
        assert.equal(await button.evaluate(element => element.tagName), 'BUTTON');
        assert.equal(await button.isEnabled(), true);
        assert.equal(await button.getAttribute('aria-expanded'), 'false');
        assert.ok(await button.getAttribute('aria-controls'));
      }
    });
    for (const label of method.labels) {
      await check(`${method.id}: ${label} supports keyboard, click, and dismissible focus restoration`, async () => {
        const control = hotspot(page, label);
        await control.focus();
        await control.press('Enter');
        await assertOpen(page, control);
        const focus = await control.evaluate(element => {
          const style = getComputedStyle(element);
          return { isFocused: element === document.activeElement, outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2, shadow: style.boxShadow !== 'none' };
        });
        assert.equal(focus.isFocused, true);
        assert.ok(focus.outline || focus.shadow, 'Keyboard-focused label must have a visible focus treatment');
        await page.keyboard.press('Escape');
        await assertClosed(page, control);
        await control.press('Space');
        await assertOpen(page, control);
        await page.getByRole('button', { name: 'Close explanation', exact: true }).click();
        await assertClosed(page, control);
        await control.click();
        await assertOpen(page, control);
        await page.getByRole('button', { name: 'Close explanation', exact: true }).click();
        await assertClosed(page, control);
      });
    }
    await check(`${method.id}: finalized scientific UI remains fail closed where applicable`, async () => {
      if (method.id === 'MIC_AUTOMATED' || method.id === 'MIC_GRADIENT') {
        assert.equal(await page.getByRole('heading', { name: 'Method-specific applicability under expert review', exact: true }).count(), 1);
        assert.ok(clean(await page.locator('.no-breakpoint').innerText()).includes('AST Compass will not automatically apply a generic MIC criterion to this method until applicability has been explicitly reviewed and documented.'));
        await page.locator('#ast-measurement').fill('4');
        assert.equal(await page.locator('.breakpoint-scale, .mic-answer, .isolate-simulator').count(), 0);
      } else if (method.id === 'DISK_DIFFUSION') {
        assert.equal(await page.getByRole('heading', { name: 'Method-specific breakpoint not available', exact: true }).count(), 1);
        const text = clean(await page.locator('.no-breakpoint').innerText());
        assert.ok(text.includes('AST Compass does not substitute an MIC breakpoint for a disk-diffusion breakpoint. MIC and zone-diameter criteria are separate method-specific interpretive standards.'));
        assert.ok(text.includes('This organism–antimicrobial–method combination remains under review.'));
        await page.locator('#ast-measurement').fill('22');
        assert.equal(await page.locator('.breakpoint-scale, .mic-answer, .isolate-simulator, #mic-operator').count(), 0);
        assert.ok(clean(await page.locator('.measurement-unit').innerText()).includes('mm'));
      } else {
        assert.equal(clean(await page.locator('.mic-answer h3').innerText()), 'Resistant', 'The existing default broth teaching result is unchanged');
        assert.equal(await page.locator('.breakpoint-scale').count(), 1);
      }
    });
    const active = hotspot(page, method.id === 'DISK_DIFFUSION' ? 'zone diameter' : method.id === 'MIC_GRADIENT' ? 'MIC read point' : method.id === 'MIC_BROTH' ? 'MIC endpoint' : 'platform-specific limitations');
    await active.click();
    await screenshot(page, page.locator('.method-learning'), method.screenshot);
    await page.getByRole('button', { name: 'Close explanation', exact: true }).click();
    if (method.id === 'DISK_DIFFUSION') {
      await screenshot(page, page.locator('.no-breakpoint'), 'disk-unavailable-teaching-state');
      await screenshot(page, page.locator('.method-entry-help'), 'what-result-do-i-enter');
      await screenshot(page, page.locator('.reviewer-callout'), 'review-this-method-callout');
    }
    await check(`${method.id}: reviewer link reaches existing feedback without submission`, async () => {
      const link = page.locator('.reviewer-callout').getByRole('link', { name: 'Review this method', exact: true });
      const target = new URL(await link.getAttribute('href'), origin);
      assert.equal(target.origin, origin);
      assert.equal(target.pathname, '/feedback');
      await link.click();
      await page.waitForURL(url => url.pathname === '/feedback');
      await page.getByRole('heading', { name: 'Help Improve AST Compass', exact: true }).waitFor();
      await page.locator('form.feedback-form').waitFor();
      await openMethod(page, method);
    });
  }
  await check('Method changes reset open explanations and update method education', async () => {
    await openMethod(page, methods[0]);
    for (const method of [...methods.slice(1), methods[0]]) {
      await page.locator('.method-hotspot-button').first().click();
      await page.locator('.method-hotspot-detail').waitFor({ state: 'visible' });
      await page.locator('#ast-method').selectOption(method.id);
      await page.locator('.method-hotspot-detail').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('.method-hotspot-button[aria-expanded="true"]').count(), 0);
      assert.ok(clean(await page.locator('.method-entry-help').innerText()).includes(method.entry));
      assert.equal(await page.locator('.method-hotspot-button').count(), method.labels.length);
      assert.equal(new URL(page.url()).searchParams.get('astMethod') || 'MIC_BROTH', method.id);
    }
  });
  await check('MIC and zone-diameter comparison expands with method separation explanation', async () => {
    const panel = page.locator('.method-measurement-comparison');
    const summary = panel.locator('summary');
    assert.equal(clean(await summary.innerText()), 'Why are MIC and zone diameter different?');
    await summary.focus();
    await summary.press('Enter');
    assert.equal(await panel.getAttribute('open'), '');
    const text = clean(await panel.innerText());
    assert.ok(text.includes('MIC and zone diameter are different susceptibility measurements.'));
    assert.ok(text.includes('AST Compass does not mathematically convert an MIC breakpoint into a disk-diffusion breakpoint, or vice versa.'));
    await screenshot(page, page.locator('.method-comparison'), 'mic-versus-zone-diameter-comparison');
  });
  await context.close();

  const touch = await newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  for (const method of methods) {
    await openMethod(touch.page, method);
    for (const label of method.labels) {
      await check(`${method.id}: ${label} opens and dismisses by touch`, async () => {
        const control = hotspot(touch.page, label);
        await control.tap();
        await assertOpen(touch.page, control);
        await touch.page.getByRole('button', { name: 'Close explanation', exact: true }).tap();
        await assertClosed(touch.page, control);
      });
    }
  }
  await touch.context.close();

  const viewports = [[390, 844], [430, 932], [768, 1024], [1366, 768], [1536, 864], [1920, 1080]];
  for (const [width, height] of viewports) {
    const current = await newPage({ viewport: { width, height } });
    for (const method of methods) await inspectResponsive(current.page, method, { width, height }, 'CSS viewport');
    await current.context.close();
  }
  const windows = await newPage({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 });
  for (const method of methods) await inspectResponsive(windows.page, method, { width: 1536, height: 864 }, 'Windows 125% equivalent: 1920×1080 physical / 1536×864 CSS');
  await windows.context.close();
  receipt.passed = receipt.checks.every(item => item.pass) && receipt.responsive.every(item => item.pass) && !receipt.errors.length && !receipt.failedRequests.length;
} catch (error) {
  receipt.errors.push(error.stack || error.message);
} finally {
  const summary = {
    passed: receipt.passed, checks: receipt.checks.length, failedChecks: receipt.checks.filter(item => !item.pass),
    responsiveChecks: receipt.responsive.length, responsiveFailures: receipt.responsive.filter(item => !item.pass),
    screenshots: receipt.screenshots.length, errors: receipt.errors, failedRequests: receipt.failedRequests,
    productionChanged: false, feedbackSubmitted: false,
  };
  await fs.writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2));
  await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  if (!receipt.passed) process.exitCode = 1;
}
