import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken:true, persistSession:true, detectSessionInUrl:true, flowType:"implicit" } }
);

export const signInWithGoogle = () => supabase.auth.signInWithOAuth({ provider:"google", options:{ redirectTo: window.location.origin } });
export const signOut = () => supabase.auth.signOut();
export const getProfile = (id) => supabase.from("profiles").select("*").eq("id",id).single();
export const upsertProfile = (p) => supabase.from("profiles").upsert(p,{onConflict:"id"}).select().single();
export const getAllClients = () => supabase.from("profiles").select("*").eq("role","client").order("created_at",{ascending:false});
export const getPortfolio = (uid) => supabase.from("portfolios").select("*, portfolio_assets(*)").eq("user_id",uid).single();
export const upsertPortfolioAsset = (a) => supabase.from("portfolio_assets").upsert(a).select().single();
export const deletePortfolioAsset = (id) => supabase.from("portfolio_assets").delete().eq("id",id);
export const getFavorites = async (uid) => { const {data}=await supabase.from("watchlist_favorites").select("ticker").eq("user_id",uid); return data?.map(d=>d.ticker)||[]; };
export const toggleFavorite = async (uid,ticker) => { const {data:e}=await supabase.from("watchlist_favorites").select("id").eq("user_id",uid).eq("ticker",ticker).single(); return e ? supabase.from("watchlist_favorites").delete().eq("id",e.id) : supabase.from("watchlist_favorites").insert({user_id:uid,ticker}); };
export const getAlerts = async (uid) => { const {data}=await supabase.from("alerts").select("*").eq("user_id",uid).eq("active",true).order("created_at",{ascending:false}); return data||[]; };
export const createAlert = (a) => supabase.from("alerts").insert(a).select().single();
export const deleteAlert = (id) => supabase.from("alerts").delete().eq("id",id);
