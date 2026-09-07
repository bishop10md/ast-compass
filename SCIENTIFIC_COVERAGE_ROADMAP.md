# AST Compass Scientific Coverage Roadmap

**Status:** Internal planning document

**Inventory date:** 2026-09-06

**Scope:** Current repository content and controlled future expansion

**Important:** A catalog entry is not evidence of validated clinical coverage

## 1. Purpose

This roadmap inventories current scientific content and provides a conservative method for prioritizing future coverage. It does not authorize new breakpoints, mechanisms, phenotype claims, or review-status changes.

Expansion should follow five factors, in this order:

1. scientific and clinical relevance;
2. documented user requests;
3. aggregate search/view demand;
4. authoritative source availability and licensing;
5. qualified review and verification capacity.

The product should prefer a small, traceable, reviewed scope over a broad but weakly governed catalog.

## 2. Current inventory

The counts below describe records found in the source tree. They do not mean that every possible organism-drug-marker combination is implemented, reviewed, clinically validated, or appropriate for patient care.

| Content area | Current source inventory | Current maturity and important limit |
| --- | ---: | --- |
| Organisms/reporting groups | 63 | Catalog and routing coverage across bacteria, fastidious bacteria, anaerobes, yeast, filamentous fungi, rapid-AST tags, and mycobacteria. Inclusion does not establish a breakpoint. |
| Antimicrobials | 73 | Cross-domain catalog entries. Inclusion does not establish applicability to every organism, method, or standard. |
| General gene/marker records | 18 | All use draft editorial metadata in the current dataset. Marker presence does not determine MIC or categorical susceptibility. |
| BCID manufacturer reference scope | 26 bacterial organisms, 7 yeast-identification organisms, 10 AMR markers | Manufacturer-owned BIOFIRE BCID2 panel composition. The AST Compass BCID resistance forecast intentionally focuses on 26 bacterial organisms and 10 AMR markers; it must not be marketed as “36 targets.” |
| BCID forecast rows | 20 | Draft educational pre-AST expectations. They require AST confirmation and are not treatment guidance. |
| Resistance mechanism records | 10 | Educational mechanism summaries with affected-class labels. Dedicated literature mappings exist for all 10; the records do not currently establish independent expert verification. |
| Intrinsic/expected pattern records | 6 | Limited illustrative coverage, not a comprehensive intrinsic-resistance ruleset. |
| Breakpoint/status records | 9 | Explicitly demonstration/educational records; they are not a current validated breakpoint library. Do not infer coverage from the 63-organism and 73-antimicrobial catalogs. |
| Standards catalog entries | 9 | Three marked `Architecture ready`; six marked `Planned`. These labels describe architecture/planning, not reviewed data completeness. |
| Source/reference records | 28 | Ten standards/regulatory or standard-support sources, two professional/public-health guidance sources, two manufacturer sources, two authoritative textbooks, and twelve peer-reviewed publications. |
| Structured learning modules | 10 | Educational module records with source links; no blanket `REVIEWED` or `VERIFIED` claim. |
| Focused educational guides | 7 | Source-linked long-form guides covering selected high-interest concepts. |
| AST Detective questions | 100 | Bank version `1.0-draft`; every item is marked `Draft`. |

### Standards catalog detail

| Catalog ID | Domain | Source | Repository status | Coverage interpretation |
| --- | --- | --- | --- | --- |
| `clsi-m100` | Bacteria | CLSI M100, 36th Edition (2026) | Architecture ready | The architecture can identify this source; the current nine demo breakpoint records are not a complete reviewed M100 implementation. |
| `fda-stic` | Bacteria | FDA STIC, live regulatory source | Architecture ready | Record-level criteria still require source verification and version/effective-date handling. |
| `eucast-161` | Bacteria | EUCAST clinical breakpoint tables v16.1 | Architecture ready | Must remain distinct from CLSI/FDA and preserve EUCAST terminology and method context. |
| `clsi-m45` | Fastidious bacteria | CLSI M45, 3rd Edition | Planned | Requires licensed source access, scope mapping, review, and record-level tests. No values are authorized. |
| `clsi-yeast` | Yeast | CLSI M27M44S, 4th Edition | Planned | Source and review work required; no breakpoint expansion is authorized by the catalog entry. |
| `clsi-mold` | Filamentous fungi | CLSI M38M51S, 4th Edition | Planned | Source and review work required. |
| `eucast-afst` | Yeast | EUCAST AFST v12.1 | Planned | Requires source-specific fungal scope and category handling. |
| `eucast-rast` | Rapid AST | EUCAST RAST v9.0 | Planned | Dedicated RAST criteria must not be substituted with routine tables. |
| `mycobacteria` | Mycobacteria | Source not selected | Planned | No source has been selected; the domain must remain unsupported until governance and source work are complete. |

### Source coverage detail

The reference library has identifiable links for:

