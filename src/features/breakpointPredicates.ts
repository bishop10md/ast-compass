import type { Breakpoint, Standard } from "../data/types";

export type Comparison = "<" | "≤" | ">" | "≥" | "=";
export type Criterion = { operator: Comparison; value: number; text: string };
export type LoadedBreakpointScale = {
  method: "MIC" | "Disk";
  susceptible: Criterion;
  intermediate: Criterion | null;
  resistant: Criterion;
  unit: string;
  origin: "Loaded demo record";
  note: string;
};
export type TeachingInterpretation = { category: string; tone: string; explanation: string };

// Only annotations already present in the illustrative I records are supported.
// Unrecognized prose/criteria fail closed instead of extracting an arbitrary number.
export function parseCriterion(text: string, intermediate = false): Criterion | null {
  const cleaned = intermediate ? text.replace(/\s*\((?:SDD example|I = susceptible, increased exposure)\)\s*$/, "") : text;
  const match = cleaned.trim().match(/^(<=|>=|≤|≥|<|>|=)?\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const value = Number(match[2]);
  if (!Number.isFinite(value)) return null;
  return { operator: (match[1] === "<=" ? "≤" : match[1] === ">=" ? "≥" : match[1] || "=") as Comparison, value, text };
}

export function matchesCriterion(criterion: Criterion, value: number): boolean {
  switch (criterion.operator) {
    case "<": return value < criterion.value;
    case "≤": return value <= criterion.value;
    case ">": return value > criterion.value;
    case "≥": return value >= criterion.value;
    case "=": return value === criterion.value;
  }
}

function overlaps(a: Criterion, b: Criterion): boolean {
  // Piecewise predicates can change only at their boundaries. Check boundaries,
  // the interior interval, and both tails; these are not new breakpoint values.
  const lo = Math.min(a.value, b.value), hi = Math.max(a.value, b.value);
  return [lo, hi, (lo + hi) / 2, Math.max(0, lo - 1), hi + 1].some(value => matchesCriterion(a, value) && matchesCriterion(b, value));
}

export function loadedBreakpointScale(record: Breakpoint): LoadedBreakpointScale | null {
  if (record.availability && record.availability !== "Clinical breakpoint available") return null;
  if (record.method !== "MIC" && record.method !== "Disk") return null;
  if (record.method === "Disk" ? record.unit !== "mm" : !["µg/mL", "mg/L"].includes(record.unit)) return null;
  const susceptible = parseCriterion(record.susceptible), resistant = parseCriterion(record.resistant);
  const noIntermediate = record.intermediate.trim() === "—";
  const intermediate = noIntermediate ? null : parseCriterion(record.intermediate, true);
  if (!susceptible || !resistant || (!noIntermediate && !intermediate)) return null;
  // Refuse unsupported method polarity; never repair or invert a source record.
  const lower = ["<", "≤"], upper = [">", "≥"];
  if (!(record.method === "MIC" ? lower : upper).includes(susceptible.operator) || !(record.method === "MIC" ? upper : lower).includes(resistant.operator)) return null;
  if (overlaps(susceptible, resistant) || intermediate && (overlaps(susceptible, intermediate) || overlaps(intermediate, resistant))) return null;
  return { method: record.method, susceptible, intermediate, resistant, unit: record.unit, origin: "Loaded demo record", note: record.footnote };
}

export function matchingBreakpointRecords(records: readonly Breakpoint[], standard: Standard, organismId?: string, antibioticId?: string) {
  return records.filter(record => record.standard === standard && record.organismId === organismId && record.antibioticId === antibioticId);
}

function evaluateLoaded(scale: LoadedBreakpointScale, input: string, standard: Standard, label: string): TeachingInterpretation | null {
  if (!/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(input.trim())) return null;
  const value = Number(input);
  if (!Number.isFinite(value)) return null;
  if (scale.method === "Disk" && !Number.isInteger(value)) return { category: "Cannot infer", tone: "int", explanation: "Enter a whole zone diameter in mm; no rounding or intermediate category is inferred." };
  const bands = [
    { criterion: scale.susceptible, category: "Susceptible", tone: "sus" },
    { criterion: scale.intermediate, category: standard === "EUCAST" ? "Susceptible, increased exposure (I)" : "Intermediate / SDD", tone: "int" },
    { criterion: scale.resistant, category: "Resistant", tone: "res" },
  ].filter(band => band.criterion && matchesCriterion(band.criterion, value));
  if (bands.length !== 1) return { category: "Cannot infer", tone: "int", explanation: bands.length ? "The loaded criteria overlap at this value. Source review is required; no category is selected." : "This value does not match an explicit category in the loaded record. No intermediate category or boundary is inferred." };
  const band = bands[0];
  return { category: band.category, tone: band.tone, explanation: `${label} (${value} ${scale.unit}) matches the loaded illustrative criterion ${band.criterion!.text}. This is not clinical validation.` };
}

export function interpretLoadedMic(scale: LoadedBreakpointScale, input: string, standard: Standard) {
  return scale.method === "MIC" ? evaluateLoaded(scale, input, standard, "The entered MIC") : null;
}

export function interpretDiskZone(scale: LoadedBreakpointScale, input: string, standard: Standard) {
  return scale.method === "Disk" ? evaluateLoaded(scale, input, standard, "The entered zone diameter") : null;
}
