import type { Mechanism } from "./types";

export const mechanisms: Mechanism[] = [
  { id: "esbl", name: "Extended-spectrum β-lactamase", family: "Enzymatic inactivation", summary: "Hydrolyzes expanded-spectrum cephalosporins; observed phenotype varies with expression and test context.", affectedClasses: ["Penicillins", "Cephalosporins", "Aztreonam"] },
  { id: "ampc", name: "AmpC β-lactamase", family: "Enzymatic inactivation", summary: "May be chromosomal or plasmid-mediated and can be inducible or derepressed.", affectedClasses: ["Penicillins", "Cephalosporins", "Cephamycins"] },
  { id: "serine_carb", name: "Serine carbapenemase", family: "Enzymatic inactivation", summary: "Carbapenem-hydrolyzing enzymes including KPC and selected OXA families.", affectedClasses: ["Carbapenems", "Most β-lactams"] },
  { id: "mbl", name: "Metallo-β-lactamase", family: "Enzymatic inactivation", summary: "Zinc-dependent enzymes including NDM, VIM, and IMP families.", affectedClasses: ["Carbapenems", "Most β-lactams"] },
  { id: "pbp2a", name: "Altered PBP2a/PBP2c", family: "Target modification", summary: "Reduced β-lactam binding in staphylococci associated with mec genes.", affectedClasses: ["Most β-lactams"] },
  { id: "van_target", name: "Vancomycin target alteration", family: "Target modification", summary: "Changes the peptidoglycan terminus and reduces glycopeptide binding.", affectedClasses: ["Glycopeptides"] },
  { id: "mlsb", name: "MLSB target methylation", family: "Target modification", summary: "Ribosomal methylation can produce constitutive or inducible macrolide-lincosamide resistance.", affectedClasses: ["Macrolides", "Lincosamides", "Streptogramin B"] },
  { id: "aminoglycoside", name: "Aminoglycoside modification / target protection", family: "Enzymatic inactivation", summary: "Multiple enzyme and methylase families can reduce aminoglycoside activity.", affectedClasses: ["Aminoglycosides"] },
  { id: "quinolone", name: "Fluoroquinolone target/protection", family: "Target modification", summary: "QRDR changes and plasmid-mediated protection can contribute to elevated MICs.", affectedClasses: ["Fluoroquinolones"] },
  { id: "polymyxin", name: "Lipid A modification", family: "Target modification", summary: "Chromosomal pathways or mcr genes can reduce polymyxin binding.", affectedClasses: ["Polymyxins"] },
];


