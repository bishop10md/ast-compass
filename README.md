# AST Compass

AST Compass is a responsive educational antimicrobial susceptibility testing platform for microbiologists. The v0.2 MLS Edition adds version-aware demo breakpoint records, separate domain datasets, Learning and Bench modes, genotype/phenotype reasoning tools, intrinsic-pattern guidance, eight AST Detective cases, inline provenance, search, real routes, and a transparent change log.

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

