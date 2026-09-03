# AST Compass Professional-Readiness Audit

Audit date: September 2, 2026  
Production application: https://astcompass.com  
Repository reviewed: React/Vite application in `ast-compass-web`  
Scope note: The Breakpoint Engine scientific logic and data were inspected but not modified.

## Executive Summary

**Overall readiness score: 74/100**

| Intended use | Readiness |
|---|---|
| Professional-grade educational use | **READY WITH CONDITIONS** |
| Professional laboratory reference-support use | **NOT READY** pending qualified scientific review, current licensed data, and validated operational controls |
| Clinical decision-support use | **NOT CLAIMED / NOT VALIDATED** |

AST Compass is a coherent and unusually transparent educational product. Its strongest characteristics are conservative scientific wording, explicit demo boundaries, full Guest access, structured BCID attribution cautions, human verification before image concordance, and owner-scoped database policies in the supplied migrations. The current public application loaded successfully across all major and legacy routes reviewed.

The largest readiness limitations are not visual. Scientific content remains Demo/Draft rather than independently reviewed; the PHI screen is a client-side heuristic rather than a validated de-identification service; production RLS and storage isolation were not proven with two independent test accounts; account deletion and password-update completion are unfinished; automated coverage is primarily source-contract testing rather than behavioral browser/integration testing; and dependency vulnerability results could not be retrieved in the restricted audit environment.

This audit made only low-risk changes: telemetry message redaction, CSP allowances required by configured monitoring and fonts, generic server-function errors, improved keyboard focus/navigation semantics, and an intentional noindex 404 state. No Breakpoint, BCID, Concordance, PHI decision rule, database policy, or scientific data was changed.

## Architecture Map

```text
Browser (React 19 + Vite 6 SPA)
├─ App.tsx: routing, navigation, search, SEO, hubs, legal/footer
├─ Scientific data modules
│  ├─ organisms / antimicrobials / genes / mechanisms
│  ├─ demo breakpoints and expected phenotypes
│  └─ BCID panel, compatibility, individual and combined forecasts
├─ Scientific workflows
│  ├─ Breakpoint Engine (unchanged)
│  ├─ Resistance / Gene→Phenotype / Phenotype→Mechanism
│  ├─ BCID Forecast
│  ├─ manual Concordance
│  └─ Image Concordance: upload → local OCR/PHI screen → verify → analyze
├─ Learning: modules + 100 AST Detective cases
├─ Optional accounts: Supabase Auth loaded from a runtime CDN path
├─ Private persistence: Supabase tables + private Storage bucket + RLS migrations
├─ Feedback: private insert-only Supabase table
├─ Telemetry: anonymous PostHog events + minimal Sentry envelope client
└─ Netlify: static SPA, redirects, security headers, one dormant AI function
```

Guest users retain access to all scientific and learning workflows. Accounts add persistence only.

## Professional-Readiness Scorecard

