import { useState } from "react";
import { learningModules, references } from "../data";

export default function LearningCenter() {
  const [activeId, setActiveId] = useState(learningModules[0].id);
  const [choice, setChoice] = useState<number | null>(null);
  const [completed, setCompleted] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("ast-learning-complete") || "[]"); } catch { return []; } });
  const module = learningModules.find((m) => m.id === activeId)!;
  const selectModule = (id: string) => { setActiveId(id); setChoice(null); scrollTo({ top: 260, behavior: "smooth" }); };
  const complete = () => { const next = completed.includes(module.id) ? completed : [...completed, module.id]; setCompleted(next); localStorage.setItem("ast-learning-complete", JSON.stringify(next)); };
  const nextModule = () => { const index = learningModules.findIndex((m) => m.id === module.id); selectModule(learningModules[(index + 1) % learningModules.length].id); };
  return <>
    <div className="page-head"><p className="eyebrow">Interactive learning center</p><h1>Learn the reasoning behind AST</h1><p>Open each module, study the short lessons, answer the checkpoint, and track progress on this device.</p></div>
    <div className="learning-progress"><div><b>{completed.length}/{learningModules.length}</b><span>modules completed</span></div><div><i style={{ width: `${(completed.length / learningModules.length) * 100}%` }}/></div></div>
    <div className="learning-shell"><aside className="module-nav">{learningModules.map((item) => <button className={item.id === activeId ? "selected" : ""} onClick={() => selectModule(item.id)} key={item.id}><span>{completed.includes(item.id) ? "✓" : item.number}</span><div><b>{item.title}</b><small>{item.duration}</small></div></button>)}</aside>
      <article className="lesson-panel"><div className="lesson-head"><div><p className="eyebrow">Module {module.number} · {module.duration}</p><h2>{module.title}</h2><p>{module.objective}</p></div><span>{completed.includes(module.id) ? "Completed" : "In progress"}</span></div>
        <div className="lesson-sections">{module.sections.map((section, index) => <section key={section.heading}><span>{index + 1}</span><div><h3>{section.heading}</h3><p>{section.body}</p><blockquote>{section.takeaway}</blockquote></div></section>)}</div>
        <section className="checkpoint"><p className="eyebrow">Knowledge checkpoint</p><h3>{module.checkpoint.question}</h3><div>{module.checkpoint.choices.map((answer, index) => <button disabled={choice !== null} className={choice !== null ? index === module.checkpoint.answer ? "correct" : choice === index ? "incorrect" : "" : ""} onClick={() => setChoice(index)} key={answer}><span>{String.fromCharCode(65 + index)}</span>{answer}</button>)}</div>{choice !== null && <div className="checkpoint-answer"><b>{choice === module.checkpoint.answer ? "Correct." : "Review this point."}</b><p>{module.checkpoint.explanation}</p>{choice === module.checkpoint.answer && <button className="primary" onClick={complete}>Mark module complete</button>}</div>}</section>
        <div className="lesson-sources"><span>Module sources</span>{module.sourceIds.map((id) => { const ref = references.find((r) => r.id === id); return ref ? <a href={ref.url} target="_blank" rel="noreferrer" key={id}>{ref.short} ↗</a> : null; })}</div>
        <button className="secondary lesson-next" onClick={nextModule}>Next module →</button>
      </article>
    </div>
  </>;
}

