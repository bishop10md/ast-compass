export interface EducationalTopicSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface EducationalTopic {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  eyebrow: string;
  aliases: string[];
  summary: string;
  keyPoint: string;
  sections: EducationalTopicSection[];
  sourceIds: string[];
  related: string[];
}

export const educationalTopics: EducationalTopic[] = [
  {
    slug: "kpc-resistance-mechanism",
    title: "KPC resistance mechanism",
    shortTitle: "KPC resistance",
    description: "Learn how KPC carbapenemases affect beta-lactam expectations, why the phenotype can vary, and why phenotypic AST remains essential.",
    eyebrow: "Carbapenemase learning guide",
    aliases: ["KPC", "blaKPC", "serine carbapenemase", "carbapenem resistance"],
    summary: "KPC enzymes are serine carbapenemases that can hydrolyze carbapenems and many other beta-lactams. The detected marker establishes a molecular finding, not a complete susceptibility profile.",
    keyPoint: "Use KPC detection to form a pre-AST expectation, then verify the observed phenotype using the laboratory's current method, standard, and policy.",
    sections: [
      { heading: "What KPC means", paragraphs: ["KPC refers to a family of Klebsiella pneumoniae carbapenemases encoded by blaKPC genes. Although first recognized in Klebsiella, these enzymes occur across Enterobacterales and may be encountered in other Gram-negative organisms.", "KPC is a serine beta-lactamase. Detection supports a carbapenemase mechanism and an expectation of broad beta-lactam impact, but it does not provide MIC values or categorical AST results."] },
      { heading: "Why the phenotype can vary", paragraphs: ["Allele, expression, inoculum, organism background, permeability, efflux, and additional enzymes can change the measured phenotype. A molecular result therefore should not be converted automatically into a complete antimicrobial report."], bullets: ["Confirm the organism associated with the marker.", "Review the actual MIC or zone and the current organism-specific criteria.", "Investigate unexpected molecular–phenotypic combinations under laboratory policy."] },
      { heading: "Enzyme family and genetic context", paragraphs: ["KPC enzymes belong to Ambler class A and use an active-site serine to hydrolyze beta-lactams. blaKPC is frequently carried on mobile genetic elements, which helps explain its movement among strains and species; the name of the enzyme does not restrict it to K. pneumoniae.", "Variant-level changes can alter substrate or inhibitor profiles. A family-level molecular result may therefore be less specific than sequence-level characterization, and local epidemiology can change which variants are most likely."], bullets: ["Separate enzyme class from organism identity.", "Distinguish a family-level detection from a characterized allele.", "Do not extrapolate a local epidemiologic pattern to an individual isolate."] },
      { heading: "A structured laboratory review", paragraphs: ["When KPC is detected, review culture purity and identification, assay target definition, raw AST endpoints, QC acceptability, breakpoint version, and any unusual pattern before releasing or escalating the result under local policy.", "Carbapenem nonsusceptibility can also arise through combinations such as beta-lactamase production plus permeability defects. Conversely, unusual KPC variants and testing limitations can complicate a simple phenotype-based screen."], bullets: ["Identity and purity", "Marker target and allele resolution", "MIC or zone endpoint and method", "Current interpretive criteria and footnotes", "Need for a validated confirmatory or public-health workflow"] },
      { heading: "What cannot be inferred", paragraphs: ["KPC detection alone cannot establish susceptibility to every antimicrobial, select therapy, or replace standardized AST. AST Compass presents the relationship for education and structured review only."] },
    ],
    sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-idsa", "ref-bcid2", "ref-kpc-structure", "ref-genotype-phenotype"],
    related: ["bcid-resistance-markers", "gene-phenotype-discordance", "mic-breakpoint-interpretation"],
  },
  {
    slug: "ctx-m-expected-phenotype",
    title: "CTX-M and the expected phenotype",
    shortTitle: "CTX-M phenotype",
    description: "Connect CTX-M detection with the ESBL mechanism, expected beta-lactam effects, phenotype variability, and confirmation by AST.",
    eyebrow: "ESBL learning guide",
    aliases: ["CTX-M", "blaCTX-M", "ESBL", "extended-spectrum beta-lactamase"],
    summary: "CTX-M enzymes are extended-spectrum beta-lactamases commonly associated with reduced susceptibility to expanded-spectrum cephalosporins. The exact observed pattern depends on the enzyme, host, expression, and co-mechanisms.",
    keyPoint: "A CTX-M result supports an ESBL expectation, but categorical interpretation must come from the applicable phenotypic result and current standard.",
    sections: [
      { heading: "From marker to mechanism", paragraphs: ["Detection of a blaCTX-M-family target supports production of a CTX-M-type ESBL. The result helps explain a beta-lactam resistance pattern, but family-level detection may not identify every allele or accompanying mechanism."] },
      { heading: "Expected laboratory pattern", paragraphs: ["Reduced susceptibility to one or more expanded-spectrum cephalosporins is a characteristic expectation. The full pattern is not fixed: beta-lactamase expression, porin changes, other enzymes, and testing conditions can alter individual MICs or zones."], bullets: ["Keep the detected target and organism linked.", "Review results drug by drug rather than inferring an entire panel.", "Apply the current standard's reporting rules and laboratory policy."] },
      { heading: "Why CTX-M groups are not identical", paragraphs: ["CTX-M is a diverse enzyme family derived from chromosomal beta-lactamases of Kluyvera species and disseminated through mobile genetic elements. Different CTX-M groups and alleles can have different catalytic behavior; the family name is not a promise that every cephalosporin result will look the same.", "Cefotaxime hydrolysis is characteristic of the family, while activity against other oxyimino-cephalosporins varies. Mutations, expression level, inoculum, permeability, and additional beta-lactamases can reshape the profile."] },
      { heading: "Reading an apparently discordant panel", paragraphs: ["First confirm that the marker belongs to the recovered organism. Then review the actual MICs or zones, method, QC, current criteria, and relevant reporting rules. A narrow or unexpected pattern should trigger review, not an automatic edit based solely on the gene."], bullets: ["Check organism and marker association.", "Retain individual antimicrobial results.", "Consider co-produced AmpC or carbapenemases and permeability changes.", "Use confirmatory testing only within a validated laboratory workflow."] },
      { heading: "Important boundary", paragraphs: ["Phenotypic AST cannot by itself prove that CTX-M is present, and CTX-M detection does not independently determine a treatment choice. Use both results in their proper roles."] },
    ],
    sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-idsa", "ref-ctxm-review", "ref-kpc-structure", "ref-genotype-phenotype"],
    related: ["gene-phenotype-discordance", "mic-breakpoint-interpretation", "bcid-resistance-markers"],
  },
  {
    slug: "meca-pbp2a-interpretation",
    title: "mecA and PBP2a interpretation",
    shortTitle: "mecA / PBP2a",
    description: "Understand how mecA and PBP2a relate to methicillin resistance in staphylococci and where organism- and method-specific rules matter.",
    eyebrow: "Staphylococcal resistance guide",
    aliases: ["mecA", "PBP2a", "MRSA", "methicillin resistance", "oxacillin", "cefoxitin"],
    summary: "mecA encodes the altered penicillin-binding protein PBP2a. In the appropriate staphylococcal context, its detection supports a methicillin-resistance mechanism with implications for beta-lactam interpretation.",
    keyPoint: "Interpret mecA or PBP2a only with the identified organism, assay scope, validated method, and current organism-specific reporting rules.",
    sections: [
      { heading: "Marker and protein", paragraphs: ["mecA is a molecular determinant; PBP2a is the altered target protein it encodes. Molecular assays, antigen tests, and phenotypic surrogate tests examine related but different parts of the same resistance question."] },
      { heading: "Organism context matters", paragraphs: ["Staphylococcal reporting rules are organism-group specific. A marker detected in a mixed blood-culture result may also require careful organism–marker attribution before a conclusion is assigned."], bullets: ["Confirm species or reporting group.", "Confirm what the molecular or PBP2a assay detects.", "Use the correct oxacillin or cefoxitin method and interpretive criteria.", "Resolve unexpected discordance under the laboratory's validated procedure."] },
      { heading: "Why surrogate testing is used", paragraphs: ["Cefoxitin can act as a useful phenotypic inducer and surrogate for mecA-mediated resistance in defined staphylococcal groups, but the applicable disk or MIC rule depends on the organism and standard. Oxacillin, cefoxitin, mecA PCR, and PBP2a testing are related measurements—not interchangeable raw results.", "Atypical or slow-growing isolates illustrate why method validation matters: performance documented for typical isolates and media cannot automatically be assumed in a different testing context."] },
      { heading: "Discordance checkpoints", paragraphs: ["For a mecA-positive but phenotypically susceptible result, confirm identification, purity, gene target, raw endpoint, incubation, medium, induction conditions where applicable, and breakpoint application. For a resistant phenotype without mecA detection, review assay coverage—including whether mecC is detected—and consider alternative mechanisms or technical causes."], bullets: ["Do not call a gene absent when it is merely outside assay scope.", "Do not assign a mixed-sample marker without support.", "Escalate unusual results using current laboratory and public-health guidance."] },
      { heading: "Do not overextend the result", paragraphs: ["A mecA/PBP2a finding does not describe every resistance mechanism in the isolate and should not be used as a stand-alone patient-specific treatment recommendation."] },
    ],
    sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-bcid2", "ref-bcid2-ifu", "ref-meca-mecc", "ref-meca-testing", "ref-genotype-phenotype"],
    related: ["bcid-resistance-markers", "gene-phenotype-discordance", "mic-breakpoint-interpretation"],
  },
  {
    slug: "vana-versus-vanb",
    title: "vanA versus vanB",
    shortTitle: "vanA vs vanB",
    description: "Compare vanA and vanB target-alteration mechanisms, classic phenotype expectations, and the limits of molecular prediction.",
    eyebrow: "Enterococcal resistance guide",
    aliases: ["vanA", "vanB", "VRE", "vancomycin resistance", "Enterococcus"],
    summary: "vanA and vanB gene clusters alter the glycopeptide target. They have different classic phenotype associations, but expression, organism context, and assay coverage can produce results that require confirmation.",
    keyPoint: "The genotype helps frame an expectation; the measured phenotype and current organism-specific rules determine the reported susceptibility category.",
    sections: [
      { heading: "Shared mechanism", paragraphs: ["Both vanA- and vanB-type resistance involves remodeling the cell-wall precursor so glycopeptides bind less effectively. The molecular families are related, but they are not interchangeable labels."] },
      { heading: "Classic distinction", paragraphs: ["vanA is classically associated with acquired resistance affecting vancomycin and often teicoplanin, whereas vanB is classically associated with variable vancomycin resistance and retained teicoplanin activity. Actual measured results can depart from these simplified teaching patterns."], bullets: ["Confirm the Enterococcus species and culture context.", "Review assay targets and limitations.", "Confirm vancomycin results phenotypically.", "Investigate unexpected genotype–phenotype combinations."] },
      { heading: "How target alteration works", paragraphs: ["Van gene clusters encode a coordinated pathway that replaces the usual terminal D-Ala-D-Ala target with a lower-affinity precursor. Regulatory components sense an inducing signal and activate resistance-gene expression; accessory enzymes suppress production of the usual target.", "The operon and its regulation matter. A detected ligase target is highly informative, but gene-cluster variation, expression, and regulatory disruption can influence the measured phenotype."] },
      { heading: "Species and ecology", paragraphs: ["Acquired vanA and vanB are most prominent in E. faecium and E. faecalis, but intrinsic glycopeptide-resistance systems occur in other enterococcal species. Species identification therefore helps distinguish acquired marker expectations from an intrinsic background.", "vanB-related sequences can also occur in non-enterococcal gut organisms. The specimen, culture isolate, and organism–marker association must remain clear before a molecular result is attributed."] },
      { heading: "Reviewing unexpected results", paragraphs: ["Variable vancomycin resistance with vanB and occasional genotype–phenotype incongruence are documented. Review growth, endpoint reading, method performance, breakpoint application, assay scope, culture purity, and the possibility of uncommon or altered van elements before assigning an explanation."], bullets: ["Confirm Enterococcus identification.", "Compare molecular target with isolate-level AST.", "Do not use the classic teicoplanin pattern as an absolute rule.", "Follow validated confirmation and infection-prevention procedures."] },
      { heading: "Negative is not susceptible", paragraphs: ["A negative vanA/vanB panel result means the tested targets were not detected. It does not exclude every glycopeptide-resistance mechanism or establish phenotypic susceptibility."] },
    ],
    sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-bcid2", "ref-bcid2-ifu", "ref-van-review", "ref-vanb-study", "ref-vanb-anaerobes", "ref-genotype-phenotype"],
    related: ["bcid-resistance-markers", "gene-phenotype-discordance", "mic-breakpoint-interpretation"],
  },
  {
    slug: "bcid-resistance-markers",
    title: "Understanding BCID resistance markers",
    shortTitle: "BCID markers",
    description: "Learn what a BCID resistance-marker result can support before AST is complete—and what it cannot establish.",
    eyebrow: "Rapid diagnostic learning guide",
    aliases: ["BCID", "blood culture identification", "AMR marker", "rapid molecular panel", "KPC", "CTX-M", "mecA", "vanA/B"],
    summary: "BCID panels report selected organisms and antimicrobial-resistance targets directly from positive blood culture material. These early signals can support a provisional phenotype expectation while conventional identification and AST are pending.",
    keyPoint: "Detected does not mean a complete phenotype, and not detected does not mean susceptible. Preserve the panel scope, organism association, and pre-AST status.",
    sections: [
      { heading: "What the panel reports", paragraphs: ["A multiplex panel detects only the organisms and resistance targets included in its design. Target naming, combinations, attribution rules, and limitations must be taken from the current manufacturer instructions for the local system and market."] },
      { heading: "Analytical performance is target-specific", paragraphs: ["Published multicenter studies and meta-analyses evaluate positive and negative agreement against culture, sequencing, PCR, and reference susceptibility methods. Aggregate performance is useful for understanding the platform, but it does not replace target-specific limitations or adjudication of an individual result.", "Off-panel organisms and off-panel resistance mechanisms remain possible. Mixed cultures, low abundance, sequence variation, and the comparator method can affect apparent agreement."] },
      { heading: "A safe reasoning sequence", paragraphs: ["Begin with every reported organism and marker. Assess whether each organism–marker pairing is compatible, identify the supported mechanism, form a conservative anticipated phenotype, and then compare that expectation with phenotypic AST when available."], bullets: ["Detected organism(s) and detected marker(s)", "Organism–marker compatibility", "Resistance mechanism", "Anticipated phenotype", "Phenotypic AST confirmation"] },
      { heading: "Multiplex attribution", paragraphs: ["When more than one organism is detected, a resistance marker may not be attributable to a single organism without additional evidence. AST Compass keeps this uncertainty visible rather than forcing a pairing."], bullets: ["Do not infer susceptibility from a negative marker result.", "Do not infer MICs from marker detection.", "Do not use the forecast as patient-specific treatment guidance."] },
      { heading: "From bottle result to isolate result", paragraphs: ["A positive-bottle molecular result and isolate-level AST answer different questions at different times. Reconcile the panel result with Gram stain, subculture, final identification, culture purity, and each recovered isolate's AST.", "When the final culture differs from the rapid result, review the complete workflow—including possible mixed growth, nonviable nucleic acid, off-panel organisms, and test limitations—according to the manufacturer instructions and laboratory procedure."], bullets: ["Record the exact panel version and target wording.", "Preserve preliminary versus final status.", "Document how a marker was attributed in a polymicrobial result.", "Use final culture and AST to close the loop."] },
    ],
    sourceIds: ["ref-mcm13", "ref-cmph5", "ref-bcid2", "ref-bcid2-ifu", "ref-clsi", "ref-bcid-meta", "ref-bcid-multicenter", "ref-genotype-phenotype"],
    related: ["kpc-resistance-mechanism", "ctx-m-expected-phenotype", "gene-phenotype-discordance"],
  },
  {
    slug: "gene-phenotype-discordance",
    title: "Investigating gene–phenotype discordance",
    shortTitle: "Gene–phenotype discordance",
    description: "Use a structured laboratory checklist when a molecular resistance marker and the observed AST phenotype do not agree.",
    eyebrow: "Concordance learning guide",
    aliases: ["discordance", "concordance", "genotype phenotype", "unexpected susceptibility", "unexpected resistance"],
    summary: "Discordance is a signal to investigate, not a reason to force one result to match the other. Identity, association, assay scope, expression, AST method, and reporting context can all contribute.",
    keyPoint: "Confirm the specimen-to-result chain and both test systems before proposing a biological explanation.",
    sections: [
      { heading: "Start with identity and association", paragraphs: ["Confirm organism identification, purity, specimen context, and whether the molecular marker can be assigned to the organism whose phenotype is being reviewed. This is especially important in polymicrobial material."] },
      { heading: "Define the disagreement precisely", paragraphs: ["Write the discrepancy as two separate observations before interpreting it—for example, a named marker was detected by a specified assay, while a particular isolate produced a measured MIC or zone interpreted with a named standard and version.", "Avoid vague labels such as 'the gene and AST do not match.' A drug-specific discrepancy, an organism-attribution problem, a category change caused by an updated breakpoint, and a true mechanism-expression question require different investigations."] },
      { heading: "Review both measurements", paragraphs: ["For molecular testing, review target coverage, allele resolution, controls, and instrument flags. For AST, review inoculum, medium, incubation, endpoint, method suitability, QC, raw values, and the exact breakpoint standard and version."], bullets: ["Confirm identity and purity.", "Verify organism–marker linkage.", "Review assay coverage and limitations.", "Review raw MIC or zone data and QC.", "Apply current organism-, method-, and site-specific criteria.", "Repeat or confirm according to laboratory policy."] },
      { heading: "Then consider biology", paragraphs: ["Expression, regulatory changes, permeability, efflux, heteroresistance, mixed populations, additional enzymes, and uncommon variants can help explain a real discrepancy. These explanations remain hypotheses until supported by appropriate testing."] },
      { heading: "Classify the likely source", paragraphs: ["A useful investigation groups possibilities without prematurely choosing one."], bullets: ["Pre-analytic: specimen, bottle, labeling, contamination, mixed population, or isolate selection.", "Analytic—molecular: off-panel determinant, target variation, detection limit, control failure, or attribution uncertainty.", "Analytic—phenotypic: inoculum, medium, incubation, endpoint, QC, method limitation, or instrument flag.", "Post-analytic: transcription, mapping, breakpoint version, expert-rule application, or preliminary/final status.", "Biological: altered expression, additional mechanisms, permeability, efflux, heteroresistance, or uncommon variants."] },
      { heading: "Close and document the investigation", paragraphs: ["Record the original results, repeat or confirmatory methods, breakpoint source, communications, resolution, and any effect on previously released information. Follow local escalation pathways and public-health requirements where applicable.", "Sometimes the correct conclusion is that the available data cannot resolve the discrepancy. A documented unresolved result is safer than a confident but unsupported mechanism claim."] },
    ],
    sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-eucast", "ref-bcid2-ifu", "ref-genotype-phenotype", "ref-breakpoint-revisions"],
    related: ["bcid-resistance-markers", "mic-breakpoint-interpretation", "kpc-resistance-mechanism"],
  },
  {
    slug: "mic-breakpoint-interpretation",
    title: "MIC and breakpoint interpretation",
    shortTitle: "MIC interpretation",
    description: "Learn the difference between an MIC measurement and an interpretive category, and why standard, version, method, organism, and context must remain attached.",
    eyebrow: "AST fundamentals guide",
    aliases: ["MIC", "minimum inhibitory concentration", "breakpoint", "susceptible", "intermediate", "SDD", "resistant"],
    summary: "An MIC is a measured endpoint produced under defined test conditions. A breakpoint maps that value to a category only for the applicable organism, antimicrobial, method, standard, version, and any relevant site or exposure conditions.",
    keyPoint: "Never treat an MIC as self-interpreting and never detach a category from the criteria used to assign it.",
    sections: [
      { heading: "Measurement before category", paragraphs: ["The minimum inhibitory concentration is the lowest tested concentration that inhibits visible growth under the specified method. It is not itself a susceptibility category and does not independently select therapy."] },
      { heading: "How an MIC is generated", paragraphs: ["Reference broth microdilution tests serial antimicrobial concentrations under standardized conditions. Commercial systems may use abbreviated concentration ranges or proprietary formats validated against reference methods. Because tested concentrations usually progress in doubling dilutions, the reportable endpoint has discrete—not unlimited—precision.", "Organism preparation, inoculum, medium composition, antimicrobial stability, incubation atmosphere and duration, and endpoint reading can all affect the measured value. Quality control asks whether the test system performed acceptably; it does not validate a patient isolate by itself."] },
      { heading: "Context required for interpretation", paragraphs: ["A defensible interpretation preserves the organism or reporting group, antimicrobial, method, units, standard, edition or version, effective date, applicable site or dosing context, footnotes, and source."], bullets: ["Confirm organism and antimicrobial.", "Confirm MIC versus disk or another validated method.", "Use the current applicable standard and version.", "Read footnotes, site restrictions, and exposure definitions.", "Retain the numeric value with the categorical result."] },
      { heading: "How clinical breakpoints are built", paragraphs: ["Breakpoint-setting bodies integrate microbiological distributions, resistance mechanisms, pharmacokinetic/pharmacodynamic exposure, dosing regimens, clinical outcome evidence, test-method performance, and expert review. A breakpoint is therefore more than a convenient numerical divider.", "Breakpoints can be revised as evidence, dosing, indications, or methods change. Laboratories must determine which criteria their testing system applies and manage implementation through validation or verification, LIS configuration, reporting rules, and staff education."] },
      { heading: "Standards use distinct language", paragraphs: ["CLSI and EUCAST categories and definitions should not be collapsed into a single vocabulary. For example, EUCAST I means susceptible, increased exposure, while CLSI intermediate and susceptible-dose dependent have their own definitions and applications."] },
      { heading: "MICs near a breakpoint", paragraphs: ["Results near a categorical boundary deserve respect for normal method variability. A one-dilution change can alter a category without representing a comparably abrupt biological change.", "Do not average unrelated methods, manufacture precision beyond the tested dilution range, or reinterpret a value using a different organism or method table. If a result is unexpected or consequential, follow the laboratory's validated repeat, confirmation, and reporting procedure."], bullets: ["Preserve operators such as ≤, >, or ≥.", "Do not substitute disk criteria for MIC criteria.", "Do not substitute routine breakpoints for dedicated rapid-AST criteria.", "Distinguish a clinical breakpoint from an epidemiological cutoff value."] },
    ],
    sourceIds: ["ref-mcm13", "ref-cmph5", "ref-clsi", "ref-eucast", "ref-fda", "ref-clsi-bit", "ref-breakpoint-primer", "ref-breakpoint-revisions"],
    related: ["gene-phenotype-discordance", "kpc-resistance-mechanism", "ctx-m-expected-phenotype"],
  },
];

export const educationalTopicBySlug = (slug: string) => educationalTopics.find((topic) => topic.slug === slug);
