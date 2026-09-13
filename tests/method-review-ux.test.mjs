import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createAuditLoader } from '../scripts/audit-module-loader.mjs';

const load = createAuditLoader();
const ui = load('src/features/BreakpointEngine.tsx', 'export { WhatResultToEnter, MethodMeasurementComparison };');
const visual = load('src/components/AstMethodLearningVisual.tsx').default;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const expectedHelp = {
  MIC_BROTH: 'Enter the reported MIC in µg/mL.',
  MIC_AUTOMATED: 'Enter the reported MIC in µg/mL. Platform-specific applicability remains under expert review.',
  MIC_GRADIENT: 'Enter the MIC where the inhibition ellipse intersects the gradient scale.',
  DISK_DIFFUSION: 'Enter the measured inhibition-zone diameter in millimeters (mm).',
};

for (const [method, message] of Object.entries(expectedHelp)) {
  test(`method-review UX: ${method} presents the requested entry guidance`, () => {
    const html = render(ui.WhatResultToEnter, { method });
    assert.ok(html.includes(message));
    assert.match(html, /What result do I enter\?/);
    assert.match(html, /Educational overview · not clinical instructions\./);
  });
}

test('method-review UX: labels are native controls with descriptions and expanded state, not hover-only text', () => {
  const expected = {
    MIC_BROTH: ['Antimicrobial dilution series', 'Visible growth', 'No visible growth', 'MIC endpoint', 'Well/concentration relationship'],
    MIC_AUTOMATED: ['Automated AST platform', 'Test panel/well system', 'Generated MIC result', 'Platform-specific limitations'],
    MIC_GRADIENT: ['Gradient strip', 'Concentration scale', 'Bacterial lawn', 'Inhibition ellipse', 'MIC read point', 'Ellipse/strip intersection'],
    DISK_DIFFUSION: ['Antimicrobial disk', 'Bacterial lawn', 'Zone of inhibition', 'Zone edge', 'Zone diameter', 'Measurement in millimeters'],
  };
  for (const [method, labels] of Object.entries(expected)) {
    const html = render(visual, { method });
    const controls = [...html.matchAll(/<button[^>]*class="method-hotspot-button"[^>]*>/g)].map(match => match[0]);
    assert.equal(controls.length, labels.length, method);
    for (const label of labels) assert.ok(controls.some(control => control.includes(`aria-label="${label}"`)), label);
    for (const control of controls) {
      assert.match(control, /type="button"/);
      assert.match(control, /aria-expanded="false"/);
      assert.match(control, /aria-controls="[^"]+-detail"/);
      assert.doesNotMatch(control, /disabled|tabindex="-1"/);
    }
    assert.match(html, /role="img"/);
    assert.match(html, /role="region" aria-label="Diagram explanation" aria-live="polite" hidden=""/);
    assert.match(html, /Use Tab and Enter or Space, click, or tap/);
  }
});

test('method-review UX: measurement explanation is an expandable educational comparison', () => {
  const html = render(ui.MethodMeasurementComparison);
  assert.match(html, /<details class="method-measurement-comparison">/);
  assert.match(html, /<summary>Why are MIC and zone diameter different\?<\/summary>/);
  assert.match(html, /does not mathematically convert an MIC breakpoint into a disk-diffusion breakpoint, or vice versa/);
  assert.match(html, /criteria specifically established for that measurement method/);
});

test('method-review UX: feedback context uses the existing workflow and carries only selected method/page', () => {
  const html = render(ui.default);
  const href = html.match(/href="([^"]+)"[^>]*>Review this method/)[1].replaceAll('&amp;', '&');
  const url = new URL(href, 'https://astcompass.com');
  assert.equal(url.pathname, '/feedback');
  assert.equal(url.searchParams.get('content'), 'ast-method-MIC_BROTH');
  assert.equal(url.searchParams.get('source'), '/breakpoints');
  assert.equal(url.searchParams.get('category'), 'Scientific content / possible error');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['category', 'content', 'source']);
  assert.match(html, /reviewer-method-context">Broth microdilution \/ MIC/);
});
