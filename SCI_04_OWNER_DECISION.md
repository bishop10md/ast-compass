# SCI-04 Owner Decision — Quinolone Inference

Prepared September 7, 2026. **LOCAL OWNER-REVIEW BUILD ONLY — DO NOT DEPLOY.**

## Decision and disposition

**OPTION C — PAUSED PENDING SCIENTIFIC REVIEW**

Reason: Current evidence does not establish a validated AST Compass one-observation or multi-observation quinolone mechanism-inference algorithm.

This implements the owner's explicit decision supplied in attachment `19e847ac-6759-460c-8b5b-691a9b87fb70/pasted-text.txt`. It is an approval to suspend inference, not qualified scientific approval of a predictive model. No reviewer credentials, review completion, or provenance were invented.

- Availability: `paused-pending-review`.
- Scientific review status: **Draft**, unchanged.
- `minimumEvidence: 2`, pattern weight **1**, and every other scientific number remain unchanged.
- No Option A or B implementation; no additive quinolone scoring.
- No commit, tag, push, deployment, DNS change, or provider configuration change.

**SCI-04 software remediation: COMPLETE FOR OWNER REVIEW. Scientific activation: NOT APPROVED. Overall production release: STILL WITHHELD.**

## Baseline and previous behavior

| Item | Observed baseline |
|---|---|
| Branch | `codex/supabase-feedback-upgrade` |
| HEAD, unchanged | `147247387eba5ee351089ecaab9f3c6ae2d27200` |
| App version, unchanged | `0.4.5` |
| Snapshot time | `2026-09-07T06:02:47.322Z` |
| Working tree | Existing uncommitted remediation work preserved; this was not a clean release checkout |
| Previous normal suite | 239 passing tests |
| Previous scientific gate | 8 PASS / 1 FAIL: SCI-04 unreachable threshold |

Previously, four drugs shared one expected pattern: ciprofloxacin, levofloxacin, moxifloxacin, and nalidixic acid. Its existing resistant predicate accepted R/NS. The evaluator added the pattern weight once if any matching observation existed. Therefore the maximum evidence was 1 even with several matching drugs, while the minimum was 2. The candidate was silently removed as insufficient data. Generic UI wording suggested adding more results even though that could not make this rule reachable.

The earlier investigation remains a historical record: [SCI-04 owner-review packet](<C:/Users/Michael/Documents/ChatGPT/AST Compass/ast-compass-web/SCI_04_QUINOLONE_OWNER_REVIEW.md>). Its then-pending decision and failed-gate conclusion are superseded by this owner decision, not retroactively rewritten. Its production observations were not newly repeated in this task.

## Implemented architecture

`PhenotypeSignature` now has an explicit availability union, separate from review status:

- `active`: the existing scoring path is available; this does **not** mean Reviewed, Verified, or clinically validated.
- `paused-pending-review`: requires Draft status and a pause explanation in the TypeScript contract.

Seven existing signatures are explicitly active. Only `quinolone-like` is paused. The active-only guard runs **before scoring**. A paused rule cannot emit a candidate even if a future accidental numerical edit makes its threshold reachable; the release gate also rejects that numerical edit.

`getPhenotypeAbstentions` returns one structured notice per applicable paused signature. It uses the existing organism scope and explicit drug membership to disclose availability without interpreting a category. It includes S, I, SDD, and Unknown observations for disclosure only; none becomes evidence of resistance. Non-applicable organisms, missing rows, and unrelated drugs do not receive a quinolone notice.

All 47 existing organism memberships and the four drug IDs are retained. Row IDs, measurements, comparison operators, categories, duplicates, and original observations are untouched. No new gene or treatment inference was introduced.

`phenotypeRowCoverage` distinguishes paused signatures from active rule coverage. A paused-only quinolone is recognized in the catalog without being described as contributing evidence to an active prediction. Intrinsic-pattern handling is unchanged.

## User-facing behavior

The interface displays the exact owner-approved explanation:

> Quinolone mechanism inference is currently unavailable pending scientific review. Quinolone resistance may involve multiple overlapping mechanisms, and the observed AST pattern alone does not establish a specific molecular mechanism.

It also states:

> This is not a negative mechanism result or evidence of susceptibility. Scientific status: Draft.

> Review the entered AST results and supporting references for additional context.

The references are explicitly described as educational context, **not validation of the AST Compass scoring model**. The original `ref-clsi` and `ref-idsa` IDs and URLs are retained.

