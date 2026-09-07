# AST Compass Scientific Trust Update Report

**Assessment date:** 2026-09-06

**Assessment scope:** Scientific trust, governance, progressive disclosure, safe issue reporting, privacy-conscious analytics, feedback categories, and internal roadmap documentation

**Baseline:** Repository working tree for the 0.4.x trust/governance update

**Important:** “Implemented” means present in the assessed source tree. It does not mean deployed, clinically validated, externally reviewed, licensed for additional source content, or institutionally approved.

## 1. Executive summary

The update establishes a substantive trust and governance foundation without changing the Breakpoint Engine or promoting scientific content to `REVIEWED` or `VERIFIED`.

Implemented source changes include a reusable scientific-governance record, an expanded public Trust Center, safe scientific-issue links, feedback categorization, privacy-constrained structured analytics, limited non-modal satisfaction prompts, progressive mechanism detail, and one clearly labeled source-linked illustrative CTX-M/ESBL phenotype card.

Prepared internal controls include the scientific governance policy, M45 expansion plan, scientific coverage roadmap, owner analytics specification, and de-identified user-feedback log.

The most important unresolved work is human and operational: apply and verify the feedback database migration, configure and audit analytics dashboards, obtain licensed source access for M45 or other protected standards, assign qualified scientific reviewers, and independently verify content before any `VERIFIED` claim.

## 2. Status legend

| Status | Meaning in this report |
| --- | --- |
| **IMPLEMENTED** | Present in source and validated locally; still subject to deployment verification. |
| **PREPARED** | Architecture, component, or documented process exists, but validation/review/content population is intentionally incomplete. |
| **REVIEW REQUIRED** | A qualified human must check scientific claims or an owner must confirm product behavior before stronger status is justified. |
| **OWNER ACTION** | Configuration, migration, assignment, policy adoption, or release action cannot be completed by code alone. |
| **LICENSED ACCESS** | Authoritative content cannot be populated until access and redistribution terms are resolved. |
| **EXPERT REVIEW** | Qualified domain review and, for `VERIFIED`, independent additional review are required. |

## 3. Requested status matrix

