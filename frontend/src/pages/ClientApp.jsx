import { useState, useEffect, useCallback } from "react";
import { signOut, getFavorites, toggleFavorite, getAlerts, createAlert, deleteAlert, getPortfolio, upsertProfile } from "../lib/supabase";

const C = { bg:"#07090F", card:"#0D1117", card2:"#111720", border:"#1C2333", cyan:"#26ECC8", cyanDim:"rgba(38,236,200,0.12)", text:"#E2E8F0", muted:"#64748B", green:"#4ADE80", red:"#F87171", yellow:"#FFD166", mono:"'JetBrains Mono',monospace" };
const API = import.meta.env.VITE_API_URL || "/api";
const WATCHLIST = {
  "MEMBRESÍA": ["ADBE","AI","BRK-B","DIS","GGAL","GOOGL","HPQ","JD","MELI","MSFT","NKE","PBR","PEP","PYPL","TSLA","UNH","URA","VIST"],
  "CRIPTO": ["BTC","ETH","SOL","XRP"],
  "RADAR": ["BB","FCX","MSTR","PM","RACE","TMUS","CVX","PAGS","TXN","PFE","TGT","MDT","EWZ"],
  "ACTIVAS": ["RBLX","LMT","META","NVDA","AMZN","ORCL"],
  "TECH": ["CRM","AVGO","SAP","PATH","MRVL","SNOW","QCOM","IBM"],
  "SEGUIMIENTO": ["NU","SWKS","COST","OXY","NFLX","MDLZ","ADP","MU","LRCX","ASML","PAM","UBER","SONY","AAPL","PLTR","NIO"],
};
const PC = { Conservador:"#4ECDC4", Moderado:"#FFD166", Agresivo:"#26ECC8" };
const PE = { Conservador:"🛡️", Moderado:"⚖️", Agresivo:"🚀" };
function fmt(n,d=2){if(n==null)return"—";return Number(n).toLocaleString("es-AR",{minimumFractionDigits:d,maximumFractionDigits:d});}
function fmtBig(n){if(!n)return"—";if(n>=1e12)return"$"+fmt(n/1e12,1)+"T";if(n>=1e9)return"$"+fmt(n/1e9,1)+"B";if(n>=1e6)return"$"+fmt(n/1e6,1)+"M";return"$"+fmt(n);}

export default function ClientApp({ session, profile, onProfileUpdate }) {
  const [tab, setTab] = useState("watchlist");
  const nav = [{ id:"watchlist",icon:"📡",label:"Watchlist"},{ id:"cartera",icon:"💼",label:"Mi Cartera"},{ id:"alertas",icon:"🔔",label:"Alertas"},{ id:"perfil",icon:"🎯",label:"Mi Perfil"}];
  const pc = PC[profile?.risk_profile] || C.cyan;
  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"'DM Sans',sans-serif", overflow:"hidden" }}>
      <div style={{ width:210, minWidth:210, background:C.card, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", padding:"22px 14px" }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ color:C.cyan, fontSize:18, fontWeight:800 }}>QuickInvest</div>
          <div style={{ color:C.muted, fontSize:10, marginTop:2, textTransform:"uppercase" }}>Panel Cliente</div>
        </div>
        {nav.map(item=>(
          <div key={item.id} onClick={()=>setTab(item.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:8, marginBottom:3, cursor:"pointer", fontSize:13, background:tab===item.id?C.cyanDim:"transparent", color:tab===item.id?C.cyan:C.muted, fontWeight:tab===item.id?700:400, borderLeft:`3px solid ${tab===item.id?C.cyan:"transparent"}` }}>
            <span>{item.icon}</span>{item.label}
          </div>
        ))}
        <div style={{ marginTop:"auto" }}>
          <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:10 }}>
            <div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", marginBottom:6 }}>Tu perfil</div>
            {profile?.risk_profile ? <div style={{ fontSize:13, fontWeight:700, color:pc }}>{PE[profile.risk_profile]} {profile.risk_profile}</div> : <div style={{ fontSize:12, color:C.muted }}>Sin definir</div>}
            <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{profile?.full_name||profile?.email}</div>
          </div>
          <button onClick={signOut} style={{ width:"100%", background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"8px", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Cerrar sesión</button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"28px 32px" }}>
        {tab==="watchlist" && <WatchlistTab userId={session.user.id} />}
        {tab==="cartera"   && <CarteraTab userId={session.user.id} profile={profile} />}
        {tab==="alertas"   && <AlertasTab userId={session.user.id} />}
        {tab==="perfil"    && <PerfilTab profile={profile} userId={session.user.id} onUpdate={onProfileUpdate} />}
      </div>
    </div>
  );
}