| Category | Score | Strengths | Weaknesses / risks | Recommendation |
|---|---:|---|---|---|
| Scientific integrity | 78 | Conservative wording, Demo labels, source IDs, no treatment direction | Content is not qualified-SME reviewed; some metadata says sources checked without independent evidence | Establish named review owners and versioned review records before reference-support claims |
| User safety | 91 | Persistent educational banner; PRE-AST boundary; no-marker warnings; no clinical authorization | High warning volume can dilute attention; automated controls are not validation | Keep warnings; conduct usability testing to prioritize rather than remove them |
| Privacy | 68 | No-PHI policy, fail-closed OCR errors, local preview, private bucket design | Client-side screening cannot guarantee PHI detection; browser detector absence is not a hard failure | Require reviewed server-side second-stage screening before permanent image saving |
| Security | 74 | CSP, HSTS, no service-role key, RLS design, private signed URLs | CDN-loaded Supabase/Tesseract, no SRI; live policy isolation not penetration-tested; dependency audit incomplete | Pin dependencies, add automated scanning, and commission RLS/storage authorization tests |
| Reliability | 72 | Error boundary, empty states, deep-link redirects, production routes load | Password reset completion is incomplete; limited API retry UX; no offline/unsupported-browser strategy | Add end-to-end auth and failure-path tests |
| Accessibility | 70 | Labels, headings, aria-live messages, semantic tables/details, reduced-motion ticker | Search dialog lacks full focus trapping/restoration; custom combobox needs assistive-technology testing | Run axe + keyboard + screen-reader audits and implement dialog focus management |
| Mobile usability | 76 | Extensive responsive CSS and single-column fallbacks | Dense matrices/tables depend on horizontal containers; no automated viewport suite | Add Playwright checks at 320, 375, 768, and 1024 px |
| Performance | 68 | Small HTML/CSS; no heavy UI framework; local data avoids API latency | Main JS is about 423 kB/125 kB gzip; no route splitting; Tesseract is CDN-loaded on demand | Split account/image/learning routes and preconnect only where justified |
| Code quality | 66 | Typed scientific models and separated datasets/services | `App.tsx` is very large; Supabase client uses `any`; dense one-line JSX impairs review | Decompose routing/pages and replace `Query = any` with typed interfaces |
| Maintainability | 62 | Separate science data, regression contracts, clear policy docs | Internal `bcid2*` naming persists; version constants are scattered; giant CSS files | Centralize versioning and module boundaries without refactoring scientific engines |
| Product clarity | 88 | Three primary entry points, signature BCID/Concordance, clear boundaries | “Laboratory reference-support” can be overread while data are Demo | Keep educational positioning until validation gates are met |
| Professional presentation | 84 | Cohesive clinical-microbiology visual system and terminology | Some dense pages and repeated disclaimers reduce scan efficiency | Conduct moderated MLS/resident usability review |
| Search/navigation | 82 | Structured local-only grouped search, aliases, legacy redirects | Results do not preload entity selections; no-results behavior lacks query guidance depth | Add deterministic deep links with entity IDs only after route-state tests |
| Account/data ownership | 64 | Optional accounts, `auth.getUser()`, owner-scoped migration policies | Account deletion disabled; password update flow missing; cross-user isolation not proven live | Complete server-side deletion and two-user RLS/storage tests |
| Observability/monitoring | 70 | Sentry project/uptime configured; release/environment attached; PostHog allowlist | No controlled production error verified; CSP previously blocked ingestion; Sentry alerts not exercised | Deploy CSP fix, send a consented synthetic error, and document alert response |
| Legal/trust transparency | 80 | Strong No-PHI, educational-use, independence, analytics and retention language | Several statements describe intended behavior that still needs operational verification | Obtain counsel review and align text after deletion/retention implementation |
| Testing coverage | 54 | 23 passing high-value contracts for BCID, PHI, telemetry, legal, search | Mostly regex/source-contract tests; no browser E2E, live RLS, component, or visual tests | Build behavioral suites before calling the platform professionally validated |
| Deployment readiness | 82 | Netlify build, redirects, canonical domain, headers, sitemap, robots | Dependency advisory query unavailable; no CI workflow in repository | Add CI for typecheck, tests, build, audit/SBOM, and deployment smoke tests |

## Critical Findings

No proven **CRITICAL** defect was found in the repository or public Guest workflows. This does **not** establish that production data isolation is safe: cross-user RLS and Storage access were not tested with independent accounts, so the professional release gate remains open.

## High-Priority Findings

### HIGH — Permanent image saving relies on a client-side PHI screen

The workflow performs OCR locally, detects text patterns, and uses browser barcode/face detectors when available. OCR/scanner exceptions fail closed and blocked images have no UI override. However, a malicious or modified client can bypass client checks and write directly through allowed Supabase APIs if authenticated. Browser barcode/face detector absence is treated as “not detected,” not scanner failure. This is not a validated de-identification system.

**REQUIRES OWNER REVIEW:** Add a server-enforced second-stage screening gate and quarantine workflow before enabling permanent image saving for general professional use. Do not accept PHI.

### HIGH — Production authorization isolation is not yet proven

The migrations enable RLS and use `auth.uid()` checks on user-owned tables and Storage paths. Client services call `auth.getUser()` rather than trusting caller-supplied IDs. These are good controls, but this audit did not prove the deployed policies with User A/User B/anonymous adversarial tests.

**REQUIRES OWNER REVIEW:** Run automated Supabase integration tests for read, update, delete, signed URL, path manipulation, and anonymous denial using isolated test users.

### HIGH — Scientific review is insufficient for laboratory reference-support use

