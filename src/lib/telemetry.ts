import { APP_VERSION } from "../config/version";
import { getAstPlatform } from "./platform";
const PRIVATE_ROUTES = ["/concordance/image", "/my-images", "/history", "/dashboard", "/settings", "/signin", "/create-account", "/auth/callback"];
const BLOCKED_KEYS = /email|username|password|token|authorization|cookie|session|filename|image|ocr|barcode|qr|phi|patient|storage|signed.?url|feedback|comment|analysis|input|table|(?:^|_)mic(?:$|_)/i;
const ALLOWED_PROPERTIES = new Set(["page", "feature_name", "guest_or_authenticated", "device_category", "screen_size_category", "app_version", "platform", "success_or_failure", "duration_bucket", "result_count", "content_status", "route", "release", "organism_id", "antimicrobial_id", "marker_id", "mechanism_id", "reference_id", "standard_id", "workflow_id", "satisfaction_response"]);
const STRUCTURED_ID_PROPERTIES = new Set(["organism_id", "antimicrobial_id", "marker_id", "mechanism_id", "reference_id", "standard_id", "workflow_id", "satisfaction_response"]);
const SAFE_STRUCTURED_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const ROUTE_GROUPS = ["/concordance/image", "/resistance/mechanisms", "/resistance/gene-to-phenotype", "/resistance/phenotype-to-mechanism", "/resistance/expected-phenotypes", "/learn/detective", "/learn/topics", "/references/coverage", "/auth/callback", "/breakpoints", "/resistance", "/concordance", "/bcid-forecast", "/learn", "/references", "/feedback", "/privacy", "/terms", "/trust", "/about", "/changes", "/signin", "/create-account", "/recover-account", "/dashboard", "/history", "/my-images", "/settings", "/promo-phone", "/promo", "/404"];
export const telemetryRoute = (value: string) => value === "/" ? "/" : ROUTE_GROUPS.find(prefix => value === prefix || value.startsWith(prefix + "/")) || "/unknown";
const SAFE_FEATURES = new Set("home breakpoints resistance mechanism genes phenotype concordance imageConcordance expected bcid learn detective learning topic references coverage feedback privacy terms trust about changes signin createAccount authCallback recoverAccount dashboard history myImages settings promo promoPhone notFound image_concordance search account owner_diagnostics native_shell application_initialization unknown".split(" "));
const PROPERTY_ENUMS: Record<string, readonly string[]> = { guest_or_authenticated: ["guest", "public_session", "authenticated"], device_category: ["mobile", "tablet", "desktop"], screen_size_category: ["mobile", "tablet", "desktop"], platform: ["web", "android", "ios"], success_or_failure: ["success", "failure", "blocked"], content_status: ["Demo", "Draft", "Reviewed", "Verified"] };
type SafeValue = string | number | boolean | null;
export type TelemetryProperties = Record<string, SafeValue | undefined>;

const environment = import.meta.env.PROD ? "production" : import.meta.env.MODE === "development" ? "development" : "preview";
const enabled = import.meta.env.PROD;
const route = () => telemetryRoute(location.pathname);
const featureForRoute = (path = route()) => path.startsWith("/bcid") ? "bcid" : path.startsWith("/concordance/image") ? "image_concordance" : path.startsWith("/concordance") ? "concordance" : path.startsWith("/breakpoints") ? "breakpoints" : path.startsWith("/resistance") ? "resistance" : path.startsWith("/learn") ? "learn" : SAFE_FEATURES.has(path.slice(1)) ? path.slice(1) : path === "/" ? "home" : "unknown";
const deviceCategory = () => innerWidth < 700 ? "mobile" : innerWidth < 1100 ? "tablet" : "desktop";
const anonymousId = () => { const key = "ast-telemetry-session"; let id = sessionStorage.getItem(key); if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); } return id; };
export const sanitizeTelemetryProperties = (properties: TelemetryProperties = {}) => Object.fromEntries(Object.entries(properties).filter(([key, value]) => {
  if (!ALLOWED_PROPERTIES.has(key) || BLOCKED_KEYS.test(key)) return false;
  if (key === "page" || key === "route") return typeof value === "string";
  if (key === "feature_name") return typeof value === "string" && SAFE_FEATURES.has(value);
  if (key === "app_version" || key === "release") return value === APP_VERSION;
  if (key === "result_count") return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 10000;
  if (STRUCTURED_ID_PROPERTIES.has(key)) return typeof value === "string" && SAFE_STRUCTURED_ID.test(value);
  return typeof value === "string" && !!PROPERTY_ENUMS[key]?.includes(value);
}).map(([key, value]) => [key, key === "page" || key === "route" ? telemetryRoute(String(value)) : value]));
const sanitize = sanitizeTelemetryProperties;
const base = () => ({ page: route(), feature_name: featureForRoute(), device_category: deviceCategory(), screen_size_category: deviceCategory(), app_version: APP_VERSION, platform: getAstPlatform() });

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
  const safeType = ["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "URIError", "EvalError", "AggregateError", "AbortError"].includes(exception.name) ? exception.name : "Error";
  // Exception messages and stacks can include multiline OCR/server detail. Do
  // not serialize either; preserve only fixed type, release and safe context.
  const payload = { event_id: eventId, timestamp: Date.now() / 1000, platform: "javascript", environment, release: `ast-compass@${APP_VERSION}`, level: "error", exception: { values: [{ type: safeType, value: "Application error captured" }] }, tags: sanitize({ ...base(), ...context, route: route(), release: APP_VERSION }) };
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
export function triggerOwnerSentryTest() {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_OWNER_DIAGNOSTICS !== "true") return false;
  captureError(new Error("Owner-triggered synthetic monitoring test"), { feature_name: "owner_diagnostics", success_or_failure: "failure" });
  return true;
}
export { APP_VERSION };
