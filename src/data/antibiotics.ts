import type { Antibiotic, CanonicalAntimicrobial, SusceptibilityDomain } from "./types";

const a = (id: string, name: string, className: string, short: string, domains: SusceptibilityDomain[] = ["Bacteria"]): Antibiotic => ({ id, name, className, short, domains });

export const antibiotics: Antibiotic[] = [
  a("penicillin", "Penicillin", "Natural penicillin", "PEN"), a("ampicillin", "Ampicillin", "Aminopenicillin", "AMP"), a("amoxicillin", "Amoxicillin", "Aminopenicillin", "AMX"),
  a("amox_clav", "Amoxicillin-clavulanate", "β-lactam/β-lactamase inhibitor", "AMC"), a("amp_sulb", "Ampicillin-sulbactam", "β-lactam/β-lactamase inhibitor", "SAM"), a("pip_tazo", "Piperacillin-tazobactam", "Antipseudomonal penicillin/inhibitor", "TZP"),
  a("oxacillin", "Oxacillin", "Antistaphylococcal penicillin", "OXA"), a("cefoxitin", "Cefoxitin screen", "Cephamycin / surrogate", "FOX"),
  a("cefazolin", "Cefazolin", "First-generation cephalosporin", "CFZ"), a("cefuroxime", "Cefuroxime", "Second-generation cephalosporin", "CXM"), a("cefotaxime", "Cefotaxime", "Third-generation cephalosporin", "CTX"), a("ceftriaxone", "Ceftriaxone", "Third-generation cephalosporin", "CRO"), a("ceftazidime", "Ceftazidime", "Antipseudomonal cephalosporin", "CAZ"), a("cefepime", "Cefepime", "Fourth-generation cephalosporin", "FEP"), a("ceftaroline", "Ceftaroline", "Anti-MRSA cephalosporin", "CPT"),
  a("aztreonam", "Aztreonam", "Monobactam", "ATM"), a("ertapenem", "Ertapenem", "Carbapenem", "ETP"), a("imipenem", "Imipenem", "Carbapenem", "IPM"), a("meropenem", "Meropenem", "Carbapenem", "MEM"), a("doripenem", "Doripenem", "Carbapenem", "DOR"),
  a("caz_avi", "Ceftazidime-avibactam", "Cephalosporin/inhibitor", "CZA"), a("cef_tol_tazo", "Ceftolozane-tazobactam", "Cephalosporin/inhibitor", "C/T"), a("mero_vabor", "Meropenem-vaborbactam", "Carbapenem/inhibitor", "MEV"), a("imi_rel", "Imipenem-cilastatin-relebactam", "Carbapenem/inhibitor", "I-R"), a("cefiderocol", "Cefiderocol", "Siderophore cephalosporin", "FDC"),
  a("amikacin", "Amikacin", "Aminoglycoside", "AMK"), a("gentamicin", "Gentamicin", "Aminoglycoside", "GEN"), a("tobramycin", "Tobramycin", "Aminoglycoside", "TOB"), a("plazomicin", "Plazomicin", "Aminoglycoside", "PLZ"),
  a("ciprofloxacin", "Ciprofloxacin", "Fluoroquinolone", "CIP"), a("levofloxacin", "Levofloxacin", "Fluoroquinolone", "LVX"), a("moxifloxacin", "Moxifloxacin", "Fluoroquinolone", "MXF"), a("nalidixic", "Nalidixic acid", "Quinolone", "NAL"),
  a("trim_sulfa", "Trimethoprim-sulfamethoxazole", "Folate pathway inhibitor", "SXT"), a("trimethoprim", "Trimethoprim", "Folate pathway inhibitor", "TMP"),
  a("tetracycline", "Tetracycline", "Tetracycline", "TET"), a("doxycycline", "Doxycycline", "Tetracycline", "DOX"), a("minocycline", "Minocycline", "Tetracycline", "MIN"), a("tigecycline", "Tigecycline", "Glycylcycline", "TGC"), a("eravacycline", "Eravacycline", "Fluorocycline", "ERV"),
  a("azithromycin", "Azithromycin", "Macrolide", "AZM"), a("clarithromycin", "Clarithromycin", "Macrolide", "CLR", ["Bacteria", "Mycobacteria"]), a("erythromycin", "Erythromycin", "Macrolide", "ERY"), a("clindamycin", "Clindamycin", "Lincosamide", "CLI"),
  a("chloramphenicol", "Chloramphenicol", "Phenicols", "CHL"), a("rifampin", "Rifampin", "Rifamycin", "RIF", ["Bacteria", "Mycobacteria"]), a("fosfomycin", "Fosfomycin", "Phosphonic acid derivative", "FOS"), a("nitrofurantoin", "Nitrofurantoin", "Nitrofuran", "NIT"),
  a("colistin", "Colistin", "Polymyxin", "CST"), a("polymyxin_b", "Polymyxin B", "Polymyxin", "PMB"),
  a("vancomycin", "Vancomycin", "Glycopeptide", "VAN"), a("teicoplanin", "Teicoplanin", "Glycopeptide", "TEC"), a("daptomycin", "Daptomycin", "Lipopeptide", "DAP"), a("linezolid", "Linezolid", "Oxazolidinone", "LZD"), a("tedizolid", "Tedizolid", "Oxazolidinone", "TZD"), a("quinu_dalfo", "Quinupristin-dalfopristin", "Streptogramin", "Q-D"),
  a("metronidazole", "Metronidazole", "Nitroimidazole", "MTZ", ["Anaerobes"]), a("clinda_ana", "Clindamycin (anaerobes)", "Lincosamide", "CLI", ["Anaerobes"]),
  a("fluconazole", "Fluconazole", "Triazole antifungal", "FLC", ["Yeast"]), a("voriconazole", "Voriconazole", "Triazole antifungal", "VOR", ["Yeast", "Filamentous fungi"]), a("posaconazole", "Posaconazole", "Triazole antifungal", "POS", ["Yeast", "Filamentous fungi"]), a("isavuconazole", "Isavuconazole", "Triazole antifungal", "ISA", ["Yeast", "Filamentous fungi"]), a("itraconazole", "Itraconazole", "Triazole antifungal", "ITR", ["Yeast", "Filamentous fungi"]),
  a("anidulafungin", "Anidulafungin", "Echinocandin", "ANI", ["Yeast"]), a("caspofungin", "Caspofungin", "Echinocandin", "CAS", ["Yeast", "Filamentous fungi"]), a("micafungin", "Micafungin", "Echinocandin", "MCF", ["Yeast", "Filamentous fungi"]), a("amphotericin_b", "Amphotericin B", "Polyene antifungal", "AMB", ["Yeast", "Filamentous fungi"]), a("flucytosine", "Flucytosine", "Antimetabolite antifungal", "5FC", ["Yeast"]),
  a("isoniazid", "Isoniazid", "Antimycobacterial", "INH", ["Mycobacteria"]), a("ethambutol", "Ethambutol", "Antimycobacterial", "EMB", ["Mycobacteria"]), a("pyrazinamide", "Pyrazinamide", "Antimycobacterial", "PZA", ["Mycobacteria"]), a("bedaquiline", "Bedaquiline", "Antimycobacterial", "BDQ", ["Mycobacteria"]), a("clofazimine", "Clofazimine", "Antimycobacterial", "CFZ", ["Mycobacteria"]),
];

