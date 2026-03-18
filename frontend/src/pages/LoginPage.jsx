import { useState } from "react";
import { signInWithGoogle, supabase } from "../lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        });
        if (error) setError(error.message);
        else setSuccess("¡Revisá tu email para confirmar tu cuenta!");
      }
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#07090F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:20 }}>
      {/* Background glow */}
      <div style={{ position:"fixed", top:"20%", left:"50%", transform:"translateX(-50%)", width:600, height:600, background:"radial-gradient(circle, rgba(38,236,200,0.05) 0%, transparent 70%)", pointerEvents:"none" }}/>

      <div style={{ width:"100%", maxWidth:400, zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:36, fontWeight:800, color:"#26ECC8", letterSpacing:"-2px", marginBottom:6 }}>QuickInvest</div>
          <div style={{ color:"#64748B", fontSize:14 }}>Gestión inteligente de carteras</div>
        </div>

        {/* Card */}
        <div style={{ background:"#0D1117", border:"1px solid #1C2333", borderRadius:20, padding:"36px 40px", boxShadow:"0 0 60px rgba(38,236,200,0.04)" }}>

          {/* Tabs */}
          <div style={{ display:"flex", background:"#090D15", borderRadius:10, padding:4, marginBottom:28 }}>
            {[["login","Iniciar sesión"],["register","Registrarse"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setError("");setSuccess("");}} style={{ flex:1, padding:"9px", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600, background:mode===m?"#26ECC8":"transparent", color:mode===m?"#07090F":"#64748B", transition:"all 0.15s" }}>{l}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div style={{ marginBottom:14 }}>
                <label style={{ color:"#64748B", fontSize:11, fontWeight:700, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Nombre completo</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Juan Pérez" required style={{ background:"#090D15", border:"1px solid #1C2333", borderRadius:8, color:"#E2E8F0", padding:"11px 14px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"inherit", outline:"none" }}/>
              </div>
            )}
            <div style={{ marginBottom:14 }}>
              <label style={{ color:"#64748B", fontSize:11, fontWeight:700, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="juan@email.com" required style={{ background:"#090D15", border:"1px solid #1C2333", borderRadius:8, color:"#E2E8F0", padding:"11px 14px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"inherit", outline:"none" }}/>
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ color:"#64748B", fontSize:11, fontWeight:700, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Contraseña</label>
              <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••••" required minLength={6} style={{ background:"#090D15", border:"1px solid #1C2333", borderRadius:8, color:"#E2E8F0", padding:"11px 14px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"inherit", outline:"none" }}/>
            </div>

            {error && <div style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:8, padding:"10px 14px", color:"#F87171", fontSize:12, marginBottom:14 }}>{error}</div>}
            {success && <div style={{ background:"rgba(38,236,200,0.1)", border:"1px solid rgba(38,236,200,0.3)", borderRadius:8, padding:"10px 14px", color:"#26ECC8", fontSize:12, marginBottom:14 }}>{success}</div>}

            <button type="submit" disabled={loading} style={{ width:"100%", padding:"13px", background:"#26ECC8", color:"#07090F", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit", opacity:loading?0.7:1, marginBottom:16 }}>
              {loading ? "..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:"#1C2333" }}/>
            <span style={{ color:"#374151", fontSize:12 }}>o continuá con</span>
            <div style={{ flex:1, height:1, background:"#1C2333" }}/>
          </div>

          <button onClick={signInWithGoogle} style={{ width:"100%", padding:"12px 24px", background:"#fff", color:"#111", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontFamily:"inherit" }}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <div style={{ marginTop:20, color:"#374151", fontSize:11, textAlign:"center", lineHeight:1.6 }}>
            Al ingresar aceptás los términos de uso.<br/>Tus datos están protegidos y encriptados.
          </div>
        </div>

        <div style={{ textAlign:"center", marginTop:24, color:"#1C2333", fontSize:12 }}>
          © 2026 QuickInvest · Todos los derechos reservados
        </div>
      </div>
    </div>
  );
}