| Audit area | Current status | Evidence in the repository | Remaining boundary |
| --- | --- | --- | --- |
| Scientific governance | **IMPLEMENTED + PREPARED** | `src/data/scientificGovernance.ts` defines source, standard/version, review, reviewer, verification, notes, and change-history fields. `SCIENTIFIC_GOVERNANCE.md` defines the operating policy. | Existing records are not automatically migrated or promoted. Canonical status mapping and operational ownership require approval. |
| AI transparency | **IMPLEMENTED** | Trust content and governance policy state that AI is not the scientific source of truth and that scientific claims require identifiable sources and appropriate human review. | Public wording should be checked in final route/PWA/offline testing. AI assistance must continue to follow the same review process. |
| Regional standards | **IMPLEMENTED WITH LIMITED SCOPE** | Trust content explains country/region, standard, laboratory, method, organism, antimicrobial, and context differences. CLSI, EUCAST, and FDA are kept distinct. An explicit unsupported-standard message exists. | The standards catalog is not comprehensive and “architecture ready” does not mean complete reviewed breakpoint coverage. Other regions/local standards remain unsupported. |
| Guideline update policy | **IMPLEMENTED AS POLICY** | Public Trust and internal governance document the controlled sequence from new guidance through impact assessment, review, tests, versioned release, and changelog. | Monitoring sources, assigning owners, obtaining source access, and executing reviews are operational owner actions. No automatic update guarantee exists. |
| Clinical-context boundary | **IMPLEMENTED** | Reusable wording states the factors that may affect interpretation and explicitly rejects patient-specific treatment recommendations. Terms/Trust and selected workflows reinforce education-only scope. | Continue checking placement to avoid repetition or accidental expansion into patient-input collection. |
| Mechanisms UX | **IMPLEMENTED; SCIENTIFIC REVIEW REQUIRED** | The hub uses concise mechanism cards linked to dedicated pages. Detail pages preserve mechanism family, key concept, affected classes, associated markers, limitations, literature, and deeper learning links. | All mechanism scientific content remains educational/demo unless documented review is completed. Accessibility/mobile behavior requires final regression verification. |
| Visual phenotype cards | **PARTIALLY IMPLEMENTED + PREPARED** | A reusable, text-and-symbol component labels content `ILLUSTRATIVE PHENOTYPE` and `NOT A PATIENT RESULT`. One CTX-M/ESBL card is source-linked. AmpC is explicitly marked internally as needing illustration review rather than being fabricated. | Claim-level expert review is required before expanding the set. Do not generate cards automatically from mechanism names or broad class labels. |
| M45 preparation | **PREPARED** | The standards catalog marks CLSI M45 as planned. The optional `BreakpointSourceIdentity` model can keep organization, document, edition/version, publication/update date, and source ID distinct. `M45_EXPANSION_PLAN.md` defines scope triage, licensing, review, tests, UI, versioning, and release gates without adding values. | **LICENSED ACCESS + EXPERT REVIEW + OWNER ACTION.** No M45 values have been populated or attached to existing records. |
| Organism expansion roadmap | **PREPARED** | `SCIENTIFIC_COVERAGE_ROADMAP.md` inventories current catalogs and prioritizes expansion by relevance, user demand, aggregate analytics, source availability, and review capacity. | No dataset is expanded by the roadmap. Each domain requires its own source and review program. |
| Analytics | **IMPLEMENTED IN CODE + OWNER ACTION** | Live events use known organism, antimicrobial, marker, mechanism, reference, and workflow IDs. `search_no_results` accepts no raw query, and the telemetry sanitizer allowlists safe fields. A privacy-validated `breakpoint_lookup` helper is prepared but is not emitted from generic navigation because that would overstate a completed lookup. `PRODUCT_ANALYTICS_DASHBOARD.md` specifies private owner views and interpretation limits. | Owner must verify provider configuration, payloads, retention, access controls, and dashboard filters. Completion-level Breakpoint instrumentation remains deferred to a separately approved, non-scientific engine integration. Analytics do not validate scientific content. |
| User satisfaction | **IMPLEMENTED IN SELECTED WORKFLOWS** | A non-modal Yes / Not quite component emits only known workflow and aggregate response buckets. It is placed after meaningful BCID and Concordance workflows rather than every interaction; optional detail routes to private Feedback. | Confirm prompt frequency, keyboard/mobile behavior, actual event receipt, and no provider autocapture. |

## 4. Additional implementation findings

### Scientific review and source visibility

- Public Trust defines `DRAFT / EDUCATIONAL`, `REVIEWED`, and `VERIFIED` without claiming blanket verification.
- The reusable governance type stores optional reviewer and independent-verifier metadata so the UI can omit absent information.
- Existing mechanisms, learning content, BCID forecasts, genes, and demo breakpoint records remain educational/draft or otherwise unverified; this update does not change their status.
- Current source inventory contains 28 reference records: standards/regulatory sources, manufacturer documentation, authoritative microbiology books, guidance, and selected peer-reviewed publications.

**Status:** **IMPLEMENTED FRAMEWORK; EXPERT REVIEW REQUIRED FOR CONTENT.**

### Unsupported standards

The approved message is represented exactly in the governance layer:

> This standard is not currently represented in AST Compass.
>
> Refer to your locally authorized standard, validated laboratory procedure, and institutional policy.

The policy prohibits automatic conversion or nearest-standard substitution.

**Status:** **IMPLEMENTED/PREPARED; result-level integration must be verified without modifying protected breakpoint behavior.**

### Scientific change history

The governance record can store previous/new versions, source IDs, reason, date, reviewer, affected organisms, affected antimicrobials, and affected modules.

**Status:** **PREPARED.** Existing datasets do not yet contain a complete retrospective change ledger, and no history was fabricated.

### Scientific issue reporting

