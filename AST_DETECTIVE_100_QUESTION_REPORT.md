# AST Detective 100-Question Report

Bank version: `1.0-draft`  
Total questions: **100**  
Review status: **100 Draft; 0 Reviewed; 0 Verified**

## Topic distribution

| Topic | Count |
|---|---:|
| AST Fundamentals | 10 |
| Breakpoints | 10 |
| Intrinsic Resistance | 10 |
| ESBL | 8 |
| AmpC | 8 |
| Carbapenemases | 12 |
| MRSA | 7 |
| VRE | 7 |
| BCID | 10 |
| Concordance | 8 |
| Troubleshooting | 5 |
| Quality Control | 5 |

## Difficulty distribution

| Difficulty | Count |
|---|---:|
| Foundation | 30 |
| Intermediate | 45 |
| Advanced | 25 |

## Question-type distribution

| Type | Count |
|---|---:|
| Case interpretation | 32 |
| Best explanation | 18 |
| Cannot infer | 15 |
| Troubleshooting | 15 |
| Mechanism identification | 8 |
| Concordance | 7 |
| Multiple choice | 5 |

Case-oriented formats (`case-interpretation`, `troubleshooting`, and `concordance`) account for 54 questions.

## Duplicate and similarity checks

Automated tests confirm:

- exactly 100 questions and 100 unique IDs;
- no duplicate stems;
- no duplicate answer sets;
- no duplicate learning objectives;
- the exact approved topic and difficulty distributions;
- required explanations, teaching points, sources, correct answers, and Draft status;
- no stem pair at or above the 0.82 token-similarity review threshold.

## Reviewer workflow

The source bank is `src/data/astDetectiveQuestions.ts`. Run `pnpm report:detective` to produce `AST_DETECTIVE_REVIEW_EXPORT.csv`, which contains the question ID, topic, difficulty, type, title, stem, choices, correct answer, explanation, teaching point, sources, and review status.

## Sources used

- `ref-clsi` — CLSI M100 / applicable AST methodology and interpretation context
- `ref-clsi-bit` — CLSI Breakpoint Implementation Toolkit
- `ref-eucast`, `ref-eucast-161`, `ref-eucast-nobp`, `ref-eucast-rast` — EUCAST definitions, versioning, no-breakpoint guidance, and Rapid AST
- `ref-bcid2-ifu` — manufacturer panel instructions and assay limitations
- `ref-idsa` — mechanism-aware AMR guidance
- `ref-cdc` — antimicrobial-resistance background
- `ref-fda` — FDA susceptibility-test interpretive-criteria context

## Areas still needing scientific review

All questions require qualified scientific review before any status changes from Draft. Priority review areas are organism-specific intrinsic phenotypes, AmpC host biology, carbapenemase inhibitor language, polymicrobial BCID attribution, and method/QC wording.

No numerical breakpoint questions were added because the current breakpoint values are educational demo data. Fungal and mycobacterial AST questions were not added to this bacterial-focused bank and remain potential future reviewed expansions.

## Verification result

- Automated test suite: **39/39 passed**
- TypeScript project check: **passed**
- Local Vite bundle: blocked by the workspace sandbox denying esbuild access above the project directory; no TypeScript or test failure was present. Netlify remains the production-build verification environment.
- Breakpoint Engine, BCID rules, Concordance engine, PHI screening, legal pages, Supabase security, and the account feature flag were not modified.
