import { useState } from "react";
import { trackSatisfaction, type SatisfactionWorkflow } from "../lib/productAnalytics";

export default function SatisfactionPrompt({ workflow, onNavigate }: { workflow: SatisfactionWorkflow; onNavigate?: (path: string) => void }) {
  const [response, setResponse] = useState<"yes" | "not_quite" | null>(null);
  const href = `/feedback?${new URLSearchParams({ category: response === "not_quite" ? "Usability" : "General feedback", source: location.pathname }).toString()}`;
  const answer = (next: "yes" | "not_quite") => { trackSatisfaction(workflow, next); setResponse(next); };
  return <aside className="feedback-prompt" aria-label="Optional satisfaction question">
    <div><span>{response ? "Thank you for the feedback." : "Was this useful?"}</span>{!response && <small>Optional · aggregate response only</small>}</div>
    {!response && <div className="satisfaction-actions"><button type="button" onClick={() => answer("yes")}>Yes</button><button type="button" onClick={() => answer("not_quite")}>Not quite</button></div>}
    <a href={href} onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate(href); } : undefined}>{response === "not_quite" ? "Tell us what could improve →" : "Tell us more →"}</a>
  </aside>;
}
