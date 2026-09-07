import { organisms } from "./organisms";
import { bcid2Targets } from "./bcid2Panel";
import type { Organism } from "./types";
import { normalizeSearch, sortAlphabetically } from "../utils/search";

export type OrganismCoverageStatus = "SUPPORTED WITH INTERPRETIVE DATA" | "SUPPORTED WITH PARTIAL DATA" | "REFERENCE-ONLY" | "OUT OF CURRENT SCOPE";
export type OrganismStandardSupport = {
  sourceKey: string;
  applicability: "public-scope" | "candidate-review" | "specialist-only";
  note: string;
};
export type OrganismCoverageSource = {
  id: string; organization: string; document: string; editionOrVersion: string;
  url: string; scopeUrl?: string; sourceId: string; notes: string;
};

// This is a source-scope directory, NOT an imported or reviewed breakpoint table.
// Public contents/menu pages establish scope only. Never generate criteria from it.
export const organismCoverageSources: Record<string, OrganismCoverageSource> = {
  "clsi-m100": { id: "clsi-m100", organization: "CLSI", document: "M100", editionOrVersion: "36th Edition (2026)", url: "https://clsi.org/shop/standards/m100/", scopeUrl: "https://cdn.bfldr.com/YLD4EVFU/at/bbjgf97h7277z6r3r6zfqgf/M100Ed36_Sample.pdf", sourceId: "ref-clsi", notes: "Public contents checked 2026-09-06. Organism/group headings do not establish every organism-drug-method-indication combination. No licensed values imported." },
  "clsi-m45": { id: "clsi-m45", organization: "CLSI", document: "M45", editionOrVersion: "3rd Edition", url: "https://clsi.org/shop/standards/m45/", scopeUrl: "https://cdn.bfldr.com/YLD4EVFU/at/btqtmwvntgh75b26jv6tbgf3/m45ed3_sample.pdf", sourceId: "ref-clsi-m45", notes: "Public contents checked 2026-09-06. A separate infrequent/fastidious organism source, not M100. Licensed criteria, applicable corrections, methods, and permissions remain pending qualified review." },
  "eucast-16.1": { id: "eucast-16.1", organization: "EUCAST", document: "Clinical breakpoint tables", editionOrVersion: "v16.1 (2026-06-24)", url: "https://www.eucast.org/bacteria/clinical-breakpoints-and-interpretation/clinical-breakpoint-tables/", scopeUrl: "https://www.eucast.org/fileadmin/eucast/pdf/breakpoints/v_16.1_Breakpoint_Tables.pdf", sourceId: "ref-eucast-161", notes: "Public organism scope checked 2026-09-06. Some headings provide no-breakpoint guidance, not numerical breakpoints. No criteria imported in this expansion." },
  "clsi-m11": { id: "clsi-m11", organization: "CLSI", document: "M11", editionOrVersion: "9th Edition (2018; reaffirmed 2025)", url: "https://clsi.org/shop/standards/m11/", sourceId: "ref-clsi-m11", notes: "Anaerobic AST methods; interpretive tables are sourced separately from M100. Method restrictions are not interchangeable with aerobic criteria." },
  "clsi-m24": { id: "clsi-m24", organization: "CLSI", document: "M24", editionOrVersion: "3rd Edition (2018)", url: "https://clsi.org/shop/standards/m24/", sourceId: "ref-clsi-m24", notes: "Specialist mycobacteria/aerobic actinomycete methods. Current supplemental criteria require separate source selection and review; no M100 or M45 substitution." },
  "bcid-panel": { id: "bcid-panel", organization: "bioMérieux / BioFire Diagnostics", document: "BIOFIRE BCID2 panel menu", editionOrVersion: "Public panel menu accessed 2026-09-06; local IFU revision must be selected", url: "https://www.biomerieux.com/corp/en/our-offer/clinical-products/biofire-blood-culture-identification-2-panel.html", sourceId: "ref-bcid2-ifu", notes: "Identification/marker scope only, never breakpoint authority. Existing 26 bacterial targets and 10 AMR targets are unchanged; yeast remains excluded from resistance forecast." },
  "clsi-yeast": { id: "clsi-yeast", organization: "CLSI", document: "M27M44S", editionOrVersion: "4th Edition (inherited catalog metadata)", url: "https://clsi.org/shop/standards/m27m44s/", sourceId: "ref-clsi-yeast", notes: "Existing fungal domain remains outside this bacterial expansion. Its source applicability and licensed criteria were not re-reviewed here." },
  "clsi-mold": { id: "clsi-mold", organization: "CLSI", document: "M38M51S", editionOrVersion: "4th Edition (inherited catalog metadata)", url: "https://clsi.org/shop/standards/m38m51s/", sourceId: "ref-clsi-mold", notes: "Existing fungal domain remains outside this bacterial expansion. Its source applicability and licensed criteria were not re-reviewed here." },
};

