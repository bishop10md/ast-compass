export function parseMeasurement(raw) {
  const match = raw.match(/(<=|>=|<|>|=|≤|≥)?\s*(\d+(?:\.\d+)?)/);
  if (!match) return {};
  const operator = match[1]?.replace("≤", "<=").replace("≥", ">=");
  return { operator, value: Number(match[2]) };
}

