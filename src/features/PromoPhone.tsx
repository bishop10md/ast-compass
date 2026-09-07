import { useEffect, useRef, useState } from "react";

const CTA_MS = 4000;

export default function PromoPhone() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [running, setRunning] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showCta, setShowCta] = useState(false);

  const playFromStart = async () => {
    setShowCta(false);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    try { await video.play(); setRunning(true); } catch { setRunning(false); }
  };

  const finishVideo = () => {
    setRunning(false);
    setShowCta(true);
    window.setTimeout(() => setShowCta(true), CTA_MS);
  };

  const togglePause = async () => {
    const video = videoRef.current;
    if (!video || showCta) return;
    if (video.paused) {
      try { await video.play(); setRunning(true); } catch { setRunning(false); }
    } else {
      video.pause();
      setRunning(false);
    }
  };

  const enableRecording = () => {
    const next = !recording;
    setRecording(next);
    videoRef.current?.pause();
    if (videoRef.current) videoRef.current.currentTime = 0;
    setRunning(false);
    setShowCta(false);
    setCountdown(next ? 3 : null);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      void playFromStart();
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => (value ?? 1) - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && recording) setRecording(false);
      if (event.key.toLowerCase() === "p") void togglePause();
      if (event.key.toLowerCase() === "r") void playFromStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return <section className={`phone-promo ${recording ? "is-recording" : ""}`} aria-label="AST Compass phone promotional demo">
    <div className="phone-promo-controls">
      <div><b>PROMOTIONAL PHONE DEMO</b><span>23-second sequence · real AST Compass scrolling recording</span></div>
      <button className="primary" type="button" onClick={() => void playFromStart()}>{running ? "Playing…" : "Start Demo"}</button>
      <button className="secondary" type="button" onClick={() => void togglePause()}>{running ? "Pause" : "Resume"}</button>
      <button className="secondary" type="button" onClick={() => void playFromStart()}>Restart</button>
      <label className="recording-switch"><input type="checkbox" checked={recording} onChange={enableRecording}/><span>Recording Mode</span></label>
    </div>

    <div className="phone-ad-canvas">
      <div className="lab-backdrop" aria-hidden="true"><i/><i/><i/></div>
      <p className="phone-caption">Explore AST reasoning.</p>
      <div className="phone-shell" aria-label="Real AST Compass scrolling demonstration">
        <div className="phone-buttons" aria-hidden="true"><i/><i/><i/></div>
        <div className="phone-screen">
          <div className="dynamic-island" aria-hidden="true"><i/></div>
          <video ref={videoRef} className="phone-recording" src="/promo-phone/scroll-demo.mp4" muted playsInline preload="metadata" aria-label="Real AST Compass website recording with scrolling" onPlay={() => setRunning(true)} onPause={() => setRunning(false)} onEnded={finishVideo}/>
          {showCta && <div className="phone-final-cta" role="status"><b>AST Compass</b><strong>Think beyond S and R.</strong><span>astcompass.com</span><small>Explore it. Try it. Send feedback.</small><em>A compass, not an autopilot.</em></div>}
        </div>
      </div>
      {countdown !== null && <div className="phone-countdown" role="status"><span>Recording begins in</span><b>{countdown || "GO"}</b></div>}
      {!recording && <p className="phone-key-help">Keyboard: P pause/resume · R restart · Esc exits Recording Mode</p>}
    </div>
  </section>;
}