function WatchlistTab({ userId }) {
  const [cat, setCat] = useState("MEMBRESÍA");
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showFavOnly, setShowFavOnly] = useState(false);
  useEffect(()=>{ getFavorites(userId).then(setFavorites); },[userId]);
  const load = useCallback(async()=>{
    setLoading(true);
    try { const r=await fetch(`${API}/quote?tickers=${WATCHLIST[cat].join(",")}`); setQuotes(await r.json()); } catch(e){}
    setLoading(false);
  },[cat]);
  useEffect(()=>{ load(); },[load]);
  async function handleFav(ticker){ await toggleFavorite(userId,ticker); setFavorites(await getFavorites(userId)); }
  const tickers = showFavOnly ? (WATCHLIST[cat]||[]).filter(t=>favorites.includes(t)) : (WATCHLIST[cat]||[]);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div><div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Watchlist</div><div style={{ color:C.muted, fontSize:13 }}>Precios actualizados · ⭐ favorito</div></div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setShowFavOnly(!showFavOnly)} style={{ background:showFavOnly?C.cyanDim:"transparent", border:`1px solid ${showFavOnly?C.cyan:C.border}`, color:showFavOnly?C.cyan:C.muted, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:600 }}>⭐ Favoritos</button>
          <button onClick={load} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>🔄</button>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:18 }}>
        {Object.keys(WATCHLIST).map(c=>(<button key={c} onClick={()=>setCat(c)} style={{ padding:"5px 14px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer", border:"none", background:cat===c?C.cyan:C.cyanDim, color:cat===c?"#07090F":C.cyan, fontFamily:"inherit" }}>{c}</button>))}
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"32px 1.8fr 1fr 1fr 1fr 1fr", padding:"10px 14px", borderBottom:`1px solid ${C.border}` }}>
          {["","Ticker","Precio","Cambio","%","Mkt Cap"].map((h,i)=>(<div key={i} style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{h}</div>))}
        </div>
        {loading && <div style={{ padding:20, color:C.muted, fontSize:13 }}>⏳ Cargando...</div>}
        {!loading && tickers.map(ticker=>{
          const q=quotes[ticker]; const pos=q?.changePct>=0; const isFav=favorites.includes(ticker);
          return (
            <div key={ticker} style={{ display:"grid", gridTemplateColumns:"32px 1.8fr 1fr 1fr 1fr 1fr", padding:"11px 14px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
              <button onClick={()=>handleFav(ticker)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, opacity:isFav?1:0.3, padding:0 }}>⭐</button>
              <div><div style={{ fontFamily:C.mono, fontWeight:700, fontSize:13 }}>{ticker}</div>{q?.name&&<div style={{ color:C.muted, fontSize:10 }}>{q.name.slice(0,24)}</div>}</div>
              <span style={{ fontFamily:C.mono, fontSize:13 }}>{q?.price?"$"+fmt(q.price):"—"}</span>
              <span style={{ color:q?(pos?C.green:C.red):C.muted, fontFamily:C.mono, fontSize:12 }}>{q?.change!=null?(pos?"+":"")+fmt(q.change):"—"}</span>
              <span style={{ color:q?(pos?C.green:C.red):C.muted, fontFamily:C.mono, fontSize:12 }}>{q?.changePct!=null?(pos?"+":"")+fmt(q.changePct)+"%":"—"}</span>
              <span style={{ color:C.muted, fontSize:11 }}>{fmtBig(q?.marketCap)}</span>
            </div>
          );
        })}
        {!loading&&tickers.length===0&&<div style={{ padding:24, textAlign:"center", color:C.muted, fontSize:13 }}>No tenés favoritos acá. Clickeá ⭐ para agregar.</div>}
      </div>
    </div>
  );
}

