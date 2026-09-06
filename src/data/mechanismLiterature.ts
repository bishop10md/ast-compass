export interface MechanismLiteratureMeta {
  mechanismId: string;
  sourceIds: string[];
  relatedGuideSlug?: string;
  laboratoryContext: string;
}

export const mechanismLiterature: MechanismLiteratureMeta[] = [
  { mechanismId: "esbl", sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-idsa", "ref-ctxm-review", "ref-kpc-structure"], relatedGuideSlug: "ctx-m-expected-phenotype", laboratoryContext: "ESBL phenotype depends on the enzyme family, allele, expression, host background, permeability, and co-produced beta-lactamases. Apply current organism-specific AST and reporting rules." },
  { mechanismId: "ampc", sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-idsa", "ref-genotype-phenotype"], laboratoryContext: "AmpC may be intrinsic and inducible, stably derepressed, or plasmid mediated. Species identification and the complete beta-lactam pattern are essential before proposing the mechanism." },
  { mechanismId: "serine_carb", sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-idsa", "ref-kpc-structure", "ref-genotype-phenotype"], relatedGuideSlug: "kpc-resistance-mechanism", laboratoryContext: "Serine carbapenemases include mechanistically and phenotypically diverse enzyme families. A detected family supports a mechanism expectation but does not establish every drug result." },
  { mechanismId: "mbl", sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-idsa", "ref-genotype-phenotype"], laboratoryContext: "Metallo-beta-lactamases require zinc for catalysis and differ from serine beta-lactamases in inhibitor and substrate behavior. Co-produced enzymes and permeability changes can substantially modify the phenotype." },
  { mechanismId: "pbp2a", sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-meca-mecc", "ref-meca-testing", "ref-genotype-phenotype"], relatedGuideSlug: "meca-pbp2a-interpretation", laboratoryContext: "Interpret mecA, mecC, PBP2a, oxacillin, and cefoxitin findings with the exact staphylococcal species or reporting group and the applicable method-specific standard." },
  { mechanismId: "van_target", sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-van-review", "ref-vanb-study", "ref-vanb-anaerobes", "ref-genotype-phenotype"], relatedGuideSlug: "vana-versus-vanb", laboratoryContext: "Acquired and intrinsic van systems are distinct. Species, gene-cluster type, expression, and isolate-level glycopeptide AST are needed to interpret a molecular finding." },
  { mechanismId: "mlsb", sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-genotype-phenotype"], laboratoryContext: "Macrolide-lincosamide-streptogramin B resistance may be constitutive or inducible. The observed erythromycin and clindamycin pattern and any validated induction test remain central." },
  { mechanismId: "aminoglycoside", sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-genotype-phenotype"], laboratoryContext: "Aminoglycoside-modifying enzymes and target-protection or target-modification mechanisms have different substrate profiles. One marker should not be generalized to the entire class." },
  { mechanismId: "quinolone", sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-genotype-phenotype"], laboratoryContext: "Fluoroquinolone phenotype can reflect stepwise target mutations, plasmid-mediated protection, efflux, permeability, and combinations of mechanisms. Low-level determinants may not produce categorical resistance alone." },
  { mechanismId: "polymyxin", sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-eucast", "ref-genotype-phenotype"], laboratoryContext: "Polymyxin testing is method sensitive. Lipid A modification may be chromosomal or mcr mediated, but a mechanism hypothesis cannot substitute for an appropriate validated susceptibility method." },
];

export const mechanismLiteratureFor = (mechanismId: string) => mechanismLiterature.find((item) => item.mechanismId === mechanismId);
