# AST Compass Scientific Governance

**Document status:** Internal policy and implementation reference

**Policy version:** 1.0

**Prepared:** 2026-09-06

**Applies to:** Scientific and educational content in AST Compass

**Does not establish:** Clinical validation, regulatory clearance, institutional approval, or completion of expert review

## 1. Purpose

This policy defines how AST Compass scientific content is sourced, represented, reviewed, changed, corrected, and released. Its purpose is to make every scientific assertion answerable to an identifiable source and an explicit review state.

AST Compass is an educational product. It does not replace a laboratory's current authorized standards, validated methods, quality system, institutional policy, or professional judgment. It does not provide patient-specific treatment recommendations.

This policy applies to, at minimum:

- breakpoint and no-breakpoint records;
- resistance mechanisms and molecular markers;
- intrinsic or characteristic phenotype expectations;
- BCID organism-marker associations and forecasts;
- Concordance and phenotype-to-mechanism rules;
- illustrative phenotype cards;
- educational guides, modules, and AST Detective content;
- scientific references and source metadata.

Product copy, navigation, layout, and non-scientific telemetry may use separate product-review processes. Any change that can alter a scientific interpretation remains governed here even when it is implemented as a user-interface change.

## 2. Non-negotiable boundaries

1. AI output is never accepted as the scientific source of truth.
2. Breakpoint values are not created, inferred, converted between standards, or copied from an adjacent organism, drug, method, or version.
3. CLSI, EUCAST, FDA, manufacturer, and local laboratory rules are not treated as interchangeable.
4. A source citation does not by itself make content `REVIEWED` or `VERIFIED`.
5. Existing content remains `DRAFT / EDUCATIONAL` until the required human-review evidence exists.
6. Reviewer names, qualifications, or verification claims are never invented.
7. Private reviewer notes, licensed-source extracts, and user-submitted content are not exposed publicly unless publication is explicitly authorized.
8. Patient identifiers, AST image content, MIC tables, and private analyses must not be copied into scientific-issue reports, telemetry, governance records, or this repository.
9. Scientific rules are versioned; replacement without an auditable change record is prohibited.

## 3. Source hierarchy

Sources are selected for the claim being made, not merely by a universal ranking. The following hierarchy guides selection and conflict resolution.

| Source class | Primary use | Governance requirement |
| --- | --- | --- |
| Current, applicable AST standard or regulatory interpretive criteria | Breakpoints, methods, categories, footnotes, scope, and reporting rules | Verify organization, document, edition/version, method, organism/drug scope, effective date, and license or access conditions. |
| Current manufacturer instructions and technical documentation | Panel menu, target names, specimen or sample type, reportable combinations, attribution limits, and assay limitations | Preserve manufacturer ownership and exact product/version context. Do not generalize beyond the documented assay. |
| Peer-reviewed primary studies and systematic reviews | Mechanism biology, analytical or clinical performance, documented discordance, and evidence limitations | Record a stable identifier such as DOI or PMID when available and distinguish primary data from review conclusions. |
| Authoritative clinical microbiology reference works | Foundational laboratory concepts, methods, terminology, and broader context | Confirm edition and publication information; licensed text is not reproduced beyond permitted use. |
| Professional/public-health guidance | Practice context, investigation frameworks, and public-health implications | Identify jurisdiction, publication/update date, and whether the guidance is current. |
| Local validated procedure or institutional policy | Local implementation | Never present as universally applicable. Local content must be clearly labeled and permission controlled. |

Search results, summaries, AI-generated text, uncited secondary webpages, and memory are discovery aids only. They are not authority records.

When sources disagree, the content owner must not silently combine them. The record should identify the applicable jurisdiction, standard, method, version, and unresolved difference. If applicability cannot be established, the content remains educational and should not generate a categorical interpretation.

## 4. Canonical scientific record

Every major scientific record should be capable of carrying the following metadata. A field may be absent only when it is genuinely not applicable or not yet known; absence must never be converted into a claim.

```ts
type ScientificGovernanceRecord = {
  contentId: string;
  contentType:
    | "breakpoint"
    | "resistance mechanism"
    | "molecular marker"
    | "phenotype expectation"
    | "concordance rule"
    | "BCID forecast"
    | "learning content"
    | "reference"
    | "other scientific content";
  sourceIds: string[];
  standardOrGuideline?: {
    organization: string;
    document: string;
    editionOrVersion?: string;
    publicationOrUpdateDate?: string;
  };
  astCompassContentVersion: string;
  reviewStatus: "Demo" | "Reviewed" | "Verified";
  lastReviewedDate?: string;
  reviewer?: string;
  reviewerQualificationOrRole?: string;
  independentVerifier?: string;
  verificationDate?: string;
  notes?: string; // private unless explicitly approved for publication
  changeHistory: ScientificChangeHistoryEntry[];
};

type ScientificChangeHistoryEntry = {
  previousVersion?: string;
  newVersion: string;
  sourceIds: string[];
  reasonForChange: string;
  dateChanged: string;
  reviewer?: string;
  affectedOrganismIds?: string[];
  affectedAntimicrobialIds?: string[];
  affectedModules?: string[];
};
```