- Unknown-only input can see the notice before pressing Analyze. The existing requirement for at least one reviewed, non-Unknown category is not relaxed.
- A completed paused-only result shows the explanation without the generic “Add more AST results” prompt.
- Mixed profiles show the pause alongside unchanged unrelated mechanism candidates.
- Duplicate quinolone rows generate one notice without deleting entered observations.
- The coverage directory retains the mechanism-literature link and labels its inference as paused.
- The notice has a semantic heading and screen-reader status region. Existing styles are reused; no library, CSS redesign, or scientific workflow replacement was added.

## Required regression cases

Every row below produced **no automated quinolone mechanism candidate**, retained the entered observations, and exposed the pause explanation.

| Synthetic profile | Result |
|---|---|
| CIP R | Paused notice; no candidate |
| CIP R + LVX R | Same; not additive evidence |
| CIP R + LVX S | Same; no new mixed-pattern interpretation |
| CIP R + LVX R + MXF R | Same; more drugs cannot activate it |
| CIP NS | Same; no new NS interpretation |
| NAL R | Same; catalog/educational material retained |
| Unknown quinolones | Availability notice before analysis; ordinary review admission still enforced |
| Duplicate quinolone rows | One notice; rows retained without score inflation |

Additional tests cover S/I/SDD-only input, empty/unrelated/unlisted input, organism-scope exclusions, exact explanation and source IDs, and absence of gene/treatment output.

Nine pre-decision actual-model fixtures cover all seven other signatures plus intrinsic-only and unrelated resistance. Current candidates, ordering, compatibility, limitations, source IDs, intrinsic findings, and combined-mechanism flags match those fixtures. Adding quinolone observations does not change their candidate outputs.

Isolated **in-memory test mutations**, never saved to scientific source files, prove that:

- Reachable numbers cannot bypass the pause.
- Accidental activation, missing/unknown availability, non-Draft status, missing explanation, or emitted quinolone candidates fail the gate.
- Suppressing every active candidate also fails the gate: all seven active witnesses must execute successfully.

## Scientific release gate

SCI-04 was **not removed** from the gate.

The old all-rules arithmetic check was separated into:

1. Active-rule reachability, including unknown-state rejection and an executable positive witness for each of the seven existing active signatures.
2. Explicit SCI-04 suspension: paused state, Draft, original minimum 2/weight 1, intact observations, no inference, and matching pre-analysis/result explanations across **376 cases** (47 existing organism contexts × 8 required profiles).

The resulting PASS verifies intentional, transparent abstention. It does **not** represent SCI-04 as a passing active scientific model. Reachability of the other Draft models is a software property, not clinical validation.

## Verification results

| Check | Final result |
|---|---|
| `pnpm test` | **PASS: 257 tests**, 0 failures, skips, cancellations, or todos; 18 new SCI-04 tests |
| `pnpm run audit:scientific-release` | **PASS: 10/10 checks**; includes safe SCI-04 suspension and seven active witnesses |
| `pnpm run check` | **PASS: exit 0** |
| `pnpm run build` | **PASS: exit 0**; Vite 6.4.3, 195 modules, postbuild completed |
| `pnpm run audit:static-release` | **PASS: exit 0**; 36 unique apex sitemap URLs, 28 unique HTTPS references, no emitted source maps or missing precache assets |
| `git diff --check` | **PASS** |
| Scientific file byte comparison | **32/32 unchanged** from this task's starting snapshot |
| Signature scientific fields | **8/8 exact semantic matches** after removing only newly added availability/explanation fields |
| UI checks | Actual React source executed/rendered in controlled tests; Unknown-only admission, paused-only, mixed-result, and coverage-link checks pass |

The existing nonfatal main-chunk size warning remains (561.24 kB / 167.59 kB gzip). No new runtime dependency or lockfile change was made.

The build is in local `dist/`. The static audit reports cache `ast-compass-0c7d367247f3`, 75 precache URLs, and no missing assets. This is **not** a fresh physical-device install/offline acceptance result. Source-rendering tests do not substitute for browser/device or scientific validation.

The existing-project Sites guidance was used to preserve the architecture and reuse existing styling. The local development server compiled and returned HTTP 200. No screenshot/DOM/device acceptance or live production verification is claimed for this focused task.

## Files changed in this task

These lists are relative to the task-start snapshot, not the entire pre-existing dirty Git diff.

Changed existing files:

- `src/features/CoverageDirectory.tsx`
- `src/features/phenotypeCoverage.ts`
- `src/features/PhenotypeMechanismAnalyzer.tsx`
- `src/features/phenotypeMechanismEngine.ts`
- `scripts/predeploy-scientific-gate.mjs`
- `tests/scientific-remediation.test.mjs`

