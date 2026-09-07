// Software availability gate only. Reachability does not establish clinical validity.
export const quinoloneCases = [
  ['CIP R', [['ciprofloxacin', 'R']]],
  ['CIP R + LVX R', [['ciprofloxacin', 'R'], ['levofloxacin', 'R']]],
  ['CIP R + LVX S', [['ciprofloxacin', 'R'], ['levofloxacin', 'S']]],
  ['CIP R + LVX R + MXF R', [['ciprofloxacin', 'R'], ['levofloxacin', 'R'], ['moxifloxacin', 'R']]],
  ['CIP NS', [['ciprofloxacin', 'NS']]],
  ['NAL R', [['nalidixic', 'R']]],
  ['Unknown quinolones', [['ciprofloxacin', 'Unknown'], ['levofloxacin', 'Unknown']]],
  ['Duplicate quinolones', [['ciprofloxacin', 'R'], ['ciprofloxacin', 'R']]],
];
export const pauseExplanation = 'Quinolone mechanism inference is currently unavailable pending scientific review. Quinolone resistance may involve multiple overlapping mechanisms, and the observed AST pattern alone does not establish a specific molecular mechanism.';

// Existing Draft model witnesses, not newly authored scientific rules or validation.
const activeWitnesses = [
  ['esbl-like', 'ecoli', [['ceftriaxone', 'R'], ['meropenem', 'S']]],
  ['ampc-like', 'ecloacae', [['cefoxitin', 'R'], ['ceftriaxone', 'R'], ['meropenem', 'S']]],
  ['carbapenemase-like', 'kpneumo', [['meropenem', 'R'], ['cefepime', 'R']]],
  ['mbl-like', 'ecoli', [['meropenem', 'R'], ['aztreonam', 'S']]],
  ['mrsa-like', 'staph_aureus', [['oxacillin', 'R']]],
  ['vre-like', 'efaecium', [['vancomycin', 'R']]],
  ['mlsb-like', 'staph_aureus', [['erythromycin', 'R'], ['clindamycin', 'R']]],
];

export function inspectPhenotypeAvailability(engine) {
  const signatures = engine.phenotypeSignatures;
  const invalidAvailability = signatures.filter(s => !['active', 'paused-pending-review'].includes(s.availability)).map(s => s.id);
  const active = signatures.filter(s => s.availability === 'active').map(s => ({
    id: s.id, minimumEvidence: s.minimumEvidence,
    maximumPatternEvidence: s.expectedPatterns.reduce((n, p) => n + p.weight, 0),
  }));
  const unreachable = active.filter(s => !Number.isFinite(s.minimumEvidence) || !Number.isFinite(s.maximumPatternEvidence) || s.minimumEvidence > s.maximumPatternEvidence);
  const witnesses = activeWitnesses.map(([id, organism, observations]) => {
    const rows = observations.map(([antimicrobialId, category], i) => ({ id: `synthetic-active-${i}`, antimicrobialId, category, measurement: '' }));
    const candidates = engine.analyzePhenotype(organism, rows).candidates;
    return { id, organism, emitted: candidates.some(c => c.signatureId === id), active: active.some(s => s.id === id) };
  });
  const paused = signatures.filter(s => s.availability === 'paused-pending-review');
  const rule = signatures.find(s => s.id === 'quinolone-like');
  const checks = [];
  for (const signature of paused) for (const organism of signature.organisms) for (const [name, observations] of quinoloneCases) {
    const rows = observations.map(([antimicrobialId, category], i) => ({ id: `synthetic-${i}`, antimicrobialId, category, measurement: '≥4' }));
    const before = JSON.stringify(rows), result = engine.analyzePhenotype(organism, rows);
    const notices = result.abstentions?.filter(item => item.signatureId === signature.id) || [];
    const preAnalysis = engine.getPhenotypeAbstentions(organism, rows).filter(item => item.signatureId === signature.id);
    checks.push({ organism, name, pass: !result.candidates.some(c => c.signatureId === signature.id || c.mechanismId === signature.mechanismId)
      && notices.length === 1 && notices[0].availability === 'paused-pending-review' && notices[0].reviewStatus === 'Draft'
      && notices[0].explanation === pauseExplanation && preAnalysis.length === 1 && preAnalysis[0].explanation === pauseExplanation
      && before === JSON.stringify(rows) });
  }
  const explicitlyPaused = signatures.filter(s => s.id === 'quinolone-like').length === 1
    && paused.length === 1 && rule?.availability === 'paused-pending-review' && rule.reviewStatus === 'Draft'
    && rule.pauseReason === pauseExplanation && rule.organisms.length > 0
    && rule.minimumEvidence === 2 && rule.expectedPatterns.length === 1 && rule.expectedPatterns[0].weight === 1;
  return {
    active: { pass: active.length === 7 && invalidAvailability.length === 0 && unreachable.length === 0 && witnesses.every(w => w.active && w.emitted),
      actual: { active, invalidAvailability, unreachable, witnesses, meaning: 'Active software thresholds are reachable; this is not clinical validation.' } },
    paused: { pass: explicitlyPaused && checks.length > 0 && checks.every(c => c.pass),
      actual: { id: rule?.id, availability: rule?.availability, reviewStatus: rule?.reviewStatus, minimumEvidence: rule?.minimumEvidence,
        maximumPatternEvidence: rule?.expectedPatterns.reduce((n, p) => n + p.weight, 0), explicitlyPaused,
        checkedCases: checks.length, failures: checks.filter(c => !c.pass), meaning: 'SCI-04 is intentionally inactive. PASS verifies safe abstention, not a passing active scientific model.' } },
  };
}