The current codebase contains two older review vocabularies: `Demo / Reviewed / Verified` in `contentReview.ts`, and `Draft / Reviewed / Validated / Retired` in `types.ts`. The public governance vocabulary is:

- `DRAFT / EDUCATIONAL` (stored as `Demo` in the shared content-review type);
- `REVIEWED`;
- `VERIFIED`.

`Validated` must not be treated as a synonym for `Verified` or as a clinical-validation claim. Migration of legacy metadata requires an explicit mapping decision and record-by-record review; it must not automatically promote content.

## 5. Review states and evidence

### DRAFT / EDUCATIONAL

Content may be useful for education, demonstration, interface testing, or editorial development, but has not completed the documented AST Compass human-review process. It must not be represented as validated for clinical use.

Required minimums before publication:

- a stable content ID;
- at least one identifiable source, or an explicit `Needs source` internal flag;
- a clear educational-use boundary where a user might confuse the material with a patient result;
- no fabricated source, reviewer, or standard metadata.

### REVIEWED

Content has been checked by a documented human reviewer against the cited, applicable source. `REVIEWED` is allowed only when the review record contains:

- reviewer identity in the internal record;
- reviewer qualification or role relevant to the content;
- date reviewed;
- exact source IDs and applicable editions/versions;
- content version reviewed;
- disposition of discrepancies;
- completed scientific and regression checks appropriate to the module.

Review means source concordance; it does not imply clinical validation, regulatory approval, or independent verification.

### VERIFIED

Content has completed the `REVIEWED` requirements and has been independently checked by an additional qualified reviewer. The verifier must not merely repeat the same undocumented assertion. The record requires verifier identity, qualification or role, verification date, reviewed content version, and discrepancy disposition.

Verification remains scoped to the cited content/version. It is invalidated for a changed rule until the change completes review again.

## 6. Review workflow

```text
SOURCE IDENTIFIED
        ↓
APPLICABILITY CONFIRMED
        ↓
CONTENT DRAFTED OR IMPORTED
        ↓
PROVENANCE + VERSION ATTACHED
        ↓
SCIENTIFIC REVIEW
        ↓
TECHNICAL / REGRESSION TESTS
        ↓
OPTIONAL INDEPENDENT VERIFICATION
        ↓
VERSIONED RELEASE + CHANGELOG
```

The scientific reviewer should check:

- that the claim is supported by the cited source;
- that the correct organism/group, antimicrobial, method, unit, specimen/site context, standard, version, and footnotes are preserved;
- that a molecular association is not overstated as a measured phenotype;
- that a phenotype is not overstated as proof of a specific gene;
- that negative or off-panel results are not converted into susceptibility claims;
- that limitations and no-breakpoint states remain visible;
- that educational copy does not become treatment guidance.

The technical reviewer should confirm:

- record IDs and references resolve;
- schema validation succeeds;
- routes and source links work;
- accessibility and offline behavior remain safe;
- existing protected scientific engines have not changed unintentionally;
- tests cover the changed rule and foreseeable boundary cases.

## 7. Standard and version handling

Every interpretation tied to a standard should preserve:

- standard-setting organization;
- document name;
- edition or version;
- publication/update or effective date where known;
- organism or reporting group;
- antimicrobial;
- method and units;
- table or rule context and applicable footnotes;
- source ID;
- AST Compass content version;
- review status and last-reviewed date when present.

CLSI and EUCAST category language must retain its source-specific meaning. AST Compass does not convert criteria between organizations or substitute routine overnight criteria for a dedicated rapid-AST method.

If the requested local standard is not represented, show:

> This standard is not currently represented in AST Compass.
>
> Refer to your locally authorized standard, validated laboratory procedure, and institutional policy.

The system must not choose a “closest” standard, organism, agent, or method.

## 8. Scientific content update policy

AST Compass should maintain a controlled register of monitored standards, guidance, manufacturer documents, and high-impact publications. Monitoring identifies possible changes; it never changes production data automatically.

