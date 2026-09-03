# Image Concordance Upload Debug Report

## Pipeline reviewed

`FILE SELECTED → FILE VALIDATION → IMAGE DECODING/NORMALIZATION → OCR INITIALIZATION → OCR → TEXT PHI SCREEN → BARCODE/FACE SCREEN (when supported) → PRIVACY DECISION → AST EXTRACTION → USER VERIFICATION → CONCORDANCE`

## Root causes

1. OCR initialization, image decoding, detector execution, and privacy findings were wrapped in one catch path. Technical failures were therefore presented as an unverifiable/rejected image rather than their actual failure category.
2. Every non-clear privacy status used nearly identical rejection language, so an OCR or image-quality failure looked like detected PHI.
3. OCR ran before image dimensions and basic image quality were checked.
4. Optional browser detector failures were not distinguishable from required OCR-screening failures.
5. A remote OCR script was unpinned and had no in-place retry experience.
6. Date-like text was treated as possible PHI without clearly separating ambiguous tokens from strongly labeled identifiers.

## Changes made

- Added explicit typed pipeline states for validation, decoding, OCR, privacy checks, degraded detector support, quality failures, and downstream extraction failures.
- Pinned the existing browser OCR loader to Tesseract.js 5.1.1 and added a retry path that retains the normalized file in memory.
- Added safe image decoding, EXIF-removing canvas normalization, orientation handling, 2400-pixel maximum downscaling, minimum resolution checks, and a blank-image variance check.
- Kept JPEG, PNG, and WEBP support; HEIC now receives a dedicated message.
- Split `phi-detected`, `possible-phi`, technical OCR failure, low quality, unsupported format, and AST extraction failure into separate user messages.
- Barcode/face detector absence now produces a degraded warning, not a PHI finding. OCR screening and explicit user acknowledgment remain required, and analysis remains session-only.
- Updated PHI screening to keep labeled MRN/DOB/name/accession/contact patterns as hard findings while treating unlabeled dates and long identifier-like numbers as soft risks. AST value/category lines are excluded from the unlabeled-number heuristic.
- Added development-only privacy-safe diagnostics and an image-pipeline self-test. Raw OCR text and image contents are not logged.

## Tests

Automated checks cover clean AST text, labeled patient name, MRN, DOB, phone, email, accession number, address, barcode, face, OCR failure, detector-independent behavior, ambiguous date, ambiguous long number, and normal AST MIC/category content.

The source contract also verifies retry controls, explicit pipeline states, supported formats, human confirmation, session-only handling, and development-only diagnostics.

## Remaining limitations

- Tesseract remains a pinned CDN-loaded browser dependency; a future release should bundle a pinned worker/language package after dependency and bundle-size validation.
- Barcode and face APIs vary by browser. Their absence is disclosed as degraded privacy checking and permanently disables storage by design.
- Blur detection is conservative: low resolution, blank images, and insufficient OCR text are caught, but every form of motion blur or compression artifact cannot be reliably classified in-browser.
- Client screening is not a legal de-identification certification and does not authorize permanent storage.
- Safari and mobile Safari were not directly available in this Windows workspace. The unavailable-detector branch is implemented without calling missing APIs and is covered by source/logic tests.

## Browser verification

- Chromium-compatible desktop path: code and production route verification planned through Netlify deployment.
- Edge/Chrome API-degraded behavior: supported by feature detection.
- Safari/mobile Safari: architecture reviewed for missing BarcodeDetector/FaceDetector; direct device testing remains outstanding.

The Breakpoint Engine, BCID rules, Concordance scientific engine, AST interpretation logic, Privacy, Terms, Supabase security, and account feature flag were not modified.
