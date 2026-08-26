export const organisms=[{id:'ecoli',name:'Escherichia coli',group:'Enterobacterales'},{id:'kpn',name:'Klebsiella pneumoniae',group:'Enterobacterales'},{id:'paer',name:'Pseudomonas aeruginosa',group:'Non-fermenter'},{id:'saureus',name:'Staphylococcus aureus',group:'Staphylococci'}]
export const antibiotics=[{id:'cip',name:'Ciprofloxacin',className:'Fluoroquinolone'},{id:'ctx',name:'Cefotaxime',className:'3rd-generation cephalosporin'},{id:'mem',name:'Meropenem',className:'Carbapenem'},{id:'oxa',name:'Oxacillin',className:'Penicillinase-stable penicillin'}]
export const mechanisms=[{id:'esbl',title:'Extended-spectrum beta-lactamase',family:'Enzymatic drug inactivation'},{id:'carbapenemase',title:'Carbapenemase production',family:'Enzymatic drug inactivation'},{id:'target',title:'Target alteration',family:'Target modification'}]
export const genes=[
{id:'ctxm',symbol:'blaCTX-M',mechanismId:'esbl',expected:['Reduced susceptibility to many expanded-spectrum cephalosporins','Aztreonam activity may be affected'],caveat:'Expression, enzyme variant, organism, and co-mechanisms influence phenotype.'},
{id:'kpc',symbol:'blaKPC',mechanismId:'carbapenemase',expected:['Reduced susceptibility to carbapenems','Broad beta-lactam resistance may occur'],caveat:'Phenotype varies with expression, porin changes, and the agent tested.'},
{id:'meca',symbol:'mecA',mechanismId:'target',expected:['Resistance to oxacillin/cefoxitin surrogate interpretation','Most beta-lactams expected inactive for S. aureus'],caveat:'Apply organism- and method-specific authoritative rules.'},
{id:'vana',symbol:'vanA',mechanismId:'target',expected:['High-level vancomycin resistance is commonly expected','Teicoplanin resistance may occur'],caveat:'Genotype does not replace phenotypic testing.'}]
export const breakpoints=[
{id:'d1',organismId:'ecoli',antibioticId:'cip',s:'≤ 0.25',i:'0.5',r:'≥ 1'},
{id:'d2',organismId:'ecoli',antibioticId:'ctx',s:'≤ 1',i:'2',r:'≥ 4'},
{id:'d3',organismId:'kpn',antibioticId:'mem',s:'≤ 1',i:'2',r:'≥ 4'},
{id:'d4',organismId:'saureus',antibioticId:'oxa',s:'≤ 2',i:'—',r:'≥ 4'}]

