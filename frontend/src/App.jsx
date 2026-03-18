import { useState, useEffect } from "react";
import { supabase, getProfile, upsertProfile } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import AdvisorApp from "./pages/AdvisorApp";
import ClientApp from "./pages/ClientApp";
import RiskProfileSetup from "./pages/RiskProfileSetup";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Limpiar hash de URL después de OAuth redirect
    if (window.location.hash.includes("access_token")) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session) await loadProfile(session.user);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(user) {
    setLoading(true);
    let { data } = await getProfile(user.id);
    if (!data) {
      const isAdvisor = user.email === import.meta.env.VITE_ADVISOR_EMAIL;
      const { data: newProfile } = await upsertProfile({
        id: user.id, email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        role: isAdvisor ? "advisor" : "client",
      });
      data = newProfile;
    }
    setProfile(data);
    setLoading(false);
  }

  if (loading) return <LoadingScreen />;
  if (!session) return <LoginPage />;
  if (profile?.role === "client" && !profile?.risk_profile)
    return <RiskProfileSetup user={session.user} profile={profile} onComplete={setProfile} />;
  if (profile?.role === "advisor") return <AdvisorApp session={session} profile={profile} />;
  return <ClientApp session={session} profile={profile} onProfileUpdate={setProfile} />;
}

function LoadingScreen() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#07090F", flexDirection:"column", gap:16 }}>
      <div style={{ color:"#26ECC8", fontSize:28, fontWeight:800, letterSpacing:"-1px" }}>QuickInvest</div>
      <div style={{ color:"#64748B", fontSize:13 }}>Cargando...</div>
      <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}`}</style>
    </div>
  );
}
