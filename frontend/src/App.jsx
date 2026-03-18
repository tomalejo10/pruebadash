import { useState, useEffect } from "react";
import { supabase, getProfile, upsertProfile } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import AdvisorApp from "./pages/AdvisorApp";
import ClientApp from "./pages/ClientApp";
import RiskProfileSetup from "./pages/RiskProfileSetup";
import AuthCallback from "./pages/AuthCallback";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const isCallback = window.location.pathname === "/auth/callback";

  useEffect(() => {
    if (isCallback) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) { console.error("Session error:", error); setLoading(false); return; }
      setSession(session);
      if (session) loadProfile(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, session?.user?.email);
      setSession(session);
      if (session) await loadProfile(session.user);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, [isCallback]);

  async function loadProfile(user) {
    setLoading(true);
    try {
      let { data, error } = await getProfile(user.id);
      console.log("Profile:", data, "Error:", error);
      if (!data) {
        const isAdvisor = user.email === import.meta.env.VITE_ADVISOR_EMAIL;
        const { data: newProfile, error: upsertError } = await upsertProfile({
          id: user.id, email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
          role: isAdvisor ? "advisor" : "client",
        });
        console.log("New profile:", newProfile, "Upsert error:", upsertError);
        data = newProfile;
      }
      setProfile(data);
    } catch(e) {
      console.error("loadProfile error:", e);
    }
    setLoading(false);
  }

  if (isCallback) return <AuthCallback />;
  if (loading) return <LoadingScreen />;
  if (!session) return <LoginPage />;
  if (profile?.role === "client" && !profile?.risk_profile)
    return <RiskProfileSetup user={session.user} profile={profile} onComplete={setProfile} />;
  if (profile?.role === "advisor") return <AdvisorApp session={session} profile={profile} />;
  if (profile?.role === "client") return <ClientApp session={session} profile={profile} onProfileUpdate={setProfile} />;
  return <LoginPage />;
}

function LoadingScreen() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#07090F", flexDirection:"column", gap:16 }}>
      <div style={{ color:"#26ECC8", fontSize:28, fontWeight:800, letterSpacing:"-1px" }}>QuickInvest</div>
      <div style={{ color:"#64748B", fontSize:13 }}>Cargando...</div>
    </div>
  );
}
