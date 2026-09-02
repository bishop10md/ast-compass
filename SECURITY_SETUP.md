# SUPABASE SETUP — ACTIONS FOR MICHAEL

The account interface remains in full-access Guest Mode until a reviewed Supabase project is connected.

1. Create a Supabase project and enable email verification.
2. Configure Google OAuth in Supabase; keep the Google client secret in the provider dashboard, never in this repository or a `VITE_*` variable.
3. Apply `supabase/migrations/20260901_private_workspace.sql` after database-security review.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Netlify environment variables.

## Private feedback workflow

Feedback is stored in the RLS-protected `public.feedback` table. Guest and authenticated users may insert records, but the application has no select policy, so submissions never appear publicly.

For an optional owner-only Google Sheets archive, synchronize this table from a trusted server-side job. Use a private sheet named `AST Compass User Feedback` with these columns: Timestamp, User ID, Account status, Display name, Email, Role, Rating, Useful feedback, Improvement feedback, Requested feature, Additional comments, Testimonial permission, AST Compass version, and Page/source. Never place Google service-account or OAuth secrets in `VITE_*` variables or frontend code.
5. Confirm the `ast-images` bucket is private and test all RLS policies with two separate users.
6. Add reviewed server-side endpoints for signed image URLs, rate limiting, audit events, account deletion, upload content verification, and the second-stage PHI scanner before enabling permanent saves.
7. Install and pin `@supabase/supabase-js`, then replace the temporary official UMD loader in `src/lib/supabase.ts` with a normal package import. Package-registry access was blocked in the Codex workspace.
8. In Supabase Auth, enable email/password registration and require email verification.
9. Test signup, verification, password reset, Google login, and sign-out on local and Netlify URLs.
10. Verify the bucket is not public and that saved images are displayed only through five-minute signed URLs.
11. Test database and Storage policies with two different authenticated users plus one anonymous browser.
12. Deploy reviewed Netlify functions for rate limiting, server-side secondary PHI screening, and complete account deletion before enabling those production operations.

## Exact redirect configuration

- Supabase Site URL: `https://astcompass.com`
- Supabase additional redirect URL: `https://astcompass.com/auth/callback`
- Local redirect URL: `http://localhost:5173/auth/callback`
- Google Cloud authorized redirect URI: use the exact Supabase callback URI displayed by Supabase for the Google provider; do not use a wildcard.

Do not configure or expose a Supabase service-role key in frontend code. Do not advertise HIPAA compliance or accept PHI.
