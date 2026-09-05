import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("PWA manifest uses AST Compass identity and complete icons", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest"));
  assert.equal(manifest.name, "AST Compass");
  assert.equal(manifest.short_name, "AST Compass");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"));
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
});

test("document declares installability and safe-area viewport", () => {
  const html = read("index.html");
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /apple-mobile-web-app-capable/);
});

test("service worker is versioned and excludes private/network submissions", () => {
  const build = read("scripts/postbuild.mjs");
  assert.match(build, /createHash/);
  assert.match(build, /request\.method !== 'GET'/);
  assert.match(build, /url\.origin !== self\.location\.origin/);
  assert.match(build, /request\.mode === 'navigate'/);
  assert.match(build, /startsWith\('\/assets\/'\)/);
  assert.doesNotMatch(build, /supabase\.co/);
  assert.doesNotMatch(build, /cache\.put\([^\n]*(feedback|auth|upload)/i);
  assert.match(read("netlify.toml"), /for = "\/sw\.js"[\s\S]*no-cache/);
});

test("Capacitor has a minimal HTTPS-only native shell", () => {
  const config = read("capacitor.config.ts");
  assert.match(config, /appId: "com\.astcompass\.app"/);
  assert.match(config, /appName: "AST Compass"/);
  assert.match(config, /webDir: "dist"/);
  assert.match(config, /androidScheme: "https"/);
  assert.match(config, /cleartext: false/);
  assert.match(config, /allowNavigation: \[\]/);
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /usesCleartextTraffic="false"/);
  assert.match(manifest, /allowBackup="false"/);
  assert.doesNotMatch(manifest, /CAMERA|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE/);
  assert.doesNotMatch(read("ios/App/App/Info.plist"), /NSCameraUsageDescription|NSPhotoLibraryUsageDescription|NSAllowsArbitraryLoads/);
});

test("native navigation accepts only canonical app links and preserves Android back", () => {
  const platform = read("src/lib/platform.ts");
  assert.match(platform, /parsed\.protocol === "https:"/);
  assert.match(platform, /parsed\.hostname === "astcompass\.com"/);
  assert.match(platform, /history\.back\(\)/);
  assert.match(platform, /CapacitorApp\.minimizeApp\(\)/);
  assert.match(platform, /Capacitor\.isNativePlatform\(\)/);
});

test("safe-area, network, telemetry, and build contracts are present", () => {
  assert.match(read("src/styles.css"), /env\(safe-area-inset-top/);
  assert.match(read("src/styles.css"), /env\(safe-area-inset-bottom/);
  assert.match(read("src/components/NetworkStatus.tsx"), /AST Compass is offline/);
  assert.match(read("src/lib/telemetry.ts"), /platform: getAstPlatform\(\)/);
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["mobile:sync"], "pnpm build && cap sync");
  assert.equal(pkg.dependencies["@capacitor/core"], "8.5.1");
  assert.equal(pkg.dependencies["@capacitor/android"], "8.5.1");
  assert.equal(pkg.dependencies["@capacitor/ios"], "8.5.1");
  assert.equal(pkg.dependencies["@capacitor/app"], "8.1.1");
  assert.equal(pkg.devDependencies["@capacitor/cli"], "8.5.1");
  assert.equal(pkg.dependencies["@capacitor/camera"], undefined);
});

test("mobile readiness artifacts and native identity assets exist", () => {
  for (const path of [
    "MOBILE_APP_READINESS_AUDIT.md",
    "MOBILE_ARCHITECTURE.md",
    "MOBILE_BUILD_GUIDE.md",
    "APP_STORE_PRIVACY_CHECKLIST.md",
    "APP_STORE_RELEASE_CHECKLIST.md",
    "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
    "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
  ]) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `${path} should exist`);
});
