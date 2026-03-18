import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href).then(() => {
      window.location.href = "/";
    });
  }, []);

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#07090F", flexDirection:"column", gap:16 }}>
      <div style={{ color:"#26ECC8", fontSize:28, fontWeight:800 }}>QuickInvest</div>
      <div style={{ color:"#64748B", fontSize:13 }}>Verificando sesión...</div>
    </div>
  );
}
