# CLSI M45 Expansion Plan

**Status:** Planning only — no M45 breakpoint values are included or authorized by this document

**Prepared:** 2026-09-06

**Current catalog entry:** `clsi-m45`, CLSI M45, 3rd Edition, `Planned`

**Protected behavior:** Existing Breakpoint Engine logic and existing breakpoint records are outside this plan and must not be changed without a separately reviewed implementation

## 1. Objective

Prepare AST Compass to represent applicable CLSI M45 content as a source-distinct, versioned dataset without mixing it with CLSI M100, EUCAST, FDA, or any local laboratory criteria.

This is an architecture, acquisition, review, and testing plan. It deliberately contains no breakpoint values, tables, disk contents, MIC thresholds, category cutoffs, or derived interpretations.

## 2. Why M45 must remain source-distinct

CLSI M45 addresses antimicrobial susceptibility testing for selected infrequently isolated or fastidious bacteria. Its organism scope, methods, tables, limitations, and interpretive criteria cannot be inferred from M100 or from EUCAST. A record is eligible for implementation only when its exact source context is available and verified.

For each future M45 record, AST Compass must preserve:

- organization: `CLSI`;
- document: `M45`;
- edition and, where applicable, supplement/revision information;
- source publication/effective date;
- organism or reporting group exactly as defined by the source;
- antimicrobial and formulation where relevant;
- method, medium, inoculum, incubation, atmosphere, and units where applicable;
- categorical or non-categorical status;
- table, section, footnote, exception, and specimen/site scope;
- source ID, content version, review status, reviewer record, and change history.

The UI and data layer must never select M45 simply because an organism looks “fastidious.” Applicability must come from an explicit reviewed mapping.

## 3. Current repository context

The current source inventory contains:

- 63 organism/group records;
- a `Fastidious bacteria` domain tag used for routing/planning;
- 73 antimicrobial records across bacterial, anaerobic, fungal, and mycobacterial domains;
- a standards catalog entry for CLSI M45 3rd Edition marked `Planned`;
- a CLSI Breakpoint Implementation Toolkit reference that identifies M45 as a source, but is not a substitute for licensed M45 content;
- nine breakpoint records, all explicitly educational/demo records rather than a reviewed clinical M45 dataset.

The existing domain tags are an inventory aid only. They do not establish that an organism is covered by M45, that a breakpoint exists, or that a particular method is applicable.

## 4. Organism groups for source-mapping triage

The following are **candidate records already present in AST Compass that require line-by-line comparison with the licensed current M45 edition**. Listing them here is not a claim that M45 contains a breakpoint or recommendation for them.

| Triage group | Current AST Compass records to check | Required decision |
| --- | --- | --- |
| Nonfermenters and other Gram-negative bacilli tagged for fastidious coverage | *Achromobacter xylosoxidans*, *Aeromonas* spp., *Burkholderia cepacia* complex, *Vibrio* spp., and any overlapping tagged group | Confirm exact taxonomic scope, method, agent set, and whether the record belongs in M45, another source, or an unsupported state. |
| Fastidious Gram-negative organisms | *Campylobacter jejuni/coli*, *Haemophilus influenzae/parainfluenzae*, *Helicobacter pylori*, *Moraxella catarrhalis*, *Neisseria gonorrhoeae*, *Neisseria meningitidis*, *Pasteurella multocida* | Determine the controlling CLSI document for each organism/method. Do not assume M45 solely from the current domain tag. |
| Fastidious or infrequently isolated Gram-positive organisms | *Aerococcus* spp., *Bacillus* spp. excluding *B. anthracis*, *Corynebacterium* spp., *Listeria monocytogenes* | Confirm source-defined grouping, exclusions, test method, and reportable agents. |
| Records with possible source overlap | *Yersinia enterocolitica* and any organism also tagged `Bacteria` | Establish a single explicit source-selection rule for each organism-drug-method combination; do not merge criteria. |
| Organisms not yet represented | To be identified only from the licensed source and documented user needs | Create records only after taxonomy, relevance, reference access, and review capacity are confirmed. |

Before implementation, a qualified reviewer must replace this triage list with a source-derived scope matrix. Organism names and taxonomy must be checked against the edition being implemented and against the product's canonical organism identifiers.

## 5. Required data model

The existing breakpoint shape already includes several useful fields, but the M45 implementation should be gated on an explicit source identity rather than relying only on a generic `standard` string.

Minimum future record structure:

```ts
type BreakpointSourceIdentity = {
  organization: "CLSI";
  document: "M45";
  edition: string;
  publicationOrUpdateDate?: string;
  sourceId: string;
};

type GovernedBreakpointRecord = {
  id: string;
  source: BreakpointSourceIdentity;
  organismId: string;
  organismScopeText: string;
  antimicrobialId: string;
  method: "MIC" | "Disk" | string;
  unit: string;
  diskContent?: string;
  susceptible?: string;
  intermediate?: string;
  resistant?: string;
  availability:
    | "Clinical breakpoint available"
    | "No clinical breakpoint available"
    | "ECOFF only"
    | "Research / tentative criteria"
    | "Not applicable";
  categoryMeaning?: string;
  specimenRestriction?: string;
  siteRestriction?: string;
  testingConditions?: string;
  tableReference: string;
  footnotes: string[];
  dosageOrExposureNote?: string;
  governance: ScientificGovernanceRecord;
};
```

Values should be stored as reviewed source data, not parsed from prose at runtime. Display formatting must not change the meaning of operators, ranges, units, or missing categories.

## 6. Licensing and source access

