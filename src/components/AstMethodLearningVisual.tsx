import type { AstMethodId } from "../data";
import { astMethodDefinition } from "../features/breakpointMethods";
import MethodDiagramExplorer from "./MethodDiagramExplorer";

function DiskDiffusionDiagram() {
  return <svg className="ast-method-diagram" viewBox="0 0 560 330" role="img" aria-labelledby="disk-diagram-title disk-diagram-desc">
    <title id="disk-diagram-title">Educational disk diffusion zone-diameter diagram</title>
    <desc id="disk-diagram-desc">A stylized agar plate with antimicrobial disks, circular inhibition zones, and a line measuring one complete zone diameter in millimeters through the center of its disk.</desc>
    <circle cx="225" cy="165" r="137" fill="#f2d8a5" stroke="#173f39" strokeWidth="5"/>
    <circle cx="225" cy="165" r="126" fill="#e6c47f" stroke="#fff7df" strokeWidth="2"/>
    <g fill="none" stroke="#fff9ea" strokeWidth="2" opacity=".45">
      <path d="M115 92c52 28 85-12 131 14s78 2 101-12"/><path d="M102 205c39-25 73-3 111 17s84 12 132-18"/><path d="M130 260c54-20 111 20 173-4"/>
    </g>
    <g>
      <circle cx="151" cy="117" r="48" fill="#f8fbf7" fillOpacity=".88" stroke="#6b9f91" strokeWidth="2"/>
      <circle cx="151" cy="117" r="12" fill="#fff" stroke="#173f39" strokeWidth="3"/>
      <circle cx="278" cy="109" r="38" fill="#f8fbf7" fillOpacity=".85" stroke="#6b9f91" strokeWidth="2"/>
      <circle cx="278" cy="109" r="12" fill="#fff" stroke="#173f39" strokeWidth="3"/>
      <circle cx="244" cy="226" r="59" fill="#f8fbf7" fillOpacity=".9" stroke="#176b5b" strokeWidth="3"/>
      <circle cx="244" cy="226" r="12" fill="#fff" stroke="#173f39" strokeWidth="3"/>
    </g>
    <g stroke="#b64b46" strokeWidth="4" fill="none" strokeLinecap="round">
      <path d="M185 226h118"/><path d="M185 217v18M303 217v18"/>
    </g>
    <g fill="#173234" fontFamily="system-ui, sans-serif">
      <text x="372" y="90" fontSize="18" fontWeight="700">Antimicrobial disk</text>
      <path d="M365 96L290 111" stroke="#173234" strokeWidth="2"/>
      <text x="372" y="158" fontSize="18" fontWeight="700">Inhibition zone</text>
      <path d="M365 164L300 188" stroke="#173234" strokeWidth="2"/>
      <text x="372" y="226" fontSize="18" fontWeight="700">Zone diameter</text>
      <text x="372" y="251" fontSize="17">measured in mm</text>
      <path d="M365 232L307 226" stroke="#b64b46" strokeWidth="2"/>
    </g>
  </svg>;
}

function GradientDiffusionDiagram() {
  return <svg className="ast-method-diagram" viewBox="0 0 560 330" role="img" aria-labelledby="gradient-diagram-title gradient-diagram-desc">
    <title id="gradient-diagram-title">Educational gradient diffusion MIC diagram</title>
    <desc id="gradient-diagram-desc">A stylized agar plate with a concentration-gradient strip, an elliptical inhibition area, and a marked read point where the ellipse edge intersects the strip scale.</desc>
    <circle cx="225" cy="165" r="137" fill="#f2d8a5" stroke="#173f39" strokeWidth="5"/>
    <circle cx="225" cy="165" r="126" fill="#e6c47f" stroke="#fff7df" strokeWidth="2"/>
    <path d="M225 45C166 45 120 72 120 115C120 155 158 186 211 193L239 193C292 186 330 155 330 115C330 72 284 45 225 45Z" fill="#f8fbf7" fillOpacity=".9" stroke="#176b5b" strokeWidth="3"/>
    <rect x="211" y="59" width="28" height="212" rx="6" fill="#fff" stroke="#173f39" strokeWidth="3"/>
    <g stroke="#647778" strokeWidth="1">
      <path d="M211 82h11M211 104h8M211 126h11M211 148h8M211 170h11M211 192h8M211 214h11M211 236h8M211 258h11"/>
    </g>
    <g fill="#526666" fontFamily="system-ui, sans-serif" fontSize="8">
      <text x="224" y="85">32</text><text x="224" y="129">8</text><text x="224" y="173">2</text><text x="224" y="217">.5</text><text x="224" y="261">.12</text>
    </g>
    <circle cx="239" cy="193" r="7" fill="#b64b46"/>
    <g fill="#173234" fontFamily="system-ui, sans-serif">
      <text x="370" y="88" fontSize="18" fontWeight="700">Gradient strip</text>
      <path d="M363 94L242 105" stroke="#173234" strokeWidth="2"/>
      <text x="370" y="158" fontSize="18" fontWeight="700">Inhibition ellipse</text>
      <path d="M363 164L307 151" stroke="#173234" strokeWidth="2"/>
      <text x="370" y="226" fontSize="18" fontWeight="700">MIC read point</text>
      <text x="370" y="251" fontSize="16">ellipse–scale intersection</text>
      <path d="M363 231L247 195" stroke="#b64b46" strokeWidth="2"/>
    </g>
  </svg>;
}

