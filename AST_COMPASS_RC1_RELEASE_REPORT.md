# AST Compass RC1 release report

Date: September 7, 2026. **LOCAL CANDIDATE ONLY — NOT PUSHED OR DEPLOYED.**

## Disposition

**READY FOR OWNER DEPLOYMENT REVIEW** for the approved educational, human-reviewed workflow. All required production-safety gates passed. No unresolved CRITICAL/HIGH security, privacy or scientific defect was identified by the checks performed. This is not clinical validation, an autonomous-OCR approval, or a claim of exhaustive security testing.

The strict OCR accuracy benchmark **FAILS**. It remains visible and unchanged: **R&D AUTOMATION ACCURACY BENCHMARK — NOT A HUMAN-REVIEW SAFETY FAILURE**. Deployment requires a separate owner decision; no push, deployment, provider mutation or DNS change was performed.

## Baseline and isolation

| Item | Recorded value |
| --- | --- |
| Production main | `b98f8d2ed3386f3cb7583a85d5a3b805ab6baf79` |
| Published Netlify deployment | `6a9ede17b7190f000816b0d1`, Published main@b98f8d2 confirmed in connected dashboard |
| Release branch | `release/ast-compass-rc1` |
| Release commit | The single local commit containing this report; exact ID supplied with the handoff and available with `git rev-parse HEAD` |
| Package | 0.4.5; dependency versions and `pnpm-lock.yaml` unchanged |
| Production canonical | `https://astcompass.com` |
| Baseline tests | 105/105, rerun before reconciliation |
| Baseline sitemap / cache | 29 apex URLs / `ast-compass-232ba0973e7b` |
| Final candidate sitemap / cache | 36 unique apex URLs / `ast-compass-49fb09410ec0` |

The RC uses a separate worktree created directly from refreshed production main, not the dirty development branch. Before integration, all 140 unreleased changed/new paths were classified in `FINAL_RC_CHANGE_INVENTORY.md`. Approved files were applied selectively. The 342 tracked/untracked-not-ignored development paths captured before reconciliation were rehashed afterward: **342 unchanged, zero differences**. No research worktree was merged or copied. Generated dependencies, fixtures, screenshots, certificates, profiles and logs remain ignored under local test/dependency directories, not release assets.

`FINAL_RC_BASELINE.md` and `docs/release/rc1-pre-reconciliation.json` preserve the before state. `docs/release/rc1-final-evidence.json` records current gate summaries, log/receipt hashes and approved protected-file differences. No real uploaded image or OCR transcript is included in committed release evidence.

## Approved changes included

| Approval | Included behavior and boundary |
| --- | --- |
| SCI-01 | Separate MIC/disk predicates and labels; disk diameter in mm; preserve inequality operators and loaded category boundaries. No numerical breakpoint-table edits or invented Intermediate category. |
| SCI-02 | Structured organism–marker–antimicrobial relationships replace prose-substring matching. Explicit mec/oxacillin/cefoxitin relevance retains species/method caveats and returns Cannot infer where source-reviewed categories are unavailable. |
| SCI-03 | Exact-species forecasts cannot leak to another species. Only explicitly authored group records may match a group; otherwise Cannot infer. |
| GOV-01 | Unsupported combined `reviewed=true` and compatibility review claims removed; neutral prose and future review-provenance schema. No Reviewed/Verified promotion. |
| SCI-04 | Option C: quinolone-like is `paused-pending-review`, still Draft, minimumEvidence 2 and maximum pattern weight 1. No additive scoring or changed threshold. |
| Product/coverage | References labels and Evidence alias preserved; conservative coverage directory/search; BCID non-manufacturer framing and external attribution; safe redundant badge cleanup; multi-antimicrobial Concordance. |
| Image workflow | Image-Assisted Concordance with PHI-first admission, original-image comparison, editable partial rows, mandatory human verification, stale-session isolation and local/session-only processing. |
| Infrastructure | Safe PWA cache/update behavior, optional telemetry isolation, feedback-network resilience, retained apex-domain rules, and low-risk responsive containment. |

