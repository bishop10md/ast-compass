# AST Detective v1 Report

Bank version: `1.0-draft`  
Total questions: **100**  
Scientific review status: **100 Draft; 0 Reviewed; 0 Verified**

## Distribution

- Foundation: 30
- Intermediate: 45
- Advanced: 25
- Case-oriented formats: 54
- Topics: AST Fundamentals 10; Breakpoints 10; Intrinsic Resistance 10; ESBL 8; AmpC 8; Carbapenemases 12; MRSA 7; VRE 7; BCID 10; Concordance 8; Troubleshooting 5; Quality Control 5.
- Formats: case interpretation 32; best explanation 18; cannot infer 15; troubleshooting 15; mechanism identification 8; concordance 7; multiple choice 5.

## Game model

- Quick Case, 5-, 10-, and 20-case challenges
- Topic Practice and Mixed Challenge through topic selection
- Foundation, Intermediate, Advanced, and Mixed difficulty
- Unique curated cases within every session
- Session score, current streak, best streak, and end-of-game percentage
- Topic-based strong-area and review summaries
- Progressive clue reveal for case interpretation, concordance, and troubleshooting formats
- Correct-answer, wrong-answer, teaching-point, and source explanations
- No account required and no live AI question generation

## Duplicate and quality checks

Automated checks confirm exactly 100 unique IDs, unique stems, unique answer sets, unique learning objectives, the approved topic and difficulty distributions, complete explanations, teaching points, source IDs, valid correct answers, and Draft review status. No stem pair reached the 0.82 similarity-review threshold.

## Source coverage

The bank uses existing AST Compass reference IDs for CLSI, EUCAST, FDA, manufacturer assay limitations, IDSA mechanism-aware guidance, and CDC antimicrobial-resistance background. No citation was invented for this game upgrade.

## Scientific review

All 100 questions require qualified review before any status changes from Draft. Priority areas include organism-specific intrinsic phenotypes, AmpC host biology, carbapenemase inhibitor language, polymicrobial BCID attribution, and method/QC wording.

## Verification

- Automated tests: **55/55 passed**
- TypeScript check: **passed**
- Local interactive game check: **passed**
- Production bundle: the Windows workspace sandbox blocked esbuild from reading above the project directory; this is an environment restriction rather than a TypeScript or test failure. Netlify remains the production build verification environment.
- Breakpoint Engine, BCID scientific engine, Concordance engine, Image Concordance, PHI screening, Privacy, Terms, and account feature state were not modified.