// Keep the legacy list above unchanged for existing scientific engines and saved IDs.
// New recognition/search interfaces use one canonical object per antimicrobial below.
const additionalAliases: Record<string, string[]> = {
  penicillin: ["Penicillin G", "Benzylpenicillin"],
  amox_clav: ["Amoxicillin/clavulanate", "Amoxicillin and clavulanate", "Amoxicillin-clavulanic acid"],
  amp_sulb: ["Ampicillin/sulbactam", "Ampicillin and sulbactam"],
  pip_tazo: ["Piperacillin/tazobactam", "Piperacillin and tazobactam", "PIP/TAZ"],
  cefoxitin: ["Cefoxitin"],
  cefuroxime: ["Cefuroxime axetil"],
  caz_avi: ["Ceftazidime/avibactam", "Ceftazidime and avibactam", "CAZ/AVI"],
  cef_tol_tazo: ["Ceftolozane/tazobactam", "Ceftolozane and tazobactam", "C/T", "C-T"],
  mero_vabor: ["Meropenem/vaborbactam", "Meropenem and vaborbactam", "MEM/VAB"],
  imi_rel: ["Imipenem/cilastatin/relebactam", "Imipenem-relebactam", "Imipenem and cilastatin and relebactam"],
  trim_sulfa: ["Trimethoprim/sulfamethoxazole", "Trimethoprim and sulfamethoxazole", "TMP/SMX", "TMP-SMX", "Co-trimoxazole", "Cotrimoxazole"],
  rifampin: ["Rifampicin"],
  clindamycin: ["clinda_ana", "Clindamycin (anaerobes)"],
};

