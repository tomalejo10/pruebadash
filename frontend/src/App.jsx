import { useState, useEffect } from "react";
import { supabase, getProfile, upsertProfile } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import AdvisorApp from "./pages/AdvisorApp";
import ClientApp from "./pages/ClientApp";
import RiskProfileSetup from "./pages/RiskProfileSetup";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) loadProfile(session.user);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(user) {
    let { data } = await getProfile(user.id);
    if (!data) {
      const { data: np } = await upsertProfile({
        id: user.id, email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        role: user.email === import.meta.env.VITE_ADVISOR_EMAIL ? "advisor" : "client",
      });
      data = np;
    }
    setProfile(data);
  }

  // session === undefined significa que todavía estamos cargando
  if (session === undefined) return <LoadingScreen />;
  if (!session) return <LoginPage />;
  if (!profile) return <LoadingScreen />;
  if (profile.role === "client" && !profile.risk_profile)
    return <RiskProfileSetup user={session.user} profile={profile} onComplete={setProfile} />;
  if (profile.role === "advisor") return <AdvisorApp session={session} profile={profile} />;
  return <ClientApp session={session} profile={profile} onProfileUpdate={setProfile} />;
}

function LoadingScreen() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#07090F", flexDirection:"column", gap:16 }}>
      <div style={{ color:"#26ECC8", fontSize:28, fontWeight:800 }}>QuickInvest</div>
      <div style={{ color:"#64748B", fontSize:13 }}>Cargando...</div>
    </div>
  );
}
