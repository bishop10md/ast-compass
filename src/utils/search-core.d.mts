export interface CoreSearchOption { value: string; label: string; aliases?: string[]; description?: string; group?: string }
export function normalizeSearch(value: string): string;
export function sortAlphabetically<T>(items: readonly T[], label: (item: T) => string): T[];
export function filterSearchOptions<T extends CoreSearchOption>(options: readonly T[], query: string): T[];

