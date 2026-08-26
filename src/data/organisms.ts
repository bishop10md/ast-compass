import type { Organism } from "./types";

export const organisms: Organism[] = [
  { id: "enterobacterales", name: "Enterobacterales", group: "Enterobacterales", gram: "negative", aliases: ["Enterics"] },
  { id: "ecoli", name: "Escherichia coli", group: "Enterobacterales", gram: "negative", aliases: ["E. coli"] },
  { id: "kpneumo", name: "Klebsiella pneumoniae", group: "Enterobacterales", gram: "negative", aliases: ["K. pneumoniae"] },
  { id: "eaerogenes", name: "Klebsiella aerogenes", group: "Enterobacterales", gram: "negative", aliases: ["Enterobacter aerogenes"] },
  { id: "pseudomonas", name: "Pseudomonas aeruginosa", group: "Non-fermenting Gram-negative bacilli", gram: "negative", aliases: ["P. aeruginosa"] },
  { id: "acinetobacter", name: "Acinetobacter baumannii complex", group: "Non-fermenting Gram-negative bacilli", gram: "negative", aliases: ["A. baumannii complex"] },
  { id: "stenotrophomonas", name: "Stenotrophomonas maltophilia", group: "Non-fermenting Gram-negative bacilli", gram: "negative", aliases: ["S. maltophilia"] },
  { id: "staph_aureus", name: "Staphylococcus aureus", group: "Staphylococcus spp.", gram: "positive", aliases: ["S. aureus", "MRSA", "MSSA"] },
  { id: "cons", name: "Coagulase-negative Staphylococcus", group: "Staphylococcus spp.", gram: "positive", aliases: ["CoNS"] },
  { id: "efaecalis", name: "Enterococcus faecalis", group: "Enterococcus spp.", gram: "positive", aliases: ["E. faecalis"] },
  { id: "efaecium", name: "Enterococcus faecium", group: "Enterococcus spp.", gram: "positive", aliases: ["E. faecium"] },
  { id: "spneumo", name: "Streptococcus pneumoniae", group: "Streptococcus spp.", gram: "positive", aliases: ["S. pneumoniae"] },
  { id: "bhs", name: "Beta-hemolytic streptococci", group: "Streptococcus spp.", gram: "positive", aliases: ["BHS"] },
  { id: "vgs", name: "Viridans group streptococci", group: "Streptococcus spp.", gram: "positive", aliases: ["VGS"] },
];


