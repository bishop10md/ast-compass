# AST Compass Mobile Architecture

## Decision

AST Compass uses one React/Vite application and one set of scientific datasets and engines. The same production build is delivered as:

```text
React + TypeScript + Vite
          |
          +-- Netlify web application / installable PWA
          |
          +-- Capacitor WebView shell
                 +-- Android project
                 +-- iOS project
```

There is no React Native application and no duplicated scientific implementation.

## Shared and platform-specific boundaries

Shared code includes every scientific workflow, data source, route, component, accessibility label, safety warning, PHI screen, account feature flag, and telemetry privacy filter. `src/lib/platform.ts` is the intentionally small platform boundary. It identifies web/Android/iOS, registers the web-only service worker, handles native app links, and maps Android's hardware back action to browser history.

Platform projects contain only build metadata, icons, splash assets, signing configuration, and Capacitor-generated native code. They must not contain scientific branching.

## Navigation and links

Canonical routes remain HTTPS routes under `https://astcompass.com`. In-app links use normal application navigation. A native `appUrlOpen` hook accepts only the canonical host and maps its path, query, and hash into the shared router. Other hosts are not allow-listed inside the WebView. External evidence/source links remain HTTPS links with a separate browsing context and `rel="noreferrer"`.

Future Android App Links require a production `/.well-known/assetlinks.json` containing the final package certificate fingerprint. Future iOS Universal Links require a production `/.well-known/apple-app-site-association` containing the final Apple Team ID and bundle ID. Do not publish either file until release signing identifiers are final and verified.

## PWA and offline boundary

The post-build step creates a versioned service worker. It precaches the application shell, local fonts, static scientific bundles, OCR worker/WASM files, icons, the manifest, and the offline page. Navigation is network-first so deployments become visible promptly, with the bundled shell/offline page as fallback.

The service worker never handles non-GET requests, Supabase/API hosts, feedback or authentication submissions, uploaded images, `blob:`/`data:` URLs, or arbitrary cross-origin resources. Scientific static content already present in a completed build may work offline; Feedback and external references require a connection. An explicit offline banner communicates that boundary.

## Image Concordance and privacy

Image selection continues through the existing HTML file picker (photo library/files), not a camera plugin. The existing size/type/magic-byte checks, PHI screen, human confirmation, and session-only processing remain shared. No camera, photo-library, or broad storage permission is declared. Uploaded image bytes are not placed in the service-worker cache or persistent personal history.

Native device testing must validate picker cancellation, temporary-file cleanup, EXIF behavior, memory pressure, OCR worker/WASM paths, background/resume, and the fail-closed PHI gate. If a future native picker is added, it must preserve these rules and receive a new privacy review.

## Data, authentication, and storage

Supabase remains the online feedback/persistence provider. Public account features remain centrally disabled. Scientific tools do not require authentication. Static local learning state may use browser storage and degrade gracefully. Future native authentication tokens must not be introduced until a secure native storage and redirect review is complete.

## Telemetry

Telemetry is optional, failure-isolated, and tagged `web`, `android`, or `ios`. Existing privacy filtering remains authoritative: do not record image bytes, OCR text, organism/marker/antimicrobial selections, form contents, free text, credentials, or persistent advertising identifiers. Session replay remains disabled.

## Native security baseline

- App identifier: `com.astcompass.app`
- Display name: `AST Compass`
- HTTPS-only Android scheme; cleartext traffic disabled
- No WebView navigation allow-list beyond the packaged app
- Android backups disabled
- No camera or broad file/storage permissions
- No iOS arbitrary-load exception
- No secrets embedded in the bundle; Vite client variables are public identifiers only
- Release signing material belongs in protected platform tooling, never Git

## Versioning and staged rollout

Web, Android, and iOS releases should reference the same AST Compass semantic version and scientific content revision. A safe sequence is: web/PWA validation, internal Android build, closed Android beta, internal iOS/TestFlight, limited external beta, then production review. Platform releases may lag the web shell, but a released binary must identify the exact bundled content version.
