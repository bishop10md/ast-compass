# Image-Assisted Concordance — human-reviewed production candidate

> Historical workflow specification and original implementation receipt. RC1 has now selectively incorporated this approved workflow in a local release commit. For current test counts, build identity, limitations and disposition, use `AST_COMPASS_RC1_RELEASE_REPORT.md`. Statements below about no commit describe the earlier implementation, not the RC1 handoff. Nothing has been pushed or deployed by the RC1 task.

Date: September 7, 2026

**Disposition: candidate ready for final owner review. NOT DEPLOYED.**

This is a software safety and workflow change, not clinical validation or a claim of improved OCR accuracy. No new OCR model, breakpoint value, scientific interpretation rule, PHI screening rule, or scientific review status was introduced. No commit, push, DNS mutation, hosting change, or production deployment was performed.

## Why OCR is assistive

The source image is evidence. OCR is a draft transcription. A generated answer or HIGH/MEDIUM confidence does not prove that an antimicrobial, operator, decimal point, category, or complete row was read correctly. The source can itself contain errors; confirming a transcription does not validate the original laboratory result.

The route remains `/concordance/image`. Its heading, route title, homepage entry and Concordance landing entry now use **Image-Assisted Concordance**. Historical release notes and existing legal text were not rewritten.

Prominent wording:

> AST Compass can assist with extracting de-identified susceptibility results from an image. Review and confirm all extracted values before analysis.

## Mandatory verification workflow

1. Select de-identified educational material. Existing full-image privacy screening runs before crop, preview comparison or AST extraction. Blocked, possibly identifying or insufficiently screenable material has no override.
2. After clearance, explicitly attest that the image contains no PHI. Existing unavailable-detector warnings and policy remain unchanged.
3. Crop/rotate if needed, preview, and request local extraction. Retry and cancellation remain available. Alternatively, use **Enter results manually — keep this image** after clearance, including after extraction failure. Manual entry without an image remains available without image attestation.
4. Compare the original image against every row. Desktop shows the image beside the review surface. On smaller screens the source heading stays available below navigation and expands/collapses; zoom is adjustable from 1× to 8× with scrolling inside the image.
5. Every row contains antimicrobial, MIC/zone string, reported category, confidence and transcription-verification state. Confidence never initializes a confirmation.
6. Confirm each field explicitly. Or open each field with **Review** (which displays its current value), then select **Confirm row**. Row confirmation cannot be used until all three current values—including missing values—have been inspected or individually confirmed. There is no “confirm all OCR” action.
7. Edit directly or use the field’s **Edit** action to focus it. Remove unusable rows; use **Add antimicrobial** for missing rows. Partial reconstructed rows remain editable rather than being dropped because a field is unreadable.
8. MIC is optional: explicitly confirm absence when it is missing/unreadable; do not invent a value. A row with a blank antimicrobial or Unknown category must be corrected from its source or explicitly removed before analysis. The UI never infers a category from an MIC. Unknown rows are not silently filtered out.
9. Complete the overall attestation covering source comparison, context, extraction warnings and missing rows. The button **Analyze Concordance** stays disabled until every included row and field passes the current admission checks.
10. The handler independently recomputes the same checks before calling the unchanged Concordance interpreter with the full included row array.

Software can require observable review actions and explicit attestations; it cannot prove that a person read attentively or transcribed correctly. “Verified by you” is explicitly labeled as transcription confirmation, not scientific validation, and does not alter Draft/Reviewed/Verified scientific records.

### Revocation and admission controls

Each confirmation stores the exact current displayed field value. A boolean alone, including legacy `verified: true`, is insufficient. Editing drug, MIC/operator or category clears that field’s verification and inspection snapshot and revokes the overall confirmation/results. Suggestions are edits, not automatic approvals.

Organism/marker changes, image changes, crop/rotation changes, row addition/removal, and privacy-attestation withdrawal invalidate the applicable review/results. Duplicate canonical antimicrobial aliases require reconciliation. Cleared MIC text also clears any previous hidden numeric value/operator; unsuccessful parsing cannot retain an earlier MIC.

The privacy-screen replacement now aborts the old request without waiting for its potentially slow cleanup, registers the new request synchronously, and checks current session identity after asynchronous boundaries. Late logs, results and errors cannot replace a newer image’s state. The existing post-clearance extraction lifecycle still cancels/releases workers and ignores stale completion.

## Completeness and correction

The review summary reports:

- Rows detected **as an estimate**, or “Not determined” when extraction has not supplied a count.
- Rows reconstructed from the actual extraction result.
- Rows needing review **now**, derived from the current included rows and current value-bound confirmations.
- Unreadable rows **at extraction**, distinguished from subsequent manual edits.