The six added existing-workflow sitemap entries repair discovery omissions; the seventh is the already approved coverage directory. No new SEO article, science engine, account feature or design rewrite was introduced. Existing References navigation, robots and base HTML already matched production and were not unnecessarily replaced.

## Changes excluded

- `codex/ocr-v4-specialized-local`, `research/v4`, specialized token models, prototype data, research fixtures/reports, `model.bin` and `model-index.json`.
- Old unreleased host redirect rules that conflict with the completed provider-managed apex transition.
- Historical audit output and stale domain/enterprise reports as current acceptance evidence. The included image-workflow and SCI-04 decision documents are qualified historical context.
- Unapproved scientific numerical changes, inference expansion, review-status promotion, DNS/auth/RLS/legal/PHI-policy changes, new dependencies and autonomous OCR.
- Generated `work/`, browser profiles, local TLS keys/certificates, screenshots, `.env`, build outputs and research/runtime test harness assets from the commit and production output.

Existing V3 synthetic tables/cells remain **test-only regression inputs** for the explicitly required benchmark, not V4 research. Original 12 difficult rasters were regenerated afresh using the historical renderer and matched their frozen SHA-256 values. No difficult input was replaced to improve results.

## Test and build results

| Command / acceptance | Final result |
| --- | --- |
| `pnpm test` | **PASS — 294/294**, zero failures/skips; final rerun after test-only portability correction |
| `pnpm run audit:scientific-release` | **PASS — 10/10**; releaseBlocked false |
| `pnpm run audit:image-human-review-safety` | **PASS — 50 behavioral tests, 43 browser assertions**, plus actual local-OCR smoke |
| `pnpm run check` | **PASS** |
| `pnpm run build` | **PASS**, 199 modules, Vite 5.43 seconds |
| `pnpm run audit:static-release` | **PASS**, no detected secrets/injection/forbidden artifacts or missing precache assets |
| `pnpm run audit:image-extraction` | **FAIL, exit 1 — R&D only**; exact full-table 0/15, conservative-abstention 3/3, isolated cells 74/115 exact |
| `pnpm audit --prod` | **PASS — no known vulnerabilities found** at run time |
| `node scripts/audit-rc1-integrity.mjs` with production checkout | **PASS** — raw preservation plus semantic comparisons |
| `node scripts/audit-rc1-browser.mjs` | **PASS** — 66 route/width combinations, seven searches, row counts 1/3/5/10/20, navigation/legacy/404 checks |
| Local HTTPS PWA acceptance | **PASS — 6 checks**, browser installability, registration, offline fallback, waiting-update lifecycle, service isolation and cache exclusions |
| `git diff --check` | **PASS**; clean staged/commit state verified at handoff |

Browser: Chrome 152.0.7977.76. Runtime: Node 24.19.0 / pnpm 11.19.0. The safety and R&D receipts bind to the same final built `dist/index.html` SHA-256: `a65ca4b21ea6de520e8ac3c5e584c9db8adc0e6ae7ff146bea53d5591f79589d`.

Main JS is 561.23 kB / 167.57 kB gzip. The existing >500 kB Vite warning remains visible and nonblocking; its limit was not increased. Image/account/promo routes remain lazy loaded. Precache: 75 URLs, 1,642,590 bytes. Lazy first-party OCR assets total 16,739,359 bytes. No source maps or V4 artifacts were found in the build. Test-only/documentation changes after the build do not alter the tested application bytes.

## Scientific gate and protected file diffs

Sixty-three protected files were hashed before reconciliation: **42 remain byte-identical; 21 differ only within enumerated approvals**. Full before/after hashes are in the evidence JSON. Portable unit checks additionally freeze production content with CRLF-to-LF-only normalization; the raw-byte audit was not replaced or weakened.

