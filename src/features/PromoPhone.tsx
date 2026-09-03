import { useEffect, useMemo, useState } from "react";

const SCENE_MS = 4000;
const scenes = [
  { src: "/promo-phone/home.png", alt: "AST Compass homepage on a mobile browser", caption: "Explore AST reasoning.", position: "top", cta: false },
  { src: "/promo-phone/resistance.jpeg", alt: "AST Compass Resistance Hub on a mobile browser", caption: "Move from gene to phenotype—and back.", position: "top", cta: false },
  { src: "/promo-phone/bcid.jpeg", alt: "AST Compass BCID Resistance Forecast on a mobile browser", caption: "Connect markers with phenotype.", position: "top", cta: false },
  { src: "/promo-phone/mechanism.jpeg", alt: "AST Compass phenotype to mechanism result on a mobile browser", caption: "Check the phenotype–mechanism fit.", position: "center", cta: false },
  { src: "/promo-phone/learn.jpeg", alt: "AST Compass Learning Center and AST Detective on a mobile browser", caption: "Learn through cases.", position: "top", cta: false },
  { src: "/promo-phone/breakpoints.jpeg", alt: "AST Compass Breakpoint Engine on a mobile browser", caption: "Visit astcompass.com", position: "top", cta: true },
] as const;

export default function PromoPhone() {
  const [scene, setScene] = useState(0);
  const [running, setRunning] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const active = scenes[scene];

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (scene === scenes.length - 1) setRunning(false);
      else setScene((current) => current + 1);
    }, SCENE_MS);
    return () => window.clearTimeout(timer);
  }, [running, scene]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      setScene(0);
      setRunning(true);
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => (value ?? 1) - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && recording) setRecording(false);
      if (event.key.toLowerCase() === "p") setRunning((value) => !value);
      if (event.key.toLowerCase() === "r") { setScene(0); setRunning(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording]);

  const progress = useMemo(() => `${((scene + 1) / scenes.length) * 100}%`, [scene]);
  const start = () => { setScene(0); setRunning(true); };
  const restart = () => { setRunning(false); setScene(0); window.setTimeout(() => setRunning(true), 60); };
  const enableRecording = () => {
    const next = !recording;
    setRecording(next);
    if (next) { setRunning(false); setScene(0); setCountdown(3); }
    else setCountdown(null);
  };

  return <section className={`phone-promo ${recording ? "is-recording" : ""}`} aria-label="AST Compass phone promotional demo">
    <div className="phone-promo-controls">
      <div><b>PROMOTIONAL PHONE DEMO</b><span>24-second sequence · real AST Compass screenshots</span></div>
      <button className="primary" type="button" onClick={start}>{running ? "Playing…" : "Start Demo"}</button>
      <button className="secondary" type="button" onClick={() => setRunning((value) => !value)}>{running ? "Pause" : "Resume"}</button>
      <button className="secondary" type="button" onClick={restart}>Restart</button>
      <label className="recording-switch"><input type="checkbox" checked={recording} onChange={enableRecording}/><span>Recording Mode</span></label>
    </div>

    <div className="phone-ad-canvas">
      <div className="lab-backdrop" aria-hidden="true"><i/><i/><i/></div>
      <p className="phone-caption" key={`caption-${scene}`}>{active.caption}</p>
      <div className="phone-shell" aria-label={`Scene ${scene + 1} of ${scenes.length}`}>
        <div className="phone-buttons" aria-hidden="true"><i/><i/><i/></div>
        <div className="phone-screen">
          <div className="dynamic-island" aria-hidden="true"><i/></div>
          <div className="phone-progress" aria-hidden="true"><i style={{ width: progress }}/></div>
          {scenes.map((item, index) => <figure className={`phone-shot ${scene === index ? "active" : ""} pan-${item.position}`} key={item.src} aria-hidden={scene !== index}>
            <img src={item.src} alt={scene === index ? item.alt : ""}/>
            {item.cta && <figcaption className="phone-final-cta"><b>AST Compass</b><strong>Think beyond S and R.</strong><span>astcompass.com</span><small>Explore it. Try it. Send feedback.</small><em>A compass, not an autopilot.</em></figcaption>}
          </figure>)}
        </div>
      </div>
      {countdown !== null && <div className="phone-countdown" role="status"><span>Recording begins in</span><b>{countdown || "GO"}</b></div>}
      {!recording && <p className="phone-key-help">Keyboard: P pause/resume · R restart · Esc exits Recording Mode</p>}
    </div>
  </section>;
}
