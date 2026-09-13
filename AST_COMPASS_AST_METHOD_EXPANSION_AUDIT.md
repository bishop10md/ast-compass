# AST Compass AST Method Expansion Audit

Date: September 13, 2026
Status: **AST METHOD REVIEW UX READY FOR OWNER APPROVAL**
Deployment: **Not deployed**

## Executive summary

The Breakpoint Explorer now exposes four explicit AST method choices for formative expert review:

1. Broth microdilution / MIC
2. Automated MIC
3. Gradient diffusion / Etest
4. Disk diffusion / Kirby-Bauer

The default remains Broth microdilution / MIC. Existing numerical breakpoint records were not edited, imported, promoted, or relabeled. MIC and disk records are selected through separate method filters. Disk mode cannot use the MIC simulation fallback and returns a method-specific unavailable state when no disk record exists.

Original responsive learning diagrams were added for all four method states, with dedicated agar-plate visuals for gradient diffusion and disk diffusion. They contain accessible titles/descriptions and are labeled as educational overviews rather than clinical instructions.

The finalized scientific-scope cleanup removes automatic inheritance of generic MIC criteria by Automated MIC and Gradient diffusion. Neither method can display criteria or assign a category without an explicit, documented review of applicability to the selected method. None of the nine current breakpoint records has such an approval. The polished teaching state now uses this heading:

> Method-specific applicability under expert review

All four method choices, diagrams, explanations, comparison, and reviewer-feedback links remain available.

The final UX polish adds interactive diagram labels, method-specific entry guidance, an expandable MIC-versus-zone explanation, clearer unavailable teaching states, and a method-context link to the existing feedback workflow. No interpretation logic, applicability rule, source record, breakpoint value, or application version was changed for this polish.

## Baseline and scope

- Source workspace: `ast-compass-rc1-configured`
- Source branch before isolation: `codex/desktop-responsive-release-candidate`
- Clean source commit: `5247e1eb9c320269fda35ea2a14355d1a0960c60`
- Approved method-expansion baseline before this cleanup: `5e65db5016b92939208e388b0d90c25ee3f4a1f0`
- Finalized scientific baseline for the UX polish: `018727fbb3437b8f61278f5e64d3fe94121df378`
- Implementation branch: `codex/method-aware-breakpoint-expansion`
- Application version: `0.4.5` (unchanged)
- Production deployment: none
- DNS, Netlify configuration, canonical metadata, PWA policy, OCR, PHI, Concordance, BCID, phenotype/mechanism logic: unchanged

## Methods and result entry

| Method | Result type | Entry unit | Current interpretation behavior |
|---|---|---:|---|
| Broth microdilution / MIC | MIC | µg/mL | Existing MIC teaching behavior remains available and is the default. |
| Automated MIC | MIC | µg/mL | No criteria or category until the selected record explicitly documents reviewed Automated MIC applicability. All current selections remain under expert review. |
| Gradient diffusion / Etest | MIC | µg/mL | No criteria or category until the selected record explicitly documents reviewed Gradient diffusion applicability. All current selections remain under expert review. |
| Disk diffusion / Kirby-Bauer | Zone diameter | mm | Uses only an explicitly loaded disk record. Never uses MIC data or MIC simulation. |

MIC entry exposes `<`, `≤`, `>`, `≥`, and `=` as distinct operators. The pre-existing exact numeric (`=`) interpretation behavior is unchanged. Because no owner-approved operator-aware inference rule exists in the current dataset, a non-equality operator/value is preserved visibly but fails closed without assigning a category.

Changing method clears the prior measurement and resets the operator, so an MIC cannot be relabeled as a zone diameter or vice versa.

## User-interface changes

- Added an accessible **AST Method** selector in the primary Breakpoint workspace.
- Added method-specific result labels and units.
- Added an expandable **About this method** section with the owner-approved educational descriptions and limitations.
- Added a non-color-only **Method expansion — under expert review** status.
- Added an expert-review callout linking to the existing `/feedback` route.
- Added a compact **Compare AST Methods** panel without breakpoint numbers.
- Added the method to URL query state as `astMethod`, while preserving existing `/breakpoints` bookmarks and default behavior.
- Added responsive layouts for phone, tablet, desktop, Windows 125% scaling, and browser zoom.

### Final expert-review UX polish

