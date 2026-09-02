type User = { id: string; email?: string; user_metadata?: { display_name?: string; avatar_url?: string } };
type Session = { user: User } | null;
type AuthResult = { data: { user?: User | null; session?: Session }; error: { message: string; status?: number } | null };
type Query = any;
export interface SupabaseClientLike { auth: { getSession(): Promise<{ data: { session: Session } }>; getUser(): Promise<{ data: { user: User | null }; error: { message: string } | null }>; onAuthStateChange(callback: (_event: string, session: Session) => void): { data: { subscription: { unsubscribe(): void } } }; signUp(options: { email: string; password: string; options: { data: { display_name: string }; emailRedirectTo: string } }): Promise<AuthResult>; signInWithPassword(options: { email: string; password: string }): Promise<AuthResult>; signInWithOAuth(options: { provider: "google"; options: { redirectTo: string } }): Promise<AuthResult>; resetPasswordForEmail(email: string, options: { redirectTo: string }): Promise<AuthResult>; signOut(): Promise<{ error: { message: string } | null }> }; from(table: string): Query; storage: { from(bucket: string): { upload(path: string, file: File, options: object): Promise<{ data: unknown; error: { message: string } | null }>; createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>; remove(paths: string[]): Promise<{ error: { message: string } | null }> } } }
declare global { interface Window { supabase?: { createClient(url: string, key: string, options: object): SupabaseClientLike } } }

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabaseConfigured = Boolean(url && publishableKey);
let client: SupabaseClientLike | null = null;

export async function getSupabase(): Promise<SupabaseClientLike | null> {
  if (!supabaseConfigured) return null;
  if (client) return client;
  if (!window.supabase) await new Promise<void>((resolve, reject) => { const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"; script.crossOrigin = "anonymous"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Authentication provider could not load.")); document.head.appendChild(script); });
  if (!window.supabase) throw new Error("Supabase client is unavailable.");
  client = window.supabase.createClient(url, publishableKey, { auth: { persistSession: true, storage: window.sessionStorage, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } });
  return client;
}
export type { User, Session };
