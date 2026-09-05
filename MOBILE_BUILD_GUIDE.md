# AST Compass Mobile Build Guide

## Prerequisites

- Node.js and pnpm compatible with `package.json`
- Android: Android Studio, supported JDK, Android SDK, and an emulator or device
- iOS: macOS, current Xcode, CocoaPods as requested by Xcode/Capacitor, Apple Developer membership, and a device or simulator
- Public client environment values used by the web build. Never place service-role keys, passwords, signing keys, or other secrets in `VITE_*` values.

## Install and verify the shared application

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

`pnpm build` runs TypeScript, Vite, copies the local OCR runtime/server function, emits route artifacts, and creates `dist/sw.js`.

## PWA / web

```bash
pnpm preview
```

Verify the manifest is detected, the service worker controls the production preview, installability is offered in a supported browser, an online visit seeds the cache, and a subsequent offline navigation displays the app shell or the explicit offline page. Netlify remains the web deployment path; this preparation does not change or publish the production deployment.

## Sync native projects

```bash
pnpm mobile:sync
```

This builds the shared web application and runs `cap sync` for installed platforms. Use it after every shared-code or dependency change.

For a faster repeat copy when native dependencies have not changed:

```bash
pnpm mobile:copy
```

## Android

```bash
pnpm android
```

The command builds/syncs and opens `android/` in Android Studio. Select a supported SDK/device, let Gradle sync, then Run. Before a release, set the version code/name, configure an organization-owned upload key outside Git, build an Android App Bundle, and test the signed artifact through Play internal testing. Confirm `usesCleartextTraffic=false`, backups disabled, and only `INTERNET` permission is requested.

## iOS

```bash
pnpm ios
```

Run this on macOS. It builds/syncs and opens `ios/App` in Xcode. Select the owner team, confirm bundle ID `com.astcompass.app`, set marketing/build versions, run on simulator and a physical iPhone/iPad, then create an Archive for TestFlight. Windows can generate and maintain the iOS project but cannot perform Xcode build, signing, archive, or TestFlight validation.

## Required device checks

Test at least a small Android phone, current Android phone, small iPhone, current iPhone, and tablet layout. Cover cold/warm launch, rotation, keyboard/focus, safe areas, hamburger/search, every major route, offline/online transition, external references, Android back behavior, background/resume, feedback success/failure, image picker cancel/retry, 10 MB boundary, PHI rejection, OCR progress/failure, human confirmation, and session-only image lifecycle.

Use only synthetic, de-identified images. Inspect telemetry to confirm the `platform` tag and absence of scientific/form/image payloads.

## Troubleshooting

- Blank native screen: run `pnpm mobile:sync`, inspect WebView console, and confirm `webDir` is `dist`.
- OCR asset error: verify `dist/ocr`, worker, WASM, and language files exist after build and inspect WebView CSP/worker logs.
- Old PWA: close tabs, reconnect, reload once, and confirm `/sw.js` is served with `Cache-Control: no-cache`.
- External link stays in-app: confirm the destination is not in `allowNavigation` and retest on a signed/device build.
- Deep link does not open: association files and signed-app identifiers are a later release gate; ordinary canonical URLs still work in a browser.
