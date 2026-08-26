# AST Compass

AST Compass is a responsive educational antimicrobial susceptibility testing platform for microbiologists. The v0.3 Blood Culture Edition adds a domain-aware breakpoint engine and an organism-aware BCID Resistance Forecast on top of the MLS learning foundation.

The breakpoint engine separates bacterial, fungal, fastidious, anaerobic, mycobacterial, and Rapid AST source domains and represents “no breakpoint available” explicitly. The BCID forecast classifies mechanism-level expectations as resistance strongly expected, activity may be retained, cannot infer, or mechanism-dependent caution.

> All breakpoint values and interpretive outputs are educational demo content. They are not validated for clinical or patient-care decisions.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

## Production build

```bash
pnpm build
pnpm preview
```

Netlify settings: build command `pnpm build`, publish directory `dist`. The included `public/_redirects` supports direct navigation to application routes.

