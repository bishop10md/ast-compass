export type ASTObservationCategory = "S" | "I" | "R" | "SDD" | "NS" | "Unknown";

export type ASTObservationInput = {
  id: string;
  antimicrobialId: string;
  measurement: string;
  category: ASTObservationCategory;
};

type Option = { value: string; label: string };

type Props = {
  rows: ASTObservationInput[];
  options: Option[];
  onChange: (id: string, change: Partial<ASTObservationInput>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  addLabel?: string;
  maxRows?: number;
};

const categories: ASTObservationCategory[] = ["S", "I", "R", "SDD", "NS", "Unknown"];

export default function ASTObservationList({ rows, options, onChange, onAdd, onRemove, addLabel = "+ Add antimicrobial", maxRows = 20 }: Props) {
  const selected = new Set(rows.map((row) => row.antimicrobialId).filter(Boolean));
  const duplicate = rows.some((row, index) => row.antimicrobialId && rows.findIndex((candidate) => candidate.antimicrobialId === row.antimicrobialId) !== index);
  return <div className="ast-observation-list">
    {rows.length === 0 && <div className="ast-observation-empty"><p>Add AST results to compare the observed phenotype with the selected molecular marker.</p></div>}
    {rows.map((row, index) => <fieldset className="ast-observation-row" aria-label={`Antimicrobial result ${index + 1}`} key={row.id}>
      <legend>Antimicrobial result {index + 1}</legend>
      <label>Antimicrobial<select value={row.antimicrobialId} onChange={(event) => onChange(row.id, { antimicrobialId: event.target.value })}><option value="">Select antimicrobial…</option>{options.map((option) => <option value={option.value} disabled={selected.has(option.value) && option.value !== row.antimicrobialId} key={option.value}>{option.label}</option>)}</select></label>
      <label>MIC / zone <small>optional</small><input value={row.measurement} onChange={(event) => onChange(row.id, { measurement: event.target.value })} placeholder="e.g. >2 or ≤0.25" inputMode="decimal"/></label>
      <label>Category <small>required</small><select value={row.category} onChange={(event) => onChange(row.id, { category: event.target.value as ASTObservationCategory })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <button type="button" className="remove-observation" aria-label={`Remove antimicrobial result ${index + 1}`} onClick={() => onRemove(row.id)}>Remove</button>
    </fieldset>)}
    {duplicate && <p className="ast-observation-warning" role="alert">Each antimicrobial may be entered only once.</p>}
    <button type="button" className="secondary add-row" disabled={rows.length >= maxRows} onClick={onAdd}>{rows.length >= maxRows ? `Maximum ${maxRows} results` : addLabel}</button>
  </div>;
}