- **What result do I enter?** appears beneath the selected method. Its four texts match the owner brief, including MIC units, Automated applicability review, the gradient intersection, and Disk diameter in mm. Educational/non-clinical wording remains visible.
- **Why are MIC and zone diameter different?** is a native expandable section in Compare AST Methods. It explains the two measurement types and prohibits mathematical conversion between their criteria.
- **Disk unavailable state:** “Method-specific breakpoint not available,” followed by the explanation that AST Compass does not substitute an MIC breakpoint for a disk-diffusion breakpoint. The organism–antimicrobial–method combination is visibly under review.
- **Automated/Gradient pending state:** “Method-specific applicability under expert review,” followed by the requested explicit-review explanation and confirmation that no criteria/category are assigned. The prior full MIC-result phrase remains the region's descriptive accessible label.
- **Review this method** links to `/feedback` with its existing supported `category`, `source`, and `content` parameters. The content token is `ast-method-METHOD_ID`; source is `/breakpoints`. The selected method name is also visible beside the link. No organism, MIC, image, private analysis, or user identity is included in that URL.
- Feedback page/service, telemetry, privacy behavior, and submission rules remain unchanged. Browser verification opens the page without submitting feedback.

## “How this AST method works” learning component

The selected method now controls a dedicated educational learning component:

- **Disk diffusion / Kirby-Bauer:** original agar-plate diagram with antimicrobial disks, an inhibition zone, and a diameter line through the disk center labeled in millimeters.
- **Gradient diffusion / Etest:** original agar-plate diagram with a gradient strip, inhibition ellipse, and labeled MIC ellipse–scale intersection.
- **Broth microdilution / MIC:** conceptual dilution-series diagram identifying the first no-visible-growth concentration as the MIC.
- **Automated MIC:** conceptual automated MIC-result diagram with explicit platform-specific limitations in the accompanying text.

Every visual uses inline SVG authored for AST Compass, includes `<title>` and `<desc>` accessibility text, scales responsively, and states: “Educational overview · not clinical instructions.” No manufacturer artwork or external image asset was used.

### Diagram interactions and accessibility

The existing SVGs are wrapped in a label explorer. Native buttons open an inline explanation and a numbered, dashed highlight on the corresponding illustration area. Essential text is available by click, keyboard, and touch; it is never hover-only. The explanation has a Close button, supports Escape, and returns focus to its invoking label. Selecting another method resets the open explanation.

| Method | Interactive labels |
|---|---|
| Disk diffusion | Antimicrobial disk; bacterial lawn; zone of inhibition; zone edge; zone diameter; measurement in millimeters |
| Gradient diffusion | Gradient strip; concentration scale; bacterial lawn; inhibition ellipse; MIC read point; ellipse/strip intersection |
| Broth microdilution | Antimicrobial dilution series; visible growth; no visible growth; MIC endpoint; well/concentration relationship |
| Automated MIC | Automated AST platform; test panel/well system; generated MIC result; platform-specific limitations |

There are 21 controls in total. Each has a semantic label, `aria-expanded`, an explanation relationship, visible keyboard focus, and at least a 44×44 px target. Numbering, text, and the dashed outline supplement color. Explanations remain in document flow, avoiding floating popovers over the source image or controls. The selected method's original SVG description remains available to assistive technology.

### Owner-approved Etest graphical alignment correction

The interaction review found an inherited mismatch: the prior red dot was inside the inhibition ellipse rather than at its boundary. The owner explicitly authorized “Correct the diagram alignment only.” The ellipse outline now meets the strip edges at the existing read level, and the marker is at the right intersection. The scale, concentration labels, strip position, result model, and applicability gate did not change. No numeric result or new Etest rule is asserted. The other three original diagram drawings remain unchanged.

## Scientific data and schema changes

### Numerical data

- Actual disk breakpoints added: **none**
- Actual MIC breakpoints added or changed: **none**
- Disk potency values added: **none**
- Etest-specific breakpoint rules added: **none**
- Automated-platform correction rules added: **none**
- Existing `src/data/breakpoints.ts` normalized SHA-256 remains: `8b729567f4f5004f94187f58289fe89befce86d8649d265b048db447a7500ec5`

### Non-destructive target schema

The type layer now defines a future `MethodAwareBreakpointRecord` capable of carrying:

- standard
- organism and antimicrobial identity
- method identifier
- measurement type and unit
- susceptible/intermediate/resistant criterion strings
- source identity and source version
- review status and notes
- optional disk potency

Supported method identifiers are `MIC_BROTH`, `MIC_AUTOMATED`, `MIC_GRADIENT`, and `DISK_DIFFUSION`. The legacy `Breakpoint` records were not migrated or mutated.

### Reviewed method applicability

The legacy type now has optional `methodApplicability` metadata. No entry was added to the actual breakpoint dataset. An admission entry must identify the selected Automated or Gradient method and have `reviewStatus: Reviewed`, with the existing qualified-review provenance structure:

