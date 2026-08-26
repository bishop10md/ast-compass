import type { Antibiotic } from "./types";

export const antibiotics: Antibiotic[] = [
  { id: "ampicillin", name: "Ampicillin", className: "Aminopenicillin", short: "AMP" },
  { id: "ceftriaxone", name: "Ceftriaxone", className: "Third-generation cephalosporin", short: "CRO" },
  { id: "ceftazidime", name: "Ceftazidime", className: "Antipseudomonal cephalosporin", short: "CAZ" },
  { id: "cefepime", name: "Cefepime", className: "Fourth-generation cephalosporin", short: "FEP" },
  { id: "meropenem", name: "Meropenem", className: "Carbapenem", short: "MEM" },
  { id: "ertapenem", name: "Ertapenem", className: "Carbapenem", short: "ETP" },
  { id: "ciprofloxacin", name: "Ciprofloxacin", className: "Fluoroquinolone", short: "CIP" },
  { id: "gentamicin", name: "Gentamicin", className: "Aminoglycoside", short: "GEN" },
  { id: "trim_sulfa", name: "Trimethoprim-sulfamethoxazole", className: "Folate pathway inhibitor", short: "SXT" },
  { id: "oxacillin", name: "Oxacillin", className: "Antistaphylococcal penicillin", short: "OXA" },
  { id: "cefoxitin", name: "Cefoxitin screen", className: "Cephamycin / surrogate", short: "FOX" },
  { id: "vancomycin", name: "Vancomycin", className: "Glycopeptide", short: "VAN" },
  { id: "erythromycin", name: "Erythromycin", className: "Macrolide", short: "ERY" },
  { id: "clindamycin", name: "Clindamycin", className: "Lincosamide", short: "CLI" },
  { id: "colistin", name: "Colistin", className: "Polymyxin", short: "CST" },
];


