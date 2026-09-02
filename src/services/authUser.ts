import { getSupabase } from "../lib/supabase";
export async function requireAuthenticatedUser() { const client = await getSupabase(); if (!client) throw new Error("Supabase is not configured."); const { data, error } = await client.auth.getUser(); if (error || !data.user) throw new Error("Sign in to save private work."); return { client, user: data.user }; }
