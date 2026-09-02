# MONITORING SETUP — ACTIONS FOR MICHAEL

Monitoring code is privacy-minimized and remains inactive until the public project identifiers are configured in Netlify. Administrative tokens must never be added to `VITE_*` variables.

## Sentry — “Tell me when AST Compass breaks.”

1. Create a Sentry account and organization.
2. Create a Browser JavaScript project named **AST Compass**. The application-level boundary and shared telemetry layer already capture React, unhandled JavaScript, initialization, workflow, and sanitized application errors.
3. Copy the project's public DSN.
4. In Netlify → AST Compass → Site configuration → Environment variables, add `VITE_SENTRY_DSN` with the DSN. Apply it to Production; use distinct projects or DSNs later for Preview if desired.
5. Confirm Sentry's production environment displays as `production` and releases display as `ast-compass@0.4.4`.
6. In Sentry Alerts, create email alerts for: a new issue; an issue seen more than 5 times in 5 minutes; error spikes; and repeated errors tagged `feature_name` as `bcid`, `concordance`, `image_concordance`, `account`, or `feedback`.
7. Add an uptime monitor for `https://astcompass.com` and enable email notification when unavailable. Add Slack later through Sentry Integrations if desired.
8. After deployment, test one controlled, non-sensitive production error, verify its route/feature/release tags, and confirm the email arrives. Remove the controlled test immediately afterward.

Do not enable screenshots, session replay, DOM capture, request bodies, cookies, authorization headers, or user-identifying fields. A future source-map upload may use a server-side `SENTRY_AUTH_TOKEN` during CI; never expose that token through a `VITE_*` variable or commit it.

## PostHog — “Show me how AST Compass is being used.”

9. Create a PostHog project named **AST Compass**.
10. Copy its public project key and regional ingestion host.
11. In Netlify environment variables, add `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST`. Do not add a personal API key.
12. Verify anonymous `page_view` and structured feature events. Confirm `$process_person_profile` is false and no email, name, password, token, filename, OCR, MIC, feedback, PHI, or saved-analysis content appears.
13. Create an **Overview** dashboard: daily/weekly/monthly visitors, top pages, and top feature events.
14. Create **Scientific tools** and **Learning** dashboards from `breakpoint_opened`, `resistance_hub_opened`, `bcid_started`, `concordance_started`, `image_concordance_started`, `image_concordance_completed`, `search_used`, `learn_opened`, `learning_module_opened`, and AST Detective events.
15. Create funnels for Image Concordance (opened → PHI pass → completed), BCID (started → completed as the completion event becomes available), and accounts (create started → sign-in completed). Review events again to verify sensitive fields are absent.

Session replay is intentionally not initialized. Do not enable it for AST Compass v0.4. Analytics use a temporary anonymous session identifier and no advertising or cross-site tracking configuration.

## Netlify and Supabase reliability

- Use Netlify function logs and alerts for feedback or future secure server functions. Log only success/failure, duration bucket, and generic error category—never request bodies.
- Use the Supabase dashboard for authentication/database health. Application errors may use generic labels such as `auth_signin_failed`, `analysis_save_failed`, `history_fetch_failed`, and `image_save_failed`; never send credentials, tokens, email addresses, connection strings, or private rows.
- Telemetry is optional and fails silently. AST Compass scientific tools and accounts continue working if either monitoring service is unavailable.