| Protected changes | Approved reason |
| --- | --- |
| `src/data/antibiotics.ts` | Add recognition/alias metadata alongside the unchanged 73 legacy objects; canonical catalog has 72 identities by collapsing the duplicate clindamycin compatibility view. |
| `src/data/bcid2Compatibility.ts`, `src/data/bcidCombinedForecasts.ts`, `src/data/rapidDiagnosticTypes.ts`, `src/data/scientificGovernance.ts`, `src/data/types.ts` | Neutral unsupported review prose/behavior, explicit scope and future provenance/coverage schema. |
| `src/features/BreakpointEngine.tsx` | Approved SCI-01 method/operator/UI correction; numerical records and provenance unchanged. |
| `src/features/concordanceEngine.ts` | SCI-02/03 explicit relationship and exact/group forecast selection. |
| `src/features/phenotypeMechanismEngine.ts` | SCI-04 pause and conservative approved coverage admission. All eight signatures' original scientific fields compare equal to production after excluding availability/pause explanation. |
| `src/features/ImageConcordanceAnalyzer.tsx`, `src/lib/ocr.ts`, `src/lib/platform.ts` | Approved human-review/local extraction controls, safe cancellation and camera capability boundary. No PHI-rule change. |
| `src/features/BcidForecast.tsx`, `src/features/EducationalTopicPage.tsx`, `src/features/MechanismDetailPage.tsx`, `src/features/PhenotypeMechanismAnalyzer.tsx`, `src/features/PromoPhone.tsx`, `src/features/TrustPage.tsx` | Approved wording, status treatment, coverage/review presentation. |
| `src/features/Feedback.tsx`, `src/lib/telemetry.ts`, `src/services/feedbackService.ts` | Nonblocking, minimized telemetry and safe feedback/network handling. |

The primary breakpoint, gene, organism, BCID forecast narrative/panel, references, intrinsic-pattern and Detective data remain byte-identical to the baseline. The original nine breakpoint records are not newly validated; their actual simulated/demo limitations remain. Source registry: 28 unique original references, no orphan rule source IDs; three coverage-only standards IDs resolve through the explicit coverage registry.

Approved coverage: 24 required antimicrobial entries resolve, 72 canonical drug identities; 96 organism directory entries comprise 47 partial-support, 33 added reference-only and 16 out-of-current-scope entries. **Zero entries claim authoritative interpretation availability.** Recognition is not breakpoint support. BCID retains 26 bacterial identifiers and 10 markers; seven manufacturer yeast identifiers remain in the unchanged underlying menu but outside the resistance forecast. All 100 distinct Detective questions remain Draft. Scientific gates confirm conservative architecture and provenance boundaries, not source re-review or clinical validity.

## Image human-review safety and OCR limitations

PHI screening precedes source display/crop/extraction; user attestation cannot override a blocked/uncertain screen. The unchanged PHI policy cannot certify that an image is de-identified. The user must remove identifiers before selecting a file.

HIGH/MEDIUM confidence never authorizes analysis. Every included antimicrobial, MIC/operator and category must be explicitly reviewed and confirmed; editing any field revokes its snapshot and overall confirmation. Confirm-row requires deliberate inspection of the current fields. Partial/added rows block admission rather than disappear; missing-table disclosure and source comparison remain available. Handler-level guards reject even a DOM-enabled disabled button. Failure after a successful PHI screen preserves manual correction and the original image. Tests cover cancelled/late OCR, replacement images, revoked attestation, reload cleanup and no persistent history.

Actual OCR smoke recovered five draft rows and verified the admission/correction/cancellation boundary, **not transcription correctness**. The full strict benchmark shows why: the clean five-row table had only 4/5 exact MICs; the 30-row table recovered 30 rows but only 12/30 exact MICs; repeated columns recovered 15/30 rows. All 15 exact-table fixtures failed; three conservative-abstention fixtures passed their existing limited criteria. Isolated-cell exactness was 74/115 with oracle geometry, not an end-to-end accuracy figure. Thresholds were not lowered and confidence rules were not relaxed.

## Security, privacy and enterprise network

Static checks found no known secret patterns, unsafe HTML injection patterns, source maps, private/research artifacts, missing cache assets or non-HTTPS source URLs. The package vulnerability audit reported none known. CSP/HSTS/HTTPS policy is retained; the only Netlify header edit makes non-hashed first-party OCR assets revalidate. Upload format/size validation, blocked PHI admission, stale-session guards and telemetry sanitization tests pass. These are heuristic/static/regression checks, **not penetration testing**, git-history secret scanning or exhaustive bundled-media PHI examination.

