import { useState, useEffect, useCallback } from "react";
import { signOut, getFavorites, toggleFavorite, getAlerts, createAlert, deleteAlert, getPortfolio, upsertPortfolioAsset, deletePortfolioAsset, upsertProfile, supabase } from "../lib/supabase";
import { getQuotes, getCrypto, getMEP } from "../api";
import PortfolioTracker from "./PortfolioTracker";

const C = { bg:"#07090F", card:"#0D1117", card2:"#111720", border:"#1C2333", cyan:"#26ECC8", cyanDim:"rgba(38,236,200,0.12)", text:"#E2E8F0", muted:"#64748B", green:"#4ADE80", red:"#F87171", yellow:"#FFD166", mono:"'JetBrains Mono',monospace" };

const WATCHLIST = {
  "CEDEARS":    ["AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","MELI","BRKB","JPM","V","MA","PYPL","NFLX","DIS","ADBE","AMD","INTC","IBM","BIDU","JD","PBR","VALE"],
  "ACCIONES AR":["GGAL","YPFD","PAMP","BBAR","TGSU2","TXAR","ALUA","CRES","TECO2","BMA","COME","LOMA","EDN","CEPU","MIRG"],
  "CRIPTO":     ["BTC","ETH","SOL","XRP","BNB","ADA","DOGE","AVAX"],
  "BONOS":      ["AL30","AL41","GD30","GD35","GD38","GD41","TX26","TX28"],
};

const CRIPTO_LIST = ["BTC","ETH","SOL","XRP","BNB","ADA","DOGE","AVAX","MATIC","DOT"];
const PC = { Conservador:"#4ECDC4", Moderado:"#FFD166", Agresivo:"#26ECC8" };
const PE = { Conservador:"🛡️", Moderado:"⚖️", Agresivo:"🚀" };

function fmt(n,d=2){if(n==null||isNaN(n))return"—";return Number(n).toLocaleString("es-AR",{minimumFractionDigits:d,maximumFractionDigits:d});}
function fmtBig(n){if(!n)return"—";if(n>=1e12)return"$"+fmt(n/1e12,1)+"T";if(n>=1e9)return"$"+fmt(n/1e9,1)+"B";if(n>=1e6)return"$"+fmt(n/1e6,1)+"M";return"$"+fmt(n);}
const inp = { background:"#090D15", border:`1px solid #1C2333`, borderRadius:8, color:"#E2E8F0", padding:"10px 14px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"inherit", outline:"none" };

export default function ClientApp({ session, profile, onProfileUpdate }) {
  const [tab, setTab] = useState("watchlist");
  const [mep, setMep] = useState(null);

  useEffect(() => {
    getMEP().then(setMep).catch(()=>{});
  }, []);

  const nav = [
    { id:"watchlist", icon:"📡", label:"Watchlist" },
    { id:"cartera",   icon:"💼", label:"Mi Cartera" },
    { id:"alertas",   icon:"🔔", label:"Alertas" },
    { id:"perfil",    icon:"🎯", label:"Mi Perfil" },
  ];
  const pc = PC[profile?.risk_profile] || C.cyan;

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"'DM Sans',sans-serif", overflow:"hidden" }}>
      <div style={{ width:210, minWidth:210, background:C.card, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", padding:"22px 14px" }}>
        <div style={{ marginBottom:16 }}>
          <div style={{ color:C.cyan, fontSize:18, fontWeight:800 }}>QuickInvest</div>
          <div style={{ color:C.muted, fontSize:10, marginTop:2, textTransform:"uppercase" }}>Panel Cliente</div>
        </div>
        {/* MEP Badge */}
        {mep?.mark && (
          <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", marginBottom:16 }}>
            <div style={{ color:C.muted, fontSize:10, marginBottom:2 }}>💵 Dólar MEP</div>
            <div style={{ color:C.cyan, fontFamily:C.mono, fontWeight:700, fontSize:14 }}>${fmt(mep.mark)}</div>
          </div>
        )}
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
        {tab==="cartera"   && <PortfolioTracker userId={session.user.id} profile={profile} />}
        {tab==="alertas"   && <AlertasTab userId={session.user.id} />}
        {tab==="perfil"    && <PerfilTab profile={profile} userId={session.user.id} onUpdate={onProfileUpdate} />}
      </div>
    </div>
  );
}

