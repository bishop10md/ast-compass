import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { monitorAstUpdates } from "./pwaUpdates";

export type AstPlatform = "web" | "android" | "ios";

export const getAstPlatform = (): AstPlatform => {
  const platform = Capacitor.getPlatform();
  return platform === "android" || platform === "ios" ? platform : "web";
};

const allowedPath = (path: string) => path.startsWith("/") && !path.startsWith("//");

export async function initializeNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" && ["www.astcompass.com", "astcompass.com"].includes(parsed.hostname) && allowedPath(parsed.pathname)) {
        history.pushState({}, "", `${parsed.pathname}${parsed.search}${parsed.hash}`);
        dispatchEvent(new PopStateEvent("popstate"));
      }
    } catch {
      // Invalid and non-canonical deep links are ignored.
    }
  });

  if (getAstPlatform() === "android") {
    await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && history.length > 1) history.back();
      else void CapacitorApp.minimizeApp();
    });
  }
}

export function registerAstServiceWorker() {
  if (Capacitor.isNativePlatform() || !("serviceWorker" in navigator)) return;
  const register = () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then(monitorAstUpdates).catch(() => {
      // Installability/offline support must never block the web application.
    });
  };
  if (document.readyState === "complete") register();
  else addEventListener("load", register, { once: true });
}
