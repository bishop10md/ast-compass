# AST Compass Responsive Desktop Layout Audit

Date: 2026-09-11  
Branch: `codex/desktop-responsive-audit`  
Baseline commit: `0263c24d5638cfe4a4830e818e67845588ac7e0f`  
Application version: `0.4.5`  
Deployment status: **NOT DEPLOYED**

## Executive summary

AST Compass had no desktop-breaking horizontal overflow or navigation wrapping, but its shared content area stopped at 1,204 CSS pixels. On 1920×1080 and 2560×1440 displays this produced excessive empty gutters, small cards, and a layout that looked like an enlarged tablet composition rather than a deliberate desktop experience.

The candidate now uses a shared responsive desktop system with:

- a 1,400-pixel maximum content area;
- clamped desktop gutters from 28 to 40 pixels;
- a wider but bounded header, main, and footer composition;
- a more compact desktop hero with readable line lengths;
- expanded desktop workspace sidebars where useful;
- four-column card grids on sufficiently wide screens, while preserving existing tablet/mobile collapse rules;
- no changes to colors, typography families, navigation labels, scientific content, feature behavior, PHI controls, PWA logic, or mobile layout rules.

Final status: ready for owner review; the required disposition appears at the end of this report.

## Audit scope

Routes exercised:

- `/`
- `/breakpoints`
- `/bcid-forecast`
- `/concordance`
- `/concordance/image`
- `/resistance`
- `/learn`
- `/learn/detective`
- `/references`
- `/about`
- `/feedback`

Viewport matrix:

- Mobile/tablet preservation: 320×720, 375×812, 390×844, 430×932, 768×1024, 1024×768
- Desktop: 1280×720, 1366×768, 1440×900, 1536×864, 1600×900, 1680×1050, 1920×1080, 2560×1440
- Windows 125% display scaling: 1920×1080 physical → 1536×864 CSS; 2560×1440 physical → 2048×1152 CSS
- Browser-zoom layout equivalents: 90%, 100%, 110%, and 125% against a nominal 1536×864 desktop working area

## Findings and fixes

### 1. Shared desktop width was overly constrained — FIXED

Before, the main content width was always 1,260 pixels including padding, leaving 1,204 pixels for content. At 2560 pixels wide this created 650-pixel outer gutters on both sides.

The shared desktop content ceiling is now 1,400 pixels. The outer container includes clamped safe gutters and remains centered.

| Viewport | Content before | Content after |
|---|---:|---:|
| 1280×720 | 1,204 px | 1,221.1 px |
| 1366×768 | 1,204 px | 1,303.2 px |
| 1440×900 | 1,204 px | 1,373.8 px |
| 1536×864 | 1,204 px | 1,400 px |
| 1920×1080 | 1,204 px | 1,400 px |
| 2560×1440 | 1,204 px | 1,400 px |

### 2. Desktop hero consumed unnecessary vertical space — FIXED

The desktop hero now uses clamped padding, a balanced 1.25/0.75 grid, a bounded 72-pixel maximum headline, and a 440-pixel maximum note card. Body copy remains width-limited.

| Viewport | Hero bottom before | Hero bottom after |
|---|---:|---:|
| 1280×720 | 686.4 px | 542.7 px |
| 1366×768 | 688.8 px | 546.6 px |
| 1440×900 | 688.8 px | 552.5 px |
| 1920×1080 | 688.8 px | 579.8 px |

This brings the next meaningful section into view sooner without turning the homepage into a compressed or overly dense layout.

### 3. Wide screens retained tablet-like card density — FIXED

At 1536 pixels and above, tool, resistance-mechanism, educational-guide, and audience grids can use four columns. The References library uses three columns. Existing card order, content, and interaction remain unchanged.

### 4. Desktop tool workspaces underused horizontal room — FIXED

Breakpoint, Concordance, gene, and BCID workspace sidebars now use bounded `minmax()` columns on desktop. Main result panels retain `minmax(0, 1fr)` containment, preventing long scientific content from forcing page-level overflow.

### 5. Header behavior at Windows 125% scaling — PASS