Breakpoint records are explicitly illustrative. BCID and mechanism content cite sources but remain Demo/Draft and lack qualified-reviewer metadata. The product appropriately avoids clinical claims, but it is not ready to be relied on as an authoritative laboratory reference.

**REQUIRES OWNER REVIEW:** Establish licensed/current source ingestion, qualified SME review, independent verification, effective dates, and controlled release records.

### HIGH — Account recovery and deletion are incomplete

Password reset emails redirect to `/settings`, but the application has no password-update control. Account deletion is visibly disabled pending a reviewed server-side deletion function. Legal copy uses conditional language, but user expectations still require an operational process.

**REQUIRES OWNER REVIEW:** Implement and test server-side account deletion and the Supabase recovery/password-update flow before promoting accounts broadly.

## Medium Findings

- **MEDIUM — Test depth:** Most tests inspect source text rather than execute React behavior. BCID multi-select, stale-selection clearing, Concordance result derivation, PHI UI gates, auth callbacks, and route/search clicks need behavioral tests.
- **MEDIUM — Dependency assurance:** `pnpm audit --prod` could not reach the advisory service in the restricted environment. No CI dependency scan or SBOM was found.
- **MEDIUM — Supply chain:** Supabase and Tesseract are loaded from jsDelivr at runtime without Subresource Integrity. Pin exact versions or bundle reviewed packages.
- **MEDIUM — Sentry verification:** Configuration and uptime monitoring exist, but a controlled production exception has not been sent and acknowledged. Before the local fix, CSP did not allow the Sentry ingestion host.
- **MEDIUM — Dialog accessibility:** The search dialog is labeled and Escape closes it, but it does not provide a complete focus trap or documented focus restoration.
- **MEDIUM — Unknown-route behavior:** Production previously rendered Home for unknown paths. A local safe fix now renders a noindex 404 state; it must be deployed.
- **MEDIUM — Error provenance:** The public science-assistant function is not linked from current search, but provider error details were returned on HTTP 500. A local fix now returns a generic message.
- **MEDIUM — Bundle architecture:** The main bundle is about 423 kB (125 kB gzip). Account and image tooling should be route-lazy-loaded.
- **MEDIUM — Legal/operations alignment:** Retention, deletion, monitoring, and private-image statements should be rechecked after backend workflows are operationally tested.

## Low-Priority Findings

- **LOW — Keyboard focus:** A global visible focus style and primary-navigation semantics were added locally.
- **LOW — Version drift:** Package version, telemetry version, release copy, and engine version strings are distributed across files.
- **LOW — Internal naming:** General product copy says BCID while internal scientific/source identifiers retain `bcid2` where manufacturer provenance matters. This is acceptable but should be documented.
- **LOW — Social assets:** Open Graph text exists, but there is no dedicated social image, favicon set, or app-icon manifest in the reviewed files.
- **LOW — Fonts:** The site imports Google Fonts; CSP previously omitted their origins. The local CSP fix allows only the required Google font hosts.

## Scientific Integrity

- No occurrences were found for “give this drug,” “best therapy,” “recommended therapy,” “safe for patient care,” or “negative gene means susceptible.”
- The only “clinically validated” wording appears in explicit negation/boundary language.
- No-marker BCID states explicitly say that absence does not establish susceptibility.
- BCID multiplex results include attribution cautions and an organism-marker matrix.
- Exact species forecasts precede group/parent fallback.
- Unreviewed exact combinations return “No reviewed forecast” rather than invented phenotypes.
- “Activity may be retained,” “Mechanism-dependent caution,” and “Cannot infer” remain distinct.
- Manufacturer BCID2 naming remains confined to source/panel provenance; the product feature is branded BCID Forecast.
- Breakpoint records are Demo/Draft and were not changed.

## BCID

Current implementation supports multiple organisms and markers, bidirectional filtering, stale marker removal on organism change, conditional associations, many-to-many attribution, species-first lookup, conservative combined rules, and explicit no-marker/no-forecast states. Existing tests cover these contracts, but they are predominantly source assertions. Add executable reducer/domain tests and browser interaction tests for every major pairing and reset case.

## Concordance and Image Concordance