export type OrganismCoverageEntry = {
  id: string; name: string; aliases: string[]; group: string; gram: Organism["gram"];
  existingOrganismId?: string;
  coverageStatus: OrganismCoverageStatus;
  reviewStatus: "Draft";
  breakpointAvailability: "PENDING AUTHORITATIVE SOURCE REVIEW" | "OUT OF CURRENT EXPANSION SCOPE";
  authoritativeInterpretationAvailable: false;
  standardSupport: OrganismStandardSupport[];
  sourceIds: string[]; relevance: string[]; bcidTargetId?: string; note: string;
};

const standard = (sourceKey: string, note: string, applicability: OrganismStandardSupport["applicability"] = "public-scope"): OrganismStandardSupport => ({ sourceKey, note, applicability });
const m100 = (note: string) => standard("clsi-m100", note);
const m45 = (note: string) => standard("clsi-m45", note);
const eucast = (note: string, applicability: OrganismStandardSupport["applicability"] = "public-scope") => standard("eucast-16.1", note, applicability);
const pendingNote = "Source listing is not implemented breakpoint coverage. PENDING AUTHORITATIVE SOURCE REVIEW. No organism-drug interpretation is enabled by this directory.";
const sourceIdsFor = (support: OrganismStandardSupport[]) => [...new Set(support.map(item => organismCoverageSources[item.sourceKey].sourceId))];

const m45Existing: Record<string, string> = {
  aeromonas: "Aeromonas groups appear in M45 Table 3.",
  vibrio: "Vibrio appears in M45 Table 20.",
  pasteurella: "Pasteurella appears in M45 Table 17; species/method restrictions still require review.",
  moraxella: "Moraxella catarrhalis appears in M45 Table 16.",
  campylobacter: "Campylobacter jejuni/coli appears in M45 Table 5.",
  helicobacter: "Helicobacter pylori appears in M45 Table 10.",
  aerococcus: "Aerococcus appears in M45 Table 2.",
  corynebacterium: "Corynebacterium and related genera appear in M45 Table 6.",
  listeria: "Listeria monocytogenes appears in M45 Table 14.",
  bacillus: "Bacillus excluding B. anthracis and selected related genera appear in M45 Table 4.",
};

