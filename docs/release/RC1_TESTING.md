# RC1 local acceptance

No push or deployment is authorized. This candidate retains package0.4.5 and the production dependency lock.

Install locked dependencies with `pnpm install --frozen-lockfile`. Node24.19.0 and pnpm11.19.0 were used for this RC.

Browser gates require an installed Chrome and an external audit-only Node module directory containing Playwright and Sharp. Set `AST_AUDIT_PLAYWRIGHT` to that directory. These tools are not runtime dependencies and are never shipped. The Windows reference environment uses Chrome152.0.7977.76, Playwright from the bundled audit runtime, and system Arial/Helvetica fonts.

Run:

```text
pnpm test
pnpm run audit:scientific-release
pnpm run check
pnpm run build
pnpm run audit:image-human-review-safety
pnpm run audit:static-release
pnpm run audit:image-extraction
node scripts/prepare-local-audit-tls.mjs
node scripts/infra-browser-acceptance.mjs pwa
```

The build precedes browser gates deliberately: the human-review gate rejects a stale build. The strict extraction command remains an **R&D AUTOMATION ACCURACY BENCHMARK — NOT A HUMAN-REVIEW SAFETY FAILURE**. A real measured accuracy failure is reported; missing tools, missing fixtures, or harness failures are not substituted for that result.

Both image gates regenerate their original synthetic rasters with the exact historical renderer and check frozen SHA-256 values from `tests/fixtures/original-image-raster-sha256.json`. That manifest is transcribed unchanged from the September7 V2 benchmark. No `work/` directory is copied. Browser/OS/font differences can change PNG bytes; such a mismatch must stop acceptance, never silently update hashes. V3 additive benchmark tables/cells remain synthetic test-only inputs, not V4 research or runtime recognition models.

TLS acceptance creates a one-day localhost certificate under ignored `work/` and pins that certificate only in the temporary headless audit browser. It does not install trust, change production TLS, or prove physical-device installation. Do not commit local certificates, profiles, screenshots, model binaries, `.env` files or generated `work/` content.

Current acceptance evidence belongs in the RC report; older workflow/owner-decision documents are historical context, not fresh test receipts. No PHI or real AST image is used in the harness.

Additional local acceptance: `node scripts/audit-rc1-browser.mjs` and `node scripts/audit-rc1-integrity.mjs`. Set `AST_RC1_PRODUCTION` to an untouched checkout of the production baseline to also run the semantic comparisons. The integrity receipt compares original Windows working-tree bytes; the portable unit test uses separately frozen production SHA-256 values with **CRLF to LF only** normalization. No scientific value, Unicode, or other whitespace is normalized. The original raw-byte evidence remains intact.
