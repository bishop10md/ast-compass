# BCID and Concordance User Feedback Update

## BCID wording

- Removed the summed “36 targets” headline.
- The scope now states “26 bacterial organisms” and “10 AMR markers” separately.
- The page explains that AST Compass uses publicly available BIOFIRE BCID2 panel information as an educational reference scope.
- Manufacturer links are explicitly labeled as external manufacturer references.
- Yeast identification organisms remain excluded from this resistance-focused workflow.
- Manufacturer panel composition, BCID compatibility, forecasting rules, source provenance, and review status were not changed.

## Molecular Concordance workflow

- Replaced the single antimicrobial/category comparison with repeatable AST observation rows.
- Each row supports an antimicrobial, optional MIC/zone text (including comparison operators), required reviewed category, and a keyboard-accessible Remove action.
- Duplicate antimicrobial selection is blocked in the selector and validated before analysis.
- Up to 20 observations can be entered; organism-relevant breakpoint drugs are prioritized without hiding other drugs.
- Existing `analyzeConcordance` logic evaluates every reviewed row. No Concordance scientific rule was changed.
- Results include conservative overall wording, counts, and expandable antimicrobial-level explanations with existing sources when available.
- Public presentation normalizes existing engine outcomes into Concordant, Potentially discordant, Cannot infer, or Not evaluable without claiming phenotype confirms a marker.
- Marker selection remains single-marker in this pass because multi-marker attribution needs separate scientific validation.

## Shared input and image workflow

- Added one reusable `ASTObservationList` used by Molecular Concordance and Phenotype → Mechanism.
- Image Concordance continues to feed the same `AstResultRow`/`analyzeConcordance` scientific model after user verification.
- PHI screening and session-only image handling were not changed.

## Mobile and accessibility checks

- Rows use fieldsets labeled “Antimicrobial result 1”, “Antimicrobial result 2”, and so on.
- Add and Remove controls are native keyboard-accessible buttons with explicit accessible names.
- At 760 px and below each result becomes a vertically stacked card; at 380 px and below context and count grids use one column.
- The same bounded list supports 1, 3, 5, and 10 rows without a minimum-width table or horizontal scrolling requirement.

## Tests and protected areas

- Added regression coverage for BCID attribution wording, repeatable shared rows, category support, duplicate prevention, conservative result presentation, row limits, and responsive layouts.
- The Breakpoint Engine, breakpoint data, BCID scientific rules, Phenotype → Mechanism scientific rules, citations, review statuses, PWA/Capacitor architecture, Privacy, and Terms were not modified.

