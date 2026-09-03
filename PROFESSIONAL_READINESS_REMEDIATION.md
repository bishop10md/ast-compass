# AST Compass professional-readiness remediation

Basis: Professional-Readiness Audit dated September 2, 2026. This checklist does not claim clinical validation or professional laboratory-reference readiness.

| Finding | Severity | Status | Fix applied | Tests added | Manual action still required |
|---|---:|---|---|---|---|
| Search-dialog focus and keyboard behavior | Medium | PARTIALLY FIXED | Focus is placed in search; Tab is trapped; Escape closes; focus returns to Search; visible focus and 44 px targets added. | Source contract added. | Human screen-reader, zoom, and keyboard testing. |
| Custom combobox keyboard behavior | Medium | FIXED | Corrected first ArrowDown behavior; added Home, End, Escape reset, blur close, and status semantics. | Existing lookup tests plus source review. | Human assistive-technology validation. |
| Behavioral/browser coverage | High | PARTIALLY FIXED | Added readiness contracts; existing concordance, parsing, PHI, search, legal, telemetry, and promo tests retained. | `professional-readiness.test.mjs`. | Install/run Playwright and axe when package access is available; add full interaction matrix. |
| Mobile viewport validation | Medium | REQUIRES LIVE ENVIRONMENT | Existing responsive CSS preserved and touch targets strengthened. | Existing route/style contracts. | Browser checks at 320, 375, 768, and 1024 px for all audited routes. |
| Recoverable error UX | Medium | PARTIALLY FIXED | Feedback preserves input; PHI/OCR fails closed; generic errors retained. | Existing failure contracts. | Add browser tests and retry controls for history/save/auth callback. |
| Password recovery completion | High | PARTIALLY FIXED | Added recovery callback state, new/confirm password form, provider `updateUser`, success/error states, and dedicated route. | Recovery source contract. | Verify redirect URL and expired-link flow in live Supabase. |
| Account deletion | High | REQUIRES OWNER REVIEW | Disabled UI and server-only requirement retained; documented sequence below. | Disabled-state contract retained. | Deploy reviewed server function: delete private objects, owned rows, then Auth user; configure server-only service privilege. |
| Runtime CDN dependencies | Medium | PARTIALLY FIXED | CSP remains narrow; dynamic dependencies documented. | CSP/source checks retained. | Bundle Supabase and Tesseract after dependency registry access is available; then remove jsDelivr from CSP. |
| App.tsx concentration | Medium | PARTIALLY FIXED | Version and PHI boundaries extracted. Scientific engines untouched. | Build/source contracts. | Incrementally extract header/search/footer and route shells with component tests. |
| Route-level lazy loading | Medium | REQUIRES OWNER REVIEW | No risky router rewrite attempted in this pass. | Route contracts retained. | Add React lazy boundaries after browser regression coverage is available. |
| Scattered versions | Medium | FIXED | Added `src/config/version.ts`; telemetry and analysis persistence use shared constants. | Version contract added. | Keep release values deliberate during future releases. |
| BCID/BCID2 naming | Low | FIXED | Documented public BCID label versus BCID2 manufacturer provenance identifiers. | Version/source contracts. | Preserve provenance naming during future refactors. |
| Social assets | Low | FIXED | Existing canonical favicon, Apple icon, 192/512 icons, social mark, and metadata retained. | Existing promo tests. | Replace social mark only through approved canonical brand workflow. |
| Sentry delivery | High | PARTIALLY FIXED | Production-only delivery, redaction, allowlisted context, and a development-only owner diagnostic trigger are present. | Telemetry privacy contracts. | Set `VITE_ENABLE_OWNER_DIAGNOSTICS=true` locally, call `triggerOwnerSentryTest()`, then verify Sentry receipt/email; never auto-trigger production. |
| PostHog privacy | High | FIXED | Anonymous, allowlisted, no profiles/replay/content payload behavior preserved; sanitizer exported for testing. | Telemetry tests and readiness contract. | Verify configured production host and event receipt. |
| CI absent | High | FIXED | Added GitHub Actions install, typecheck, tests, build, critical audit, dependency review, inventory, and report artifacts. | Workflow itself. | Enable Actions and review first run. |
| Dependency vulnerability/SBOM visibility | Medium | PARTIALLY FIXED | Added production audit and deterministic dependency inventory commands. | CI step. | Run advisory audit online; consider CycloneDX after package access is available. |
| Dormant science assistant | Medium | REQUIRES OWNER REVIEW | Endpoint not removed because production use could not be proven absent. | Search confirms it is not linked by current UI. | Confirm Netlify logs/config, then remove function and stale secret if unused. |
| Intentional 404 | Medium | FIXED | Existing explicit page, Home action, canonical handling, and noindex preserved. | 404 contract. | Verify Netlify deep-link behavior after deployment. |
| Scientific review metadata | High | PARTIALLY FIXED | Added qualification, source version, verification date, evidence IDs, and content version fields. No statuses or names invented. | Version/status contracts. | Qualified SME review and independent verification. |
| Image Concordance single-pair scope | Medium | PARTIALLY FIXED | Current single organism/single marker behavior preserved; no multi-pair claim added. | Existing image-concordance tests. | Review every public/promo/legal surface during next editorial pass. |
| Client-only PHI gate for persistence | High | PARTIALLY FIXED | **Permanent image saving disabled**; server quarantine types/boundary and architecture plan added. | Fail-closed readiness test. | Implement and independently review server quarantine/scanner/storage flow. |
| Production RLS/storage isolation unproven | High | REQUIRES LIVE ENVIRONMENT | Added non-production adversarial-harness guard and exact test matrix. | Harness safety checks. | Complete REST implementation and run only against disposable Supabase. |
| Legal/operational wording | High | REQUIRES LEGAL REVIEW | No-PHI and educational boundaries preserved. | Existing legal tests. | Counsel review and operational verification; soften any still-unproven absolute claim. |
| Qualified scientific review | Critical | REQUIRES SCIENTIFIC REVIEW | No content promoted to Reviewed/Verified. | Status contracts. | Qualified reviewers must document scope, sources, versions, dates, and evidence. |

## Account deletion sequence

The client action remains disabled. A reviewed server function must authenticate the user, delete private Storage objects, delete every user-owned application row in a controlled transaction/order, delete the Auth user with server-only privilege, and return only generic status. Never expose the service-role secret through a `VITE_` variable.

## Required outcome categories

1. **FIXED NOW:** centralized versions; CI; keyboard combobox behavior; telemetry allowlist; intentional 404; existing social assets.
2. **PARTIALLY FIXED:** search accessibility, password recovery, PHI persistence safety, review metadata, supply chain, failure UX, Sentry.
3. **REQUIRES LIVE TEST:** Supabase recovery, RLS/storage isolation, Netlify routes, Sentry/PostHog delivery, mobile/browser testing.
4. **REQUIRES MICHAEL:** enable/review CI, approve server functions, verify alerts, confirm dormant endpoint, coordinate reviewers.
5. **REQUIRES SCIENTIFIC REVIEW:** every scientific module still labeled Demo unless documented review occurs.
6. **REQUIRES LEGAL REVIEW:** Privacy/Terms and organizational-use claims.

## Provisional score

**78/100 (provisional)**, up from the audit's 74/100. The limited increase reflects safer image persistence, recovery scaffolding, CI, metadata, and accessibility improvements. High-risk live, scientific, security-isolation, legal, and human-accessibility evidence remains open. AST Compass is not professionally or clinically validated.