function CarteraTab({ userId, profile }) {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const pc = PC[profile?.risk_profile] || C.cyan;
  useEffect(()=>{ getPortfolio(userId).then(({data})=>{ setPortfolio(data); setLoading(false); }); },[userId]);
  if(loading) return <div style={{ color:C.muted, padding:20 }}>⏳ Cargando...</div>;
  if(!portfolio||!portfolio.portfolio_assets?.length) return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Mi Cartera</div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:40, textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>💼</div>
        <div style={{ color:C.muted, fontSize:13 }}>Tu asesor todavía no cargó activos en tu cartera.</div>
      </div>
    </div>
  );
  const assets=portfolio.portfolio_assets;
  const totalW=assets.reduce((a,b)=>a+(b.weight||0),0);
  return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Mi Cartera</div>
      <div style={{ color:C.muted, fontSize:13, marginBottom:24 }}>Perfil: <span style={{ color:pc }}>{PE[profile?.risk_profile]} {profile?.risk_profile}</span></div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr 2fr", padding:"10px 16px", borderBottom:`1px solid ${C.border}` }}>
          {["Ticker","Peso %","Cantidad","Precio Prom.","Notas"].map(h=>(<div key={h} style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{h}</div>))}
        </div>
        {assets.map(a=>(
          <div key={a.id} style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr 2fr", padding:"12px 16px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
            <span style={{ fontFamily:C.mono, fontWeight:700 }}>{a.ticker}</span>
            <div><span style={{ color:pc, fontFamily:C.mono, fontWeight:700 }}>{a.weight}%</span><div style={{ height:3, borderRadius:2, background:C.border, marginTop:4, width:"80%" }}><div style={{ width:`${(a.weight/totalW)*100}%`, height:"100%", background:pc, borderRadius:2 }}/></div></div>
            <span style={{ fontFamily:C.mono, color:C.muted }}>{a.quantity||"—"}</span>
            <span style={{ fontFamily:C.mono, color:C.muted }}>{a.avg_price?"$"+fmt(a.avg_price):"—"}</span>
            <span style={{ color:C.muted, fontSize:12 }}>{a.notes||"—"}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop:12, color:C.muted, fontSize:11 }}>⚠️ Información orientativa. No constituye asesoramiento financiero personalizado.</div>
    </div>
  );
}