- Reusable links preselect `Scientific content / possible error`.
- Context is restricted to safe route, content ID, and app version.
- Feedback parsing rejects malformed category, route, or content values.
- The UI explicitly warns against patient data, AST image text, MIC tables, and private analysis content.
- Links are present on mechanism pages, focused educational topics, and Trust.

**Status:** **IMPLEMENTED.** The feedback schema migration and end-to-end production insert require owner verification.

### Feedback categories

The feedback form and service represent all requested categories:

- Scientific content / possible error
- Usability
- Missing organism/drug
- Missing resistance mechanism
- Breakpoint/standard request
- Feature request
- Privacy/security
- General feedback

The No-PHI reminder remains visible. A Supabase migration adds and constrains the category and safe content-ID fields; the service retains compatibility behavior for an environment where the new columns are not yet available.

**Status:** **IMPLEMENTED IN SOURCE; OWNER ACTION REQUIRED TO APPLY/VERIFY MIGRATION.**

### References terminology and BCID scope

- `References` remains the user-facing reference-library terminology.
- BCID public scope remains described as 26 bacterial organisms, 10 AMR markers, and manufacturer reference scope; this report does not call the forecast “36 targets.”
- The underlying manufacturer panel metadata continues to identify 7 yeast targets separately, while the resistance forecast intentionally excludes yeast-identification targets.

**Status:** **PRESERVED.** No BCID scientific rule was changed by the documentation work.

### Concordance multi-AST and No-PHI behavior

The current code retains multiple antimicrobial rows with optional measurements and phenotypic categories, plus human confirmation and No-PHI controls for image processing.

**Status:** **PRESERVED.** No Concordance scientific rule or PHI screening rule was changed by the documentation work.

## 5. Current scientific inventory and interpretation

| Inventory | Count/status at 2026-09-06 | Trust interpretation |
| --- | --- | --- |
| Organism/group catalog | 63 | Searchable/cataloged is not the same as breakpoint-supported. |
| Antimicrobial catalog | 73 | Presence does not establish applicability for every organism or standard. |
| General gene/marker records | 18, draft metadata | Human review required. |
| Mechanisms | 10 | All have literature mappings; no blanket independent verification. |
| Intrinsic/expected patterns | 6 | Limited educational set, not comprehensive. |
| Breakpoint/status rows | 9, demo/educational | Not a validated clinical breakpoint library. |
| BCID forecast rows | 20, draft | Pre-AST education only; AST confirmation required. |
| BCID manufacturer panel metadata | 26 bacterial, 7 yeast-identification, 10 AMR | Forecast scope uses bacteria + AMR markers; manufacturer owns panel composition. |
| Standards catalog | 9 entries: 3 architecture ready, 6 planned | Architecture/planning labels do not confer record-level review. |
| References | 28 | Identifiable source coverage, not proof that every claim was reviewed. |
| Focused learning guides | 7 | Source-linked educational content. |
| Learning modules | 10 | No blanket reviewed/verified claim. |
| AST Detective | 100 questions, bank `1.0-draft` | Educational game content remains Draft. |

## 6. Prepared for future validation

- canonical scientific governance metadata and public status definitions;
- source/version and change-history shape;
- controlled correction and release process;
- M45 source-distinct expansion gates;
- domain-by-domain coverage roadmap;
- owner analytics dashboards and safe event dictionary;
- reusable phenotype visualization with opt-in, source-backed data;
- satisfaction capture using aggregate response buckets;
- private user-feedback categorization and safe issue context.

Prepared architecture must not be described as reviewed scientific coverage.

## 7. Requires scientific review

- every current demo breakpoint/status row before any clinical representation;
- all 18 gene/marker records and 20 BCID forecast rows before status promotion;
- mechanism summaries, literature-to-claim mapping, and the single CTX-M/ESBL phenotype visualization;
- intrinsic/expected phenotype rules;
- Concordance and phenotype-to-mechanism rule content;
- all 100 AST Detective questions and the learning guides/modules in controlled batches;
- standard scope and applicability for each implemented organism-drug-method combination.

