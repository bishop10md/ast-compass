import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabase, supabaseConfigured, type Session, type User } from "../lib/supabase";
import { ACCOUNT_FEATURES_ENABLED } from "../config/features";

type AuthContextValue = { user: User | null; session: Session; loading: boolean; recoveryMode: boolean; isGuest: boolean; configured: boolean; signUp(email: string, password: string, displayName: string): Promise<string>; signIn(email: string, password: string): Promise<string>; signInWithGoogle(): Promise<string>; reset(email: string): Promise<string>; updatePassword(password: string): Promise<string>; signOut(): Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null), [session, setSession] = useState<Session>(null), [loading, setLoading] = useState(true), [recoveryMode, setRecoveryMode] = useState(false);
  useEffect(() => { let active = true, unsubscribe = () => {}; if (!ACCOUNT_FEATURES_ENABLED) { setLoading(false); return () => undefined; } void getSupabase().then(async (client) => { if (!client) { setLoading(false); return; } const { data } = await client.auth.getSession(); if (active) { setSession(data.session); setUser(data.session?.user || null); setLoading(false); } const listener = client.auth.onAuthStateChange((event, next) => { setSession(next); setUser(next?.user || null); if (event === "PASSWORD_RECOVERY") setRecoveryMode(true); }); unsubscribe = () => listener.data.subscription.unsubscribe(); }).catch(() => setLoading(false)); return () => { active = false; unsubscribe(); }; }, []);
  const requireClient = async () => { const client = await getSupabase(); if (!client) throw new Error("Account services are not configured yet. Continue as a guest for full educational access."); return client; };
  const message = (error: { message: string } | null, success: string) => { if (error) throw new Error(error.message); return success; };
  const value: AuthContextValue = { user, session, loading, recoveryMode, isGuest: !user, configured: ACCOUNT_FEATURES_ENABLED && supabaseConfigured,
    signUp: async (email, password, displayName) => message((await (await requireClient()).auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: `${location.origin}/dashboard` } })).error, "Check your email. We sent a verification link."),
    signIn: async (email, password) => message((await (await requireClient()).auth.signInWithPassword({ email, password })).error, "Signed in."),
    signInWithGoogle: async () => message((await (await requireClient()).auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } })).error, "Opening Google sign-in."),
    reset: async (email) => message((await (await requireClient()).auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/recover-account` })).error, "If an account is eligible, a time-limited reset link will be sent."),
    updatePassword: async (password) => { const result = await (await requireClient()).auth.updateUser({ password }); const response = message(result.error, "Password updated. You can now return to your workspace."); setRecoveryMode(false); return response; },
    signOut: async () => { const result = await (await requireClient()).auth.signOut(); if (result.error) throw new Error(result.error.message); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error("useAuth requires AuthProvider"); return value; };