function existingStandards(item: Organism): OrganismStandardSupport[] {
  if (item.gram === "fungal") return [standard(item.domains?.includes("Yeast") ? "clsi-yeast" : "clsi-mold", "Separate fungal standards apply; outside this bacterial expansion.", "specialist-only")];
  if (item.gram === "acid-fast") return [standard("clsi-m24", "Mycobacterial-specific methods and supplemental criteria require separate review.", "specialist-only"), ...(item.id === "mtb" ? [eucast("EUCAST contains an M. tuberculosis section; it does not establish coverage of all mycobacteria.", "specialist-only")] : [])];
  if (item.domains?.includes("Anaerobes")) return [m100("M100 has anaerobic interpretive tables; exact organism and method scope remains pending."), standard("clsi-m11", "Anaerobic reference methods remain separate from aerobic testing."), eucast("EUCAST anaerobic criteria are species/group-specific; broad genus labels must not imply coverage of every member.", "candidate-review")];
  if (item.id === "haemophilus") return [m100("H. influenzae and H. parainfluenzae are in M100, despite the Fastidious UI domain."), eucast("Public EUCAST heading is H. influenzae. Do not assume this covers the entire combined H. influenzae/parainfluenzae record.", "candidate-review")];
  if (item.id === "ngonorrhoeae" || item.id === "nmeningitidis") return [m100("This Neisseria species has its own M100 section; it is not automatically M45 because it is fastidious."), eucast("A species-specific Neisseria section is present; agent/method/indication review remains pending.")];
  if (item.id === "burkholderia") return [m100("The public M100 contents list B. cepacia complex MIC criteria; no licensed values are bundled."), eucast("EUCAST v16.1 explicitly provides no numerical breakpoints for B. cepacia complex and points to its guidance document.")];
  if (item.id === "achromobacter") return [eucast("A. xylosoxidans has a specific EUCAST section."), standard("clsi-m100", "Potential Other Non-Enterobacterales context requires species-level licensed-source review; do not substitute P. aeruginosa criteria.", "candidate-review")];
  if (m45Existing[item.id]) return [m45(m45Existing[item.id]), eucast(item.id === "aerococcus" ? "EUCAST names A. urinae and A. sanguinicola, not all Aerococcus species." : item.id === "corynebacterium" ? "EUCAST separates C. diphtheriae/ulcerans from other Corynebacterium; exact scope requires review." : "An organism/group section exists; exact species, antimicrobial, method and exclusions remain pending.", ["aerococcus", "corynebacterium"].includes(item.id) ? "candidate-review" : "public-scope")];
  return [m100(item.group === "Enterobacterales" ? "M100 distinguishes Enterobacterales from Salmonella/Shigella tables; a taxonomic group is not permission to apply all group criteria." : "The organism/group is represented in public M100 contents; pair-level rules and exclusions remain pending."), eucast("The organism/group is represented in EUCAST contents; agent-specific and species-specific restrictions remain pending.")];
}

const matchingBcidTarget = (name: string) => bcid2Targets.find(target => target.category !== "Yeast" && normalizeSearch(target.name) === normalizeSearch(name));

// Read-only companion records: the original scientific organism list is untouched.
const existingCoverage: OrganismCoverageEntry[] = organisms.map(item => {
  const outOfScope = item.gram === "fungal" || item.gram === "acid-fast";
  const support = existingStandards(item);
  const panelTarget = matchingBcidTarget(item.name);
  if (panelTarget) support.push(standard("bcid-panel", "Exact existing bacterial panel target; identification scope does not establish a resistance phenotype."));
  return {
    id: item.id, existingOrganismId: item.id, name: item.name, aliases: [...item.aliases], group: item.group, gram: item.gram,
    coverageStatus: outOfScope ? "OUT OF CURRENT SCOPE" : "SUPPORTED WITH PARTIAL DATA",
    reviewStatus: "Draft", breakpointAvailability: outOfScope ? "OUT OF CURRENT EXPANSION SCOPE" : "PENDING AUTHORITATIVE SOURCE REVIEW",
    authoritativeInterpretationAvailable: false, standardSupport: support, sourceIds: sourceIdsFor(support), bcidTargetId: panelTarget?.id,
    relevance: outOfScope ? ["Existing specialist-domain architecture; preserved, not expanded."] : ["Existing Draft phenotype reasoning includes a generic quinolone signature; species-specific coverage is not comprehensive.", ...(panelTarget ? ["Exact identification target in the existing bacterial BCID scope."] : [])],
    note: outOfScope ? "Outside this bacterial coverage expansion. Existing architecture is retained without new scientific claims." : "Partial educational support only. Existing generated breakpoint thresholds are simulated, not authoritative interpretive data. " + pendingNote,
  };
});

type NewCoverageSeed = Pick<OrganismCoverageEntry, "id" | "name" | "aliases" | "group" | "gram" | "standardSupport" | "relevance"> & { bcidTargetId?: string; note?: string };
const newEntry = (seed: NewCoverageSeed): OrganismCoverageEntry => ({ ...seed, coverageStatus: "REFERENCE-ONLY", reviewStatus: "Draft", breakpointAvailability: "PENDING AUTHORITATIVE SOURCE REVIEW", authoritativeInterpretationAvailable: false, sourceIds: sourceIdsFor(seed.standardSupport), note: [seed.note, pendingNote].filter(Boolean).join(" ") });

