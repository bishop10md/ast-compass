# AST Compass Enterprise Network Readiness Audit

Audit date: 2026-09-04  
Production domain: https://astcompass.com  
Scope: source, built client, Netlify configuration, production DNS/TLS/redirect observations, browser network dependencies, uploads, privacy boundaries, indexing, and external reputation workflow.

## Executive summary

**Enterprise network readiness score: 84/100**

| Decision | Status |
|---|---|
| Hospital network compatibility | **READY WITH CONDITIONS** |
| University/school network compatibility | **READY WITH CONDITIONS** |
| Public domain reputation | **NEW / NEEDS VENDOR REVIEW** |

AST Compass has a small and explainable production network surface. The hardened build serves the application, fonts, icons, and complete OCR runtime from `astcompass.com`. Supabase is feature-specific, while Sentry and PostHog are optional and failure-isolated. File uploads are browser-local, session-only, restricted by MIME type, extension, size, and magic bytes, and remain subject to the existing PHI screening gate.

The source is ready to deploy, but this audit does not claim the new headers or self-hosted OCR are live before that deployment is published and rechecked. The principal remaining blocker is reputation/policy: one hospital has reportedly labeled the new domain high-risk, while the exact filtering vendor and category remain unknown. DNSSEC and CAA also require registrar/DNS-provider confirmation.

This was a compatibility and source-security review, not a penetration test, HIPAA assessment, clinical validation, or guarantee of vendor allowlisting.

## Technical blockers

1. **Production verification after deployment:** confirm the new CSP/headers, `/trust`, `/.well-known/security.txt`, and `/ocr/*` assets on the canonical domain, then run a real image-OCR smoke test.
2. **Cross-browser managed-device validation:** current Chrome, Edge, Firefox, and Safari should receive a manual smoke pass on representative managed devices. Automated source tests cover graceful storage/telemetry failure but do not reproduce every institutional proxy or endpoint product.
3. **Feedback endpoint governance:** separately verify Supabase RLS, rate limiting/abuse controls, origin handling, and error logging in the deployed project. No policy or database change was made automatically.

## Reputation and policy blockers

- Obtain the hospital block page, product/vendor name, category, affected URL, and timestamp.
- Check and request truthful categorization with the relevant web-filter vendors; categories should align with Education, Health/Medicine, Reference, or Science/Technology when supported by that vendor's taxonomy.
- Retain dated results from Google Safe Browsing and VirusTotal. The owner's prior clean checks are recorded but were not independently certified by this audit.
- Institutional SSL inspection, DLP rules, new-domain policies, and local risk thresholds can still block a technically sound site.

## Required third-party domains

The educational core has **no required third-party browser hostname**. It requires only `astcompass.com` over HTTPS.

`dfsvprtsdqhjrkciflsk.supabase.co` is required only for Feedback and retained future account/data functionality. If blocked, core scientific and educational pages remain available.

## Optional third-party domains

- `*.ingest.us.sentry.io` — optional sanitized error reporting.
- `us.i.posthog.com` — optional cookieless aggregate analytics.
- `www.astcompass.com` and `astcompass.netlify.app` — redirect-only aliases.

See `AST_COMPASS_ENTERPRISE_ALLOWLIST.md` and `ENTERPRISE_NETWORK_DEPENDENCY_MAP.md`.

## DNS and TLS

Observed on 2026-09-04:

- `astcompass.com` certificate hostname and chain valid; Let's Encrypt issuer; observed TLS 1.3.
- HTTP redirects directly to HTTPS.
- `www` redirects directly to the apex domain.
- The legacy Netlify domain redirects directly to the apex domain.
- HSTS is present with `includeSubDomains`.
- Apex and `www` resolve to the active hosting addresses; no AAAA answer was observed.
- Google Search Console verification TXT exists and must be retained.
- No MX answer was observed; do not advertise an unmonitored security mailbox.
- DNSSEC/DS and CAA could not be conclusively verified with the available resolver tooling. Owner/provider review required.
- No dangling application subdomain was identified from the known configuration, but a full authoritative-zone inventory requires provider access.

## Security headers and CSP

