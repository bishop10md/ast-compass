import { APP_VERSION } from "../config/version";

const safeToken = (value: string) => /^[a-z0-9][a-z0-9._-]{0,119}$/i.test(value) ? value : "";

export function scientificIssueHref(contentId: string, sourceRoute = location.pathname) {
  const parameters = new URLSearchParams({ category: "Scientific content / possible error", source: sourceRoute.startsWith("/") ? sourceRoute.slice(0, 160) : "/", version: APP_VERSION });
  const safeContentId = safeToken(contentId);
  if (safeContentId) parameters.set("content", safeContentId);
  return `/feedback?${parameters.toString()}`;
}

export default function ScientificIssueLink({ contentId, onNavigate }: { contentId: string; onNavigate?: (path: string) => void }) {
  const href = scientificIssueHref(contentId);
  return <a className="scientific-issue-link" href={href} onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate(href); } : undefined}>Report a scientific issue →</a>;
}
