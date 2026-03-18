import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  }
});

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}
export async function signOut() { return supabase.auth.signOut(); }
export async function getProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return { data, error };
}
export async function upsertProfile(profile) {
  const { data, error } = await supabase.from("profiles").upsert(profile, { onConflict:"id" }).select().single();
  return { data, error };
}
export async function getAllClients() {
  const { data, error } = await supabase.from("profiles").select("*").eq("role","client").order("created_at",{ ascending:false });
  return { data, error };
}
export async function getPortfolio(userId) {
  const { data, error } = await supabase.from("portfolios").select("*, portfolio_assets(*)").eq("user_id", userId).single();
  return { data, error };
}
export async function upsertPortfolioAsset(asset) {
  const { data, error } = await supabase.from("portfolio_assets").upsert(asset).select().single();
  return { data, error };
}
export async function deletePortfolioAsset(id) {
  return supabase.from("portfolio_assets").delete().eq("id", id);
}
export async function getFavorites(userId) {
  const { data } = await supabase.from("watchlist_favorites").select("ticker").eq("user_id", userId);
  return data?.map(d => d.ticker) || [];
}
export async function toggleFavorite(userId, ticker) {
  const { data: existing } = await supabase.from("watchlist_favorites").select("id").eq("user_id", userId).eq("ticker", ticker).single();
  if (existing) return supabase.from("watchlist_favorites").delete().eq("id", existing.id);
  return supabase.from("watchlist_favorites").insert({ user_id:userId, ticker });
}
export async function getAlerts(userId) {
  const { data } = await supabase.from("alerts").select("*").eq("user_id", userId).eq("active", true).order("created_at",{ ascending:false });
  return data || [];
}
export async function createAlert(alert) {
  return supabase.from("alerts").insert(alert).select().single();
}
export async function deleteAlert(id) {
  return supabase.from("alerts").delete().eq("id", id);
}
