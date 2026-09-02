const APP_VERSION = "0.4.4";
const PRIVATE_ROUTES = ["/concordance/image", "/my-images", "/history", "/dashboard", "/settings", "/signin", "/create-account", "/auth/callback"];
const BLOCKED_KEYS = /email|username|password|token|authorization|cookie|session|filename|image|ocr|mic|barcode|qr|phi|patient|storage|signed.?url|feedback|comment|analysis|input|table/i;
const ALLOWED_PROPERTIES = new Set(["page", "feature_name", "guest_or_authenticated", "device_category", "screen_size_category", "app_version", "success_or_failure", "duration_bucket", "result_count", "content_status", "route", "release"]);
type SafeValue = string | number | boolean | null;
export type TelemetryProperties = Record<string, SafeValue | undefined>;

const environment = import.meta.env.PROD ? "production" : import.meta.env.MODE === "development" ? "development" : "preview";
const enabled = import.meta.env.PROD;
const route = () => location.pathname;
const featureForRoute = (path = route()) => path.startsWith("/bcid") ? "bcid" : path.startsWith("/concordance/image") ? "image_concordance" : path.startsWith("/concordance") ? "concordance" : path.startsWith("/breakpoints") ? "breakpoints" : path.startsWith("/resistance") ? "resistance" : path.startsWith("/learn") ? "learn" : path.replace(/^\//, "") || "home";
const deviceCategory = () => innerWidth < 700 ? "mobile" : innerWidth < 1100 ? "tablet" : "desktop";
const anonymousId = () => { const key = "ast-telemetry-session"; let id = sessionStorage.getItem(key); if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); } return id; };
const sanitize = (properties: TelemetryProperties = {}) => Object.fromEntries(Object.entries(properties).filter(([key, value]) => ALLOWED_PROPERTIES.has(key) && !BLOCKED_KEYS.test(key) && ["string", "number", "boolean"].includes(typeof value)).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 120) : value]));
const base = () => ({ page: route(), feature_name: featureForRoute(), device_category: deviceCategory(), screen_size_category: deviceCategory(), app_version: APP_VERSION });

async function posthog(event: string, properties: TelemetryProperties) {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = String(import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");
  if (!enabled || !key) return;
  await fetch(`${host}/capture/`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ api_key: key, event, properties: { distinct_id: anonymousId(), ...sanitize(properties), $process_person_profile: false } }) });
}

async function sentry(error: unknown, context: TelemetryProperties) {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!enabled || !dsn) return;
  const parsed = new URL(dsn), projectId = parsed.pathname.replace(/^\//, "").split("/").pop();
  if (!projectId) return;
  const endpoint = `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/?sentry_key=${encodeURIComponent(parsed.username)}&sentry_version=7&sentry_client=ast-compass-web%2F${APP_VERSION}`;
  const exception = error instanceof Error ? error : new Error("Unexpected application error");
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const payload = { event_id: eventId, timestamp: Date.now() / 1000, platform: "javascript", environment, release: `ast-compass@${APP_VERSION}`, level: "error", exception: { values: [{ type: exception.name || "Error", value: String(exception.message || "Unexpected application error").slice(0, 300), stacktrace: exception.stack ? { frames: exception.stack.split("\n").slice(0, 30).map((line) => ({ filename: "application", function: line.trim().slice(0, 180), in_app: true })) } : undefined }] }, tags: sanitize({ ...base(), ...context, route: route(), release: APP_VERSION }) };
  const envelope = `${JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString(), dsn })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(payload)}`;
  await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-sentry-envelope" }, keepalive: true, body: envelope });
}

export function trackEvent(event: string, properties: TelemetryProperties = {}) { void posthog(event, { ...base(), ...properties }).catch(() => undefined); }
export function captureError(error: unknown, properties: TelemetryProperties = {}) { void sentry(error, properties).catch(() => undefined); }
export function setTelemetryContext(_properties: TelemetryProperties = {}) { /* Context is intentionally event-scoped to prevent private data persistence. */ }
export function isPrivateTelemetryRoute(path = route()) { return PRIVATE_ROUTES.some((privateRoute) => path.startsWith(privateRoute)); }
export function initTelemetry() {
  if (!enabled) return;
  addEventListener("error", (event) => captureError(event.error || new Error("Unhandled application error")));
  addEventListener("unhandledrejection", (event) => captureError(event.reason || new Error("Unhandled promise rejection")));
  trackEvent("guest_session_started", { guest_or_authenticated: "guest" });
}
export { APP_VERSION };
