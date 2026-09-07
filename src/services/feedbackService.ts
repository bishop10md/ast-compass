import { getSupabase } from "../lib/supabase";
import { APP_VERSION } from "../config/version";

export type FeedbackCategory = "Scientific content / possible error" | "Usability" | "Missing organism/drug" | "Missing resistance mechanism" | "Breakpoint/standard request" | "Feature request" | "Privacy/security" | "General feedback";
export type FeedbackPayload = { displayName: string; email: string; role: string; rating: number | null; category: FeedbackCategory; useful: string; improvement: string; requestedFeature: string; comments: string; testimonialPermission: boolean; userId: string | null; accountStatus: "Guest" | "Authenticated"; pageSource: string; contentId: string | null };

export async function submitFeedback(payload: FeedbackPayload) {
  const client = await getSupabase();
  if (!client) throw new Error("Feedback service is unavailable.");
  const base = { user_id: payload.userId, account_status: payload.accountStatus, display_name: payload.displayName || null, email: payload.email || null, role: payload.role || null, rating: payload.rating, useful_feedback: payload.useful || null, improvement_feedback: payload.improvement || null, requested_feature: payload.requestedFeature || null, additional_comments: payload.comments || null, testimonial_permission: payload.testimonialPermission, app_version: APP_VERSION, page_source: payload.pageSource };
  const { error } = await client.from("feedback").insert({ ...base, category: payload.category, content_id: payload.contentId });
  if (!error) return;
  const missingGovernanceColumn = ["PGRST204", "42703"].includes(error.code) && /category|content_id/i.test(error.message);
  if (missingGovernanceColumn) {
    const { error: legacyError } = await client.from("feedback").insert(base);
    if (!legacyError) return;
    throw new Error(legacyError.message);
  }
  throw new Error(error.message);
}