The image workflow follows upload → PHI screen → human confirmation → extraction → verification → analyze → explain. It does not automatically produce clinical interpretation. MIC operators and categories are parsed separately; summary counts derive from result rows. Manual and image analysis share a concordance engine. The current implementation accepts one organism and one marker per image analysis, so “multiple organisms/markers” is a future capability, not a verified current feature.

## Privacy & PHI

Strengths include an acknowledgment, local preview, fail-closed OCR errors, no override for blocked states, guest session-only work, private Storage design, five-minute signed URLs, analytics key allowlisting, and no image/OCR/MIC/feedback payloads in telemetry. The Sentry local fix discards original exception messages and the message-bearing first stack line.

Remaining conditions: deploy and verify a server-enforced image gate, prove rejected images never reach Storage in production, validate browser-detector unavailability behavior, and test Storage policies with two users. The Privacy Policy correctly avoids guarantees and HIPAA claims.

## Security

No service-role key or frontend secret was found. `.env*` files are ignored and the example contains only public identifiers/placeholders. HSTS, nosniff, Referrer-Policy, Permissions-Policy, CSP frame restrictions, and private Storage are configured. CSP still permits inline styles and CDN scripts; this should be narrowed after dependencies are bundled. CSRF exposure is limited by PKCE/token APIs and no cookie-authenticated custom mutation endpoint was found. No `dangerouslySetInnerHTML` use was found.

## Authentication & Data Ownership

Email/password signup, verification messaging, sign-in, sign-out, Guest mode, and reset-email initiation exist. Google OAuth code remains in the provider abstraction but no Google button is exposed. RLS migrations use owner checks and Storage folder ownership. The live implementation still requires recovery-flow, deletion-flow, and adversarial ownership tests.

## Reliability

All reviewed production routes loaded without a blank screen. An application error boundary provides refresh/feedback recovery. Legacy routes redirect intentionally. API and save failures generally preserve user context and show generic messages. Add retry controls, abort/timeout handling, and E2E failure simulations. The isolated production build passes; a transient sandbox-only failure occurred when test and build processes were chained, then disappeared when build ran independently.

## Accessibility

Forms generally have labels, status messages use `aria-live`, results use text in addition to color, tables use headings, disclosures are native `<details>`, and motion honors `prefers-reduced-motion`. Local fixes add visible focus, navigation labels, current-page semantics, and an accessible mobile-menu label/state. Remaining work requires axe, VoiceOver/NVDA, keyboard focus-trap, custom combobox, table-caption, and touch-target verification.

## Performance

Production build output after safe fixes:

- HTML: 1.48 kB (0.62 kB gzip)
- CSS: 71.65 kB (14.36 kB gzip)
- JavaScript: 423.41 kB (125.41 kB gzip)

Tesseract loads only when image analysis is used, which protects the homepage. Route-level splitting would reduce initial JavaScript. Avoid adding large libraries.

## Mobile

CSS includes dedicated breakpoints for the header, primary cards, BCID layout, tables, legal pages, search, learning, and dashboards. Production route smoke tests passed. Automated viewport overflow and touch testing are still absent; these remain release-gate conditions.

## Analytics & Monitoring

PostHog is optional, production-only, anonymous by default, and uses an allowlist with person profiles disabled. No session replay was found. Sentry includes release/environment and now uses generic error values locally. The local CSP update allows the configured ingestion hosts. Do a consented synthetic-error test after deployment and document owner alert handling. Never send AST rows, OCR, images, feedback text, credentials, or PHI findings.

## Legal / Trust

Privacy, Terms, Feedback, No-PHI, educational-use, independence, manufacturer non-endorsement, Guest behavior, and image limitations are prominently stated. The policies correctly avoid a HIPAA-compliance claim. Legal counsel should review jurisdiction, retention, deletion, subprocessors, and incident-response language before broader institutional adoption.

## SEO / Domain

`https://astcompass.com` is canonical in metadata, sitemap, robots, and runtime page tags. The Netlify subdomain has a forced permanent redirect. Major routes have titles/descriptions, and legacy routes are preserved. Add a social image, favicon/app icons, and a real 404 response strategy if server-rendered status codes become important. The SPA currently serves `index.html` with HTTP 200 for client-side 404s.

## Testing

**Current result: 23 tests passed.** The production build passes independently. Existing tests cover PHI patterns/failures, MIC operators, search aliases, BCID inventory/compatibility/multiplex contracts, Guest/RLS architecture, telemetry filtering, legal routes, error boundary, and the new 404/telemetry-redaction checks.

