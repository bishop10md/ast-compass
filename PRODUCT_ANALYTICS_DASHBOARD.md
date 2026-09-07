# AST Compass Owner Analytics Specification

**Status:** Internal owner specification — no public analytics dashboard

**Prepared:** 2026-09-06

**Purpose:** Prioritize scientific review, usability work, and carefully scoped content expansion without collecting arbitrary scientific or patient-related text

## 1. Principles

1. Analytics measure product use; they do not validate scientific content.
2. Prefer stable AST Compass catalog IDs over names, labels, aliases, or free text.
3. Never transmit raw search queries, feedback text, MIC/zone tables, image/OCR content, filenames, patient data, email addresses, account tokens, or private analysis content.
4. Do not build user profiles. Aggregate by event and coarse product context.
5. Do not publish analytics or expose owner dashboards to public users.
6. A missing event is not proof that a feature was unused; blockers, offline use, configuration, or privacy controls may prevent collection.
7. Analytics should fail without blocking the educational application.

## 2. Current implementation baseline

The repository contains a production-only telemetry layer that can send aggregate events to PostHog when configured and sanitized application errors to Sentry when configured. It uses a session-scoped anonymous identifier and requests that PostHog not create a person profile. Core product access does not depend on either service.

The product-analytics adapter validates IDs against the current organism, antimicrobial, marker, mechanism, and reference catalogs before emitting structured events. Its no-results function accepts no query argument by design. Satisfaction responses are limited to two known buckets.

Deployment configuration, provider retention, access controls, and actual event receipt require owner verification. Code presence does not demonstrate that a dashboard is populated or that a particular privacy regime has been satisfied.

## 3. Approved event dictionary

| Event | Trigger | Approved event-specific properties | Explicitly prohibited |
| --- | --- | --- | --- |
| `organism_searched` | User selects a known organism result | `organism_id` | Query text, organism name typed by user, specimen, patient context |
| `antimicrobial_searched` | User selects a known antimicrobial result | `antimicrobial_id` | Query text, dose, therapy plan, patient context |
| `marker_searched` | User selects a known marker result | `marker_id` | Query text, raw assay output, patient result |
| `mechanism_viewed` | A known mechanism detail page opens | `mechanism_id` | Arbitrary URL parameters, prior analysis |
| `breakpoint_lookup` | A complete lookup uses known catalog selections | `organism_id`, `antimicrobial_id`, `standard_id` | MIC/zone value, category, specimen, site, comments |
| `reference_viewed` | User follows a known reference | `reference_id` | Referrer search text, private notes |
| `search_no_results` | Local search returns zero matches | No query property; use only safe base context such as coarse page/device/app version | Raw query, normalized query, query hash, partial token, autocomplete history |
| `satisfaction` | User chooses Yes or Not quite after an eligible workflow | `workflow_id`, `satisfaction_response` (`yes` or `not_quite`) | Free-text reason, analysis content, user identity |
| `page_view` and module-open events | Route/module opens | Coarse page/feature, device category, app version, platform | Full URLs containing private parameters, account or content payloads |

**Current release note:** the privacy-validated `breakpoint_lookup` helper is prepared, but no completion event is emitted from the protected Breakpoint Engine in v0.4.5. A generic navigation or search-result click must not be counted as a completed lookup. Add that instrumentation only through a separately approved non-scientific integration that can observe a completed structured selection without collecting MIC values.
| `feedback_submitted` | Private feedback submission succeeds | Success indicator and public-session/authenticated bucket if account features are enabled | Feedback fields, email, display name, role, comments, requested feature |

Safe common properties may include app version, platform, device category, coarse page/feature, success/failure, duration bucket, result-count bucket, or content status. Exact values must pass an allowlist and length limits.

## 4. Identity and privacy model

- Use a random identifier scoped to the current browser session, not an email, account ID, fingerprint, IP-derived identifier, or persistent cross-session identity.
- Keep person-profile processing disabled at the analytics provider.
- Do not join analytics to Supabase feedback, account, storage, or saved-analysis records.
- Do not replay sessions, capture DOM/input values, or enable automatic form capture for scientific workflows.
- Do not record private route query parameters.
- Treat provider IP handling, geolocation, cookies, retention, and subprocessors as owner/legal configuration questions; the code alone cannot settle them.
- Configure the shortest retention that still answers the documented product questions, and document the decision.
- Restrict dashboard access to the owner and explicitly authorized collaborators with least privilege and multi-factor authentication where available.

Hashing raw search strings is not an acceptable substitute for not collecting them. Specialized terms, identifiers, or rare strings can remain sensitive or re-identifiable even when hashed.

## 5. Dashboard suite

### Dashboard A — Most searched organisms

**Question:** Which existing organism records are selected most often?

**Metric:** Count of `organism_searched`, grouped by `organism_id`.

**Views:** Last 7, 30, and 90 days; app version; web/mobile platform; known organism ID.

**Use:** Prioritize review of existing organism-linked content and assess demand for deeper education.

**Do not infer:** Disease prevalence, patient volume, laboratory testing volume, or clinical importance from product selections.

### Dashboard B — Most searched antimicrobials

**Question:** Which existing antimicrobial records are selected most often?

**Metric:** Count of `antimicrobial_searched`, grouped by `antimicrobial_id`.

**Use:** Prioritize reference, mechanism, and breakpoint-content review for high-use agents.

**Guardrail:** Do not collect dose, MIC, category, combination therapy, or patient context.

### Dashboard C — Most viewed mechanisms

**Question:** Which of the 10 current mechanism pages receive the most attention?

**Metric:** Unique sessions and total `mechanism_viewed`, grouped by `mechanism_id`.