function WatchlistTab({ userId }) {
  const [cat, setCat] = useState("CEDEARS");
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showFavOnly, setShowFavOnly] = useState(false);

  useEffect(()=>{ getFavorites(userId).then(setFavorites); },[userId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tickers = WATCHLIST[cat] || [];
      const isCripto = cat === "CRIPTO";
      const data = isCripto ? await getCrypto(tickers) : await getQuotes(tickers);
      setQuotes(data);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [cat]);

  useEffect(()=>{ load(); },[load]);

  async function handleFav(ticker){ await toggleFavorite(userId,ticker); setFavorites(await getFavorites(userId)); }

  const tickers = showFavOnly ? (WATCHLIST[cat]||[]).filter(t=>favorites.includes(t)) : (WATCHLIST[cat]||[]);
  const isCripto = cat === "CRIPTO";
  const currency = isCripto ? "USD" : "ARS";

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Watchlist</div>
          <div style={{ color:C.muted, fontSize:13 }}>Precios en {currency} vía data912 · ⭐ favorito</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setShowFavOnly(!showFavOnly)} style={{ background:showFavOnly?C.cyanDim:"transparent", border:`1px solid ${showFavOnly?C.cyan:C.border}`, color:showFavOnly?C.cyan:C.muted, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:600 }}>⭐ Favoritos</button>
          <button onClick={load} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>🔄</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:18 }}>
        {Object.keys(WATCHLIST).map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{ padding:"5px 14px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer", border:"none", background:cat===c?C.cyan:C.cyanDim, color:cat===c?"#07090F":C.cyan, fontFamily:"inherit" }}>
            {c} ({WATCHLIST[c].length})
          </button>
        ))}
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"32px 2fr 1fr 1fr 1fr", padding:"10px 14px", borderBottom:`1px solid ${C.border}` }}>
          {["","Ticker","Precio","Cambio %","Volumen"].map((h,i)=>(<div key={i} style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{h}</div>))}
        </div>
        {loading && <div style={{ padding:20, color:C.muted, fontSize:13 }}>⏳ Cargando precios...</div>}
        {!loading && tickers.map(ticker => {
          const q = quotes[ticker];
          const pos = q?.changePct >= 0;
          const isFav = favorites.includes(ticker);
          return (
            <div key={ticker} style={{ display:"grid", gridTemplateColumns:"32px 2fr 1fr 1fr 1fr", padding:"11px 14px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
              <button onClick={()=>handleFav(ticker)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, opacity:isFav?1:0.3, padding:0 }}>⭐</button>
              <div>
                <div style={{ fontFamily:C.mono, fontWeight:700, fontSize:13 }}>{ticker}</div>
                <div style={{ color:C.muted, fontSize:10 }}>{isCripto?"Crypto":"AR"}</div>
              </div>
              <span style={{ fontFamily:C.mono, fontSize:13 }}>
                {q?.price ? `${currency==="USD"?"$":"$"}${fmt(q.price)}` : "—"}
              </span>
              <span style={{ color:q?(pos?C.green:C.red):C.muted, fontFamily:C.mono, fontSize:12 }}>
                {q?.changePct!=null?(pos?"+":"")+fmt(q.changePct)+"%":"—"}
              </span>
              <span style={{ color:C.muted, fontSize:11 }}>{q?.volume?fmt(q.volume,0):"—"}</span>
            </div>
          );
        })}
        {!loading && tickers.length===0 && <div style={{ padding:24, textAlign:"center", color:C.muted, fontSize:13 }}>No tenés favoritos en esta categoría.</div>}
      </div>
    </div>
  );
}

