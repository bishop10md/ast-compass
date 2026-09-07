# AST Compass User Feedback Log

**Status:** Internal product and scientific-governance record

**Created:** 2026-09-06

**Privacy:** Do not add names, email addresses, patient information, images, MIC tables, private analyses, or unredacted feedback text to this file

## 1. Purpose

This log records actionable themes and decisions without publishing or exposing reviewer/user identity. It is a product-planning record, not scientific evidence. User requests may establish demand, but authoritative sources and qualified review remain necessary before scientific content changes.

## 2. Required fields

Each entry should include:

- **Date** — date received or date a theme was synthesized;
- **Reviewer/user type** — broad role only when known and safe; otherwise `Not recorded`;
- **Feedback** — concise, de-identified theme;
- **Category** — one approved feedback category;
- **Priority** — `Critical`, `High`, `Medium`, or `Low`, with rationale;
- **Decision** — accept, investigate, defer, decline, or complete;
- **Rationale** — why the decision was made;
- **Implementation** — specific code/document/process change or next action;
- **AST Compass version** — version in which the decision applies;
- **Status** — `Open`, `In progress`, `Prepared`, `Implemented`, `Scientific review required`, `Owner action required`, or `Closed`.

If a report concerns a scientific error, preserve the safe content ID, public route, and release version in the private issue system. Do not copy patient data, arbitrary query strings, image/OCR content, or submitted AST observations into this log.

## 3. Current feedback themes

The entries below synthesize the latest feedback without recording or inventing a reviewer identity. Version is recorded as `0.4.5 trust/governance update`; `package.json` and runtime `APP_VERSION` are aligned for this release.

