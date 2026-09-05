# AST Compass Enterprise Security Overview

Audit date: 2026-09-04  
Audience: hospital, university, school, and enterprise IT/security teams

## Purpose and boundary

AST Compass is an educational antimicrobial susceptibility and resistance-learning platform at `https://astcompass.com`. It does not provide patient-specific treatment recommendations, authorize laboratory reporting, replace validated procedures, or claim clinical validation.

## Hosting and transport

- Netlify hosts the static React/Vite application and terminates HTTPS.
- The verified production certificate is for `astcompass.com`, chains successfully to Let's Encrypt, and negotiated TLS 1.3 on 2026-09-04.
- HTTP redirects directly to HTTPS. `www` and the old Netlify hostname redirect directly to the canonical apex domain.
- HSTS, CSP, nosniff, referrer, permissions, frame, opener, and resource-policy headers are configured.

## Network model

Core educational pages require only `astcompass.com`. Fonts and the complete OCR runtime are version-pinned and served from the same origin. Optional Sentry/PostHog requests are failure-isolated. Supabase is contacted only when a user submits Feedback or when retained future account services are deliberately invoked.

See `AST_COMPASS_ENTERPRISE_ALLOWLIST.md` for the exact host list.

## Images and No-PHI policy

- **Do not upload PHI or patient-identifiable material.**
- Accepted files are JPEG, PNG, or WebP, no larger than 10 MB.
- Extension, declared MIME type, and magic bytes must agree before decode.
- SVG and executable formats are rejected.
- Image decode, OCR, PHI text screening, optional browser barcode/face checks, and AST extraction occur locally in the browser.
- Public uploads are session-only and are not added to persistent personal history.
- OCR and automated PHI screening can fail or miss identifiers; users remain responsible for de-identification.
- AST Compass does not send uploaded AST images to a general-purpose AI service.

## Data, accounts, cookies, and analytics

- Public account functionality is disabled; all scientific tools work without authentication.
- Account/RLS/private-storage architecture remains in development and is not represented as production-validated.
- The site does not require third-party cookies for educational functionality.
- Local/session storage supports learning continuity and anonymous telemetry identifiers; restricted storage degrades progress persistence rather than blocking learning.
- PostHog and Sentry are optional. They must not intentionally receive images, OCR text, MIC tables, credentials, PHI, feedback text, or authentication tokens.
- Netlify server-side Web Analytics may provide traffic aggregates independently of browser trackers.

## Downloads and public endpoints

The application does not auto-download executables or present deceptive system prompts. Promo video and public static assets are same-origin. The unused public AI function was removed during this audit. Feedback is the only active Supabase-backed public submission workflow identified in the client.

## Authentication status

Authentication UI and private workspace routes are hidden and noindexed/treated as unavailable while validation continues. If accounts return, authentication branding, OAuth redirects, RLS isolation, account deletion, recovery, and private storage require a separate release gate.

## Supported browsers and graceful degradation

Current Chrome, Edge, Firefox, and Safari are intended. If optional barcode or face detector APIs are absent, Image Concordance displays a degraded screening state instead of silently claiming full screening. If optional telemetry is blocked, core features continue. If Supabase is blocked, Feedback/persistence is unavailable but core education continues.

## Contact and disclosure

Use `https://astcompass.com/feedback` for security and privacy reports. `https://astcompass.com/.well-known/security.txt` publishes the same real contact route. No inactive `security@astcompass.com` address is claimed.

## Known limitations

This review is not a penetration test, certification, HIPAA determination, or clinical validation. Enterprise URL reputation varies by vendor and organization. TLS interception, custom allowlists, browser versions, and institutional DLP policies can change observed behavior.
