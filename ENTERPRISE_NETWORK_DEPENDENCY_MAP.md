# AST Compass Enterprise Network Dependency Map

Audit date: 2026-09-04  
Production: https://astcompass.com

This inventory distinguishes automatic browser traffic from links a user deliberately opens. It reflects the hardened source in this release; production must be rechecked after deployment.

| Classification | Hostname | Purpose | Required? | Execution | Party | If blocked | Sensitive data | Replacement / risk |
|---|---|---|---|---|---|---|---|---|
| ESSENTIAL | `astcompass.com` | Application HTML, JavaScript, CSS, locally hosted fonts, OCR worker/core/language data, images and media | Required | Browser | First-party domain on Netlify | Site does not load | Normal HTTP request metadata; session-only AST images remain in browser memory | Primary production origin; low risk |
| ESSENTIAL | `dfsvprtsdqhjrkciflsk.supabase.co` | Feedback submission; retained future account/database/storage architecture | Required only for Feedback and future account features | Browser | Third-party processor | Core educational pages still work; Feedback fails with a generic state | Feedback fields submitted by the user; no PHI permitted | Could be proxied through a reviewed first-party function later; medium risk |
| OPTIONAL | `*.ingest.us.sentry.io` | Minimized application error envelopes when a public DSN is configured | Optional | Browser | Third party | Application continues; errors are not reported | Sanitized generic error metadata; no image/OCR/MIC/feedback text by design | Self-hosting or first-party relay possible; medium risk |
| OPTIONAL | `us.i.posthog.com` | Aggregate, cookieless product events when a public project key is configured | Optional | Browser | Third party | Application continues; analytics are absent | Random session identifier and allowlisted route/feature/device fields | Netlify server-side analytics can replace it; medium risk |
| OPTIONAL | `astcompass.netlify.app` | Legacy hostname, permanent redirect only | Optional | Browser | Hosting alias | Canonical domain remains available | Request metadata only | Retain redirect until reputation/bookmark migration is complete; low risk |
| OPTIONAL | `www.astcompass.com` | Convenience hostname, permanent redirect to apex | Optional | Browser | First-party DNS | Apex remains available | Request metadata only | Retain redirect; low risk |
| REMOVE IF POSSIBLE — REMOVED | `cdn.jsdelivr.net` | Previously loaded Supabase, Tesseract wrapper, OCR worker/core/data | No longer used | Browser | Third party CDN | Previously broke OCR/auth/feedback when blocked | No intended sensitive content, but OCR dependency requests exposed client metadata | Replaced with pinned packages and first-party OCR assets |
| REMOVE IF POSSIBLE — REMOVED | `fonts.googleapis.com`, `fonts.gstatic.com` | Previously loaded DM Sans and Manrope | No longer used | Browser | Third party CDN | Previously degraded typography | Request metadata | Replaced with pinned `@fontsource` packages under the SIL Open Font License |
| REMOVE IF POSSIBLE — REMOVED | `tessdata.projectnaptha.com` | Previously allowed OCR language data origin | No longer used | Browser | Third party | Previously could break first OCR use | Request metadata | English model is now served by `astcompass.com` |
| REMOVE IF POSSIBLE — REMOVED | `api.openai.com` | Dormant server-side science-assistant function | No longer deployed | Server-side only | Third party | No public feature used it | The removed function could have transmitted user-entered questions | Unused public endpoint removed |

## User-initiated external links

References may open authoritative sites such as `clsi.org`, `eucast.org`, `fda.gov`, `cdc.gov`, `biomerieux.com`, and `idsociety.org` in a new tab. They are not required to render or operate AST Compass and receive no uploaded image or AST table from AST Compass.

## Browser-only processing

Image decoding, OCR, AST text parsing, and the PHI screening rules execute in the browser. Temporary previews use `blob:` URLs and are revoked when the image is removed. No executable or SVG upload type is accepted.
