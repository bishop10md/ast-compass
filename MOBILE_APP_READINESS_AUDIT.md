# AST Compass Mobile App Readiness Audit

Audit date: 2026-09-04  
Target architecture: one React/Vite source → PWA + Capacitor → Android/iOS

## Executive assessment

AST Compass is a strong candidate for a shared-code mobile application. Its scientific engines and datasets are framework-neutral or React-based browser modules, routes are URL-addressable, core education works without accounts, OCR is deferred and first-party, and public images are already session-only. The application should not be rewritten in React Native.

The starting repository was **READY WITH CHANGES**: mobile-responsive web UI existed, but it had no manifest, service worker, offline shell, Capacitor configuration, native projects, safe-area contract, native navigation policy, platform telemetry tag, or deep-link documentation.

## Readiness matrix

| Area | Initial status | Finding / required change |
|---|---|---|
| React/Vite architecture | READY | Suitable single source for web and WebView builds. |
| Shared scientific source | READY | Breakpoint, BCID, Concordance, phenotype-mechanism, Detective, and evidence data can remain unchanged. |
| Routing | READY WITH CHANGES | History-based SPA routes work; native back/deep-link behavior requires a thin platform shell and association-file release gate. |
| Mobile responsiveness | READY WITH CHANGES | Existing breakpoints are usable; add safe-area insets and device testing. |
| Navigation/search | READY WITH CHANGES | Existing hamburger/search retained. A native bottom bar may help later but should follow usability testing, not this preparation pass. |
| Breakpoints | READY | No mobile-specific scientific change required. |
| Mechanisms | READY | Shared route and dataset. |
| Concordance | READY | Shared logic; table/layout device testing still required. |
| Image Concordance | READY WITH CHANGES | Browser file picker supports library/files; preserve PHI gate and verification. Test worker/WASM memory and cancellation on devices. Camera capture is not enabled. |
| BCID | READY | Shared workflow and logic. |
| Learn / AST Detective | READY | Static content is offline-safe when shipped in the versioned app bundle. |
| Evidence | READY WITH CHANGES | Metadata can be cached; external source links remain online and must open outside the app WebView. |
| Feedback | READY WITH CHANGES | Online-only Supabase submission; needs explicit offline state/retry. |
| Privacy / Terms / About / Trust | READY | Static, public, offline-safe content. |
| Image upload/file APIs | READY WITH CHANGES | JPEG/PNG/WebP, 10 MB, MIME/extension/magic-byte validation already exist. Native picker behavior and large-image memory require tests. |
| OCR | READY WITH CHANGES | Pinned/self-hosted and lazy. Validate worker/WASM paths in Android WebView and WKWebView; add progress/cancellation later if device testing shows need. |
| PHI screening | REQUIRES OWNER REVIEW | Must remain fail-closed. Native cache, EXIF, screenshots, and temporary file lifecycle need privacy sign-off before store beta. |
| Supabase | READY WITH CHANGES | HTTPS public client supports Feedback. Accounts remain disabled. RLS/storage/auth validation remains a separate owner gate. |
| Sentry/PostHog | READY WITH CHANGES | Failure-isolated and privacy-filtered. Add platform tag; do not add session replay or mobile advertising identifiers. |
| External links | READY WITH CHANGES | Web links are HTTPS and intentional; native WebView allow-navigation/system-browser enforcement needs device validation. |
| Local/session storage | READY WITH CHANGES | Learning continuity degrades gracefully. Never use web storage as future secure native token storage without review. |
| Service worker/PWA | NOT MOBILE SAFE | No manifest or worker existed at audit start. |
| Offline behavior | NOT MOBILE SAFE | No offline shell existed at audit start. |
| Browser APIs | READY WITH CHANGES | Face/barcode detectors are optional and explicitly degraded; mobile WebView coverage varies. |
| Camera/photo library | READY WITH CHANGES | Standard file selection is appropriate. Do not add camera permission without explicit privacy approval. |
| Authentication feature state | READY | Centrally disabled; scientific tools do not require sign-in. |
| Deep links | READY WITH CHANGES | Canonical HTTPS routes exist; Android/iOS association files must wait for signed app identifiers. |
| Security headers/CSP | READY WITH CHANGES | Web CSP is narrow. Native local-origin behavior and OCR WASM/worker CSP require device tests. |
| Third-party network dependencies | READY | Core uses first-party static assets; Supabase is feature-specific; telemetry is optional. |
| Android toolchain/build | READY WITH CHANGES | Native target can be generated; SDK/JDK/Android Studio build must be validated locally. |
| iOS toolchain/build | REQUIRES OWNER REVIEW | Project may be generated on Windows; signing/build/TestFlight require macOS, Xcode, and an Apple Developer account. |

## Mobile-specific risks

1. Large images plus OCR/WASM may exceed memory on older phones.
2. WebView worker/WASM path and CSP behavior must be confirmed on real Android and iOS devices.
3. Service-worker caching must exclude Supabase, feedback, auth, uploaded images, blob/data URLs, and non-GET requests.
4. Native screenshots and OS-level backups cannot be fully controlled by web code; the No-PHI policy remains essential.
5. EXIF is not transmitted by the current browser-local workflow, but native temporary-file and metadata behavior needs device inspection.
6. Future auth tokens need native secure-storage design review; current public account functionality remains disabled.
7. Universal/App Links must not be published until signing identities and association files are exact.

## Refactoring boundary

No major scientific refactor is justified. Platform work should remain limited to installability, lifecycle/network status, safe areas, external navigation, deep-link hooks, native projects, and build/release documentation.

## Remediation outcome for this preparation pass

This pass adds the PWA/Capacitor foundation and documentation. Native runtime, store privacy, signing, device accessibility, OCR performance, and deep-link association remain explicit release gates rather than assumed complete.

## Post-remediation status

| Deliverable / gate | Status | Evidence |
|---|---|---|
| PWA foundation | READY | Manifest, canonical icons, versioned worker, safe cache boundary, offline page/indicator, retry, and Netlify worker headers added. Browser install/offline behavior still needs production-origin testing before release. |
| Shared-code policy | READY | Web and native targets build from the same `src`, routes, data, and scientific engines. |
| Android project | READY WITH CHANGES | Capacitor target generated and synced; canonical assets and minimal permissions verified. Local Gradle build is blocked on this Windows host because no JDK/Android Studio runtime is installed. |
| iOS project | READY WITH CHANGES | Capacitor/Xcode target generated and synced; no camera/photo/ATS exception declared. Compile/sign/archive requires macOS, Xcode, signing identity, and owner review. |
| Image/OCR workflow | REQUIRES OWNER REVIEW | Shared safeguards remain intact; WebView worker/WASM, memory, picker, EXIF, temporary-file lifecycle, and performance need physical-device tests. |
| Deep links | READY WITH CHANGES | Canonical runtime route hook is prepared. Association files intentionally remain unpublished until final signing identities exist. |
| Privacy/store declarations | REQUIRES OWNER REVIEW | Checklists reflect current architecture without inventing store answers; exact binary/vendor configuration and legal review remain required. |
| Scientific regression | READY | 74 automated tests passed; TypeScript and production build passed; no protected scientific engine/data file was modified. |

No web, Play Store, App Store, TestFlight, or beta publication was performed.