```text
NEW STANDARD / GUIDANCE
        ↓
CHANGE IDENTIFIED
        ↓
IMPACT ASSESSMENT
        ↓
SOURCE DATA UPDATED
        ↓
SCIENTIFIC REVIEW
        ↓
TESTS
        ↓
VERSIONED RELEASE
        ↓
CHANGELOG
```

The impact assessment records affected organisms, drugs, methods, modules, content IDs, tests, labels, and downstream examples. Superseded records are retained in version history or archived; they are not silently overwritten. Licensed source content remains subject to its access and redistribution terms.

An update is released only when the applicable review gate is complete. A newly published standard may be listed as monitored or planned before its values are implemented, but that status must remain distinct from supported, reviewed data.

## 9. Change control

Each scientific change should have a reviewable change set containing:

1. previous and new content versions;
2. source IDs and exact source versions;
3. reason for change;
4. date changed;
5. author/editor and scientific reviewer in the private record;
6. affected organisms, antimicrobials, mechanisms, rules, modules, and routes;
7. test evidence;
8. release version and changelog entry;
9. rollback or correction path.

Editorial changes that alter scientific meaning follow the same process as data changes. Spelling, layout, or accessibility changes may use a lighter review only when a diff confirms the underlying assertion did not change.

## 10. Correction and issue-reporting process

Scientific result and learning pages should offer a subtle **Report a scientific issue →** action. A safe issue link may include only:

- current route;
- stable content ID;
- AST Compass app version;
- preselected category `Scientific content / possible error`.

It must not include patient data, image or OCR content, MIC/zone tables, arbitrary search text, or private analysis content.

On receipt:

1. acknowledge and triage the report without exposing the reporter;
2. identify the content ID, production version, and cited sources;
3. assess whether immediate suppression or a visible caution is needed;
4. reproduce and document the issue;
5. obtain qualified scientific review;
6. correct, test, version, and release the change;
7. record the disposition and affected versions;
8. notify the reporter only if contact information was voluntarily supplied and use is authorized.

An unresolved concern stays open or the affected content returns to `DRAFT / EDUCATIONAL`. Silence is not evidence that a concern is resolved.

## 11. AI use boundary

AI is not the scientific source of truth for AST Compass.

Scientific content is derived from identifiable standards, peer-reviewed literature, manufacturer documentation, and other authoritative references. AI-assisted tools may support development, organization, coding, test generation, literature discovery, or quality-control workflows, but any scientific claim must remain source-linked and pass the required human review before it is represented as reviewed content.

AI may not:

- supply missing breakpoint values;
- resolve a standards conflict without authoritative documentation;
- invent citations, reviewer credentials, dates, or source versions;
- promote content to `REVIEWED` or `VERIFIED`;
- transform educational content into patient-specific advice.

AI-assisted changes must be reviewed using the same evidence and change-control requirements as human-authored changes.

## 12. Clinical-context boundary

Use the following statement in the Trust Center and selected interpretation workflows, without repeating it on every small card:

> AST interpretation is one component of clinical decision-making. Infection site, specimen type, organism, antimicrobial exposure, patient factors, pharmacokinetics/pharmacodynamics, local epidemiology, and institutional guidance may affect clinical interpretation.
>
> AST Compass does not provide patient-specific treatment recommendations.

This boundary is explanatory only. AST Compass must not collect diagnosis, patient name, medical history, prior therapy, renal function, pregnancy, comorbidities, or similar patient-specific inputs for a therapy engine.

## 13. Scientific release checklist

Before a governed release, document that:

- [ ] Every changed scientific record has a stable ID and source IDs.
- [ ] Standard/document/version fields are present where applicable.
- [ ] Review status matches documented human review.
- [ ] No reviewer or verifier field is invented.
- [ ] Licensed-source handling has been checked.
- [ ] Unsupported combinations fail closed and do not use nearest-neighbor rules.
- [ ] Limitations and clinical-context boundaries remain visible.
- [ ] Scientific issue reporting excludes sensitive inputs.
- [ ] TypeScript, automated tests, route/metadata checks, and production build pass.
- [ ] Protected scientific engines show no unintended diff.
- [ ] Release version and changelog are updated consistently.
- [ ] Public wording avoids clinical-validation, approval, certification, or compliance claims that have not been formally established.

## 14. Current implementation note

As inventoried on 2026-09-06, AST Compass contains reusable content-review metadata and source-linked scientific records, but current educational modules, demo breakpoint records, BCID forecast rows, gene records, and AST Detective content must not be assumed to have completed independent expert review. The repository's runtime version (`APP_VERSION`) and package version are aligned at 0.4.5 for this release; future releases must keep those identifiers synchronized.

This document establishes the process. It does not, by itself, promote any content status.