Owner action is required before any M45 values are entered:

1. obtain authorized access to the current applicable M45 edition;
2. confirm the license permits the intended internal extraction, implementation, display, testing, and distribution model;
3. document the authorized source copy, edition, access date, and any redistribution constraints;
4. restrict licensed working extracts to approved storage and reviewers;
5. avoid committing copyrighted tables or extensive source text unless the license explicitly permits it.

The public CLSI Breakpoint Implementation Toolkit and catalog metadata may help identify documents and versions. They are not sufficient authority for reconstructing M45 values. Search snippets, secondary summaries, AI output, and values copied from third-party systems are prohibited as source data.

## 7. Review requirements

### Source extraction review

Each record should be entered by one person and checked against the licensed source by a qualified AST reviewer. The review record must identify the exact edition, table/section, organism scope, antimicrobial, method, unit, categories, footnotes, and exclusions.

### Independent verification

Before any M45 record is labeled `VERIFIED`, a second qualified reviewer must independently compare the implemented record with the licensed source. Verification must include source-scope selection, not only numeric transcription.

### Clinical laboratory review

Review should cover:

- current taxonomy and reporting-group mapping;
- method-specific requirements;
- special growth, medium, atmosphere, or incubation conditions;
- relevant quality-control requirements;
- intrinsic-resistance or reporting qualifications;
- absent categories and explicit no-breakpoint states;
- footnotes, exceptions, and limitations;
- distinction between an educational implementation and local validation.

No reviewer identity or qualification may be populated without documentation. Until the gates are complete, records remain `DRAFT / EDUCATIONAL` and unavailable for clinical interpretation.

## 8. Testing requirements

### Schema and provenance

- reject missing organization, document, edition, source ID, method, unit, content version, or review status;
- reject duplicate IDs and unresolved organism, antimicrobial, or source IDs;
- require explicit availability state;
- ensure every source/document combination is internally consistent;
- ensure reviewer fields are absent when review has not occurred.

### Interpretation boundaries

- never fall back from M45 to M100, EUCAST, FDA, or a neighboring organism;
- never convert values between standards or units automatically;
- preserve `≤`, `<`, `>`, `≥`, ranges, dashes, and unavailable categories;
- show the unsupported-standard message when no reviewed source record applies;
- keep MIC and disk methods distinct;
- do not apply an M45 record outside its reviewed organism scope.

### Record-level tests after licensed data entry

For every implemented source row, reviewers should create immutable expected-result cases directly from the verified record. Boundary tests should cover each stated cutoff and the values immediately around it where mathematically meaningful. Tests must also cover footnote-driven exclusions, missing categories, unsupported methods, and version selection.

### Regression and release

- run TypeScript, all automated tests, route/metadata tests, and production build;
- compare the Breakpoint Engine file and scientific datasets against the approved change set;
- confirm no existing M100/EUCAST/FDA demonstration behavior changed unintentionally;
- verify mobile/PWA presentation of long organism names, source labels, version text, and unsupported states;
- retain an audit export mapping each test to a source record and reviewer decision.

## 9. UI implications

The interface should make the source identity visible before interpretation:

```text
Organization: CLSI
Document: M45
Edition: [reviewed edition]
Method: [reviewed method]
Source: [source link or licensed-source citation]
Content status: [DRAFT / EDUCATIONAL, REVIEWED, or VERIFIED]
Last reviewed: [only when documented]
```

M45 must appear as a distinct choice from M100. If a user selects an organism/agent combination without a reviewed M45 record, the interface should show the unsupported/no-breakpoint state rather than generate a result from another standard.

The interface must not expose licensed table text beyond the rights granted. A source citation and version label may be preferable to reproducing protected notes; legal/licensing review determines the final display.

## 10. Versioning and change history

- Use a dataset version separate from the overall app version.
- Retain organization, document, and edition in each source identity.
- Treat a new M45 edition as a new source version requiring impact assessment.
- Record additions, changes, removals, taxonomy mappings, and editorial corrections separately.
- Identify every affected organism, antimicrobial, method, rule, route, and test.
- Do not overwrite the prior edition before the new edition completes review and release gates.
- Publish a concise changelog that does not reproduce licensed content.

## 11. Proposed delivery phases and exit criteria

### Phase 0 — Access and governance

Exit only when source access/licensing is documented, reviewers are identified, the canonical review vocabulary is agreed, and the content-version convention is selected.

### Phase 1 — Scope matrix

Create a licensed-source-derived matrix of organism groups, methods, agents, category availability, and exclusions. Exit only after source extraction review; no public values are needed at this stage.

### Phase 2 — Schema and import tooling

Implement source-distinct records and validation that fail closed. Exit only when synthetic fixtures prove that M45 cannot be confused with M100 or another standard. Synthetic fixtures must never be shipped as scientific values.

### Phase 3 — Reviewed data entry

Enter a deliberately limited, high-priority subset from the authorized source. Each record must have provenance, record-level tests, and documented review. Do not expand faster than review capacity.

### Phase 4 — Independent verification and controlled release

Independently verify the release set, complete mobile/PWA and regression checks, version the dataset, publish the changelog, and monitor issue reports.

## 12. Open decisions requiring owner action

- Which licensed M45 edition and access model will be used?
- Who is qualified and available to perform source review and independent verification?
- Which institutions or regions are in the initial scope?
- What subset has the highest documented user need?
- What license-compliant source information may be displayed publicly?
- How will superseded licensed records and review evidence be retained securely?

Until these questions are resolved, M45 remains `Planned`, and AST Compass must not display or infer M45 breakpoint values.
