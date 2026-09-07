import { canonicalAntimicrobials } from "./antibiotics";
import { organisms } from "./organisms";
import { organismCoverage, organismCoverageSources } from "./organismCoverage";
import { references } from "./references";
import { normalizeSearch, sortAlphabetically, type SearchOption } from "../utils/search";

/** Recognition is not interpretive eligibility. New reference-only taxa stay out. */
export const scientificOrganismOptions: SearchOption[] = sortAlphabetically(organisms, o => o.name).map(o => ({
  value: o.id, label: o.name, description: o.group,
  aliases: organismCoverage.find(entry => entry.existingOrganismId === o.id)?.aliases || o.aliases,
}));

export const antimicrobialIdOptions: SearchOption[] = canonicalAntimicrobials.map(drug => ({
  value: drug.id, label: drug.displayName, aliases: drug.aliases,
  description: `${drug.abbreviation} · ${drug.drugClass}`,
}));

// An OCR alias must identify exactly one canonical drug across the dictionary.
// E.g. CFZ can mean cefazolin or clofazimine; never choose one by array order.
const aliasOwners = new Map<string, Set<string>>();
for (const drug of canonicalAntimicrobials) for (const alias of [drug.displayName, ...drug.aliases]) {
  const key = normalizeSearch(alias);
  const owners = aliasOwners.get(key) || new Set<string>();
  owners.add(drug.id); aliasOwners.set(key, owners);
}
export const imageAntimicrobialOptions: SearchOption[] = canonicalAntimicrobials.map(drug => ({
  value: drug.name, label: drug.displayName, description: drug.drugClass,
  aliases: drug.aliases.filter(alias => aliasOwners.get(normalizeSearch(alias))?.size === 1),
}));

/** These links disclose implementation limits instead of opening a default result. */
export const coverageSearchEntries = [
  ...organismCoverage.map(o => ({ group: "Organisms", title: o.name,
    subtitle: `${o.coverageStatus} · ${o.group}`, aliases: o.aliases,
    path: `/references/coverage?organism=${encodeURIComponent(o.id)}`,
    analyticsKind: "organism" as const, analyticsId: o.id })),
  ...canonicalAntimicrobials.map(a => ({ group: "Antimicrobials", title: a.displayName,
    subtitle: `${a.abbreviation} · ${a.drugClass} · Recognition is not interpretation`, aliases: a.aliases,
    path: `/references/coverage?drug=${encodeURIComponent(a.id)}`,
    analyticsKind: "antimicrobial" as const, analyticsId: a.id })),
];

export function searchCoverage(query: string) {
  const needle = normalizeSearch(query);
  if (!needle) return [];
  const exact = coverageSearchEntries.filter(entry => [entry.title, ...entry.aliases].some(alias => normalizeSearch(alias) === needle));
  return exact.length ? exact : coverageSearchEntries.filter(entry => normalizeSearch([entry.title, entry.subtitle, ...entry.aliases].join(" ")).includes(needle));
}

/** Preserve every citation, adding only missing explicit source-document identities. */
export const coverageReferenceLibrary = [...references, ...Object.values(organismCoverageSources)
  .filter(source => !references.some(reference => reference.id === source.sourceId))
  .map(source => ({ id: source.sourceId, short: `${source.organization} ${source.document}`,
    title: source.document, owner: source.organization, url: source.url,
    note: `${source.editionOrVersion}. ${source.notes} Source scope only; no scientific review status is conferred.` }))];