The hardened Netlify configuration adds or preserves HSTS, `nosniff`, referrer policy, permissions policy, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy: same-origin`, and `Cross-Origin-Resource-Policy: same-origin`.

The production CSP is narrowed to first-party scripts, styles, fonts, images, media, manifest, workers, and OCR assets, plus feature-specific Supabase and optional telemetry connections. `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, and `form-action 'self'` are set.

Known CSP exceptions:

- `style-src 'unsafe-inline'` remains because the current React UI uses inline style properties. Roadmap: migrate remaining dynamic styles to classes/CSS variables or nonce-compatible styles.
- `script-src 'wasm-unsafe-eval'` is required for the locally hosted Tesseract WebAssembly runtime. Generic `'unsafe-eval'` is not allowed.
- `worker-src blob:` is required by the Tesseract worker bootstrap; worker code and OCR models are otherwise first-party.

COEP was not enabled because it can break legitimate resources and needs a dedicated cross-origin-isolation test; this is not currently required by the application.

## Third-party dependencies

Fixed in this audit:

- Replaced runtime jsDelivr Supabase loading with pinned `@supabase/supabase-js`.
- Replaced runtime jsDelivr/Tessdata OCR loading with pinned Tesseract packages and same-origin worker, core, WASM, and language assets.
- Replaced Google Fonts network loading with pinned, locally bundled Fontsource packages. DM Sans and Manrope are distributed under the SIL Open Font License; keep the package license notices with distributions.
- Removed the unused public science-assistant Netlify function and its OpenAI network path.

The built client scan found no jsDelivr, Google Fonts, unpkg, or cdnjs runtime reference.

## Tracking and analytics

Sentry and PostHog initialize only when configured for production, use minimized allowlisted data, and fail without blocking core features. Neither is a core dependency. The telemetry privacy filter prohibits image/OCR/MIC, account, credential, feedback, and laboratory-detail fields. There are no advertising pixels in the reviewed source.

Server-side Netlify Analytics may provide aggregate traffic without requiring a client-side advertising tracker. Institutional teams may block optional telemetry hosts with only observability loss.

## File uploads and Image Concordance

- Accepted: JPEG, PNG, WebP only; maximum 10 MB.
- Declared MIME type, extension, and magic bytes must agree.
- SVG and executable/spoofed files are rejected before decode/OCR.
- Browser decoding rejects unreadable images.
- Object URLs are temporary and revoked.
- OCR, parsing, PHI text checks, and available barcode/face checks run in the browser.
- Public images are session-only and are not persisted to personal history.
- Telemetry failure cannot block analysis.
- The existing No-PHI warning and screening rules were preserved; automated screening does not certify de-identification.

## Authentication and Supabase

Public account features remain disabled behind the centralized flag, hidden from navigation, and unnecessary for the scientific experience. Retained auth routes are intentionally unavailable/noindexed in the public mode. No service-role credential, database password, OAuth secret, Sentry auth token, or private API key was found in the tracked source or built client patterns reviewed.

The browser uses only the designed public Supabase client configuration. No raw database connection is exposed. Supabase is not contacted for ordinary anonymous educational page load; Feedback remains the identified public submission workflow. Database/RLS/private-storage changes require owner review and were not made.

## Netlify, redirects, and public endpoints

- Canonical production domain is `https://astcompass.com`.
- HTTP, `www`, and old Netlify aliases use direct canonical redirects without an observed loop.
- SPA fallback remains configured.
- Preview/development and promo routes should remain noindexed and should be rechecked in deployed previews.
- The dormant public AI function was removed.
- No active Netlify Function remained in the reviewed source after that removal.

## Search, crawlability, and trust signals

- Public Privacy, Terms, About, Feedback, References, and new Trust routes are available through semantic links.
- `robots.txt`, `sitemap.xml`, canonical metadata, unique route titles/descriptions, and intentional 404/noindex behavior are present.
- `/trust` was added to the sitemap.
- `/.well-known/security.txt` uses the real Feedback route rather than inventing an inactive mailbox.
- Authentication callbacks, hidden workspace pages, and promo tooling remain inappropriate for indexing.

## Web-filter classification

Recommended legitimate process:

1. Capture the exact block-page evidence.
2. Verify the category at the named vendor.
3. Submit `DOMAIN_REPUTATION_REVIEW_PACKET.md` with the public Privacy, Terms, About, Trust, References, and Feedback links.
4. Request the closest truthful educational/health/reference/science category.
5. Track the case number and review date.
6. Use normal institutional allowlisting while review is pending; never rotate, proxy, disguise, or tunnel traffic to evade controls.

