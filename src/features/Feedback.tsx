import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { submitFeedback, type FeedbackCategory } from "../services/feedbackService";
import { captureError, trackEvent } from "../lib/telemetry";
import { ACCOUNT_FEATURES_ENABLED } from "../config/features";
import { APP_VERSION } from "../config/version";

const roles = ["Medical Laboratory Scientist / Clinical Laboratory Scientist", "Microbiology Technologist", "Resident", "Fellow", "Student", "Educator", "Researcher", "Physician", "Pharmacist", "Other", "Prefer not to say"];
export const feedbackCategories: FeedbackCategory[] = ["Scientific content / possible error", "Usability", "Missing organism/drug", "Missing resistance mechanism", "Breakpoint/standard request", "Feature request", "Privacy/security", "General feedback"];
const safeContext = () => {
  const parameters = new URLSearchParams(location.search);
  const requestedCategory = parameters.get("category");
  const category = feedbackCategories.includes(requestedCategory as FeedbackCategory) ? requestedCategory as FeedbackCategory : "General feedback";
  const source = parameters.get("source") || location.pathname;
  const pageSource = /^\/[a-z0-9/_-]{0,159}$/i.test(source) ? source : "/feedback";
  const content = parameters.get("content") || "";
  const contentId = /^[a-z0-9][a-z0-9._-]{0,119}$/i.test(content) ? content : "";
  return { category, pageSource, contentId };
};
const emptyForm = { displayName: "", email: "", role: "", rating: "", category: "General feedback" as FeedbackCategory, useful: "", improvement: "", requestedFeature: "", comments: "", testimonialPermission: false, website: "" };

export default function Feedback({ onReturn }: { onReturn: () => void }) {
  const auth = useAuth();
  const context = useMemo(safeContext, []);
  const [form, setForm] = useState({ ...emptyForm, category: context.category });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.website) return;
    const last = Number(localStorage.getItem("ast-feedback-last") || 0);
    if (Date.now() - last < 30000) { setStatus("error"); return; }
    setStatus("sending");
    try {
      const signedIn = ACCOUNT_FEATURES_ENABLED && !!auth.user;
      await submitFeedback({ ...form, rating: form.rating ? Number(form.rating) : null, userId: signedIn ? auth.user?.id || null : null, accountStatus: signedIn ? "Authenticated" : "Guest", pageSource: context.pageSource, contentId: context.contentId || null });
      localStorage.setItem("ast-feedback-last", String(Date.now()));
      trackEvent("feedback_submitted", { page: "/feedback", feature_name: "feedback", guest_or_authenticated: signedIn ? "authenticated" : "public_session", success_or_failure: "success" });
      setStatus("success");
    } catch (error) {
      captureError(error, { feature_name: "feedback", success_or_failure: "failure" });
      setStatus("error");
    }
  };
  if (status === "success") return <section className="feedback-success" role="status"><span>✓</span><h1>Thank you for helping improve AST Compass.</h1><p>Your feedback has been received and will help guide future improvements to the platform.</p><button className="primary" onClick={onReturn}>Return to AST Compass</button></section>;
  return <><div className="page-head"><p className="eyebrow">Private product feedback</p><h1>Help Improve AST Compass</h1><p>Report a possible scientific issue, request missing coverage, or tell us how AST Compass could work better.</p></div><form className="feedback-form panel" onSubmit={submit}>
    <div className="phi-warning"><b>Please do not include patient information or PHI in your feedback.</b><span>Do not enter names, MRNs, accession numbers, dates of birth, clinical case identifiers, AST image text, or private analysis content.</span></div>
    {context.contentId && <div className="feedback-context"><b>Scientific issue context attached</b><span>Content ID: {context.contentId}</span><span>Route: {context.pageSource}</span><span>AST Compass version: {APP_VERSION}</span><small>No patient, image, MIC-table, or private-analysis data are included.</small></div>}
    <div className="feedback-grid"><label>Category<select required value={form.category} onChange={(event) => update("category", event.target.value)}>{feedbackCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Role <small>Optional</small><select value={form.role} onChange={(event) => update("role", event.target.value)}><option value="">Select a role</option>{roles.map((role) => <option key={role}>{role}</option>)}</select></label><label>Name or display name <small>Optional</small><input value={form.displayName} onChange={(event) => update("displayName", event.target.value)}/></label><label>Email <small>Optional</small><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)}/></label><fieldset><legend>Overall experience <small>Optional</small></legend><div className="rating-row">{[1, 2, 3, 4, 5].map((number) => <label key={number}><input type="radio" name="rating" value={number} checked={form.rating === String(number)} onChange={(event) => update("rating", event.target.value)}/><span>{number}</span></label>)}</div></fieldset></div>
    {[["useful", "What did you find useful?"], ["improvement", "What could be improved?"], ["requestedFeature", "What feature or coverage would you like to see next?"], ["comments", "Additional comments"]].map(([key, label]) => <label className="feedback-long" key={key}>{label}<textarea rows={4} value={form[key as keyof typeof form] as string} onChange={(event) => update(key as keyof typeof form, event.target.value)}/></label>)}
    <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)}/></label><label className="testimonial"><input type="checkbox" checked={form.testimonialPermission} onChange={(event) => update("testimonialPermission", event.target.checked)}/> You may contact me about using this feedback as a testimonial.</label><small>Feedback remains private. It is not published automatically.</small>{status === "error" && <div className="form-error" role="alert">We couldn't submit your feedback right now. Please try again. Your entries are still here.</div>}<button className="primary" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send private feedback →"}</button>
  </form></>;
}