- CLSI, EUCAST, FDA, and breakpoint-implementation resources;
- planned bacterial, fungal, and rapid-AST standards;
- manufacturer BCID product and instructions pages;
- CDC and IDSA background/guidance;
- the *Manual of Clinical Microbiology*, 13th Edition, and *Clinical Microbiology Procedures Handbook*, 5th Edition;
- selected peer-reviewed publications on beta-lactamases, mecA/mecC, van systems, genotype-phenotype discordance, BCID performance, and breakpoint development/revisions.

This is a selective reference set, not a systematic review of each module. A URL or reference record does not demonstrate that every derived claim has been checked by a qualified reviewer.

## 3. Current strengths

- Core entities have stable IDs and source IDs in many datasets.
- BCID panel ownership and forecast boundaries are explicitly distinguished.
- Molecular-marker and phenotype workflows repeatedly state that genotype and phenotype answer different questions.
- The breakpoint dataset clearly labels current rows as demonstration/educational records.
- Literature pages now provide a route from each of the 10 mechanism summaries to source material.
- The repository includes no-breakpoint and ECOFF-only educational states rather than forcing every pair into S/I/R.
- Image workflows preserve a No-PHI boundary and session-only public processing.
- Search spans organisms, antimicrobials, markers, mechanisms, learning, cases, and references.

## 4. Governance gaps to close before broad expansion

### 4.1 Review metadata is not yet uniform

The source contains both `Demo / Reviewed / Verified` and `Draft / Reviewed / Validated / Retired` vocabularies. The scientific governance model should become canonical, while legacy records remain unpromoted until mapped individually. `Validated` must not be used casually because it could be read as clinical validation.

### 4.2 Catalog breadth exceeds rule coverage

Sixty-three organisms and seventy-three antimicrobials are searchable, while the breakpoint dataset contains only nine educational records and the intrinsic-pattern dataset contains six records. The UI must continue to distinguish catalog availability from supported interpretation.

### 4.3 Review evidence is incomplete

Current gene, BCID forecast, mechanism, AST Detective, and breakpoint content is draft/demo or lacks documented independent verification. Source links are valuable but do not satisfy the review gate by themselves.

### 4.4 App/content version identity needs reconciliation

For this release, `package.json` and the runtime `APP_VERSION` both report `0.4.5`. Scientific records and issue reports use that release identifier alongside dataset-specific versions.

### 4.5 Geographic scope is limited

The catalog acknowledges CLSI, FDA, and EUCAST sources, but it does not represent all national standards, local adaptations, methods, or institutional policies. Unsupported standards must fail closed with the approved message and no nearest-standard substitution.

## 5. Prioritized roadmap

### Priority 0 — Trust and traceability foundation

Complete before adding meaningful new scientific scope:

- adopt the canonical governance record and status definitions;
- attach record-level source/version metadata to high-impact rules;
- reconcile app, content-schema, and dataset versions;
- provide scientific issue reporting using safe route/content/version context only;
- maintain Trust content for sourcing, AI boundaries, standards scope, clinical context, updates, privacy, and reporting;
- test that unsupported standards and missing combinations do not trigger fallback interpretation;
- establish a private review register without exposing reviewer details or notes publicly by default.

**Exit evidence:** governance approval, version convention, source register, safe correction workflow, automated provenance checks, and an owner-assigned review process.

### Priority 1 — Review existing high-use content

Review the content already in front of users before multiplying it:

- the 10 mechanism records and their literature mappings;
- the 18 general marker records;
- the 20 BCID forecast rows and organism-marker association rules;
- Concordance and phenotype-to-mechanism rule boundaries;
- the six intrinsic-pattern records;
- the seven focused learning guides;
- a risk-based subset of the 100 AST Detective questions.

Use aggregate product analytics to identify which existing records receive the most views. High use increases review priority; it does not establish correctness.

**Exit evidence:** claim-to-source review worksheet, documented reviewer role, dates, content versions, discrepancies resolved, and tests tied to the reviewed content.

### Priority 1 — Standards and breakpoint source program

- preserve the current Breakpoint Engine unchanged unless a separately approved change is strictly required;
- determine the intended validated scope for M100, FDA STIC, and EUCAST rather than presenting catalog size as breakpoint coverage;
- acquire licensed M45 access and execute the separate M45 plan;
- define exact handling of no-breakpoint, ECOFF, research/tentative, and not-applicable states;
- establish source-update monitoring and controlled replacement by edition/version.

**Exit evidence:** authorized source access, explicit scope matrix, record-level review and tests, independent verification for any content labeled `VERIFIED`, and versioned release notes.

### Priority 2 — User-demand-led organism and drug coverage

Use structured, aggregate demand signals:

- known organism IDs selected in search/workflows;
- known antimicrobial IDs selected in search/workflows;
- no-results counts without raw query text;
- feedback category `Missing organism/drug`;
- requests for a named standard or method;
- recurring scientific issue reports.

Candidate domains already represented in the catalog but not comprehensively implemented include fastidious bacteria, anaerobes, yeast, filamentous fungi, rapid AST, and mycobacteria. Each domain requires its own authoritative sources, method expertise, review plan, terminology, and tests. Do not treat these as one generic expansion.

**Exit evidence:** a ranked demand list, source/license feasibility, assigned reviewers, bounded release scope, and no unresolved ambiguity about standard or method.

