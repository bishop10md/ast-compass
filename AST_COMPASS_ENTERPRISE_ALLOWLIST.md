# AST Compass Enterprise Firewall Allowlist

Audit date: 2026-09-04

## Required for the educational core

| Requirement | Hostname | Ports | Purpose |
|---|---|---|---|
| REQUIRED | `astcompass.com` | TCP 443 | Site, application bundles, images, locally hosted fonts and OCR assets |

`www.astcompass.com` and `astcompass.netlify.app` are redirect-only aliases. Institutions may allow them to support old links, but normal production use resolves to `astcompass.com`.

## Required for specific features

| Requirement | Hostname | Ports | Purpose | Failure behavior |
|---|---|---|---|---|
| REQUIRED FOR FEEDBACK | `dfsvprtsdqhjrkciflsk.supabase.co` | TCP 443 | Submit optional feedback | Feedback reports an unavailable state; scientific tools continue |
| FUTURE / CURRENTLY HIDDEN | `dfsvprtsdqhjrkciflsk.supabase.co` | TCP 443; WSS 443 if future realtime/auth needs it | Retained account, database and private-storage architecture | Public account-free application continues |

## Optional telemetry

| Requirement | Hostname | Ports | Purpose | Failure behavior |
|---|---|---|---|---|
| OPTIONAL | `*.ingest.us.sentry.io` | TCP 443 | Sanitized crash reporting | Silent telemetry loss only |
| OPTIONAL | `us.i.posthog.com` | TCP 443 | Aggregate, non-advertising usage events | Silent analytics loss only |

Do not bypass institutional controls. If an organization blocks a required hostname, request ordinary security review or allowlisting using this document and the enterprise security overview.
