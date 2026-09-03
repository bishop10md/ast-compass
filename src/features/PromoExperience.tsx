import { useEffect, useRef, useState } from "react";
import { ASTCompassLogo } from "../components/ASTCompassLogo";

const sceneDurations = [2500, 3000, 5000, 4500, 4000, 3500, 3000];

export default function PromoExperience() {
  const [running, setRunning] = useState(false);
  const [scene, setScene] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!running) return;
    if (scene >= sceneDurations.length - 1) {
      const finish = window.setTimeout(() => { setRunning(false); setScene(0); }, sceneDurations[scene]);
      return () => window.clearTimeout(finish);
    }
    const timer = window.setTimeout(() => setScene((current) => current + 1), sceneDurations[scene]);
    return () => window.clearTimeout(timer);
  }, [running, scene]);

  const start = () => { setScene(0); setRunning(true); };
  const restart = () => { setRunning(false); setScene(0); window.setTimeout(() => setRunning(true), 80); };
  const fullScreen = async () => { if (!document.fullscreenElement) await stageRef.current?.requestFullscreen(); else await document.exitFullscreen(); };

  return <section className="promo-page" aria-label="AST Compass promotional demonstration">
    <div className="promo-controls" aria-label="Recording controls">
      <div><b>PROMO RECORDING MODE</b><span>Synthetic educational examples only</span></div>
      <button className="primary" type="button" onClick={start}>{running ? "Demo running…" : "Start Demo"}</button>
      <button className="secondary" type="button" onClick={restart}>Restart Demo</button>
      <button className="secondary" type="button" onClick={() => void fullScreen()}>Full Screen</button>
    </div>

    <div className="promo-stage" ref={stageRef}>
      <div className="promo-progress" aria-label={`Scene ${scene + 1} of 7`}><i style={{ width: `${((scene + 1) / 7) * 100}%` }}/></div>
      <div className="promo-safety"><b>EDUCATIONAL DEMONSTRATION</b><span>Not for patient-care decisions</span></div>

      <div className="promo-scenes" aria-live="polite">
        <article className={`promo-scene promo-brand ${scene === 0 ? "active" : ""}`} aria-hidden={scene !== 0}>
          <ASTCompassLogo variant="compact" tone="dark" className="promo-logo"/>
          <h1>Think beyond S and R.</h1>
          <p>From organism to mechanism to interpretation.</p>
          <strong>A compass, not an autopilot.</strong>
        </article>

        <article className={`promo-scene promo-problem ${scene === 1 ? "active" : ""}`} aria-hidden={scene !== 1}>
          <span className="promo-kicker">THE INTERPRETIVE GAP</span>
          <h2>Molecular resistance marker detected.</h2>
          <p>AST is still pending.</p>
          <div className="promo-question">How well does the expected phenotype fit the mechanism?</div>
          <b>See the mechanism behind the result.</b>
        </article>

        <article className={`promo-scene promo-bcid ${scene === 2 ? "active" : ""}`} aria-hidden={scene !== 2}>
          <div className="promo-heading"><div><span>EDUCATIONAL EXAMPLE</span><h2>BCID Resistance Forecast</h2></div><b>PRE-AST EXPECTATION</b></div>
          <div className="promo-pair"><strong>Klebsiella pneumoniae group</strong><i>+</i><strong>KPC detected</strong></div>
          <div className="promo-chain"><span>Serine carbapenemase</span><i>↓</i><span>Anticipated phenotype</span><i>↓</i><span>AST confirmation</span></div>
          <div className="promo-categories"><span className="resistance">Resistance strongly expected</span><span className="retained">Activity may be retained</span><span className="unknown">Cannot infer</span></div>
          <small>A marker does not establish the complete phenotype.</small>
        </article>

        <article className={`promo-scene promo-concordance ${scene === 3 ? "active" : ""}`} aria-hidden={scene !== 3}>
          <div className="promo-heading"><div><span>GENE + PHENOTYPE</span><h2>Concordance</h2></div><b>DEMO DATA</b></div>
          <div className="promo-inputs"><div><span>Organism</span><b>Escherichia coli</b></div><div><span>Marker</span><b>CTX-M</b></div><div><span>AST phenotype</span><b>Synthetic table entered</b></div></div>
          <div className="promo-result"><span>GENE–PHENOTYPE CONCORDANCE</span><h3>Largely concordant</h3><p>Review the complete AST pattern and confirm results using validated laboratory methods.</p></div>
          <div className="promo-result-counts"><b>Concordant</b><b>Cannot infer</b><b>Investigate</b></div>
        </article>

        <article className={`promo-scene promo-image ${scene === 4 ? "active" : ""}`} aria-hidden={scene !== 4}>
          <div className="promo-heading"><div><span>IMAGE-ASSISTED REVIEW</span><h2>Image Concordance</h2></div><b>DE-IDENTIFIED IMAGES ONLY</b></div>
          <div className="promo-image-grid"><div className="synthetic-table" aria-label="Synthetic AST table"><div><b>Antimicrobial</b><b>MIC</b><b>Category</b></div><div><span>Ceftriaxone</span><span>≥ 4</span><span>R</span></div><div><span>Meropenem</span><span>≤ 1</span><span>S</span></div><div><span>Gentamicin</span><span>2</span><span>S</span></div></div><div className="privacy-seal"><b>✓</b><span>Synthetic data<br/>No patient identifiers</span></div></div>
          <div className="promo-steps"><span>Upload</span><i>→</i><span>Verify MICs</span><i>→</i><span>Analyze</span><i>→</i><span>Explain</span></div>
          <small>Human confirmation required before analysis.</small>
        </article>

        <article className={`promo-scene promo-learn ${scene === 5 ? "active" : ""}`} aria-hidden={scene !== 5}>
          <span className="promo-kicker">LEARN AND APPLY</span>
          <h2>Learn the concept.<br/>Apply the reasoning.</h2>
          <div className="promo-tool-grid"><div><b>Learn</b><span>Core AST concepts</span></div><div><b>AST Detective</b><span>100 reasoning cases</span></div><div><b>Resistance Mechanisms</b><span>Genes to phenotype</span></div><div><b>Breakpoint Explorer</b><span>Educational demo data</span></div></div>
          <p>Built for microbiology learners and professionals.</p>
        </article>

        <article className={`promo-scene promo-cta ${scene === 6 ? "active" : ""}`} aria-hidden={scene !== 6}>
          <ASTCompassLogo variant="compact" tone="dark" className="promo-logo"/>
          <span>EXPLORE THE PLATFORM</span>
          <h2>ASTCOMPASS.COM</h2>
          <p>Explore AST Compass. Try the tools. Send feedback.</p>
          <b>Educational AST reasoning · Source-linked interpretation</b>
          <strong>A compass, not an autopilot.</strong>
        </article>
      </div>
    </div>

    <p className="promo-note">Recording route only. It is intentionally absent from the main navigation and uses no account, uploaded-image, or patient data.</p>
  </section>;
}
