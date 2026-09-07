const SATISFACTION_RESPONSES = new Set(["yes", "not_quite"]);

/**
 * Return a catalog identifier only when it exactly matches a known AST Compass
 * record. Free text, labels, aliases, and partially matching values are rejected.
 */
export function knownCatalogId(value, knownIds) {
  if (typeof value !== "string" || !Array.isArray(knownIds)) return null;
  return knownIds.includes(value) ? value : null;
}

/** Satisfaction is deliberately limited to the two aggregate response buckets. */
export function knownSatisfactionResponse(value) {
  return typeof value === "string" && SATISFACTION_RESPONSES.has(value) ? value : null;
}

/** Workflow names must be selected from an explicit caller-owned allowlist. */
export function knownWorkflowId(value, knownWorkflows) {
  return knownCatalogId(value, knownWorkflows);
}