New files:

- `src/components/PhenotypeInferenceNotices.tsx`
- `scripts/phenotype-availability-gate.mjs`
- `tests/fixtures/sci-04-owner-baseline.json`
- `tests/sci-04-abstention.test.mjs`
- `SCI_04_OWNER_DECISION.md`

The prior whole-file phenotype-engine hash assertion was deliberately replaced with exact **scientific-field/behavior** regression checks, because the owner approved availability changes in that engine. All other pre-existing protected assertions remain. The new fixture retains raw hashes for this local audit and LF-normalized hashes for portable Windows/Linux regression tests; no scientific file line endings were changed to make tests pass.

## Protected scientific source proof

Every file in `src/data/`, plus the Breakpoint Engine/predicates, Concordance engines, and PHI screening core, was byte-identical before and after this task. Full raw and newline-normalized digests are retained in [the baseline fixture](<C:/Users/Michael/Documents/ChatGPT/AST Compass/ast-compass-web/tests/fixtures/sci-04-owner-baseline.json>).

| File | Start and finish SHA-256 | Result |
|---|---|---|
| `src/data/antibiotics.ts` | `0c0afb12e37896484b72806b0b381ac3e0e14de3d219192b72dba109772dc22e` | MATCH |
| `src/data/antimicrobialCoverage.ts` | `0f13765a65566811cc07183a3655845cec06105bef876ac44e265513620c4a80` | MATCH |
| `src/data/astDetectiveQuestions.ts` | `1016ce12001fe5cab0336e331d67e6b4fd89c063b73337b6d2dadc3d9384e020` | MATCH |
| `src/data/bcid2Compatibility.ts` | `3f7d22252915b9d7901ed933638b37b8a78dd64f0ef26a5aed85400933375ff4` | MATCH |
| `src/data/bcid2Panel.ts` | `c4319a37f7b9298b901ebefeca348b2844a2726339d6988048cefa6254410aa6` | MATCH |
| `src/data/bcidCombinedForecasts.ts` | `e59405d27ce0e91db1e406c63f5425c4d59194b8f352b16f092845876b667cfc` | MATCH |
| `src/data/bcidForecasts.ts` | `16d8161841acbed2aaae493b03f96ecc3ca60054133b6ab2c389b3e6039e3db4` | MATCH |
| `src/data/breakpoints.ts` | `e880798aa41d4fcb0c804f5fa673e52f66767f4078069f5e780b5df1e7cc207a` | MATCH |
| `src/data/cases.ts` | `f6c4a040b5d90a75e58a5567e149eb77a7dcc03543333a7eef9230fc6e6fddfd` | MATCH |
| `src/data/concordanceRelationships.ts` | `6834af61af6906db28cdabac581455b1976107eea56a71043645580622d82f5a` | MATCH |
| `src/data/contentReview.ts` | `2c24b137e24f8f6d71e05c7cf240cc5774ddeed2c90613319e08adb47d7dcad6` | MATCH |
| `src/data/coverageOptions.ts` | `cb6d7b0b8d3d6d703c02afc013d9f5756318fdfd7af8b6105ba780b69c9808da` | MATCH |
| `src/data/dataChecks.ts` | `42fb780e2e9c5c66485c138968007258f22bafea380aaa73510d2bed0396a191` | MATCH |
| `src/data/educationalTopics.ts` | `f0aa808009ac6bcdf62ad0bb84ce7f88bc23cfb90fe80183521e384e43923624` | MATCH |
| `src/data/genes.ts` | `5ec4b8ac31bb566bb826118501223f38bb4b90ba8d9ecd11e358190b8ec1fb38` | MATCH |
| `src/data/index.ts` | `3f426e55749b63552037b116ef1123fc890212fd925c3fa548304d6d68f93969` | MATCH |
| `src/data/intrinsicPatterns.ts` | `2081bc1bfe8e4435fc7195d579ab07d82123ce60cb8a5ebbbe6fb4dfef8df095` | MATCH |
| `src/data/learningModules.ts` | `bc58369ecbbe967799f8f8f74db7e5343dc772e33f529c01e9a303fdfd75db68` | MATCH |
| `src/data/mechanismLiterature.ts` | `177ddf739d802bcc20faeb26e836293ab56098fb00f43481ef15d2f4087daa3e` | MATCH |
| `src/data/mechanisms.ts` | `0f2494131e926659c9ed709b9b6ea5d50deee8c92571b8a2b19171778ccd1217` | MATCH |
| `src/data/organismCoverage.ts` | `f8a1ee74daf4bffdd1840d4f7db1e2cb7412e73243922560c55940f10a5d639c` | MATCH |
| `src/data/organisms.ts` | `5f58599910d21400fb5fa83840913832454e8159f31fe024dcfccab70ef01aab` | MATCH |
| `src/data/rapidDiagnosticTypes.ts` | `d43bab372448351e77922e7cf43336a4915c72753060166fb89c31bcbedb2bfb` | MATCH |
| `src/data/references.ts` | `e7a1dfbd105c4055eb4cd9fc4746f952897b16dd4ba79ed9972459250d3ba425` | MATCH |
| `src/data/scientificGovernance.ts` | `097d9d09829c202132120b7e7f11cc11bfc0776d80fbaf2dfc975b75b93f45e2` | MATCH |
| `src/data/standardCatalog.ts` | `32c6871b5680f76719d0297a5b94acf84544b3059d62192bf97bcf4e62aa35a7` | MATCH |
| `src/data/types.ts` | `e72c59527793a5af22cbf80d77f4d9ecb89bd09339783b234cac6aaab5ead473` | MATCH |
| `src/features/BreakpointEngine.tsx` | `69528b34a2811ad480a952aedb7dd434d8a43df5d2ea11dac0a6b698d23926b4` | MATCH |
| `src/features/breakpointPredicates.ts` | `bd0e20b1f269ef6e4fb27553e1a23afaa75571c23c8e35a23f4c7c23387bd19f` | MATCH |
| `src/features/concordanceEngine.ts` | `0bac61b7451e59bd111b5296b3212a9adbbda244dba611fc83126a85fb13945e` | MATCH |
| `src/features/coverageConcordance.ts` | `a80d29b46d9ba48eef6942a8565cd616d4d74266859f8fc2e910279e1cd121ee` | MATCH |
| `src/features/phi-screening-core.mjs` | `7b08eb7fd828965ba3237b6d0a299b3b78b77d56c5fa2e23191d3dfe2d6e322b` | MATCH |