### Priority 2 — Visual phenotype education

Build visual cards only for patterns supported by the existing source set and reviewed claim-by-claim. Each card must:

- be labeled `ILLUSTRATIVE PHENOTYPE` and `NOT A PATIENT RESULT`;
- include text in addition to color or shape;
- separate “often expected,” “context dependent,” and “cannot infer” statements;
- link to source IDs and show review status;
- avoid categorical claims for individual patients or isolates;
- be suppressed or internally marked `Needs scientific review` when source coverage is insufficient.

Start with a small source-supported set rather than templating every marker automatically.

### Priority 3 — Learning and assessment review

- review AST Detective's 100 draft questions in topic-based batches;
- verify each correct answer, distractor explanation, source ID, and cannot-infer boundary;
- review structured learning modules and focused guides using the same source hierarchy;
- preserve educational scoring as learning feedback, not professional competency certification.

## 6. Prioritization method

For each proposed expansion, record evidence under the following headings. Do not generate a single numeric “scientific priority score” until the owner has approved weights and definitions.

| Factor | Evidence to collect | Disqualifying or deferring condition |
| --- | --- | --- |
| Scientific/clinical relevance | Frequency or consequence in the intended educational/laboratory scope; authoritative guidance | Scope is unclear or would invite patient-specific advice. |
| User request | Repeated categorized feedback, institution requests, issue reports | One ambiguous request without a defined use case. |
| Search demand | Counts of known structured IDs, module views, and no-result frequency | Raw free-text query collection would be required. |
| Source availability | Current authoritative source and stable provenance | Source unavailable, outdated, ambiguous, or licensing unresolved. |
| Review capacity | Named internal owner; qualified reviewer and, when needed, independent verifier | No qualified reviewer or insufficient time for record-level review. |

An item can be high demand and still be deferred for source, licensing, or review reasons.

## 7. Candidate gap register

| Gap | Current state | Next safe action | Gate before public scientific implementation |
| --- | --- | --- | --- |
| Comprehensive breakpoint coverage | Nine demo/status records | Define intended organism-drug-method-source scope | Licensed/current sources, review, boundary tests, independent verification policy |
| CLSI M45 | Cataloged as planned | Complete source/license acquisition and scope matrix | See `M45_EXPANSION_PLAN.md` |
| Fungal AST | Organisms and agents cataloged; CLSI/EUCAST sources planned | Choose a bounded yeast or mold scope | Fungal AST subject-matter review, source-specific methods, licensing |
| Rapid AST | Some organisms tagged; EUCAST RAST planned | Define method/incubation-specific scope | Dedicated RAST source review; no routine-breakpoint fallback |
| Anaerobes | Organisms/limited agents cataloged | Document demand and controlling sources | Method and source review; organism-drug coverage matrix |
| Mycobacteria | Organisms/agents cataloged; source not selected | Select authoritative scope and source | Specialist review, source/version and method model |
| Intrinsic patterns | Six records | Audit high-use organism/drug pairs | Authoritative source mapping and conservative rules |
| Mechanism visualizations | Reusable presentation can be prepared | Review a small number of source-backed cards | Claim-level scientific review and accessible rendering |
| Regional/local standards | Not comprehensively represented | Collect categorized requests, not patient data | Authoritative source access, jurisdiction label, no conversion/fallback |

## 8. Source acquisition and review-capacity roadmap

1. Maintain a source register with owner, document/version, access date, update channel, license notes, and affected modules.
2. Assign a content owner for each scientific domain.
3. Identify the required reviewer role for each domain; do not infer qualifications from job titles alone.
4. Limit each release to content that can be reviewed record-by-record.
5. Reserve independent review capacity before promising `VERIFIED` status.
6. Keep source extracts and reviewer notes private; publish only approved provenance and reviewer metadata.
7. Reassess priorities using aggregate analytics and categorized feedback at a documented cadence chosen by the owner.

## 9. Measurement plan

The privacy-conscious analytics layer should support only known structured identifiers and aggregate outcomes:

- `organism_searched` with a validated `organism_id`;
- `antimicrobial_searched` with a validated `antimicrobial_id`;
- `marker_searched` with a validated `marker_id`;
- `mechanism_viewed` with a validated `mechanism_id`;
- `breakpoint_lookup` with known organism, antimicrobial, and standard IDs;
- `reference_viewed` with a validated `reference_id`;
- `search_no_results` without the raw query;
- aggregate workflow satisfaction.

Analytics may prioritize review or expansion; they never validate a scientific claim. See `PRODUCT_ANALYTICS_DASHBOARD.md`.

## 10. Roadmap review questions

At each roadmap review, ask:

- What source and version supports this proposed scope?
- Is the source accessible and licensed for the intended use?
- What exactly is supported versus merely searchable?
- Which qualified reviewer will check it?
- What can the rule not infer?
- What happens when the combination or standard is unsupported?
- Can a user report an error without transmitting sensitive information?
- Is the release small enough to test and audit completely?

No dataset should expand solely because an entry can be generated programmatically.
