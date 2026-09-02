import type { BcidTargetCategory, BcidResistanceMarker, BcidPanelTarget, RapidDiagnosticPanel, PanelAssociationRule } from "./rapidDiagnosticTypes";

const target = (id: string, name: string, category: BcidTargetCategory, targetType: BcidPanelTarget["targetType"], parentId?: string, aliases: string[] = []): BcidPanelTarget => ({ id, name, scientificName: name, category, targetType, parentId, aliases });

export const bcid2Targets: BcidPanelTarget[] = [
  target("acb-complex", "Acinetobacter calcoaceticus-baumannii complex", "Gram-negative bacteria", "complex"),
  target("b-fragilis", "Bacteroides fragilis", "Gram-negative bacteria", "species"),
  target("enterobacterales", "Enterobacterales", "Gram-negative bacteria", "group"),
  target("e-cloacae-complex", "Enterobacter cloacae complex", "Gram-negative bacteria", "complex", "enterobacterales"),
  target("e-coli", "Escherichia coli", "Gram-negative bacteria", "species", "enterobacterales", ["E. coli"]),
  target("k-aerogenes", "Klebsiella aerogenes", "Gram-negative bacteria", "species", "enterobacterales"),
  target("k-oxytoca", "Klebsiella oxytoca", "Gram-negative bacteria", "species", "enterobacterales"),
  target("k-pneumoniae-group", "Klebsiella pneumoniae group", "Gram-negative bacteria", "group", "enterobacterales", ["K. pneumoniae group"]),
  target("proteus-spp", "Proteus spp.", "Gram-negative bacteria", "genus", "enterobacterales"),
  target("salmonella-spp", "Salmonella spp.", "Gram-negative bacteria", "genus", "enterobacterales"),
  target("s-marcescens", "Serratia marcescens", "Gram-negative bacteria", "species", "enterobacterales"),
  target("h-influenzae", "Haemophilus influenzae", "Gram-negative bacteria", "species"),
  target("n-meningitidis", "Neisseria meningitidis", "Gram-negative bacteria", "species"),
  target("p-aeruginosa", "Pseudomonas aeruginosa", "Gram-negative bacteria", "species"),
  target("s-maltophilia", "Stenotrophomonas maltophilia", "Gram-negative bacteria", "species"),
  target("e-faecalis", "Enterococcus faecalis", "Gram-positive bacteria", "species"),
  target("e-faecium", "Enterococcus faecium", "Gram-positive bacteria", "species"),
  target("l-monocytogenes", "Listeria monocytogenes", "Gram-positive bacteria", "species"),
  target("staphylococcus-spp", "Staphylococcus spp.", "Gram-positive bacteria", "group"),
  target("s-aureus", "Staphylococcus aureus", "Gram-positive bacteria", "species", "staphylococcus-spp"),
  target("s-epidermidis", "Staphylococcus epidermidis", "Gram-positive bacteria", "species", "staphylococcus-spp"),
  target("s-lugdunensis", "Staphylococcus lugdunensis", "Gram-positive bacteria", "species", "staphylococcus-spp"),
  target("streptococcus-spp", "Streptococcus spp.", "Gram-positive bacteria", "group"),
  target("s-agalactiae", "Streptococcus agalactiae", "Gram-positive bacteria", "species", "streptococcus-spp"),
  target("s-pneumoniae", "Streptococcus pneumoniae", "Gram-positive bacteria", "species", "streptococcus-spp"),
  target("s-pyogenes", "Streptococcus pyogenes", "Gram-positive bacteria", "species", "streptococcus-spp"),
  target("c-albicans", "Candida albicans", "Yeast", "species"),
  target("c-auris", "Candida auris", "Yeast", "species"),
  target("c-glabrata", "Candida glabrata", "Yeast", "species"),
  target("c-krusei", "Candida krusei", "Yeast", "species"),
  target("c-parapsilosis", "Candida parapsilosis", "Yeast", "species"),
  target("c-tropicalis", "Candida tropicalis", "Yeast", "species"),
  target("cryptococcus", "Cryptococcus (C. neoformans/C. gattii)", "Yeast", "complex", undefined, ["Cryptococcus neoformans", "Cryptococcus gattii"]),
];

