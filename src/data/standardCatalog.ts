import type { StandardCatalogEntry } from "./types";

export const standardCatalog: StandardCatalogEntry[] = [
  { id: "clsi-m100", domain: "Bacteria", authority: "CLSI", document: "M100", edition: "36th Edition (2026)", effectiveDate: "2026", purpose: "Common aerobic bacterial susceptibility criteria", sourceId: "ref-clsi-bit", implementationStatus: "Architecture ready" },
  { id: "clsi-m45", domain: "Fastidious bacteria", authority: "CLSI", document: "M45", edition: "3rd Edition", effectiveDate: "Current edition listed by CLSI BIT", purpose: "Infrequently isolated or fastidious bacteria", sourceId: "ref-clsi-bit", implementationStatus: "Planned" },
  { id: "fda-stic", domain: "Bacteria", authority: "FDA", document: "FDA STIC", edition: "Live regulatory source", effectiveDate: "Verify per record", purpose: "FDA-recognized interpretive criteria", sourceId: "ref-fda", implementationStatus: "Architecture ready" },
  { id: "eucast-161", domain: "Bacteria", authority: "EUCAST", document: "Clinical breakpoint tables", edition: "v16.1", effectiveDate: "2026-06-24", purpose: "Bacterial clinical breakpoint tables, including updated anaerobe coverage", sourceId: "ref-eucast-161", implementationStatus: "Architecture ready" },
  { id: "clsi-yeast", domain: "Yeast", authority: "CLSI", document: "M27M44S", edition: "4th Edition", effectiveDate: "2026-03-04", purpose: "Antifungal susceptibility testing of yeasts", sourceId: "ref-clsi-yeast", implementationStatus: "Planned" },
  { id: "clsi-mold", domain: "Filamentous fungi", authority: "CLSI", document: "M38M51S", edition: "4th Edition", effectiveDate: "2026-03-04", purpose: "Antifungal susceptibility testing of filamentous fungi", sourceId: "ref-clsi-mold", implementationStatus: "Planned" },
  { id: "eucast-afst", domain: "Yeast", authority: "EUCAST", document: "AFST clinical breakpoint table", edition: "v12.1", effectiveDate: "2026-04-10", purpose: "Fungal clinical breakpoints", sourceId: "ref-eucast-afst", implementationStatus: "Planned" },
  { id: "eucast-rast", domain: "Rapid AST", authority: "EUCAST", document: "RAST breakpoint table", edition: "v9.0", effectiveDate: "2026-01-16", purpose: "Short-incubation disk diffusion directly from positive blood culture bottles", sourceId: "ref-eucast-rast", implementationStatus: "Planned" },
  { id: "mycobacteria", domain: "Mycobacteria", authority: "CLSI", document: "Future scoped source", edition: "Not selected", effectiveDate: "Not applicable", purpose: "Mycobacterial susceptibility domain", sourceId: "ref-clsi", implementationStatus: "Planned" },
];