These counts cannot establish completeness. The persistent review disclosure is:

> AST Compass may not have extracted the complete susceptibility table. Compare the extracted results with the source image and add any missing rows.

Original partial/unreadable reconstruction is retained where the existing cell-aware extractor can identify a physical row. If no row can be reconstructed, a manual row is available. A total extraction failure leaves cleared-image manual entry available. Neither route guesses absent rows or their contents. Removing a row excludes it from the subsequent analysis and resets the overall attestation.

## Separate gates

### AUTOMATION ACCURACY R&D BENCHMARK

Command: `pnpm run audit:image-extraction`

**Known status: FAIL.** The last full strict receipt is `work/image-extraction-v2/benchmark.json`, dated `2026-09-07T17:10:02.399Z`. It contains 18 fixtures: 15 exact-reconstruction cases and 3 conservative-abstention cases. **0/15 exact full-table cases passed.** No automated accuracy approval is claimed.

That full benchmark was **not rerun for this UI-only candidate**. The recognizer, raster fixtures, scoring thresholds and exact-match requirements were not changed. Its command still exits nonzero on failure; only its classification/output language now clearly distinguishes R&D accuracy from human-review production safety. The new safety smoke test below does not replace or convert that historical failure into a pass.

### HUMAN-REVIEW PRODUCTION SAFETY GATE

Command: `pnpm run audit:image-human-review-safety`

**PASS: 50 executable behavior/contract tests and 43 browser/real-OCR assertions.**

The gate requires a fresh local production build (`pnpm run build` first), runs the actual admission logic and existing PHI/privacy tests, and serves only the local `dist` candidate. It never deploys. Browser execution requires an installed Playwright runtime and Chrome; `AST_AUDIT_PLAYWRIGHT` can identify the existing runtime dependency directory without adding a library to the app.

Coverage includes:

| Safety requirement | Evidence |
| --- | --- |
| Unverified OCR cannot reach analysis | HIGH/MEDIUM/LOW and missing-metadata tests; exact-value admission; actual handler negatives; disabled browser button; real OCR starts with zero confirmed fields |
| Every included row is verified | 1/3/5/10/20/30-row policy tests; actual handler forwarding at 1/3/5/10/20; partial/new rows block instead of disappearing |
| Edits revoke verification | Every field and operator snapshot tests; actual browser MIC/operator edit; real-OCR field edit |
| Confirm row is controlled | Cannot confirm unopened fields; inspection alone does not confirm; explicit row action required |
| Missing rows disclosed | Actual summary warning and manual add/remove checks; estimated counts not fabricated ground truth |
| Source comparison remains available | Image loads at 320/390/768/1440 px, 8× zoom, expand/collapse, sticky toggle position, no document overflow; real-OCR lane also checks 320/390/1280 |
| Manual correction works after failure | Forced extraction-only failure after clearance, retained source, manual row editing/confirmation and actual analysis |
| PHI gate cannot be bypassed | Definite PHI, possible PHI, insufficient text and OCR failure expose no extraction/source/attestation; clearance without attestation does not expose extraction; withdrawal blocks analysis |
| Stale OCR is isolated | Deferred privacy replacement/unmount unit test; delayed cancelled OCR cannot clear a later blocked image; existing pending-worker cancellation/unmount tests; real extraction cancellation |
| No OCR content in telemetry | Non-vacuous production-mode fake-provider tests capture two sanitized requests and reject canaries; browser checks inspect attempted outbound bodies before blocking outside hosts |
| No personal persistence | Reload restores no image, review table or analysis; source object URLs are revoked on lifecycle cleanup |

Browser PHI-control tests script OCR responses **at the OCR library boundary only**; they do not modify PHI rules or app state and do not measure PHI-detection sensitivity. The deterministic manual fixture deliberately exercises software controls, not scientifically coherent data or transcription accuracy. The separate real-OCR lane uses the unchanged `clean-screen-5.png` raster and the actual local engine; it reconstructed five rows, but no claim of exact transcription is made.

Browser provider requests observed: 0 (providers unconfigured/optional). This alone is not evidence of payload sanitization; the executable fake-provider tests supply that evidence. No production monitoring account was contacted by this gate.

## Completed validation

