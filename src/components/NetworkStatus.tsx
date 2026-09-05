import { useEffect, useState } from "react";

export default function NetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    addEventListener("online", onOnline);
    addEventListener("offline", onOffline);
    return () => { removeEventListener("online", onOnline); removeEventListener("offline", onOffline); };
  }, []);
  if (online) return null;
  return <aside className="offline-indicator" role="status">AST Compass is offline. Some features require an internet connection. <button onClick={() => location.reload()}>Retry</button></aside>;
}
