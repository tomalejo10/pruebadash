import { useState, useEffect, useRef } from "react";
import { supabase, getProfile, upsertProfile } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import AdvisorApp from "./pages/AdvisorApp";
import ClientApp from "./pages/ClientApp";
import RiskProfileSetup from "./pages/RiskProfileSetup";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const loading = useRef(false);

  async function loadProfile(user) {
    if (loading.current) return;
    loading.current = true;
    try {
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
    } finally {
      loading.current = false;
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
      if (session) loadProfile(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { setSession(null); setProfile(null); loading.current = false; }
      if (event === "SIGNED_IN" && session) { setSession(session); loadProfile(session.user); }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined || (session && !profile)) return <LoadingScreen />;
  if (!session) return <LoginPage />;
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
