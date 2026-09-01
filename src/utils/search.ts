export interface SearchOption {
  value: string;
  label: string;
  aliases?: string[];
  description?: string;
  group?: string;
}

export { normalizeSearch, sortAlphabetically, filterSearchOptions } from "./search-core.mjs";

