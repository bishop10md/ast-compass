let waiting = false;
const subscribers = new Set<(available: boolean) => void>();
const monitored = new WeakSet<ServiceWorkerRegistration>();

export function subscribeAstUpdates(listener: (available: boolean) => void) {
  subscribers.add(listener);
  listener(waiting);
  return () => { subscribers.delete(listener); };
}

/** Announce a waiting version; never interrupt an in-memory AST session. */
export function monitorAstUpdates(registration: ServiceWorkerRegistration) {
  if (monitored.has(registration)) return;
  monitored.add(registration);
  const announce = () => {
    if (!registration.waiting || !navigator.serviceWorker.controller || waiting) return;
    waiting = true;
    subscribers.forEach(listener => listener(true));
  };
  const observeInstallation = () => {
    registration.installing?.addEventListener("statechange", announce);
    announce();
  };
  registration.addEventListener("updatefound", observeInstallation);
  observeInstallation();
  let lastCheck = 0;
  let checking = false;
  const check = () => {
    if (!navigator.onLine || document.visibilityState !== "visible" || checking || Date.now() - lastCheck < 60_000) return;
    lastCheck = Date.now();
    checking = true;
    void registration.update().then(announce).catch(() => undefined).finally(() => { checking = false; });
  };
  document.addEventListener("visibilitychange", check);
  addEventListener("online", check);
  // Registration itself checks the worker. Later foreground/reconnect events
  // recheck it without reloading, clearing user data, or forcing activation.
}
