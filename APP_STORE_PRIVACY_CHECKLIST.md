# AST Compass App Store Privacy Checklist

This is a release-owner worksheet, not a completed legal declaration. Store answers must be reconciled against the exact signed binary and live vendor configurations.

## Current product behavior to disclose accurately

- Educational product; not validated for patient-care decisions and not treatment guidance.
- Public scientific features currently require no account.
- Feedback is optional and sent over HTTPS to Supabase; submitted fields and retention must match the live form and Privacy page.
- Optional Sentry/PostHog telemetry may process diagnostics or aggregate usage only when configured. Session replay and advertising tracking are not part of this architecture.
- Image Concordance accepts user-selected, de-identified images for current-session local analysis. Images are not placed in a persistent personal history or service-worker cache.
- Users are instructed not to upload PHI. Automated screening reduces risk but does not certify de-identification.
- The application uses no camera permission, broad storage permission, advertising ID, or cross-app tracking permission.
- External reference links leave AST Compass and are governed by the destination's policy.

## Apple privacy declaration review

- [ ] Confirm whether Feedback fields qualify as contact information, user content, or other data under the current App Store definitions.
- [ ] Confirm diagnostic/usage categories actually emitted by configured Sentry/PostHog SDK endpoints.
- [ ] Confirm data linked to identity is **No** while accounts are disabled, unless vendor configuration or submitted feedback makes it linkable.
- [ ] Confirm tracking is **No** only after verifying no advertising, data-broker, or cross-company tracking behavior.
- [ ] Confirm image input is processed on device/current session and not collected; test network traces.
- [ ] Complete required-reason API and privacy-manifest review against the final Capacitor/Xcode dependency set.
- [ ] Provide a public Privacy Policy URL and support contact.

## Google Play Data safety review

- [ ] Map Feedback fields to Play data types and declare collection/purpose/optional status accurately.
- [ ] Map crash diagnostics and analytics from live configurations.
- [ ] Verify encryption in transit for every submitted endpoint.
- [ ] Confirm no image/OCR payload is transmitted or retained through network inspection.
- [ ] Confirm account creation/deletion answers reflect the production-disabled account flag.
- [ ] Confirm deletion/retention process for feedback and telemetry with each processor.
- [ ] Publish the same Privacy Policy URL used by the app.

## PHI and sensitive-data gate

- [ ] Use only synthetic/de-identified test media.
- [ ] Validate PHI screen fail-closed behavior on Android and iOS.
- [ ] Inspect temporary files, thumbnails, OS recents/backups, EXIF behavior, and memory cleanup.
- [ ] Confirm telemetry never includes filenames, image bytes, OCR output, form free text, or scientific selections.
- [ ] Confirm no guest/public uploaded image is permanently stored.
- [ ] Obtain privacy/legal review before external beta.

## Processors and owner records

- [ ] Maintain current processor inventory (hosting, Supabase, Sentry, PostHog if enabled).
- [ ] Record purposes, regions, retention, deletion route, DPA status, and incident contact.
- [ ] Verify production environment variables enable only intended processors.
- [ ] Reconcile Privacy and Terms wording with the final binary and store declarations.
