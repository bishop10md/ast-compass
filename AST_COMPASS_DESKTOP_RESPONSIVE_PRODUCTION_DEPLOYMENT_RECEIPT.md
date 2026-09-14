# AST Compass Desktop Responsive Production Deployment Receipt

## Final status

**DESKTOP RESPONSIVE RELEASE DEPLOYED SUCCESSFULLY**

## Deployment identity

- Deployment timestamp: `2026-09-12T04:04:31.000Z` (`2026-09-11 11:04:31 PM CDT`)
- Production URL: `https://astcompass.com`
- Hosting provider: Netlify
- Published deployment ID: `6aa4cf4daebd830777d6735b`
- Authorized/deployed source commit: `febb3da5d7a54afa21bfdbb7e21993afefa72458`
- Previous production commit: `0263c24d5638cfe4a4830e818e67845588ac7e0f`
- Previous production deployment ID: `6aa0db1dd87a3e0008b1c38f`
- Application version: `0.4.5` (unchanged)
- Build during deployment: **NO** (`--no-build`)
- Artifact files: 168
- Artifact manifest SHA-256: `27d398e3f023200b3e048f6b077e12bdbf63136fbaed4dad648642028ca6dbe9`
- `index.html` SHA-256: `9c4d5bbd70cab2c4ab832f9146282c4d89457f524c987be925d710b795f05543`
- Owner-reviewed preview deployment: `6aa4bbdb2ef6307325973b1b`

The production artifact is byte-identical to the owner-reviewed preview artifact. The source audit commit `b148f28ea181c4a4f2d68ff1056fddabd16cd0ff` and authorized integration commit have identical Git trees. Netlify's manual no-build deployment does not populate `commit_ref`; the authorized commit is recorded in the deployment title and verified by the frozen source tree and artifact hashes above.

## Pre-deployment verification

- Production still pointed to deployment `6aa0db1dd87a3e0008b1c38f` and commit `0263c24d5638cfe4a4830e818e67845588ac7e0f`.
- The runtime diff from that baseline to the authorized commit was limited to `src/styles.css`.
- The repository working tree was clean.
- The only post-integration source-tree difference was the owner-approved release receipt; it was not part of the deployed artifact.
- Primary domain remained `astcompass.com`.
- Domain alias remained `www.astcompass.com`.
- Netlify production branch remained `main`.
- Force HTTPS remained enabled.

## Post-deployment route checks

All returned HTTP 200 without an unexpected redirect:

- `/`
- `/breakpoints`
- `/bcid-forecast`
- `/concordance`
- `/concordance/image`
- `/resistance`
- `/learn`
- `/learn/detective`
- `/references`
- `/about`
- `/feedback`

The live `index.html` SHA-256 matched the frozen artifact exactly.

## Responsive production smoke

Six required viewport sizes were tested across all 11 routes, for 66 live responsive checks:

- 430 × 932
- 768 × 1024
- 1366 × 768
- 1536 × 864
- 1920 × 1080
- 2560 × 1440

Results:

- Responsive checks: **66/66 PASS**
- Horizontal overflow: **0**
- Navigation wrapping: **0**
- Browser console errors: **0**
- Failed first-party requests: **0**
- Mobile menu open/navigation: **PASS**
- Desktop primary navigation: **PASS**
- Search (`CRO` → Ceftriaxone): **PASS**
- Mobile regression: **NONE**
- Tablet regression: **NONE**
- Desktop result: **PASS**

## HTTPS and canonical-domain result

- `https://astcompass.com/`: **200**
- TLS/HTTPS validation: **PASS**
- HSTS: `max-age=31536000; includeSubDomains`
- CSP: present and unchanged
- Canonical metadata across tested routes: apex `https://astcompass.com/...`
- Open Graph URL metadata across tested routes: apex `https://astcompass.com/...`
- `https://www.astcompass.com/...`: permanent 301 redirect to the same apex path/query
- `http://astcompass.com/...`: permanent 301 redirect to HTTPS apex
- `http://www.astcompass.com/...`: existing Netlify HTTPS-upgrade hop to `https://www`, followed by the permanent apex redirect; path and query preserved
- DNS/domain configuration changes: **NONE**

## PWA and indexing assets

- `/manifest.webmanifest`: **200**
- `/sw.js`: **200**, `no-cache, no-store, must-revalidate`
- `/robots.txt`: **200**
- `/sitemap.xml`: **200**
- PWA shell/load check: **PASS**
- Canonical domain remained apex throughout.

## Scientific and safety smoke

The live artifact identity matched the locally gated artifact. Existing non-mutating gates were rerun after publication:

- Scientific release gate: **10/10 PASS**, `releaseBlocked: false`
- Image human-review safety: **50/50 PASS**
- Local synthetic OCR safety smoke: **PASS**, 5/5 synthetic rows recovered; this is not an exact-accuracy claim
- SCI-04: **paused-pending-review / Draft / fail-closed**
- Unsupported Reviewed/Verified claims introduced: **NONE**
- Combined review claims: disabled pending documented approval
- Image-Assisted verification: mandatory before analysis
- Editing verified content revokes verification
- PHI screening: fail-closed prerequisite retained
- OCR/image/MIC telemetry exclusion: retained
- Protected scientific, OCR, privacy, telemetry, metadata, canonical-domain, and PWA source changes: **NONE**

Only synthetic/de-identified material was used.

## Owner approval reference

Source release receipt: `AST_COMPASS_DESKTOP_RESPONSIVE_RELEASE_RECEIPT.md`

- Owner desktop visual review: **PASSED**
- Release receipt status: **DESKTOP RESPONSIVE RELEASE CANDIDATE READY FOR PRODUCTION**
- Owner production authorization: received for commit `febb3da5d7a54afa21bfdbb7e21993afefa72458`

## Rollback

- Rollback required: **NO**
- Previous known-good deployment retained by Netlify: `6aa0db1dd87a3e0008b1c38f`

## Deployment boundary confirmation

No CSS values or application source were changed after validation. No scientific, breakpoint, BCID, Concordance, OCR, PHI/privacy, telemetry, metadata, canonical, PWA, DNS, or hosting configuration was changed. No version bump, unrelated cleanup, or production-branch merge was performed during publication.