The phenotype-engine file necessarily changed from `b2b27263912c08d2139a863bfeb179b17c2ce6f139d73a9df6f081c63b1fc86c` to `909a013853e0a0f47d3196d8f59e4fee852bf39fe8af3d0e6f1fc13b55b1a235`. Its original scientific fields are snapshot-tested unchanged, including every minimum, weight, drug/organism membership, limitation, source ID, and Draft status. The diff leaves the category predicates, evidence accumulation, and compatibility calculation unchanged; it adds only explicit availability gating and structured abstention.

## Conditions for future reactivation

Do not switch this rule to active merely because the build or gate is green. Future activation requires:

1. A clearly defined scientific claim.
2. Approved organism and antimicrobial scope.
3. Approved category semantics, including NS and mixed/Unknown observations.
4. An explicit evidence model, including duplicate/independence handling.
5. Authoritative source locators supporting the proposed claim/model.
6. Validation fixtures and acceptance criteria.
7. Qualified scientific review.
8. Documented approval/provenance and appropriate change control.

Generic CLSI/IDSA references and this owner suspension decision do not satisfy those prerequisites.

## Remaining release restrictions

**DO NOT DEPLOY.** The focused scientific availability gate passing does not clear the separate infrastructure/acceptance release work.

The last recorded non-scientific findings remain in [NON_SCIENTIFIC_RELEASE_REMEDIATION.md](<C:/Users/Michael/Documents/ChatGPT/AST Compass/ast-compass-web/NON_SCIENTIFIC_RELEASE_REMEDIATION.md>):

- Live canonical-domain/provider alignment still requires owner coordination and re-verification; this task changed no DNS/provider setting.
- Real image/OCR accuracy and operator-preservation acceptance failures remain outside this SCI-04 change. Parser/unit passes must not be represented as real-image accuracy acceptance.
- Physical Android/iPhone PWA, camera, offline-indicator, and device-memory acceptance remains outstanding.
- Institutional network/reputation/allowlist acceptance remains unverified.
- The prior Yallist repair is recorded separately; its normal regression test passed again, but a fresh clean-clone/device environment was not certified here.

No privacy/PHI policy, OCR algorithm, auth architecture, Supabase RLS, BCID forecast, Concordance interpretation, breakpoint table, scientific review status, or deployment configuration was changed in this task. Historical reports were preserved.

**Scientific abstention is preferable to unsupported inference. This local build is returned for owner review only.**