const contextNotes: Record<string, string[]> = {
  penicillin: ["Penicillin G/benzylpenicillin naming does not establish route-specific criteria or substitute for oral penicillin V."],
  cefoxitin: ["Cefoxitin screening/surrogate interpretation is organism- and method-specific; recognition of the drug does not authorize use of a surrogate threshold."],
  cefazolin: ["Systemic, urinary, and oral-cephalosporin surrogate contexts must remain distinct; CFZ also occurs as a clofazimine abbreviation in the legacy mycobacterial catalog."],
  cefuroxime: ["Oral cefuroxime axetil and parenteral cefuroxime require route-specific source review; an alias does not make their criteria interchangeable."],
  clindamycin: ["The legacy clinda_ana record remains a compatibility view for the anaerobic domain, not a second canonical drug."],
  clofazimine: ["CFZ is ambiguous without context because it is also used for cefazolin; require an explicit name or a mycobacterial context."],
  fosfomycin: ["Oral and intravenous formulations and organism/specimen restrictions require separate source review."],
  tigecycline: ["Do not assume a CLSI M100 breakpoint solely from catalog inclusion; verify the organism and selected authoritative standard."],
};

/** Alphabetized recognition catalog. No numeric breakpoint or resistance rule is added. */
export const canonicalAntimicrobials: CanonicalAntimicrobial[] = antibiotics
  .filter((drug) => drug.id !== "clinda_ana")
  .map((drug): CanonicalAntimicrobial => ({
    ...drug,
    canonicalId: drug.id,
    displayName: drug.id === "cefoxitin" ? "Cefoxitin" : drug.name,
    abbreviation: drug.short,
    drugClass: drug.className,
    domains: drug.id === "clindamycin" ? ["Bacteria", "Anaerobes"] : [...(drug.domains || ["Bacteria"])],
    aliases: [...new Set([drug.id, drug.name, drug.short, ...(additionalAliases[drug.id] || [])])],
    sourceIds: drug.domains?.some((domain) => domain === "Yeast" || domain === "Filamentous fungi")
      ? [...(drug.domains.includes("Yeast") ? ["ref-clsi-yeast"] : []), ...(drug.domains.includes("Filamentous fungi") ? ["ref-clsi-mold"] : []), "ref-eucast-afst"]
      : ["ref-fda", "ref-eucast"],
    reviewStatus: "Draft",
    breakpointAvailability: "PENDING AUTHORITATIVE SOURCE REVIEW",
    notes: ["Catalog recognition is not a claim of supported clinical interpretation for every organism, method, route, or standard.", ...(contextNotes[drug.id] || [])],
  }))
  .sort((left, right) => left.displayName.localeCompare(right.displayName, "en", { sensitivity: "base" }));

const normalizeAntimicrobialName = (value: string) => value.normalize("NFKC").trim().toLowerCase()
  .replace(/[\u2010-\u2015]/g, "-").replace(/\s*(?:\band\b|\/)\s*/g, "-")
  .replace(/[\s_]+/g, "-").replace(/-+/g, "-");

/** Exact aliases only: never silently convert an unknown drug using fuzzy matching. */
export function findAntimicrobialMatches(query: string, domain?: SusceptibilityDomain): CanonicalAntimicrobial[] {
  const normalized = normalizeAntimicrobialName(query);
  if (!normalized) return [];
  return canonicalAntimicrobials.filter((drug) => (!domain || drug.domains?.includes(domain))
    && [drug.displayName, ...drug.aliases].some((alias) => normalizeAntimicrobialName(alias) === normalized));
}

/** Ambiguous abbreviations (notably CFZ) require an explicit domain or full name. */
export function resolveAntimicrobial(query: string, domain?: SusceptibilityDomain): CanonicalAntimicrobial | undefined {
  const matches = findAntimicrobialMatches(query, domain);
  return matches.length === 1 ? matches[0] : undefined;
}