const panelExtraAliases: Record<string, string[]> = {
  "acb-complex": ["A. calcoaceticus-baumannii complex", "ACB complex"],
  "b-fragilis": ["B. fragilis"],
  "k-pneumoniae-group": ["K. pneumoniae group"],
  "h-influenzae": ["H. influenzae"],
  "s-epidermidis": ["S. epidermidis"],
  "s-agalactiae": ["S. agalactiae", "Group B Streptococcus"],
  "s-pyogenes": ["S. pyogenes", "Group A Streptococcus"],
};
const panelAdditions: OrganismCoverageEntry[] = bcid2Targets.filter(target => target.category !== "Yeast" && !existingCoverage.some(item => normalizeSearch(item.name) === normalizeSearch(target.name))).map(target => {
  const support = [standard("bcid-panel", "Existing manufacturer panel target, newly indexed in the coverage directory only; no panel behavior changes.")];
  support.push(standard("clsi-m100", "Relevant bacterial group or species is a candidate for source review; an assay group name is not automatically a breakpoint organism definition.", "candidate-review"));
  support.push(eucast("Verify exact species/group applicability independently of the panel identification label.", "candidate-review"));
  return newEntry({ id: `coverage-bcid-${target.id}`, name: target.name, aliases: [...new Set([...target.aliases, ...(panelExtraAliases[target.id] || [])])], group: "BCID identification scope", gram: target.category === "Gram-positive bacteria" ? "positive" : "negative", standardSupport: support, bcidTargetId: target.id, relevance: ["Exact named target in the existing bacterial BCID panel; source-linked identification scope."], note: "Species, genus, complex and group targets remain distinct. This record is not an alias for a narrower organism and does not enable general AST inference." });
});

const m45Addition = (id: string, name: string, gram: "positive" | "negative", table: number, aliases: string[] = [], extraSupport: OrganismStandardSupport[] = []): OrganismCoverageEntry => newEntry({ id: `coverage-${id}`, name, gram, aliases, group: "Infrequent / fastidious bacteria", standardSupport: [m45(`Named organism/genus scope in public M45 Table ${table} contents; licensed criteria are not imported.`), ...extraSupport], relevance: [`M45 Table ${table} source-scope education for infrequently isolated or fastidious bacteria.`] });
const anaerobeAddition = (id: string, name: string, gram: "positive" | "negative", aliases: string[] = []): OrganismCoverageEntry => newEntry({ id: `coverage-${id}`, name, gram, aliases, group: "Anaerobic bacteria", standardSupport: [eucast("Named anaerobic organism/genus section in EUCAST v16.1; no numerical values imported."), standard("clsi-m11", "Anaerobic methods source; exact criteria remain separately governed."), standard("clsi-m100", "Potential anaerobic-table context requires licensed pair-level review.", "candidate-review")], relevance: ["Named anaerobic scope in EUCAST v16.1, retained separately from broad existing genus/group entries."] });

