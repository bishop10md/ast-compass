import { bcidForecasts } from "./bcidForecasts";
import { breakpoints } from "./breakpoints";
import { organisms } from "./organisms";

export function runDataChecks() {
  const failures: string[] = [];
  const domains = new Set(organisms.flatMap((organism) => organism.domains || []));
  if (!["Bacteria", "Yeast", "Filamentous fungi", "Rapid AST"].every((domain) => domains.has(domain as never))) failures.push("Required breakpoint domains are missing.");
  if (!breakpoints.some((record) => record.availability === "No clinical breakpoint available")) failures.push("No-breakpoint state is not represented.");
  if (!breakpoints.some((record) => record.availability === "ECOFF only")) failures.push("ECOFF-only state is not represented.");
  if (!breakpoints.some((record) => record.standard === "EUCAST" && record.intermediate.includes("susceptible, increased exposure"))) failures.push("EUCAST I wording is missing.");
  if (!bcidForecasts.some((record) => record.organism)) failures.push("Species-specific BCID overrides are missing.");
  if (!bcidForecasts.every((record) => record.antimicrobialClass && record.doesNotTellYou.length && record.sourceIds.length)) failures.push("BCID grouping, limitations, or sources are incomplete.");
  const keys = new Set<string>();
  for (const record of bcidForecasts) {
    const key = `${record.organism || record.organismGroup}|${record.markerLabel}|${record.drugOrClass}`;
    if (keys.has(key)) failures.push(`Duplicate BCID forecast: ${key}`);
    keys.add(key);
  }
  if (failures.length) throw new Error(`AST Compass data checks failed:\n${failures.join("\n")}`);
  return true;
}
