# PHI server-gate plan

Status: **REQUIRES LIVE ENVIRONMENT / OWNER SECURITY REVIEW**

AST Compass must not treat browser OCR as authorization for permanent storage. The required flow is:

1. Upload only after the user confirms the No-PHI rule.
2. Place bytes in an isolated, private quarantine location with a short lifecycle.
3. Invoke a trusted server-side scanner; clients cannot set approval state.
4. Record `pending`, `approved`, `rejected`, or `unable-to-screen` with a screening version and timestamp.
5. On pass, move/copy the object to the user's private prefix and create metadata in one reviewed server transaction.
6. On fail or scanner error, delete the quarantine object and return a generic failure. There is no override.
7. Permit signed URLs only for approved objects owned by the authenticated user.

The client types and server boundary are prepared in `src/security/phiServerGate.ts`. Permanent saving is disabled until the server function, quarantine policy, lifecycle cleanup, RLS/storage policies, adversarial tests, logging redaction, and independent security review are complete.

Never expose a service-role secret in Vite/Netlify client variables. Required privileged values belong only in the server-function environment.