export const referenceOnlyOrganisms: OrganismCoverageEntry[] = sortAlphabetically([
  ...panelAdditions,
  m45Addition("abiotrophia", "Abiotrophia spp.", "positive", 1),
  m45Addition("granulicatella", "Granulicatella spp.", "positive", 1),
  m45Addition("erysipelothrix", "Erysipelothrix rhusiopathiae", "positive", 7, ["E. rhusiopathiae"]),
  m45Addition("gemella", "Gemella spp.", "positive", 8),
  m45Addition("aggregatibacter", "Aggregatibacter spp.", "negative", 9),
  m45Addition("cardiobacterium", "Cardiobacterium spp.", "negative", 9),
  m45Addition("eikenella", "Eikenella corrodens", "negative", 9, ["E. corrodens"]),
  m45Addition("kingella", "Kingella kingae", "negative", 9, ["K. kingae"], [eucast("Named Kingella kingae section; do not extend it to every Kingella species.")]),
  newEntry({ id: "coverage-lactobacillus", name: "Lactobacillus spp.", gram: "positive", aliases: [], group: "Infrequent / fastidious bacteria", standardSupport: [m45("M45 Table 11 lists the historical Lactobacillus grouping; modern genus reassignments require taxonomy and table-scope review.")], relevance: ["M45 Table 11 source-scope education; explicitly preserves the historical grouping rather than assigning it to all renamed genera."] }),
  m45Addition("lactococcus", "Lactococcus spp.", "positive", 12),
  m45Addition("leuconostoc", "Leuconostoc spp.", "positive", 13),
  m45Addition("micrococcus", "Micrococcus spp.", "positive", 15),
  m45Addition("pediococcus", "Pediococcus spp.", "positive", 18),
  m45Addition("rothia", "Rothia mucilaginosa", "positive", 19, ["R. mucilaginosa", "Stomatococcus mucilaginosus"]),
  anaerobeAddition("f-nucleatum", "Fusobacterium nucleatum", "negative", ["F. nucleatum"]),
  anaerobeAddition("f-necrophorum", "Fusobacterium necrophorum", "negative", ["F. necrophorum"]),
  anaerobeAddition("c-perfringens", "Clostridium perfringens", "positive", ["C. perfringens"]),
  anaerobeAddition("c-septicum", "Clostridium septicum", "positive", ["C. septicum"]),
  anaerobeAddition("c-innocuum", "Clostridium innocuum", "positive", ["Erysipelatoclostridium innocuum"]),
  anaerobeAddition("c-acnes", "Cutibacterium acnes", "positive", ["C. acnes", "Propionibacterium acnes"]),
  anaerobeAddition("parvimonas", "Parvimonas micra", "positive", ["P. micra", "Peptostreptococcus micros"]),
  anaerobeAddition("finegoldia", "Finegoldia spp.", "positive"),
  newEntry({ id: "coverage-enterococcus", name: "Enterococcus spp.", gram: "positive", aliases: ["Enterococci"], group: "Enterococcus spp.", standardSupport: [m100("Named Enterococcus genus section; species-specific exclusions require review."), eucast("Named Enterococcus genus section; species-specific exclusions require review.")], relevance: ["Genus-level source scope helps distinguish unidentified enterococci from the existing E. faecalis/E. faecium entries."], note: "Genus-level recognition is not equivalent to E. faecalis or E. faecium and does not authorize species-specific rules." }),
], item => item.name);

export const organismCoverage: OrganismCoverageEntry[] = sortAlphabetically([...existingCoverage, ...referenceOnlyOrganisms], item => item.name);

/** Exact canonical names win over overlapping legacy aliases; never fuzzy-map a group to a species. */
export function findOrganismCoverage(query: string): OrganismCoverageEntry | undefined {
  const normalized = normalizeSearch(query);
  if (!normalized) return undefined;
  return organismCoverage.find(item => item.id === query || normalizeSearch(item.name) === normalized)
    || organismCoverage.find(item => item.aliases.some(alias => normalizeSearch(alias) === normalized));
}

export function getOrganismStandardMessage(id: string, sourceKey: string): string {
  const item = organismCoverage.find(entry => entry.id === id);
  const support = item?.standardSupport.find(entry => entry.sourceKey === sourceKey);
  const boundary = "AST Compass does not currently provide breakpoint interpretation for this organism under the selected standard.";
  return `${boundary} ${support ? `${support.note} ` : ""}${item?.breakpointAvailability || "PENDING AUTHORITATIVE SOURCE REVIEW"}.`;
}

export const organismCoverageSummary = {
  originalCount: existingCoverage.length,
  originalBacterialCount: existingCoverage.filter(item => item.gram === "positive" || item.gram === "negative").length,
  originalAcidFastCount: existingCoverage.filter(item => item.gram === "acid-fast").length,
  originalFungalCount: existingCoverage.filter(item => item.gram === "fungal").length,
  addedReferenceOnlyCount: referenceOnlyOrganisms.length,
  partialCount: organismCoverage.filter(item => item.coverageStatus === "SUPPORTED WITH PARTIAL DATA").length,
  outOfScopeCount: organismCoverage.filter(item => item.coverageStatus === "OUT OF CURRENT SCOPE").length,
  authoritativeInterpretiveCount: organismCoverage.filter(item => item.authoritativeInterpretationAvailable).length,
};
