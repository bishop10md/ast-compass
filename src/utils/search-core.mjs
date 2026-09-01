export const normalizeSearch = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const sortAlphabetically = (items, label) => [...items].sort((a, b) => label(a).localeCompare(label(b), undefined, { sensitivity: "base", numeric: true }));
export const filterSearchOptions = (options, query) => {
  const needle = normalizeSearch(query);
  if (!needle) return [...options];
  return options.filter((option) => normalizeSearch([option.label, option.description, ...(option.aliases || [])].filter(Boolean).join(" ")).includes(needle));
};