**Secondary view:** Mechanism detail open → known reference view, using aggregate counts rather than a persistent user journey.

**Use:** Prioritize scientific review, progressive-disclosure improvements, and source maintenance.

### Dashboard D — Most used modules

**Question:** Which workflows are used, and which are opened but not meaningfully completed?

**Metrics:** Page/module opens plus existing safe completion events for Breakpoints, Gene → Phenotype, Phenotype → Mechanism, BCID, Concordance, Image Concordance, Learn, AST Detective, References, Trust, and Feedback.

**Suggested display:** Opens, safe completions, aggregate completion ratio, and satisfaction rate by module and app version.

**Guardrail:** A workflow “completion” means the interface action completed, not that a scientific result was correct, reviewed, or used clinically.

### Dashboard E — Searches with no results

**Question:** How often does local search fail to find content?

**Metric:** Count and rate of `search_no_results` divided by search-result selection sessions.

**Breakdowns:** Coarse source page, device category, app version, and time period.

**Important limitation:** This dashboard intentionally cannot show what users typed. Use categorized voluntary feedback (`Missing organism/drug`, `Missing resistance mechanism`, or `Breakpoint/standard request`) to learn the desired content. Do not relax this privacy boundary merely to make the chart more descriptive.

### Dashboard F — Most viewed references

**Question:** Which identifiable sources are opened from AST Compass?

**Metric:** Count of `reference_viewed`, grouped by `reference_id`.

**Use:** Detect high-use sources, broken/obsolete links, and review priorities.

**Do not infer:** Opening a source proves that a user read it, agreed with it, or applied it appropriately.

### Dashboard G — AST Detective usage

**Question:** Is the educational game being used across its topic structure?

**Current safe minimum:** `ast_detective_started` and aggregate workflow satisfaction.

**Future structured events, only after privacy review:** `detective_case_started`, `detective_case_completed`, and `detective_topic` using known question/topic IDs and broad correctness buckets. Do not capture question text, free-text responses, or claim competency certification.

**Use:** Improve pacing and review high-use or high-abandonment items. Do not create individual performance profiles while public account features are disabled.

### Dashboard H — Feedback themes

**Question:** What categories of voluntary feedback are submitted?

**Data source:** The private feedback system, summarized by an authorized owner into the approved categories. Do not pipe feedback text into PostHog.

**Categories:**

- Scientific content / possible error
- Usability
- Missing organism/drug
- Missing resistance mechanism
- Breakpoint/standard request
- Feature request
- Privacy/security
- General feedback

**Display:** Counts, priority, disposition, and time-to-disposition only if the owner defines and consistently maintains those fields. Do not expose reporter identity.

### Dashboard I — User satisfaction

**Question:** Was a completed workflow useful?

**Metrics:** Yes count, Not quite count, and response rate by `workflow_id`, app version, and time period.

**Use:** Find workflows needing explanation or UX work. Satisfaction is not a measure of scientific correctness.

## 6. Recommended owner overview

The first owner view should contain only:

1. module usage trend;
2. most selected known organisms and antimicrobials;
3. most viewed mechanisms and references;
4. no-results rate with no query text;
5. satisfaction by workflow;
6. feedback-category counts;
7. telemetry-health panel showing event volume, rejected/invalid structured IDs, app versions, and missing-data warnings.

Avoid a single composite “engagement” score. Each metric has different meaning and limitations.

## 7. Data-quality checks

- Reject event-specific IDs not found in the shipped catalog.
- Alert on unknown app versions rather than merging them silently.
- Confirm `search_no_results` contains no query-like property.
- Confirm breakpoint events contain no measurement or result category.
- Confirm feedback events contain no feedback form content.
- Sample provider payloads after every analytics change.
- Compare event volume before and after deployments to identify instrumentation regressions.
- Track a schema version internally if the event contract changes.
- Keep synthetic owner tests clearly tagged and exclude them from product decisions.

## 8. Dashboard interpretation rules

- Use multiple periods; a short spike may reflect a demo, classroom, crawler, or release test.
- Prefer unique sessions plus total events so repeated clicking does not dominate.
- Apply minimum reporting thresholds before showing narrow breakdowns.
- Label incomplete periods and telemetry outages.
- Do not rank scientific importance solely by popularity.
- Pair demand with source availability, review capacity, and documented feedback before adding content.
- Record the decision and rationale in `USER_FEEDBACK_LOG.md` or the scientific coverage backlog.

## 9. Owner setup checklist

- [ ] Confirm PostHog project ownership and production key/host configuration.
- [ ] Disable session replay, autocapture, form capture, and person profiles unless separately reviewed and justified; the preferred state is disabled.
- [ ] Review provider IP/geolocation and retention settings.
- [ ] Restrict dashboard access and enable account security controls.
- [ ] Build the nine dashboards above using only approved properties.
- [ ] Verify safe payloads in a production-like test before relying on charts.
- [ ] Document analytics configuration in Privacy/Trust content without overstating compliance.
- [ ] Define a periodic review cadence and owner.
- [ ] Keep feedback text in the private feedback system, not the analytics provider.
- [ ] Recheck event schemas after every dependency or analytics change.

## 10. Decisions analytics may and may not drive

Analytics may help decide which existing content to review first, which workflows need clearer navigation, and which requested coverage deserves a licensed-source feasibility assessment.

Analytics may not:

- authorize a scientific claim;
- promote content to `REVIEWED` or `VERIFIED`;
- justify generating a missing breakpoint or mechanism;
- establish patient, disease, resistance, or laboratory prevalence;
- replace qualified review or authoritative source access.
