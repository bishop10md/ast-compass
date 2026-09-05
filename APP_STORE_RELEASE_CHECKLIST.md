# AST Compass App Store Release Checklist

No store submission or production publication is part of this preparation pass.

## Shared release gate

- [ ] `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, and `pnpm build` pass.
- [ ] Scientific protected-file diff is empty or separately approved.
- [ ] Breakpoint, BCID, Concordance, PHI, and AST Detective regression suites pass unchanged.
- [ ] PWA manifest, icons, service worker, offline shell, canonical routes, and metadata pass.
- [ ] Web, Android, and iOS identify the same product/content version.
- [ ] Privacy/Terms/Trust copy matches actual behavior and store disclosures.
- [ ] Owner signs off the PHI/device-risk review.

## Android

- [ ] Open/sync with current supported Android Studio, SDK, Gradle, and JDK.
- [ ] Confirm application ID `com.astcompass.app`, display name, version code/name, min/target SDK.
- [ ] Confirm only necessary permission (`INTERNET`), cleartext disabled, backups disabled.
- [ ] Verify adaptive/round icons and splash on light/dark devices.
- [ ] Store upload key and Play credentials outside Git with recovery ownership documented.
- [ ] Build and inspect signed AAB; run Play pre-launch report.
- [ ] Complete Data safety, content rating, target audience, education/medical disclaimer, support, and privacy URLs.
- [ ] Internal test → closed test → staged production; define rollback owner.

## iOS

- [ ] Build on macOS with current Xcode and sync Capacitor dependencies.
- [ ] Confirm bundle ID `com.astcompass.app`, team, entitlements, marketing/build versions, supported devices/orientations.
- [ ] Confirm no camera/photo permission strings and no arbitrary-load exception.
- [ ] Verify icon/splash and safe areas across iPhone/iPad and light/dark appearances.
- [ ] Complete App Privacy, age rating, export compliance, category, support, and privacy URLs.
- [ ] Archive and validate; internal TestFlight → limited external beta → App Review.
- [ ] Add Associated Domains only after exact AASA file and signing identity are verified.

## Functional beta matrix

- [ ] Home/navigation/search and all major routes.
- [ ] Breakpoints, Resistance, Concordance, BCID, Learn/Detective, Evidence/References.
- [ ] Feedback success, offline failure, retry, and no duplicate submission.
- [ ] Image picker/cancel, type/size/magic-byte checks, PHI rejection, OCR, correction, analysis, cleanup.
- [ ] Offline first launch, cached repeat launch, reconnect/update, external sources.
- [ ] Keyboard, focus, screen reader, text size, contrast, reduced motion, rotation, and tablet.
- [ ] Crash/analytics platform tags and privacy-filter verification.

## Draft short store description

Learn antimicrobial susceptibility testing and connect organisms, resistance mechanisms, molecular markers, expected phenotypes, and interpretive context in one educational workspace.

## Draft full store description

AST Compass is an educational platform for microbiology professionals and learners. Explore antimicrobial susceptibility breakpoints, resistance mechanisms, BCID resistance markers, gene–phenotype concordance, expected phenotypes, and case-based AST reasoning from one connected experience.

Trace interpretations to source material, compare molecular and phenotypic patterns, and practice with structured learning tools. Image Concordance can process a user-selected, de-identified AST image for the current session and requires human review before educational analysis.

AST Compass is a compass, not an autopilot. It contains educational/demo content, is not validated for patient-care decisions, and does not provide treatment recommendations. Always verify interpretations against current authorized standards and local policy. Do not upload protected health information.

Educational use only. AST Compass is not a medical device and is not intended for patient-specific treatment decisions.

## Explicit blockers before submission

- Physical Android/iOS device validation, including OCR performance and temporary-file behavior
- Apple signing/Xcode archive and Play signing/AAB ownership
- Final privacy/legal review and exact store disclosures
- Final screenshots, support contact, category/age/content-rating decisions
- Verified universal/app-link association files if deep links are enabled
- Owner approval of staged rollout, monitoring, and rollback plan