- Exact record-and-method content ID (`record.id:method`) and matching record version
- Documented reviewer identity and qualification/role
- Review date and approval-evidence ID
- Resolvable source IDs, source editions/versions, and source locators

Absent, Draft, incomplete, wrong-method, wrong-record, wrong-version, or duplicate applicability entries are rejected before criteria selection. A generic breakpoint review label does not grant method applicability. Broth and disk admission retain their original record-type filters. Numerical parsing, interpretation, and simulation functions are unchanged.

This checks the completeness and scope of authored review metadata; it does not perform scientific review or establish that a source supports a method. Future approvals must be supplied through qualified owner/source review. Test-only synthetic provenance exercises the contract and is excluded from the production build.

## Scientific separation and fail-closed behavior

- MIC and disk filtering occurs before a record can be selected.
- Disk mode has no access to the absent-record MIC teaching simulation.
- An E. coli + ceftriaxone + disk selection displays “Method-specific breakpoint not available” with the no-MIC-substitution explanation and does not return an MIC-derived category.
- The existing Staphylococcus aureus + cefoxitin disk demonstration continues to use the existing disk record, its original inequalities, its original unit, and its original draft/source metadata.
- Duplicate method-specific records remain ambiguous and do not produce an interpretation.
- Unavailable, malformed, overlapping, or unsupported records remain fail-closed.
- No intermediate category is created when the loaded record has none.
- Automated MIC and Gradient diffusion have no current admitted records. Entering a numeric MIC does not expose generic broth criteria, generate a category, or activate a simulation.
- Shared MIC units do not establish method applicability. Both pending states retain the educational visuals and method-specific limitations.

## Functional versus draft

### Functional

- Method selector and URL state
- Dynamic MIC versus zone-diameter entry
- Correct display units
- Separate disk-record admission
- Missing-disk fail-closed state
- Missing-reviewed-applicability fail-closed states for Automated and Gradient MIC
- Existing exact-value MIC interpretation
- Existing disk-direction interpretation
- Method switching/reset behavior
- Method education, comparison, feedback link, and responsive visuals

### Draft / under expert review

- Scope and terminology of all newly visible method options
- Whether Automated MIC should remain a distinct Explorer method
- Whether “Gradient diffusion / Etest” wording should be retained or generalized
- Instrument/manufacturer-specific applicability
- Method-specific validation and source coverage
- Operator-aware interpretation of censored MIC results
- Population of authoritative disk-diffusion records and disk potency

## References

No citation was added, duplicated, or fabricated. Existing loaded records continue to link only to their existing source IDs and URLs. The expansion uses the existing CLSI, EUCAST, and FDA catalog/reference links already present in AST Compass. No new disk-diffusion, Etest, or automated-platform source is asserted until a traceable record is entered and reviewed.

## Test and build results

| Gate | Result |
|---|---|
| Application tests | PASS — 318/318 |
| Focused method-expansion tests | PASS — 13/13 plus 2 new actual-component regression tests (included in application total) |
| New UX unit tests | PASS — 7/7; requested entry text, semantic controls, comparison, feedback context |
| Scientific release gate | PASS — 10/10; releaseBlocked=false |
| TypeScript | PASS |
| Production build | PASS |
| Static release audit | PASS — no secret patterns, unsafe injection patterns, source maps, forbidden artifacts, or missing precache assets |
| Responsive matrix | PASS — 280/280; zero horizontal overflow, navigation wrapping, browser errors, or failed requests |
| Interactive browser audit / screenshots | PASS — 60/60 interaction/content checks, 28/28 expanded-explanation responsive checks, 10 screenshots; zero browser errors or failed requests |

The responsive matrix includes the default, automated, gradient, and disk Breakpoint states at mobile, tablet, desktop, Windows 125% scaling, and 90/100/110/125% browser-zoom equivalents.

The additional focused browser audit exercises all 21 labels with Enter, Space, mouse click, Escape, Close, and focus restoration; all 21 also pass touch activation/dismissal. It verifies method switching, the four entry cards, pending/unavailable scientific UI, the existing feedback route without submission, and the expandable measurement comparison. Expanded explanations pass at 390×844, 430×932, 768×1024, 1366×768, 1536×864, 1920×1080, and a Windows 125% device-scale equivalent. There are no new overflow, navigation-wrapping, or undersized label-target findings. This is browser-level accessibility testing, not a claim of a physical screen-reader audit.

