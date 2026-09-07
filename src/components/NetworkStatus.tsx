import { useEffect, useState } from "react";
import { subscribeAstUpdates } from "../lib/pwaUpdates";

export default function NetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    addEventListener("online", onOnline);
    addEventListener("offline", onOffline);
    const unsubscribe = subscribeAstUpdates(setUpdateAvailable);
    return () => { removeEventListener("online", onOnline); removeEventListener("offline", onOffline); unsubscribe(); };
  }, []);
  return <div className="network-notices">{!online && <aside className="offline-indicator" role="status">AST Compass is offline. Cached educational content may be outdated. Reconnect for updates, external references, Feedback, or the first OCR download. <button onClick={() => location.reload()}>Retry</button></aside>}
    {updateAvailable && <aside className="offline-indicator" role="status">An AST Compass update is ready. Finish your current session, then close all AST Compass tabs and installed-app windows and reopen. Session-only images and unsaved work will not carry over. Your current analysis will not reload automatically.</aside>}</div>;
}