## Fixes applied

| Finding | Result |
|---|---|
| Runtime CDN Supabase dependency | **FIXED** |
| Runtime CDN OCR dependencies | **FIXED** |
| Google-hosted font dependency | **FIXED** |
| Overbroad legacy CSP origins | **FIXED in source; LIVE VERIFICATION REQUIRED** |
| Missing frame/opener/resource headers | **FIXED in source; LIVE VERIFICATION REQUIRED** |
| Weak image type checking | **FIXED** with extension/MIME/magic-byte validation |
| Unused public AI endpoint | **FIXED** |
| Optional storage could interrupt learning flows | **FIXED** |
| Missing public trust summary | **FIXED** |
| Missing security.txt | **FIXED** using Feedback contact |
| Incomplete enterprise documentation | **FIXED** |
| Scientific engines/data changed | **NO — protected diff is clean** |

## Manual actions for Michael

1. Deploy this release, then verify live headers, `/trust`, `/.well-known/security.txt`, `/ocr/*`, Feedback, and Image Concordance.
2. Obtain the hospital block page and identify the filtering vendor.
3. Run and retain dated Safe Browsing/VirusTotal/vendor results; submit reclassification requests as needed.
4. Ask Netlify/DNS provider to confirm DNSSEC status, authoritative zone inventory, and CAA strategy before changing DNS.
5. Review Supabase Feedback RLS, abuse/rate controls, logs, and origin policy in the dashboard. Do not weaken No-PHI controls.
6. Perform managed Chrome/Edge smoke tests and current Safari/Firefox tests; include a network with optional telemetry blocked.
7. Create `security@astcompass.com` only after a monitored mailbox and response process exist; until then retain Feedback as the contact.
8. Consider replacing optional browser analytics with Netlify aggregate analytics if institutional telemetry minimization becomes a commercial requirement.

## Verification performed

- `pnpm test`: **67/67 passed**.
- `pnpm check`: **passed**.
- `pnpm build`: **passed**; locally hosted OCR assets included.
- `pnpm audit --prod`: **no known vulnerabilities found**.
- Runtime CDN/font scan: **passed**.
- Current tracked/built secret-pattern scan: **passed**, with only a test assertion mentioning a prohibited variable name.
- Protected Breakpoint/scientific data diff: **empty**.
- Production certificate/redirect/DNS/header observations: completed as described above.
- Not performed: penetration testing, authenticated vendor reputation certification, authoritative DNS-console review, or a full device/browser laboratory.

## Enterprise release gate

- [x] HTTPS valid
- [x] no mixed content detected
- [x] canonical domain correct
- [ ] DNS clean — **provider confirmation needed for DNSSEC/CAA and full zone inventory**
- [ ] no dangling subdomains — **known hosts clean; authoritative full-zone review needed**
- [x] no exposed secrets found in tracked source/built client scan
- [x] no unnecessary runtime CDN scripts
- [x] core site designed/tested to tolerate analytics blocked
- [x] core site designed/tested to tolerate Sentry blocked
- [x] core site works without external font requests
- [x] CSP tested at configuration/build level
- [ ] security headers verified — **new configuration requires post-deploy live verification**
- [x] redirects clean in current production observations
- [x] no unused public API endpoint retained
- [x] file upload restricted and validated
- [ ] no PHI in bundled demo assets — **text/source review clean; retain human visual/metadata review for all future media**
- [x] robots/sitemap valid in source and current production observations
- [x] Search Console verification retained in DNS
- [x] major public URLs intentionally indexable; private/promo routes noindexed
- [ ] VirusTotal reviewed — **owner-reported clean; retain dated evidence**
- [ ] Google Safe Browsing reviewed — **owner-reported clean; retain dated evidence**
- [ ] major enterprise categorization vendors reviewed
- [x] enterprise hostname allowlist documented
- [x] IT security overview created
- [x] reputation-review packet created

## Final verdict

**READY WITH CONDITIONS.** Deploy the hardened build and complete the live smoke/header check. The remaining hospital blockage should then be handled as a legitimate reputation/classification and institutional-policy review using the provided packet—not by changing domains or bypassing controls.