const marker = (id: string, label: string, category: BcidResistanceMarker["category"], mechanismId?: string, mechanismFamily?: BcidResistanceMarker["mechanismFamily"]): BcidResistanceMarker => ({ id, label, category, mechanismId, mechanismFamily });
export const bcid2Markers: BcidResistanceMarker[] = [
  marker("ctx-m", "CTX-M", "ESBL", "esbl"),
  marker("imp", "IMP", "Carbapenemase", "mbl", "Metallo-beta-lactamase"),
  marker("kpc", "KPC", "Carbapenemase", "serine_carb", "Serine carbapenemase"),
  marker("ndm", "NDM", "Carbapenemase", "mbl", "Metallo-beta-lactamase"),
  marker("oxa-48-like", "OXA-48-like", "Carbapenemase", "serine_carb", "Serine carbapenemase"),
  marker("vim", "VIM", "Carbapenemase", "mbl", "Metallo-beta-lactamase"),
  marker("mcr-1", "mcr-1", "Colistin resistance", "polymyxin"),
  marker("meca-c", "mecA/C", "Methicillin resistance", "pbp2a"),
  marker("meca-c-mrej", "mecA/C and MREJ (MRSA)", "Methicillin resistance", "pbp2a"),
  marker("vana-b", "vanA/B", "Vancomycin resistance", "van_target"),
];

export const bcid2AssociationRules: PanelAssociationRule[] = [
  { organismId: "enterobacterales", markerId: "ctx-m", association: "Potential association", explanation: "CTX-M is a BCID ESBL target reported in a compatible Enterobacterales context. A monomicrobial result supports association, but phenotypic AST remains required.", sourceIds: ["ref-bcid2-ifu", "ref-idsa"] },
  { organismId: "e-coli", markerId: "ctx-m", association: "Strongly associated in this BCID context", explanation: "In a monomicrobial E. coli BCID result, CTX-M is strongly associated with the detected Enterobacterales target. This is still a pre-AST molecular association, not proof of the complete phenotype.", sourceIds: ["ref-bcid2-ifu", "ref-idsa"] },
  { organismId: "e-cloacae-complex", markerId: "ctx-m", association: "Potential association", explanation: "CTX-M supports an ESBL mechanism, while Enterobacter cloacae complex also has important chromosomal AmpC biology.", sourceIds: ["ref-bcid2-ifu", "ref-idsa"] },
  { organismId: "enterobacterales", markerId: "kpc", association: "Potential association", explanation: "KPC can be associated with a detected Enterobacterales target in the appropriate BCID context; isolation and AST are needed for attribution and phenotype.", sourceIds: ["ref-bcid2-ifu", "ref-idsa"] },
  { organismId: "k-pneumoniae-group", markerId: "kpc", association: "Strongly associated in this BCID context", explanation: "A monomicrobial Klebsiella pneumoniae group plus KPC result supports a strong pre-AST organism–marker association.", sourceIds: ["ref-bcid2-ifu", "ref-idsa"] },
  ...["imp", "ndm", "oxa-48-like", "vim"].map((markerId) => ({ organismId: "enterobacterales", markerId, association: "Potential association" as const, explanation: "The carbapenemase target may be associated with the detected Enterobacterales target in a monomicrobial BCID result; culture and AST remain necessary.", sourceIds: ["ref-bcid2-ifu", "ref-idsa"] })),
  { organismId: "s-aureus", markerId: "meca-c-mrej", association: "Strongly associated in this BCID context", explanation: "The combined mecA/C and MREJ target is the BCID MRSA-associated marker context for Staphylococcus aureus.", sourceIds: ["ref-bcid2-ifu"] },
  { organismId: "staphylococcus-spp", markerId: "meca-c", association: "Potential association", explanation: "mecA/C may support methicillin resistance in a compatible Staphylococcus context, but species and manufacturer reporting rules must be reviewed.", sourceIds: ["ref-bcid2-ifu"] },
  { organismId: "e-faecalis", markerId: "vana-b", association: "Potential association", explanation: "vanA/B may be associated with the detected Enterococcus faecalis target; expression and phenotypic AST remain important.", sourceIds: ["ref-bcid2-ifu"] },
  { organismId: "e-faecium", markerId: "vana-b", association: "Potential association", explanation: "vanA/B may be associated with the detected Enterococcus faecium target; expression and phenotypic AST remain important.", sourceIds: ["ref-bcid2-ifu"] },
];

export const bcid2PanelMetadata = {
  manufacturer: "bioMérieux / BioFire Diagnostics",
  panel: "BIOFIRE Blood Culture Identification 2 (BCID) Panel",
  sampleType: "Positive blood culture",
  totalTargets: 43,
  bacterialTargets: 26,
  yeastTargets: 7,
  resistanceTargets: 10,
  sourceIds: ["ref-bcid2", "ref-bcid2-ifu"],
  lastVerified: "2026-09-01",
} as const;

export const bcid2Panel: RapidDiagnosticPanel = {
  id: "biofire-bcid2",
  shortName: "BIOFIRE BCID",
  name: bcid2PanelMetadata.panel,
  manufacturer: bcid2PanelMetadata.manufacturer,
  sampleType: bcid2PanelMetadata.sampleType,
  targets: bcid2Targets,
  markers: bcid2Markers,
  associationRules: bcid2AssociationRules,
  metadata: bcid2PanelMetadata,
};