function MicMethodDiagram({ automated }: { automated: boolean }) {
  return <svg className="ast-method-diagram" viewBox="0 0 560 330" role="img" aria-labelledby="mic-diagram-title mic-diagram-desc">
    <title id="mic-diagram-title">Educational MIC result diagram</title>
    <desc id="mic-diagram-desc">A conceptual dilution series changes from visible growth to no visible growth, with the first no-growth well identified as the minimum inhibitory concentration.</desc>
    <g transform="translate(42 90)">
      {[0,1,2,3,4,5].map(index => <g key={index} transform={`translate(${index * 72} 0)`}><circle cx="31" cy="31" r="28" fill={index < 3 ? "#d59a64" : "#f8fbf7"} stroke="#173f39" strokeWidth="3"/><circle cx="31" cy="31" r={index < 3 ? 13 : 3} fill={index < 3 ? "#875b3d" : "#bcd7ce"} opacity=".75"/><text x="31" y="83" textAnchor="middle" fill="#526666" fontFamily="system-ui, sans-serif" fontSize="13">{["0.12","0.25","0.5","1","2","4"][index]}</text></g>)}
      <path d="M247 118V72" stroke="#b64b46" strokeWidth="3"/><path d="M239 80l8-9 8 9" fill="none" stroke="#b64b46" strokeWidth="3"/>
      <text x="247" y="142" textAnchor="middle" fill="#173234" fontFamily="system-ui, sans-serif" fontSize="17" fontWeight="700">First no-visible-growth concentration = MIC</text>
    </g>
    <text x="280" y="45" textAnchor="middle" fill="#173234" fontFamily="system-ui, sans-serif" fontSize="20" fontWeight="700">{automated ? "Automated platform reports an MIC" : "Conceptual broth dilution series"}</text>
    <text x="280" y="300" textAnchor="middle" fill="#647778" fontFamily="system-ui, sans-serif" fontSize="14">Concentrations shown are illustrative—not breakpoint values.</text>
  </svg>;
}

const steps: Record<AstMethodId, string[]> = {
  MIC_BROTH: [
    "The organism is exposed to a dilution series of the antimicrobial under a standardized reference method.",
    "Growth is compared across concentrations.",
    "The MIC is the lowest tested concentration that meets the method's endpoint definition, reported here as µg/mL.",
  ],
  MIC_AUTOMATED: [
    "A validated automated susceptibility platform evaluates the organism across its available antimicrobial range.",
    "The platform applies its instrument-specific detection and reporting process.",
    "The reported result is an MIC in µg/mL; platform limits and local validated procedures still apply.",
  ],
  MIC_GRADIENT: [
    "A strip containing a continuous antimicrobial gradient is placed on an inoculated agar surface.",
    "An inhibition ellipse forms around the strip after growth.",
    "The MIC is read where the ellipse edge intersects the strip scale, following applicable method guidance.",
  ],
  DISK_DIFFUSION: [
    "Antimicrobial disks are placed on an inoculated agar surface using a standardized method.",
    "Drug diffusion may produce a visible zone of inhibited growth around a disk.",
    "The complete inhibition-zone diameter is measured through the disk center in millimeters and compared only with a method-specific zone criterion.",
  ],
};

export default function AstMethodLearningVisual({ method }: { method: AstMethodId }) {
  const definition = astMethodDefinition(method);
  return <section className="method-learning" aria-labelledby="method-learning-title">
    <header><div><p className="eyebrow">Method learning visual</p><h2 id="method-learning-title">How this AST method works</h2><p>{definition.label} produces a <strong>{definition.measurementType}</strong> result reported in <strong>{definition.unit}</strong>.</p></div><span>Educational overview · not clinical instructions</span></header>
    <div className="method-learning-layout"><figure><MethodDiagramExplorer key={method} method={method}>{method === "DISK_DIFFUSION" ? <DiskDiffusionDiagram/> : method === "MIC_GRADIENT" ? <GradientDiffusionDiagram/> : <MicMethodDiagram automated={method === "MIC_AUTOMATED"}/>}</MethodDiagramExplorer><figcaption>Original AST Compass educational diagram. Consult the current standard, manufacturer instructions where applicable, and validated laboratory procedure.</figcaption></figure><ol>{steps[method].map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol></div>
  </section>;
}