Missing high-value suites: component behavior, browser routing/search, BCID selection state, Concordance outcomes, image gate interactions, User A/User B RLS and Storage, auth recovery/deletion, feedback persistence, network failures, accessibility, mobile overflow, and production monitoring delivery.

## Code Quality

Scientific datasets and services are separated, which is a sound database-ready direction. The main maintainability concern is concentration: `App.tsx` and global CSS carry many unrelated responsibilities. Refactor only UI/routing boundaries; keep scientific engines isolated and regression-protected. Replace the loose Supabase `Query = any` abstraction with generated database types after schema stabilization.

## Safe Fixes Applied in This Audit

1. Allowed only the required Sentry/PostHog and Google Fonts origins in Netlify CSP.
2. Removed original exception messages from Sentry payloads and skipped the message-bearing first stack line.
3. Replaced provider-specific HTTP 500 details in the dormant science-assistant function with a generic error.
4. Added visible global keyboard focus styling.
5. Added accessible primary-navigation, current-page, brand, and mobile-menu semantics.
6. Added an intentional noindex client-side 404 page instead of silently showing Home.
7. Added regression tests for telemetry redaction and unknown routes.

## Remaining Manual Actions

1. Deploy the safe fixes and verify response CSP in production.
2. With explicit approval, trigger one synthetic production error and verify Sentry receipt and email alerting.
3. Run `pnpm audit --prod` or an equivalent CI advisory scan with registry access; review every result.
4. Execute User A/User B/anonymous RLS and Storage tests against a non-production Supabase environment.
5. Confirm applied production migrations exactly match the reviewed SQL.
6. Complete account deletion and password-recovery update flows.
7. Add server-enforced image screening/quarantine before general permanent-image use.
8. Conduct qualified scientific review and independent verification; do not relabel content before completion.
9. Perform axe, keyboard, NVDA/VoiceOver, and mobile-device testing.
10. Obtain legal review before institutional contracting or reference-support positioning.

## Recommended v0.5 Priorities

1. **Trust gate:** live RLS/Storage integration tests and server-side account deletion.
2. **Privacy gate:** server-enforced second-stage image screening and auditable rejection lifecycle.
3. **Scientific governance:** versioned SME review records and controlled content release.
4. **Behavioral quality:** Playwright/Vitest suites for routing, BCID, Concordance, PHI, auth, and mobile.
5. **Accessibility:** focus-managed search dialog, combobox validation, and WCAG-oriented test automation.
6. **Maintainability/performance:** route splitting, generated Supabase types, centralized versions, and smaller UI modules.

## PROFESSIONAL-GRADE RELEASE GATE

- [x] production build passes locally
- [x] current automated tests pass
- [ ] no critical security issues (requires live authorization and dependency verification)
- [ ] no cross-user data access (requires User A/User B testing)
- [ ] PHI safeguards confirmed for permanent storage
- [x] no exposed frontend secrets found
- [x] no unsupported clinical claims found
- [ ] Privacy Policy fully matches verified production operations
- [ ] Terms fully match verified production operations
- [ ] mobile critical workflows pass automated/manual device tests
- [ ] accessibility critical issues resolved through assistive-technology testing
- [ ] BCID behavioral regression suite passes
- [ ] Concordance behavioral regression suite passes
- [ ] Image Concordance PHI integration tests pass
- [x] Guest access works in production
- [ ] account signup/recovery/deletion access works end-to-end
- [ ] error monitoring delivery and alerts verified with a controlled event
- [x] analytics code excludes known sensitive fields and replay is absent
- [x] astcompass.com canonical domain works
- [x] legacy URLs do not break
- [x] scientific status labels remain conservative (Demo; no unsupported Reviewed/Verified labels)

## Final Determination

AST Compass is suitable for a professional presentation as a **transparent educational platform in active validation**, provided the Demo/not-for-clinical-use boundaries remain visible. It should not yet be represented as a validated laboratory reference or clinical decision-support product. The shortest path to stronger professional readiness is not more features; it is proof of data isolation, stronger PHI enforcement, qualified scientific review, behavioral testing, and operational verification.

**AST Compass — A compass, not an autopilot.**
