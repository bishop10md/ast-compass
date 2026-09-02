import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabase, supabaseConfigured, type Session, type User } from "../lib/supabase";

type AuthContextValue = { user: User | null; session: Session; loading: boolean; isGuest: boolean; configured: boolean; signUp(email: string, password: string, displayName: string): Promise<string>; signIn(email: string, password: string): Promise<string>; signInWithGoogle(): Promise<string>; reset(email: string): Promise<string>; signOut(): Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null), [session, setSession] = useState<Session>(null), [loading, setLoading] = useState(true);
  useEffect(() => { let active = true, unsubscribe = () => {}; void getSupabase().then(async (client) => { if (!client) { setLoading(false); return; } const { data } = await client.auth.getSession(); if (active) { setSession(data.session); setUser(data.session?.user || null); setLoading(false); } const listener = client.auth.onAuthStateChange((_event, next) => { setSession(next); setUser(next?.user || null); }); unsubscribe = () => listener.data.subscription.unsubscribe(); }).catch(() => setLoading(false)); return () => { active = false; unsubscribe(); }; }, []);
  const requireClient = async () => { const client = await getSupabase(); if (!client) throw new Error("Account services are not configured yet. Continue as a guest for full educational access."); return client; };
  const message = (error: { message: string } | null, success: string) => { if (error) throw new Error(error.message); return success; };
  const value: AuthContextValue = { user, session, loading, isGuest: !user, configured: supabaseConfigured,
    signUp: async (email, password, displayName) => message((await (await requireClient()).auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: `${location.origin}/dashboard` } })).error, "Check your email. We sent a verification link."),
    signIn: async (email, password) => message((await (await requireClient()).auth.signInWithPassword({ email, password })).error, "Signed in."),
    signInWithGoogle: async () => message((await (await requireClient()).auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } })).error, "Opening Google sign-in."),
    reset: async (email) => message((await (await requireClient()).auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/settings` })).error, "If an account is eligible, a time-limited reset link will be sent."),
    signOut: async () => { const result = await (await requireClient()).auth.signOut(); if (result.error) throw new Error(result.error.message); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error("useAuth requires AuthProvider"); return value; };