function AlertasTab({ userId }) {
  const [alerts, setAlerts] = useState([]);
  const [ticker, setTicker] = useState("");
  const [type, setType] = useState("price_above");
  const [alertType, setAlertType] = useState("price");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async()=>{ const data=await getAlerts(userId); setAlerts(data); },[userId]);
  useEffect(()=>{ load(); },[load]);

  async function handleCreate(){
    if(!ticker||!price) return; setSaving(true);
    await createAlert({ user_id:userId, ticker:ticker.toUpperCase(), type, alert_type:alertType, target_price:parseFloat(price), email_notify:true, active:true, created_by:userId });
    await load(); setTicker(""); setPrice(""); setSaving(false);
  }

  const alertTypeColor = { buy:C.green, sell:C.red, price:C.cyan };
  const alertTypeLabel = { buy:"🟢 COMPRA", sell:"🔴 VENTA", price:"🔵 PRECIO" };

  return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Alertas</div>
      <div style={{ color:C.muted, fontSize:13, marginBottom:24 }}>Tus alertas y las de tu asesor</div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22, marginBottom:18 }}>
        <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>Nueva alerta</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr auto", gap:12, alignItems:"end" }}>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>TICKER</label><input value={ticker} onChange={e=>setTicker(e.target.value)} placeholder="GGAL" style={inp}/></div>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>TIPO</label>
            <select value={alertType} onChange={e=>setAlertType(e.target.value)} style={inp}>
              <option value="price">🔵 Precio</option>
              <option value="buy">🟢 Compra</option>
              <option value="sell">🔴 Venta</option>
            </select>
          </div>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>CONDICIÓN</label>
            <select value={type} onChange={e=>setType(e.target.value)} style={inp}>
              <option value="price_above">↑ Sube a</option>
              <option value="price_below">↓ Baja a</option>
            </select>
          </div>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>PRECIO</label><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="6500" type="number" style={inp}/></div>
          <button onClick={handleCreate} disabled={saving||!ticker||!price} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", opacity:saving||!ticker||!price?0.5:1 }}>{saving?"...":"+ Crear"}</button>
        </div>
      </div>
      {alerts.length===0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:40, textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔔</div>
          <div style={{ color:C.muted, fontSize:13 }}>No tenés alertas activas. Tu asesor también puede enviarte alertas de compra y venta.</div>
        </div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          {alerts.map(a=>{
            const color = alertTypeColor[a.alert_type||"price"];
            const byAdvisor = a.created_by && a.created_by !== userId;
            return (
              <div key={a.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 60px", padding:"13px 16px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
                <span style={{ fontFamily:C.mono, fontWeight:700 }}>{a.ticker}</span>
                <span style={{ background:`${color}20`, color, border:`1px solid ${color}`, borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:700, display:"inline-block" }}>{alertTypeLabel[a.alert_type||"price"]}</span>
                <span style={{ color:C.muted, fontSize:12 }}>{a.type==="price_above"?"↑ Sube a":"↓ Baja a"}</span>
                <span style={{ color, fontFamily:C.mono, fontWeight:700 }}>${fmt(a.target_price)}</span>
                <span style={{ fontSize:11, color:byAdvisor?C.yellow:C.muted }}>{byAdvisor?"👨‍💼 Asesor":"Yo"}</span>
                {!byAdvisor && <button onClick={()=>deleteAlert(a.id).then(load)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.red, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>✕</button>}
                {byAdvisor && <span/>}
              </div>
            );
          })}
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
              <input value={name} onChange={e=>setName(e.target.value)} style={{...inp, marginBottom:12}}/>
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
          <div style={{ background:"rgba(38,236,200,0.05)", border:"1px solid rgba(38,236,200,0.15)", borderRadius:8, padding:"10px 14px", fontSize:12, color:C.muted }}>ℹ️ Se recomienda revisar anualmente.</div>
        </div>
      </div>
    </div>
  );
}