Image processing/OCR remains local. No cloud OCR/AI upload, permanent image/history storage, OCR/MIC telemetry or new host dependency was introduced. Synthetic safety browser requests made no external submissions; fake-provider tests separately exercise sanitization because optional live providers may be unconfigured. The original image can retain metadata in temporary session memory for comparison; it is not a promise to scrub the source file's EXIF. Compressed 10 MB admission and bounded processed canvases do not establish a pre-decode megapixel memory ceiling.

Nine core routes rendered with non-first-party requests blocked. Offline feedback failed safely and retained input. This verifies browser isolation and fallback, not permission to bypass a workplace filter or guaranteed access on every hospital network. Live feedback delivery, provider-specific monitoring and authenticated persistence were not exercised; accounts remain disabled, and auth/RLS architecture is unchanged.

## PWA, mobile and accessibility

Local HTTPS Chrome reports no installability errors; manifest/icons/worker registration succeed. Seven educational routes load from the service worker while origin requests are blocked. That route-fallback lane keeps `navigator.onLine=true`, so it does not establish a fresh-navigation offline banner. A separate same-page offline/update check confirms two notices do not overlap. The update preserves the open session, waits for clients to close, then activates and removes the old cache. The acceptance harness was corrected to wait for this actual lifecycle instead of reopening prematurely; runtime activation was not forced.

Cache inventory contains 75 permitted static URLs, without uploads, query-bearing entries, feedback submissions or auth/private data. Local TLS is one-day test-only and not installed into the system trust store. Production-installed PWA migration is not proven by this test.

Browser coverage: 320/375/390/430/768/1440 px across 11 routes. No document horizontal overflow after minimal Breakpoints panel containment/title wrapping; no interpretation/control changes. Image comparison/zoom/collapse and review controls were exercised at four widths. Navigation has the exact eight requested labels, active states, one main heading per tested page, footer utility links and keyboard Ctrl-K/Escape focus return. Search covers CRO, CTX, CZA, SXT, evidence, references and KPC. Concordance row add/remove/limit works at 1/3/5/10/20 rows. This is not a complete WCAG contrast audit or assistive-technology certification.

## SEO and canonical

Fresh production observation passed 20/20 root/path/query redirect tests: HTTPS apex 200; HTTPS www permanent redirect to the same apex path; HTTP enforced. HTTP-www uses Netlify's two safe hops. TLS responses had no observed certificate error in those requests. Sitemap/robots/manifest/SW returned 200. Provider primary-domain settings, DNS, verification records and `public/_redirects` were not changed.

Candidate sitemap has 36 unique apex URLs; robots, canonical, Open Graph and shared production metadata use apex. Route/metadata tests cover intended public pages, legacy aliases and noindex for private/temporary/unknown routes. A static SPA host may return its shell with HTTP 200 for an unknown route; the application renders not-found/noindex, not an asserted edge-level HTTP 404. No indexing or ranking outcome is promised.

## Owner device tests still required

1. Android Chrome and iPhone Safari: camera permission, capture/upload fallback, orientation, crop/rotation, long table review, cancellation and on-screen keyboard behavior using de-identified synthetic material.
2. Physical devices: large/high-megapixel images, memory pressure, background/resume and image cleanup. Do not interpret the compressed-file limit as a verified memory cap.
3. Existing installed PWA: update/reopen, offline routes, notices and origin continuity on both platforms. Local Chrome installability does not prove iOS/Android installation.
4. Keyboard/screen-reader and contrast spot checks on actual devices; realistic user effort confirming every field and identifying missing rows.
5. Following a separately approved deployment only: live Netlify route/header/canonical smoke, feedback delivery, monitoring failures and real institutional-network acceptance. No production feedback submission was made by this RC task.

## Deployment recommendation

Review this single local release commit and complete physical-device acceptance before authorizing production. Retain mandatory human verification, abstention, Draft/scientific limitations and the failing R&D benchmark. Do not enable autonomous interpretation or claim clinical validation from passing software gates.

**No push or deployment is authorized by this report.** The release tree is clean at handoff; local ignored evidence remains available for inspection. Reproduction instructions: `docs/release/RC1_TESTING.md`.
