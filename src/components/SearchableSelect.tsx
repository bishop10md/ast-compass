import { Fragment, useEffect, useId, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { filterSearchOptions, type SearchOption } from "../utils/search";

interface SearchableSelectProps {
  label: string;
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function SearchableSelect({ label, options, value, onChange, placeholder = "Search…", required }: SearchableSelectProps) {
  const id = useId();
  const sorted = useMemo(() => [...options].sort((a, b) => (a.group || "").localeCompare(b.group || "", undefined, { sensitivity: "base" }) || a.label.localeCompare(b.label, undefined, { sensitivity: "base" })), [options]);
  const selected = sorted.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label || "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => { if (!open) setQuery(selected?.label || ""); }, [open, selected?.label, value]);
  const matches = useMemo(() => filterSearchOptions(sorted, query === selected?.label ? "" : query).slice(0, 60), [query, selected?.label, sorted]);

  const choose = (option: SearchOption) => {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
    setActive(0);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); if (!open) { setOpen(true); setActive(0); } else setActive((current) => Math.min(current + 1, matches.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((current) => Math.max(current - 1, 0)); }
    if (event.key === "Home" && open) { event.preventDefault(); setActive(0); }
    if (event.key === "End" && open) { event.preventDefault(); setActive(Math.max(matches.length - 1, 0)); }
    if (event.key === "Enter" && open && matches[active]) { event.preventDefault(); choose(matches[active]); }
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); setQuery(selected?.label || ""); }
  };
  return <label className="searchable-label" htmlFor={`${id}-input`}>{label}{required && <span className="required-mark"> required</span>}
    <div className="searchable-select">
      <input id={`${id}-input`} role="combobox" aria-expanded={open} aria-controls={`${id}-listbox`} aria-autocomplete="list" aria-activedescendant={open && matches[active] ? `${id}-${active}` : undefined} value={query} placeholder={placeholder} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); if (!event.target.value) onChange(""); }} onKeyDown={onKeyDown}/>
      {query && <button type="button" aria-label={`Clear ${label}`} onClick={() => { setQuery(""); onChange(""); setOpen(true); }}>×</button>}
      {open && <ul id={`${id}-listbox`} role="listbox">
        {matches.map((option, index) => <Fragment key={option.value}>{option.group && (index === 0 || matches[index - 1]?.group !== option.group) && <li className="option-group" role="presentation">{option.group}</li>}<li id={`${id}-${index}`} role="option" aria-selected={option.value === value} className={index === active ? "active" : ""} onMouseDown={(event) => { event.preventDefault(); choose(option); }}><b>{option.label}</b>{option.description && <span>{option.description}</span>}</li></Fragment>)}
        {!matches.length && <li className="no-result" role="status">No matching option</li>}
      </ul>}
    </div>
  </label>;
}