The full primary navigation remains on one line at the 1536×864 CSS viewport produced by a 1920×1080 Windows display at 125% scaling. Search remains visible and usable. No content or navigation overflow was detected.

The 125% checks passed across all 11 audited routes at both tested physical resolutions.

### 6. Mobile and tablet regression — PASS

Existing mobile and tablet breakpoints were not redesigned. The current hamburger navigation, stacked cards, Image-Assisted review table transformation, safe-area handling, and touch-target behavior remain intact.

The audit found no page-level horizontal overflow at 320, 375, 390, 430, 768, or 1024 pixels. Breakpoint standard selectors and AST Detective investigation steps remain intentionally contained horizontal scrollers on very small screens; off-screen feedback honeypot fields were excluded as intentional nonvisual controls.

## Visual regression evidence

Post-change screenshots:

- `work/desktop-responsive/after/home-430x932.png`
- `work/desktop-responsive/after/home-768x1024.png`
- `work/desktop-responsive/after/home-1366x768.png`
- `work/desktop-responsive/after/home-1440x900.png`
- `work/desktop-responsive/after/home-1920x1080.png`
- `work/desktop-responsive/after/home-2560x1440.png`
- `work/desktop-responsive/after/home-windows-1920x1080-125.png`
- `work/desktop-responsive/after/home-windows-2560x1440-125.png`

Baseline screenshots are retained under `work/desktop-responsive/before/` for direct comparison.

## Automated responsive results

The repeatable local browser audit inspected 220 route/viewport/zoom combinations.

| Result | Count |
|---|---:|
| Checks | 220 |
| Failed checks | 0 |
| Page-level or uncontained overflow | 0 |
| Navigation wraps | 0 |
| Browser runtime errors | 0 |
| Failed first-party requests | 0 |

Detailed machine-readable results:

- `work/desktop-responsive/after/results.json`

## Accessibility review

Status: **PASS for available automated regression coverage**

- semantic primary navigation and `aria-current` behavior passed;
- mobile menu open/close state and reachable navigation passed;
- search dialog role, modal behavior, Escape handling, and focus restoration passed;
- footer links retain 44-pixel minimum targets;
- shared focus-visible outlines remain present;
- reduced-motion browser context was used during the responsive run;
- no colors or typography families were changed, avoiding contrast or brand regressions;
- no clipped controls or uncontained text were detected by the geometry audit.

Limitation: no claim is made that this is a full manual screen-reader or formal WCAG conformance audit. Physical-device visual review is still appropriate before publication.

## Verification results

| Gate | Result |
|---|---|
| Normal application tests | PASS — 296/296 |
| Scientific release gate | PASS — 10/10 |
| Image human-review safety | PASS — 50/50 plus real local synthetic OCR safety smoke |
| TypeScript | PASS |
| Production build | PASS |
| Static release audit | PASS |
| Existing RC1 browser regression | PASS — 66 viewport-route checks, 11 route checks, 7 search aliases, 1/3/5/10/20-row Concordance |
| Responsive desktop matrix | PASS — 220/220 |

The build retains the existing Vite warning for a JavaScript chunk larger than 500 kB. This was pre-existing and is unrelated to the CSS-only responsive change.

## Files changed

- `src/styles.css` — shared large-desktop width, spacing, grid-density, and workspace-column rules
- `scripts/audit-desktop-responsive.mjs` — local responsive/zoom/125%-scaling audit and screenshot harness
- `AST_COMPASS_DESKTOP_RESPONSIVE_AUDIT.md` — this report

## Protected behavior confirmation

No changes were made to:

- breakpoint values or interpretation paths;
- Concordance or BCID scientific logic;
- organism, antimicrobial, marker, or reference data;
- review statuses or provenance;
- Image-Assisted OCR recognition or verification safeguards;
- PHI screening or telemetry;
- routing, metadata, canonical domain, service worker, or PWA behavior;
- mobile or tablet breakpoint rules.

## Remaining review

- Owner visual review on the actual Windows machine at 125% display scaling is recommended because automated device-scale emulation cannot reproduce every GPU/font-rendering difference.
- No production deployment has been made or authorized by this task.

**DESKTOP RESPONSIVENESS READY FOR REVIEW**
