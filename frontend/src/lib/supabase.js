import { createClient } from "@supabase/supabase-js";

// Singleton — una sola instancia
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _client = null;
export function getSupabaseClient() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
    });
  }
  return _client;
}
export const supabase = getSupabaseClient();

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({ provider:"google", options:{ redirectTo:`${window.location.origin}/auth/callback` } });
}
export const signOut = () => supabase.auth.signOut();
export const getProfile = (id) => supabase.from("profiles").select("*").eq("id",id).single().then(r=>r);
export const upsertProfile = (p) => supabase.from("profiles").upsert(p,{onConflict:"id"}).select().single().then(r=>r);
export const getAllClients = () => supabase.from("profiles").select("*").eq("role","client").order("created_at",{ascending:false}).then(r=>r);
export const getPortfolio = (uid) => supabase.from("portfolios").select("*, portfolio_assets(*)").eq("user_id",uid).single().then(r=>r);
export const upsertPortfolioAsset = (a) => supabase.from("portfolio_assets").upsert(a).select().single().then(r=>r);
export const deletePortfolioAsset = (id) => supabase.from("portfolio_assets").delete().eq("id",id);
export const getFavorites = async (uid) => { const {data}=await supabase.from("watchlist_favorites").select("ticker").eq("user_id",uid); return data?.map(d=>d.ticker)||[]; };
export const toggleFavorite = async (uid,ticker) => { const {data:e}=await supabase.from("watchlist_favorites").select("id").eq("user_id",uid).eq("ticker",ticker).single(); return e ? supabase.from("watchlist_favorites").delete().eq("id",e.id) : supabase.from("watchlist_favorites").insert({user_id:uid,ticker}); };
export const getAlerts = async (uid) => { const {data}=await supabase.from("alerts").select("*").eq("user_id",uid).eq("active",true).order("created_at",{ascending:false}); return data||[]; };
export const createAlert = (a) => supabase.from("alerts").insert(a).select().single();
export const deleteAlert = (id) => supabase.from("alerts").delete().eq("id",id);
