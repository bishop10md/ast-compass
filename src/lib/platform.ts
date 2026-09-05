import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

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
      if (parsed.protocol === "https:" && parsed.hostname === "astcompass.com" && allowedPath(parsed.pathname)) {
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
  addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability/offline support must never block the web application.
    });
  }, { once: true });
}