function AlertasTab({ userId }) {
  const [alerts, setAlerts] = useState([]);
  const [ticker, setTicker] = useState("");
  const [type, setType] = useState("price_above");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(()=>{ getAlerts(userId).then(setAlerts); },[userId]);
  async function handleCreate(){
    if(!ticker||!price) return; setSaving(true);
    await createAlert({ user_id:userId, ticker:ticker.toUpperCase(), type, target_price:parseFloat(price), email_notify:true, active:true });
    setAlerts(await getAlerts(userId)); setTicker(""); setPrice(""); setSaving(false);
  }
  async function handleDelete(id){ await deleteAlert(id); setAlerts(alerts.filter(a=>a.id!==id)); }
  const inp = { background:"#090D15", border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"10px 14px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"inherit", outline:"none" };
  return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Alertas</div>
      <div style={{ color:C.muted, fontSize:13, marginBottom:24 }}>Recibís un email cuando el activo llegue al precio objetivo</div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22, marginBottom:18 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:12, alignItems:"end" }}>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>TICKER</label><input value={ticker} onChange={e=>setTicker(e.target.value)} placeholder="AAPL" style={inp}/></div>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>CONDICIÓN</label><select value={type} onChange={e=>setType(e.target.value)} style={inp}><option value="price_above">Precio sube a</option><option value="price_below">Precio baja a</option></select></div>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>PRECIO USD</label><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="150.00" type="number" style={inp}/></div>
          <button onClick={handleCreate} disabled={saving||!ticker||!price} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", opacity:saving||!ticker||!price?0.5:1 }}>{saving?"...":"+ Crear"}</button>
        </div>
      </div>
      {alerts.length===0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:40, textAlign:"center" }}><div style={{ fontSize:32, marginBottom:10 }}>🔔</div><div style={{ color:C.muted, fontSize:13 }}>No tenés alertas activas.</div></div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          {alerts.map(a=>(
            <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ fontFamily:C.mono, fontWeight:700 }}>{a.ticker}</span>
                <span style={{ color:C.muted, fontSize:12 }}>{a.type==="price_above"?"sube a":"baja a"}</span>
                <span style={{ color:C.cyan, fontFamily:C.mono, fontWeight:700 }}>${fmt(a.target_price)}</span>
                {a.email_notify&&<span style={{ background:"rgba(38,236,200,0.1)", color:C.cyan, fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:600 }}>📧 EMAIL</span>}
              </div>
              <button onClick={()=>handleDelete(a.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:6, padding:"4px 12px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>Eliminar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PerfilTab({ profile, userId, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.full_name||"");
  const [saving, setSaving] = useState(false);
  const pc = PC[profile?.risk_profile] || C.cyan;
  async function handleSave(){ setSaving(true); const {data}=await upsertProfile({...profile,id:userId,full_name:name}); onUpdate(data); setEditing(false); setSaving(false); }
  const updatedAt = profile?.risk_updated_at ? new Date(profile.risk_updated_at).toLocaleDateString("es-AR") : "—";
  const nextUpdate = profile?.risk_updated_at ? new Date(new Date(profile.risk_updated_at).setFullYear(new Date(profile.risk_updated_at).getFullYear()+1)).toLocaleDateString("es-AR") : "—";
  return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Mi Perfil</div>
      <div style={{ color:C.muted, fontSize:13, marginBottom:24 }}>Tu información y perfil de riesgo</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22 }}>
          <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>Datos personales</div>
          {editing ? (
            <div>
              <input value={name} onChange={e=>setName(e.target.value)} style={{ background:"#090D15", border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"10px 14px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"inherit", outline:"none", marginBottom:12 }}/>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={handleSave} disabled={saving} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>{saving?"...":"Guardar"}</button>
                <button onClick={()=>setEditing(false)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{profile?.full_name}</div>
              <div style={{ color:C.muted, fontSize:13, marginBottom:16 }}>{profile?.email}</div>
              <button onClick={()=>setEditing(true)} style={{ background:C.cyanDim, border:`1px solid ${C.border}`, color:C.cyan, borderRadius:8, padding:"7px 14px", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:600 }}>Editar nombre</button>
            </div>
          )}
        </div>
        <div style={{ background:C.card, border:`2px solid ${pc}`, borderRadius:12, padding:22 }}>
          <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>Perfil de riesgo</div>
          <div style={{ fontSize:28, marginBottom:6 }}>{PE[profile?.risk_profile]||"—"}</div>
          <div style={{ fontSize:22, fontWeight:800, color:pc, marginBottom:4 }}>{profile?.risk_profile||"Sin definir"}</div>
          <div style={{ color:C.muted, fontSize:12, marginBottom:16 }}>Último test: {updatedAt}<br/>Próxima revisión: {nextUpdate}</div>
          <div style={{ background:"rgba(38,236,200,0.05)", border:"1px solid rgba(38,236,200,0.15)", borderRadius:8, padding:"10px 14px", fontSize:12, color:C.muted }}>ℹ️ Se recomienda revisar anualmente o ante cambios en tu situación financiera.</div>
        </div>
      </div>
    </div>
  );
}