| Requested check | Result |
| --- | --- |
| `pnpm test` | PASS — 290 tests; 0 failures, skips or cancellations |
| `pnpm run audit:image-human-review-safety` | PASS — 50 focused tests + 43 browser/real-OCR assertions |
| `pnpm run audit:scientific-release` | PASS — all 10 checks; existing SCI-04 suspension remains in place |
| `pnpm run check` | PASS |
| `pnpm run build` | PASS; pre-existing >500 kB chunk warning remains |
| `pnpm run audit:static-release` | PASS; no heuristic secret/injection findings, source maps or missing precache assets |
| Protected scientific/privacy file comparison | PASS — 42 files unchanged against the retained baseline |
| Exact automation benchmark | Known FAIL; not rerun and not represented as a human-mode release gate |

Candidate identifiers:

- Base commit: `147247387eba5ee351089ecaab9f3c6ae2d27200`, branch `codex/supabase-feedback-upgrade`, app version `0.4.5`.
- This checkout already contained substantial unreleased work; no release commit was created and unrelated edits were preserved.
- Safety receipt: `work/image-human-review/receipt.json`, run `2026-09-07T18:36:05.545Z`, ID `884cfb44-9665-4bf4-a06c-0d5cc081df85`.
- Tested `dist/index.html` SHA-256: `b81f42fd564264de512a493e2ba93786a7781de6f707e4f9d33ec4d2c6b3d5f9`.
- Generated PWA cache: `ast-compass-71f75f043eee`; existing content-hash cache generation updated naturally with the build.
- Static audit: 36 unique apex sitemap URLs; 75 precache URLs; 1,642,335 precache bytes; no missing cached assets.

Receipts and synthetic screenshots live under `work/image-human-review/` and `work/image-extraction-v2/human-review/` (gitignored local evidence). The previous complete R&D receipt was preserved. No permanent user images are included in these test artifacts.

## Privacy and science boundaries

- Existing PHI screening remains first, including full-image rather than cropped-only screening, existing blocking rules and explicit de-identification attestation. Automated screening cannot certify absence of PHI.
- All image decoding, crop/rotation and OCR run locally using the existing first-party assets. No external AI/cloud OCR or image upload was added.
- User images, OCR text, MIC tables, confirmations and results remain session-only. No history write or storage service was introduced; reload discards this work.
- No image/OCR/MIC data are added to analytics. Fixed workflow events and aggregate counts retain the existing sanitization and optional-failure behavior.
- Organism, marker, mechanism, breakpoint and expected phenotype are not passed to extraction to repair text. The dictionary is the existing text-name dictionary, not a scientific expectation model.
- Scientific interpretation remains separate and unchanged. Breakpoint records, BCID logic, Concordance relationships, phenotype rules, AST Detective content and review statuses were not changed by this task.

## Known limitations and owner review

1. OCR can still misread operators/decimals/categories, merge or miss rows, and fail on dense, rotated, small-text or low-quality images. Confidence is not an accuracy guarantee.
2. Estimated row counts cannot reveal every omitted row. The user must inspect the complete source and add missing rows, or decline to analyze it.
3. A blank MIC can be intentionally confirmed absent; this does not authorize guessing it. An unreadable category/drug must be corrected or the row explicitly removed. This limits completeness and must remain visible to the user.
4. Human review remains fallible. The software enforces deliberate controls, not attention or professional competence. Educational-use and verification warnings still apply.
5. Validation here used Chrome 152 on Windows and responsive viewports, not physical Android/iPhone camera hardware, native installed-PWA updates or a clinical human-factors study. Those remain owner/device acceptance tasks.
6. Static security checks are heuristic, not penetration testing or a HIPAA-compliance certification. Privacy-detector sensitivity was not newly validated.
7. The broader checkout includes earlier unreleased scientific/infrastructure changes. Passing this focused mode does not authorize publishing the whole dirty tree; final owner review remains necessary.

## Future OCR research path

Keep the strict exact-transcription benchmark and difficult raster corpus as an independent R&D measure. Any future recognition experiment belongs in the isolated research worktree, with fresh measurements, unchanged held-out cases, explicit false-acceptance reporting and owner approval before integration. The previous OCR V4 experiment remains unintegrated. No further model was attempted here. Even a future accuracy improvement should not silently remove the human-confirmation boundary.

## Change scope

Application: `src/features/ImageConcordanceAnalyzer.tsx`, new `src/features/image-human-review.mjs` and declarations, `src/components/ImageExtractionWorkspace.tsx`, `src/components/ExtractionSourceReview.tsx`, scoped `src/concordance.css` additions, and display-only Image-Assisted labels in `src/App.tsx`.

Validation: new safety script and tests, additive real-OCR smoke observations, existing source-contract tests updated for the stronger admission contract, and R&D command classification. No scientific/PHI engine edits, dependency installs, review-status changes or deployment changes.

**Final owner action: review the local candidate and device workflow. Do not deploy this checkout automatically.**
