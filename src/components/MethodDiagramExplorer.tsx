import { useId, useRef, useState, type ReactNode } from "react";
import type { AstMethodId } from "../data";

type DiagramLabel = {
  label: string;
  explanation: string;
  // Illustration coordinates only: these never enter measurement/interpretation.
  area: [x: number, y: number, width: number, height: number];
};

const labels: Record<AstMethodId, readonly DiagramLabel[]> = {
  DISK_DIFFUSION: [
    { label: "Antimicrobial disk", explanation: "The small circle identifies an antimicrobial disk on the agar surface.", area: [262, 93, 32, 32] },
    { label: "Bacterial lawn", explanation: "The shaded agar surrounding the clear zones represents the bacterial lawn.", area: [188, 133, 36, 30] },
    { label: "Zone of inhibition", explanation: "The clear circular area around the disk represents the zone of inhibited growth.", area: [182, 164, 124, 124] },
    { label: "Zone edge", explanation: "The zone edge marks the boundary between the inhibition zone and the surrounding lawn.", area: [289, 206, 25, 40] },
    { label: "Zone diameter", explanation: "The diameter line extends from one zone edge to the opposite edge through the center of the disk. It shows the full diameter, not the radius.", area: [180, 211, 130, 30] },
    { label: "Measurement in millimeters", explanation: "Disk diffusion reports the inhibition-zone diameter in millimeters (mm), rather than an MIC concentration.", area: [369, 232, 188, 31] },
  ],
  MIC_GRADIENT: [
    { label: "Gradient strip", explanation: "The strip represents a continuous antimicrobial concentration gradient on the agar surface.", area: [206, 54, 38, 222] },
    { label: "Concentration scale", explanation: "The markings identify positions on the strip's antimicrobial concentration scale. This is a conceptual illustration, not a breakpoint table.", area: [210, 76, 28, 190] },
    { label: "Bacterial lawn", explanation: "The shaded agar outside the inhibition ellipse represents the bacterial lawn.", area: [108, 208, 28, 34] },
    { label: "Inhibition ellipse", explanation: "The clear elliptical area represents inhibition around the gradient strip.", area: [116, 40, 218, 160] },
    { label: "MIC read point", explanation: "The marked point illustrates reading the MIC on the concentration scale at the ellipse–strip intersection, following applicable method guidance.", area: [225, 179, 28, 28] },
    { label: "Ellipse/strip intersection", explanation: "The ellipse–strip intersection is the feature used to locate the MIC read point. The diagram is schematic; it does not establish a numeric result or method applicability.", area: [223, 177, 32, 32] },
  ],
  MIC_BROTH: [
    { label: "Antimicrobial dilution series", explanation: "The wells represent a series of antimicrobial concentrations used to compare growth.", area: [42, 90, 422, 100] },
    { label: "Visible growth", explanation: "The first three wells show larger central growth marks in this conceptual example.", area: [43, 91, 202, 62] },
    { label: "No visible growth", explanation: "The later wells illustrate no visible growth. The accompanying labels and growth marks distinguish this state as well as color.", area: [259, 91, 202, 62] },
    { label: "MIC endpoint", explanation: "The arrow identifies the first no-visible-growth concentration in this conceptual series. The applicable method defines the endpoint.", area: [256, 88, 66, 124] },
    { label: "Well/concentration relationship", explanation: "Each well is paired with the concentration label below it. The displayed concentrations are illustrative, not breakpoint values.", area: [256, 88, 66, 100] },
  ],
  MIC_AUTOMATED: [
    { label: "Automated AST platform", explanation: "The heading represents a generic automated AST platform. No specific commercial instrument is depicted.", area: [72, 20, 416, 37] },
    { label: "Test panel/well system", explanation: "The wells are a conceptual representation of an automated test panel. Actual platform designs and available antimicrobial ranges vary.", area: [42, 90, 422, 100] },
    { label: "Generated MIC result", explanation: "The conceptual endpoint identifies the type of result reported as an MIC. A reported MIC alone does not establish reviewed applicability for this method in AST Compass.", area: [48, 209, 464, 34] },
    { label: "Platform-specific limitations", explanation: "Platform ranges, detection and reporting processes, and applicability can differ. Platform-specific applicability remains under expert review.", area: [72, 20, 416, 37] },
  ],
};

export default function MethodDiagramExplorer({ method, children }: { method: AstMethodId; children: ReactNode }) {
  const id = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const controls = useRef<Array<HTMLButtonElement | null>>([]);
  const items = labels[method];
  const active = selected === null ? null : items[selected];
  const dismiss = () => {
    const previous = selected;
    setSelected(null);
    if (previous !== null) controls.current[previous]?.focus();
  };
  return <div className="method-diagram-explorer" onKeyDown={event => {
    if (event.key === "Escape" && selected !== null) { event.preventDefault(); event.stopPropagation(); dismiss(); }
  }}>
    <div className="method-diagram-canvas">
      {children}
      {active && <svg className="method-diagram-highlight" viewBox="0 0 560 330" aria-hidden="true">
        <rect x={active.area[0]} y={active.area[1]} width={active.area[2]} height={active.area[3]} rx="8" fill="none" stroke="#fff" strokeWidth="7"/>
        <rect x={active.area[0]} y={active.area[1]} width={active.area[2]} height={active.area[3]} rx="8" fill="none" stroke="#173f39" strokeWidth="3" strokeDasharray="6 4"/>
        <circle cx={active.area[0] + 12} cy={active.area[1] + 12} r="13" fill="#173f39" stroke="#fff" strokeWidth="2"/>
        <text x={active.area[0] + 12} y={active.area[1] + 17} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">{selected! + 1}</text>
      </svg>}
    </div>
    <p id={`${id}-instructions`} className="method-diagram-instructions">Select a label to highlight the diagram and read its explanation. Use Tab and Enter or Space, click, or tap.</p>
    <div className="method-hotspot-labels" role="group" aria-label="Explore diagram labels" aria-describedby={`${id}-instructions`}>
      {items.map((item, index) => <button className="method-hotspot-button" type="button" key={item.label}
        ref={element => { controls.current[index] = element; }}
        aria-label={item.label} aria-expanded={selected === index} aria-controls={`${id}-detail`}
        onClick={() => setSelected(selected === index ? null : index)}>
        <span aria-hidden="true">{index + 1}</span>{item.label}
      </button>)}
    </div>
    <div id={`${id}-detail`} className="method-hotspot-detail" role="region" aria-label="Diagram explanation" aria-live="polite" hidden={!active}>
      {active && <><div><h3>{active.label}</h3><button type="button" aria-label="Close explanation" onClick={dismiss}>Close <span aria-hidden="true">×</span></button></div><p>{active.explanation}</p></>}
    </div>
  </div>;
}