If evidence is insufficient, content should remain educational or be withheld. Review status must not be inferred from the presence of source links.

## 8. Requires owner action

1. Confirm the aligned `package.json` and runtime `APP_VERSION` value of 0.4.5 after deployment.
2. Review and adopt the governance policy and assign content owners.
3. Apply and verify `supabase/migrations/20260906_feedback_governance.sql` in the intended Supabase project.
4. Verify Feedback category inserts and fallback behavior end to end without PHI.
5. Configure private analytics dashboards, retention, access controls, and provider privacy settings.
6. Validate actual analytics payloads and confirm raw search text/forms are never captured.
7. Select and document a guideline-monitoring cadence and change owner.
8. Commission qualified review and independent verification appropriate to each module.
9. Deploy the locally validated build through the controlled release process.
10. Confirm public Trust, Feedback, mechanism, mobile/PWA, and offline-safe content after deployment.

## 9. Requires licensed source access

- CLSI M45 values, scope details, tables, and footnotes;
- any additional CLSI standards content not authorized for current use;
- licensed textbook or procedure-manual material beyond permissible citation and original summary;
- any regional or proprietary criteria whose implementation or redistribution terms are not yet established.

No licensed values or protected tables were added by the documentation deliverables.

## 10. Requires external expert review

Independent or external qualified review is needed before `VERIFIED` is displayed. High-priority areas include:

- breakpoint source extraction and standard/version applicability;
- M45 scope and future values;
- BCID organism-marker association and forecast boundaries;
- mechanism and illustrative phenotype claims;
- Concordance/phenotype-to-mechanism rules;
- fungal, rapid-AST, anaerobic, or mycobacterial expansion;
- review of the educational question bank if it is used for formal assessment.

The required reviewer qualification depends on the content. This report does not name or imply a reviewer.

## 11. Validation status

The documentation work itself does not modify the Breakpoint Engine, scientific datasets, BCID scientific rules, Concordance scientific rules, PHI screening rules, AST Detective scientific content, or scientific review statuses.

Final integration validation recorded on 2026-09-06:

- [x] TypeScript check (`pnpm run check`)
- [x] Complete automated test suite (`105/105` passing)
- [x] Production build and post-build checks (`pnpm run build`)
- [x] Trust route and offline-safe static content
- [x] References terminology and links
- [x] Mechanism progressive disclosure and responsive-layout contracts
- [x] Feedback categories, scientific-issue preselection, and No-PHI copy
- [x] Satisfaction prompt keyboard/mobile behavior contracts
- [x] Analytics payload/privacy tests
- [x] Standard/version labels and the exact unsupported-standard guidance in Trust/governance
- [ ] Result-level unsupported-standard behavior — intentionally requires a separately approved Breakpoint Engine change; the protected engine was not altered in this update
- [x] Protected-file diff confirming no unauthorized Breakpoint Engine, BCID rule, Concordance rule, PHI-screening, or AST Detective scientific-content changes

The BCID Forecast and Image Concordance component diffs are limited to when the optional satisfaction prompt appears; their scientific rules and PHI-screening logic were not changed. The production build completed with Vite's existing advisory that one JavaScript chunk exceeds 500 kB after minification. This is a performance optimization opportunity, not a build failure. Live deployment and provider-side verification remain owner release actions. The feedback category/content-ID migration must also be applied separately in Supabase; the compatibility fallback does not replace that owner action.

## 12. Overall conclusion

The update materially improves AST Compass's ability to explain where information came from, which source/version context applies, what its review status means, what cannot be inferred, how AI is bounded, and how a possible error can be reported.

It does not establish clinical validation, universal standards coverage, hospital approval, certification, FDA approval, HIPAA compliance, or completion of expert review. The next milestone is not automatic scientific expansion; it is owner adoption of governance, licensed source access where required, qualified record-level review, verified deployment configuration, and a controlled release with recorded test evidence.