| Date | Reviewer/user type | Feedback | Category | Priority | Decision | Rationale | Implementation | AST Compass version | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Clarify the boundary between AST education and clinical advice. | Scientific content / possible error | Critical | Accept | Users must not mistake educational interpretation for patient-specific treatment advice. | Preserve educational-use labels; add the clinical-context boundary to Trust and selected interpretation workflows; do not collect patient-specific treatment inputs. | 0.4.x trust/governance update | Implemented in policy; public placement requires release verification |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Make scientific review credibility and provenance visible. | Scientific content / possible error | Critical | Accept | Source links, review state, reviewer scope, and content version are needed for professional trust. | Add a canonical governance record, define DRAFT/EDUCATIONAL, REVIEWED, and VERIFIED, and require record-level review evidence before promotion. | 0.4.x trust/governance update | Prepared; scientific review required |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Explain regional differences in AST practices and standards. | Breakpoint/standard request | High | Accept | CLSI, EUCAST, FDA, local methods, and institutional policies are not interchangeable. | Add Supported Standards & Scope content; preserve organization/document/version; prohibit conversions and nearest-standard fallback. | 0.4.x trust/governance update | Implemented in policy; public display requires release verification |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Handle unsupported standards explicitly. | Breakpoint/standard request | Critical | Accept | Generating an interpretation from an adjacent standard would be unsafe and misleading. | Use the approved unsupported-standard message and fail closed; do not infer values. | 0.4.x trust/governance update | Prepared; integration/testing required |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Provide clearer cybersecurity, privacy, and No-PHI information. | Privacy/security | Critical | Accept and continue | Image/feedback workflows can invite sensitive data; professional networks need plain-language architecture and reporting information. | Keep No-PHI gates, session-only public image processing, Trust content, safe telemetry, and private feedback; avoid unestablished security/compliance claims. | 0.4.x trust/governance update | Partly implemented; continuing owner/security review |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Clarify the relationship between the website, PWA, and native app preparation. | Usability | Medium | Accept | Users may assume different platforms have different scientific content or privacy behavior. | Maintain a single governed content source and document platform-specific storage/network behavior; do not describe an unreleased app as available. | 0.4.x trust/governance update | Owner communication action required |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Explain how guideline updates are identified and released. | Breakpoint/standard request | Critical | Accept | Fast updates without source, review, and change control can be less trustworthy than slower controlled updates. | Adopt the controlled update workflow from source identification through impact assessment, review, tests, versioned release, and changelog. | 0.4.x trust/governance update | Policy implemented; operating process/owner required |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Include clinical context without creating a patient-specific tool. | Scientific content / possible error | High | Accept with boundary | Clinical context matters, but collecting diagnosis or patient factors would expand product risk and purpose. | Display concise context limits in Trust and meaningful workflows; do not add diagnosis, history, renal function, pregnancy, prior therapy, or comorbidity fields. | 0.4.x trust/governance update | Implemented in policy; UI review required |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Expand organism coverage. | Missing organism/drug | Medium | Investigate, do not auto-expand | The catalog is broad, but source access and reviewer capacity constrain safe scientific implementation. | Use the Scientific Coverage Roadmap; rank de-identified structured demand, source feasibility, and review capacity before adding records. | Future governed releases | Open; source and review plan required |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Improve breakpoint update speed. | Breakpoint/standard request | High | Accept controlled monitoring; decline automatic injection | New versions matter, but unreviewed values, AI extraction, or uncontrolled web sources are unacceptable. | Maintain a monitored-source register and impact assessment; release only versioned, reviewed records with tests and changelog. | Future governed releases | Owner action and licensed-source access required |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Explain whether AI checks or creates scientific facts. | Privacy/security | Critical | Accept | Users need to know that AI assistance does not confer scientific authority. | Publish AI & Scientific Content language; require identifiable sources and human review; prohibit “AI validated” wording. | 0.4.x trust/governance update | Implemented in policy; public display requires release verification |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Simplify the Mechanisms page, which feels too complex or wordy. | Usability | High | Accept | Mechanism depth should remain available without overwhelming the landing experience. | Use concise summary cards and progressive disclosure into dedicated mechanism pages with key concept, phenotype pattern, limitations, and literature. | 0.4.x trust/governance update | Implementation/review in progress |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Add CLSI M45 coverage. | Breakpoint/standard request | High | Prepare, do not populate | M45 may address requested organism coverage, but the values and scope require licensed access and qualified review. | Follow `M45_EXPANSION_PLAN.md`; no M45 breakpoint values are entered in this update. | Future governed release | Licensed access and external expert review required |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Use search and page-view analytics to prioritize content. | Feature request | Medium | Accept with strict privacy limits | Aggregate demand can guide review, but arbitrary queries could contain sensitive information. | Track only known structured IDs and a query-free no-results event; keep analytics private and separate from feedback text. | 0.4.x trust/governance update | Prepared/implemented in code; provider setup verification required |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Ask whether meaningful workflows were useful. | Usability | Medium | Accept | A small, non-modal prompt provides directional feedback without interrupting work. | Use Yes / Not quite after selected workflow completions; track only aggregate workflow and response; link optional detail to private Feedback. | 0.4.x trust/governance update | Implementation/review in progress |
| 2026-09-06 | User-feedback synthesis; identity not recorded | Add visual phenotype or pattern summaries. | Feature request | Medium | Accept only for source-supported patterns | Visuals can improve learning but can also overstate or flatten conditional biology. | Label every card `ILLUSTRATIVE PHENOTYPE` and `NOT A PATIENT RESULT`; include text plus non-color indicators; suppress any unsupported card. | 0.4.x trust/governance update | Component prepared; claim-level scientific review required |

## 4. Decision rules

- **Scientific error reports** receive immediate triage priority, but priority does not prejudge correctness.
- **Breakpoint/standard requests** require source and license review before implementation.
- **Missing-content requests** are ranked with aggregate structured demand and reviewer capacity.
- **Usability requests** may proceed when a diff confirms no scientific rule changed.
- **Privacy/security feedback** is handled conservatively and may require external security or legal review.
- **Feature requests** are declined or deferred when they would create patient-specific advice, require unsupported inference, or exceed review capacity.

## 5. Entry template

Use this template for future feedback that should not be compressed into the summary table:

```md
### Feedback ID: UF-YYYY-NNN

- Date:
- Reviewer/user type: Not recorded
- Feedback:
- Category:
- Priority:
- Decision:
- Rationale:
- Implementation:
- AST Compass version:
- Status:
- Safe content ID/route, if relevant:
- Source/review dependency:
- Follow-up owner:
- Resolution evidence:
```

Never infer or invent the reporter's identity, employer, qualification, or intent. Store voluntarily provided contact information only in the authorized private feedback system, not in this repository.
