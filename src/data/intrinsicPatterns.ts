import type { IntrinsicPattern } from "./types";

export const intrinsicPatterns: IntrinsicPattern[] = [
  { id: "ip1", organismId: "stenotrophomonas", antibioticId: "meropenem", expectation: "Expected resistant", rationale: "Intrinsic β-lactamases and permeability factors make carbapenem activity unreliable.", sourceIds: ["ref-clsi"] },
  { id: "ip2", organismId: "efaecalis", antibioticId: "ceftazidime", expectation: "Expected resistant", rationale: "Enterococci are intrinsically resistant to cephalosporins.", sourceIds: ["ref-clsi"] },
  { id: "ip3", organismId: "pseudomonas", antibioticId: "ertapenem", expectation: "Expected resistant", rationale: "Ertapenem lacks reliable activity against P. aeruginosa.", sourceIds: ["ref-clsi"] },
  { id: "ip4", organismId: "kpneumo", antibioticId: "ampicillin", expectation: "Expected resistant", rationale: "A chromosomal penicillinase commonly confers intrinsic ampicillin resistance.", sourceIds: ["ref-clsi"] },
  { id: "ip5", organismId: "staph_aureus", antibioticId: "vancomycin", expectation: "Expected susceptible", rationale: "Reduced vancomycin susceptibility is unusual and should trigger careful confirmation.", sourceIds: ["ref-clsi", "ref-cdc"] },
  { id: "ip6", organismId: "acinetobacter", antibioticId: "ceftriaxone", expectation: "Variable / context dependent", rationale: "Species, acquired mechanisms, and local epidemiology strongly affect activity.", sourceIds: ["ref-clsi"] },
];