The first focused audit exposed eight test-harness assertion failures, not application failures: four case-sensitive comparisons of CSS-uppercased disclaimer text and four assumptions about the existing Feedback page heading. The harness now compares case appropriately and waits for the actual “Help Improve AST Compass” heading and existing feedback form. The final rerun passes all checks without application changes to accommodate those assertions.

The UX polish reruns the six requested gates. Commands use the existing installed tools directly: `node --test tests/*.test.mjs`, `node scripts/predeploy-scientific-gate.mjs`, `tsc -b --pretty false`, the package build sequence (`tsc -b`, `vite build --config vite.config.mjs --configLoader runner`, `node scripts/postbuild.mjs`), `node scripts/audit-desktop-responsive.mjs after`, and `node scripts/predeploy-static-audit.mjs`. The added interaction audit is `node scripts/audit-ast-method-review-ux.mjs`. These match the package scripts without invoking dependency reinstallation through the shared node_modules junction.

The previous 50/50 Image-Assisted safety and RC1 browser results belong to baseline commit `5e65db5`; those separate audits were not rerun for this cleanup. Image/OCR/PHI sources and behavior were outside the change and remain unchanged. The current application and scientific suites passed. Responsive results are browser emulation, including Windows scaling/zoom equivalents, rather than new physical-device acceptance.

The build retains a non-blocking large-chunk warning (largest listed chunk: 586.68 kB minified). No unrelated bundle/refactoring change was made. The static audit confirms 36 unique apex-domain sitemap URLs, no forbidden artifacts or source maps, and a complete generated precache.

## Regression assessment

- Existing MIC numerical behavior: unchanged for existing numeric inputs
- Existing disk predicates and boundaries: unchanged
- Original drawings retained, with only the separately owner-approved Etest boundary/read-point alignment correction; label interactions and scoped responsive styles added
- Mobile regression: none detected
- Tablet regression: none detected
- Desktop responsive regression: none detected
- Scientific rules/data regression: none detected
- OCR/PHI/privacy/PWA regression: none detected by the applicable gates

## Visual evidence

- [Disk interactive diagram](work/ast-method-expansion/ux-polish/disk-interactive-diagram.png)
- [Etest interactive diagram](work/ast-method-expansion/ux-polish/gradient-interactive-diagram.png)
- [Broth microdilution interactive diagram](work/ast-method-expansion/ux-polish/broth-interactive-diagram.png)
- [Automated MIC interactive diagram](work/ast-method-expansion/ux-polish/automated-interactive-diagram.png)
- [What result do I enter?](work/ast-method-expansion/ux-polish/what-result-do-i-enter.png)
- [MIC versus zone diameter comparison](work/ast-method-expansion/ux-polish/mic-versus-zone-diameter-comparison.png)
- [Disk unavailable teaching state](work/ast-method-expansion/ux-polish/disk-unavailable-teaching-state.png)
- [Review this method callout](work/ast-method-expansion/ux-polish/review-this-method-callout.png)
- [Mobile Disk view](work/ast-method-expansion/ux-polish/mobile-disk-view.png)
- [Mobile Etest view](work/ast-method-expansion/ux-polish/mobile-gradient-view.png)
- [Interaction / screenshot receipt](work/ast-method-expansion/ux-polish/receipt.json)
- [Responsive matrix receipt](work/desktop-responsive/after/results.json)
- [UX application test log](work/ast-method-expansion/ux-application-tests.log)
- [UX scientific gate](work/ast-method-expansion/ux-scientific-gate.json)
- [UX build log](work/ast-method-expansion/ux-build.log)
- [UX static audit](work/ast-method-expansion/ux-static-audit.json)

Screenshots were generated locally from the production build with synthetic/demo selections. They are not production captures and contain no patient data. Component-only screenshots temporarily hide the sticky site header so it does not obscure the cropped component; this screenshot-only treatment is recorded in the receipt. All interaction and responsive tests run with the real header and normal application styling.

## Remaining owner/expert-review items

1. Review the terminology and prominence of the four method choices.
2. Review method applicability and its sources before considering any future Automated or Gradient admission entries. The owner's interim decision is implemented: no generic MIC inheritance.
3. Review the original diagrams and step wording for scientific clarity and appropriate educational scope.
4. Determine whether operator-aware MIC interpretation should remain disabled or receive a separately sourced, owner-approved scientific design.
5. Add authoritative method-specific disk records, disk potency, and method references only through governed scientific review.

## Final disposition

**AST METHOD REVIEW UX READY FOR OWNER APPROVAL**

No deployment was performed.

The finalized local candidate is awaiting owner approval. This status reflects completion of the requested scope and software checks; no method applicability or clinical validation has been granted.
