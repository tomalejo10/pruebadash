import { useState } from "react";
import { signInWithGoogle, supabase } from "../lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(false);
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
        const { error } = await supabase.auth.signUp({ email, password, options:{ data:{ full_name:name } } });
        if (error) setError(error.message);
        else setSuccess("¡Revisá tu email para confirmar tu cuenta!");
      }
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  async function handleForgot() {
    if (!email) { setError("Ingresá tu email primero"); return; }
    setError(""); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo:`${window.location.origin}/reset-password` });
    if (error) setError(error.message);
    else setSuccess("Te enviamos un link para restablecer tu contraseña.");
    setLoading(false);
  }

  const inputStyle = { background:"#0A0F1A", border:"1px solid #2A3347", borderRadius:10, color:"#F1F5F9", padding:"13px 16px", fontSize:15, width:"100%", boxSizing:"border-box", fontFamily:"inherit", outline:"none" };
  const labelStyle = { color:"#94A3B8", fontSize:12, fontWeight:700, display:"block", marginBottom:7, textTransform:"uppercase", letterSpacing:"0.6px" };

  return (
    <div style={{ minHeight:"100vh", background:"#07090F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:20 }}>
      <div style={{ position:"fixed", top:"20%", left:"50%", transform:"translateX(-50%)", width:700, height:700, background:"radial-gradient(circle, rgba(38,236,200,0.06) 0%, transparent 70%)", pointerEvents:"none" }}/>

      <div style={{ width:"100%", maxWidth:420, zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <div style={{ fontSize:40, fontWeight:800, color:"#26ECC8", letterSpacing:"-2px", marginBottom:8 }}>QuickInvest</div>
          <div style={{ color:"#94A3B8", fontSize:15 }}>Gestión inteligente de carteras</div>
        </div>

        <div style={{ background:"#0D1117", border:"1px solid #1C2333", borderRadius:22, padding:"40px 44px", boxShadow:"0 0 80px rgba(38,236,200,0.05)" }}>
          <div style={{ display:"flex", background:"#090D15", borderRadius:12, padding:5, marginBottom:32 }}>
            {[["login","Iniciar sesión"],["register","Registrarse"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setError("");setSuccess("");}} style={{ flex:1, padding:"11px", border:"none", borderRadius:9, cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight:700, background:mode===m?"#26ECC8":"transparent", color:mode===m?"#07090F":"#94A3B8", transition:"all 0.15s" }}>{l}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div style={{ marginBottom:18 }}>
                <label style={labelStyle}>Nombre completo</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Juan Pérez" required style={inputStyle}/>
              </div>
            )}
            <div style={{ marginBottom:18 }}>
              <label style={labelStyle}>Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="juan@email.com" required style={inputStyle}/>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={labelStyle}>Contraseña</label>
              <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••••" required minLength={6} style={inputStyle}/>
            </div>

            {mode === "login" && (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"#94A3B8" }}>
                  <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} style={{ accentColor:"#26ECC8", width:16, height:16 }}/>
                  Recordar contraseña
                </label>
                <button type="button" onClick={handleForgot} style={{ background:"none", border:"none", color:"#26ECC8", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
            {mode === "register" && <div style={{ marginBottom:22 }}/>}

            {error && <div style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:8, padding:"11px 14px", color:"#FCA5A5", fontSize:13, marginBottom:16 }}>{error}</div>}
            {success && <div style={{ background:"rgba(38,236,200,0.1)", border:"1px solid rgba(38,236,200,0.3)", borderRadius:8, padding:"11px 14px", color:"#26ECC8", fontSize:13, marginBottom:16 }}>{success}</div>}

            <button type="submit" disabled={loading} style={{ width:"100%", padding:"14px", background:"#26ECC8", color:"#07090F", border:"none", borderRadius:11, fontWeight:800, fontSize:15, cursor:"pointer", fontFamily:"inherit", opacity:loading?0.7:1, marginBottom:18 }}>
              {loading ? "..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          </form>

          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
            <div style={{ flex:1, height:1, background:"#1C2333" }}/>
            <span style={{ color:"#64748B", fontSize:13 }}>o continuá con</span>
            <div style={{ flex:1, height:1, background:"#1C2333" }}/>
          </div>

          <button onClick={signInWithGoogle} style={{ width:"100%", padding:"13px 24px", background:"#fff", color:"#111", border:"none", borderRadius:11, fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontFamily:"inherit" }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <div style={{ marginTop:22, color:"#475569", fontSize:12, textAlign:"center", lineHeight:1.7 }}>
            Al ingresar aceptás los términos de uso.<br/>Tus datos están protegidos y encriptados.
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:28, color:"#1C2333", fontSize:12 }}>© 2026 QuickInvest · Todos los derechos reservados</div>
      </div>
    </div>
  );
}
