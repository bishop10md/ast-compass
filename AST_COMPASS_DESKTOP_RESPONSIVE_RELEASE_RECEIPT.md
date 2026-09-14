# AST Compass Desktop Responsive Release Receipt

## Release disposition

**DESKTOP RESPONSIVE RELEASE CANDIDATE READY FOR PRODUCTION**

This receipt records integration and verification only. No production deployment was performed.

## Candidate identity

- Source branch: `codex/desktop-responsive-audit`
- Source commit: `b148f28ea181c4a4f2d68ff1056fddabd16cd0ff`
- Production baseline (`origin/main`): `0263c24d5638cfe4a4830e818e67845588ac7e0f`
- Integration branch: `codex/desktop-responsive-release-candidate`
- Integration commit: `febb3da5d7a54afa21bfdbb7e21993afefa72458`
- Application version: `0.4.5` (unchanged)
- Owner desktop visual review: **PASSED**

## Integrated files

The approved source commit changes exactly these files relative to the production baseline:

- `src/styles.css` — audited responsive CSS implementation
- `scripts/audit-desktop-responsive.mjs` — responsive regression harness
- `AST_COMPASS_DESKTOP_RESPONSIVE_AUDIT.md` — source audit evidence

No additional visual or CSS changes were made during release-candidate preparation.

## Protected-source boundary

The only changed runtime source file is `src/styles.css`. Git reports no changed files under `src/` other than that stylesheet. Therefore, the integration does not modify:

- scientific logic or datasets
- breakpoint data or predicates
- BCID logic or content
- Concordance logic
- Image-Assisted OCR or human-verification logic
- PHI screening or privacy controls
- telemetry behavior
- metadata or canonical-domain configuration
- PWA manifest, service worker, or cache behavior

SCI-04 remains `paused-pending-review`, Draft, and fail-closed.

## Final release-gate results

| Gate | Result | Evidence |
| --- | --- | --- |
| Normal application tests | **PASS** | 296/296 passed; 0 failed |
| Scientific release gate | **PASS** | 10/10 passed; `releaseBlocked: false` |
| Image human-review safety | **PASS** | 50/50 passed; local synthetic OCR smoke recovered 5/5 rows; mandatory review retained |
| TypeScript | **PASS** | `tsc -b --pretty false`, exit 0 |
| Production build | **PASS** | 201 modules transformed; postbuild completed; exit 0 |
| Static release audit | **PASS** | 108 first-party text files; 0 secret findings; 0 unsafe injection findings; 0 forbidden artifacts; 36 unique apex-domain sitemap URLs; no source maps |
| RC1 browser regression | **PASS** | 11 routes; 66 viewport-route checks; 7 search queries; Concordance 1/3/5/10/20 rows; 0 errors |
| Responsive desktop matrix | **PASS** | 220/220 checks; 0 failed; 0 horizontal overflow; 0 navigation wrapping; 0 console errors; 0 failed requests |
| Production dependency audit | **PASS** | No known vulnerabilities found |

The image-safety command was rerun with the repository's existing bundled Playwright runtime after the initial shell could not resolve the optional Playwright module. The executed safety suite then passed completely; no application source was changed.

The production build retains its pre-existing non-blocking warning that one minified JavaScript chunk exceeds 500 kB. The build itself passes, and no performance-sensitive source was changed by this release candidate.

## Responsive verification matrix

The automated matrix exercised 11 representative routes at 14 viewport sizes, two Windows 125% display-scaling equivalents, and four browser-zoom equivalents.

Required viewports verified:

- 430 × 932
- 768 × 1024
- 1366 × 768
- 1440 × 900
- 1536 × 864
- 1920 × 1080
- 2560 × 1440

Additional viewport coverage included 320 × 720, 375 × 812, 390 × 844, 1024 × 768, 1280 × 720, 1600 × 900, and 1680 × 1050.

Browser-zoom equivalents verified at 90%, 100%, 110%, and 125% on a nominal 1536 × 864 desktop. Windows 125% display scaling was verified for 1920 × 1080 and 2560 × 1440 physical displays. The owner separately completed visual review on the actual target Windows desktop that originally exposed the defect and reported **PASSED**.

Routes covered by the responsive matrix:

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

## Regression conclusions

- Mobile regression: **NONE**
- Tablet regression: **NONE**
- Desktop result: **PASSED**
- New horizontal overflow: **ZERO**
- Navigation wrapping: **ZERO**
- Protected scientific/privacy/OCR sources changed: **NONE**
- Production deployment: **NOT PERFORMED**

## Release boundary

This candidate contains only the approved desktop-responsive implementation and its audit evidence. Production publication requires a separate, explicit owner authorization.
