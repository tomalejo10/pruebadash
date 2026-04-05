import { useState, useEffect, useCallback } from "react";
import { signOut, getFavorites, toggleFavorite, getAlerts, createAlert, deleteAlert, upsertProfile } from "../lib/supabase";
import { getQuotes, getCrypto, getMEP, getCCL } from "../api";
import PortfolioTracker from "./PortfolioTracker";

const C = { bg:"#07090F", card:"#0D1117", card2:"#111720", border:"#1C2333", cyan:"#26ECC8", cyanDim:"rgba(38,236,200,0.12)", text:"#E2E8F0", muted:"#64748B", green:"#4ADE80", red:"#F87171", yellow:"#FFD166", mono:"'JetBrains Mono',monospace" };

// Lista de la membresía con nombres y zonas de compra
const MEMBRESIA = {
  activas: [
    { ticker:"GOOG",  nombre:"Google",           zonaCompra:273,  perfil:"Moderado/Agresivo", plazo:"Largo" },
    { ticker:"WMT",   nombre:"Walmart",           zonaCompra:120,  perfil:"Conservador/Moderado", plazo:"Mediano" },
    { ticker:"URA",   nombre:"URA (ETF Uranio)",  zonaCompra:50,   perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"PM",    nombre:"Philip Morris",     zonaCompra:168,  perfil:"Moderado", plazo:"Mediano" },
    { ticker:"AMZN",  nombre:"Amazon",            zonaCompra:215,  perfil:"Moderado/Agresivo", plazo:"Largo" },
    { ticker:"ASTS",  nombre:"AST SpaceMobile",   zonaCompra:92,   perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"QCOM",  nombre:"Qualcomm",          zonaCompra:145,  perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"NIO",   nombre:"NIO",               zonaCompra:5,    perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"SONY",  nombre:"Sony Group",        zonaCompra:22,   perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"MSFT",  nombre:"Microsoft",         zonaCompra:393,  perfil:"Moderado/Agresivo", plazo:"Largo" },
    { ticker:"BIIB",  nombre:"Biogen",            zonaCompra:186,  perfil:"Moderado", plazo:"Mediano" },
    { ticker:"NU",    nombre:"Nu Holdings",       zonaCompra:16,   perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"GGAL",  nombre:"Galicia",           zonaCompra:53,   perfil:"Agresivo", plazo:"Mediano" },
    { ticker:"V",     nombre:"Visa",              zonaCompra:327,  perfil:"Moderado/Agresivo", plazo:"Largo" },
    { ticker:"PG",    nombre:"Procter & Gamble",  zonaCompra:141,  perfil:"Conservador/Moderado", plazo:"Largo" },
    { ticker:"UBER",  nombre:"Uber",              zonaCompra:82,   perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"UNH",   nombre:"UnitedHealth",      zonaCompra:328,  perfil:"Moderado/Agresivo", plazo:"Largo" },
    { ticker:"PAGS",  nombre:"PagSeguro",         zonaCompra:9,    perfil:"Agresivo", plazo:"Mediano" },
    { ticker:"ORCL",  nombre:"Oracle",            zonaCompra:191,  perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"NFLX",  nombre:"Netflix",           zonaCompra:98,   perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"META",  nombre:"Meta",              zonaCompra:622,  perfil:"Moderado/Agresivo", plazo:"Largo" },
    { ticker:"RBLX",  nombre:"Roblox",            zonaCompra:107,  perfil:"Agresivo", plazo:"Mediano" },
    { ticker:"CRM",   nombre:"Salesforce",        zonaCompra:250,  perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"RACE",  nombre:"Ferrari",           zonaCompra:399,  perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"TMUS",  nombre:"T-Mobile",          zonaCompra:221,  perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"MELI",  nombre:"MercadoLibre",      zonaCompra:2230, perfil:"Moderado/Agresivo", plazo:"Largo" },
    { ticker:"JD",    nombre:"JD.com",            zonaCompra:34,   perfil:"Agresivo", plazo:"Mediano" },
    { ticker:"NKE",   nombre:"Nike",              zonaCompra:72,   perfil:"Moderado/Agresivo", plazo:"Mediano" },
    { ticker:"ADBE",  nombre:"Adobe",             zonaCompra:348,  perfil:"Agresivo", plazo:"Mediano" },
    { ticker:"DIS",   nombre:"Disney",            zonaCompra:117,  perfil:"Moderado", plazo:"Mediano" },
    { ticker:"HPQ",   nombre:"HP Inc.",           zonaCompra:28,   perfil:"Moderado", plazo:"Mediano" },
    { ticker:"PYPL",  nombre:"PayPal",            zonaCompra:63,   perfil:"Moderado/Agresivo", plazo:"Mediano" },
  ],
  radar: [
    { ticker:"AAPL",  nombre:"Apple",            zonaCompra:230,  perfil:"Moderado" },
    { ticker:"INTC",  nombre:"Intel",            zonaCompra:35,   perfil:"Moderado/Agresivo" },
    { ticker:"NVDA",  nombre:"Nvidia",           zonaCompra:145,  perfil:"Moderado/Agresivo" },
    { ticker:"GE",    nombre:"GE Aerospace",     zonaCompra:234,  perfil:"Moderado/Agresivo" },
    { ticker:"ABBV",  nombre:"AbbVie",           zonaCompra:188,  perfil:"Moderado" },
    { ticker:"AVGO",  nombre:"Broadcom",         zonaCompra:255,  perfil:"Moderado/Agresivo" },
    { ticker:"CAT",   nombre:"Caterpillar",      zonaCompra:646,  perfil:"Moderado/Agresivo" },
    { ticker:"AMD",   nombre:"AMD",              zonaCompra:176,  perfil:"Agresivo" },
    { ticker:"MCO",   nombre:"Moody's",          zonaCompra:414,  perfil:"Moderado" },
    { ticker:"COST",  nombre:"Costco",           zonaCompra:942,  perfil:"Conservador/Moderado" },
    { ticker:"LMT",   nombre:"Lockheed Martin",  zonaCompra:430,  perfil:"Moderado/Agresivo" },
    { ticker:"LLY",   nombre:"Eli Lilly",        zonaCompra:860,  perfil:"Moderado" },
    { ticker:"TSLA",  nombre:"Tesla",            zonaCompra:278,  perfil:"Moderado/Agresivo" },
    { ticker:"MU",    nombre:"Micron",           zonaCompra:263,  perfil:"Moderado/Agresivo" },
    { ticker:"MRVL",  nombre:"Marvell Tech",     zonaCompra:83,   perfil:"Moderado/Agresivo" },
  ],
  cripto: [
    { ticker:"ETH", nombre:"Ethereum" },
    { ticker:"BTC", nombre:"Bitcoin" },
  ],
};

const PC = { Conservador:"#4ECDC4", Moderado:"#FFD166", Agresivo:"#26ECC8" };
const PE = { Conservador:"🛡️", Moderado:"⚖️", Agresivo:"🚀" };
function fmt(n,d=2){if(n==null||isNaN(n))return"—";return Number(n).toLocaleString("es-AR",{minimumFractionDigits:d,maximumFractionDigits:d});}
const inp = { background:"#090D15", border:`1px solid #1C2333`, borderRadius:8, color:"#E2E8F0", padding:"10px 14px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"inherit", outline:"none" };

export default function ClientApp({ session, profile, onProfileUpdate }) {
  const [tab, setTab] = useState("watchlist");
  const [mep, setMep] = useState(null);
  const [ccl, setCcl] = useState(null);
  const [dolarMode, setDolarMode] = useState("MEP"); // MEP | CCL

  useEffect(() => {
    getMEP().then(d => { if(d && !d.error) setMep(d); }).catch(()=>{});
    getCCL().then(d => { if(Array.isArray(d) && d.length) setCcl(d[0]); }).catch(()=>{});
  }, []);

  const nav = [
    { id:"watchlist", icon:"📡", label:"Watchlist" },
    { id:"cartera",   icon:"💼", label:"Mi Cartera" },
    { id:"alertas",   icon:"🔔", label:"Alertas" },
    { id:"perfil",    icon:"🎯", label:"Mi Perfil" },
  ];
  const pc = PC[profile?.risk_profile] || C.cyan;
  const dolarPrice = dolarMode === "MEP" ? mep?.mark : ccl?.CCL_mark;

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"'DM Sans',sans-serif", overflow:"hidden" }}>
      <div style={{ width:220, minWidth:220, background:C.card, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", padding:"22px 14px" }}>
        <div style={{ marginBottom:12 }}>
          <div style={{ color:C.cyan, fontSize:18, fontWeight:800 }}>QuickInvest</div>
          <div style={{ color:C.muted, fontSize:10, marginTop:2, textTransform:"uppercase" }}>Membresía</div>
        </div>

        {/* Dólar switcher */}
        <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:12, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <div style={{ color:C.muted, fontSize:10 }}>💵 Dólar referencia</div>
            <div style={{ display:"flex", background:"#090D15", borderRadius:6, padding:2 }}>
              {["MEP","CCL"].map(m => (
                <button key={m} onClick={() => setDolarMode(m)} style={{ padding:"2px 8px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:10, fontWeight:700, background:dolarMode===m?C.cyan:"transparent", color:dolarMode===m?"#07090F":C.muted }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div style={{ color:C.cyan, fontFamily:C.mono, fontWeight:800, fontSize:16 }}>
            {dolarPrice ? `$${fmt(dolarPrice)}` : "—"}
          </div>
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
          <button onClick={signOut} style={{ width:"100%", background:"rgba(248,113,113,0.1)", border:`1px solid rgba(248,113,113,0.3)`, color:"#F87171", borderRadius:8, padding:"8px", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:600 }}>Cerrar sesión</button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"28px 32px" }}>
        {tab==="watchlist" && <WatchlistTab userId={session.user.id} dolarPrice={dolarPrice} dolarMode={dolarMode} />}
        {tab==="cartera"   && <PortfolioTracker userId={session.user.id} profile={profile} dolarPrice={dolarPrice} />}
        {tab==="alertas"   && <AlertasTab userId={session.user.id} />}
        {tab==="perfil"    && <PerfilTab profile={profile} userId={session.user.id} onUpdate={onProfileUpdate} />}
      </div>
    </div>
  );
}

function WatchlistTab({ userId, dolarPrice, dolarMode }) {
  const [cat, setCat] = useState("activas");
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showFavOnly, setShowFavOnly] = useState(false);

  useEffect(()=>{ getFavorites(userId).then(setFavorites); },[userId]);

  const items = MEMBRESIA[cat] || [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tickers = items.map(i => i.ticker);
      const isCripto = cat === "cripto";
      const data = isCripto ? await getCrypto(tickers) : await getQuotes(tickers);
      setQuotes(data);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [cat, items]);

  useEffect(()=>{ load(); },[load]);

  async function handleFav(ticker){ await toggleFavorite(userId,ticker); setFavorites(await getFavorites(userId)); }

  const displayItems = showFavOnly ? items.filter(i => favorites.includes(i.ticker)) : items;

  // Convertir precio ARS → USD si hay dólar disponible
  function toUSD(priceARS, currency) {
    if (currency === "USD") return priceARS; // cripto ya viene en USD
    if (!dolarPrice || !priceARS) return null;
    return priceARS / dolarPrice;
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Watchlist Membresía</div>
          <div style={{ color:C.muted, fontSize:13 }}>Precios en USD · Referencia {dolarMode}: ${fmt(dolarPrice)}</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setShowFavOnly(!showFavOnly)} style={{ background:showFavOnly?C.cyanDim:"transparent", border:`1px solid ${showFavOnly?C.cyan:C.border}`, color:showFavOnly?C.cyan:C.muted, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:600 }}>⭐ Favoritos</button>
          <button onClick={load} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>🔄</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:18 }}>
        {[["activas","🟢 Activas"],["radar","🔍 Radar"],["cripto","₿ Cripto"]].map(([id,label]) => (
          <button key={id} onClick={()=>setCat(id)} style={{ padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none", background:cat===id?C.cyan:C.cyanDim, color:cat===id?"#07090F":C.cyan, fontFamily:"inherit" }}>
            {label} ({MEMBRESIA[id].length})
          </button>
        ))}
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"32px 2fr 1fr 1fr 1fr 1fr 1fr", padding:"10px 16px", borderBottom:`1px solid ${C.border}` }}>
          {["","Activo","Precio USD","Cambio %","Zona Compra","Estado","Perfil"].map((h,i) => (
            <div key={i} style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</div>
          ))}
        </div>

        {loading && <div style={{ padding:20, color:C.muted, fontSize:13 }}>⏳ Cargando precios...</div>}

        {!loading && displayItems.map(item => {
          const q = quotes[item.ticker];
          const priceUSD = toUSD(q?.price, q?.currency);
          const pos = q?.changePct >= 0;
          const isFav = favorites.includes(item.ticker);

          // Estado: en zona de compra si precio <= zonaCompra
          const enZona = priceUSD && item.zonaCompra && priceUSD <= item.zonaCompra * 1.05;
          const pctFaltaZona = priceUSD && item.zonaCompra ? ((priceUSD - item.zonaCompra) / item.zonaCompra * 100) : null;

          return (
            <div key={item.ticker} style={{ display:"grid", gridTemplateColumns:"32px 2fr 1fr 1fr 1fr 1fr 1fr", padding:"12px 16px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
              <button onClick={()=>handleFav(item.ticker)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, opacity:isFav?1:0.3, padding:0 }}>⭐</button>
              <div>
                <div style={{ fontFamily:C.mono, fontWeight:700, fontSize:13 }}>{item.ticker}</div>
                <div style={{ color:C.muted, fontSize:11, marginTop:1 }}>{item.nombre}</div>
              </div>
              <span style={{ fontFamily:C.mono, fontSize:13, fontWeight:600 }}>
                {priceUSD ? `$${fmt(priceUSD)}` : "—"}
              </span>
              <span style={{ color:q?(pos?C.green:C.red):C.muted, fontFamily:C.mono, fontSize:12 }}>
                {q?.changePct!=null?(pos?"+":"")+fmt(q.changePct)+"%":"—"}
              </span>
              <span style={{ fontFamily:C.mono, fontSize:12, color:C.muted }}>
                {item.zonaCompra ? `$${fmt(item.zonaCompra)}` : "—"}
              </span>
              <div>
                {enZona ? (
                  <span style={{ background:"rgba(74,222,128,0.15)", color:C.green, border:"1px solid rgba(74,222,128,0.3)", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>🟢 En zona</span>
                ) : pctFaltaZona ? (
                  <span style={{ color:C.muted, fontSize:11 }}>{fmt(pctFaltaZona)}% arriba</span>
                ) : <span style={{ color:C.muted, fontSize:11 }}>—</span>}
              </div>
              <span style={{ fontSize:11, color:C.muted }}>{item.perfil || "—"}</span>
            </div>
          );
        })}

        {!loading && displayItems.length === 0 && (
          <div style={{ padding:24, textAlign:"center", color:C.muted, fontSize:13 }}>No tenés favoritos en esta categoría.</div>
        )}
      </div>

      <div style={{ marginTop:10, color:C.muted, fontSize:11 }}>
        ⚠️ Precios orientativos. Zona de compra según análisis QuickInvest. No constituye asesoramiento financiero.
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
      <div style={{ color:C.muted, fontSize:13, marginBottom:24 }}>Tus alertas personales y las enviadas por el asesor</div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22, marginBottom:18 }}>
        <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>Nueva alerta personal</div>
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
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>PRECIO USD</label>
            <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="150.00" type="number" style={inp}/>
          </div>
          <button onClick={handleCreate} disabled={saving||!ticker||!price} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", opacity:saving||!ticker||!price?0.5:1 }}>
            {saving?"...":"+ Crear"}
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:40, textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔔</div>
          <div style={{ color:C.muted, fontSize:13 }}>No tenés alertas activas. Tu asesor también puede enviarte alertas de compra y venta a tu email.</div>
        </div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 60px", padding:"10px 16px", borderBottom:`1px solid ${C.border}` }}>
            {["Ticker","Tipo","Condición","Precio","Origen",""].map(h => (
              <div key={h} style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{h}</div>
            ))}
          </div>
          {alerts.map(a => {
            const color = alertTypeColor[a.alert_type||"price"];
            const byAdvisor = a.created_by && a.created_by !== userId;
            return (
              <div key={a.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 60px", padding:"13px 16px", borderBottom:`1px solid ${C.border}`, alignItems:"center", background:byAdvisor?"rgba(255,209,102,0.03)":"transparent" }}>
                <span style={{ fontFamily:C.mono, fontWeight:700 }}>{a.ticker}</span>
                <span style={{ background:`${color}20`, color, border:`1px solid ${color}`, borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:700, display:"inline-block" }}>{alertTypeLabel[a.alert_type||"price"]}</span>
                <span style={{ color:C.muted, fontSize:12 }}>{a.type==="price_above"?"↑ Sube a":"↓ Baja a"}</span>
                <span style={{ color, fontFamily:C.mono, fontWeight:700 }}>${fmt(a.target_price)}</span>
                <div>
                  {byAdvisor ? (
                    <span style={{ background:"rgba(255,209,102,0.15)", color:C.yellow, border:"1px solid rgba(255,209,102,0.3)", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>👨‍💼 Asesor</span>
                  ) : (
                    <span style={{ color:C.muted, fontSize:11 }}>Yo</span>
                  )}
                </div>
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

  async function handleSave(){
    setSaving(true);
    const {data} = await upsertProfile({...profile, id:userId, full_name:name});
    onUpdate(data); setEditing(false); setSaving(false);
  }

  const updatedAt = profile?.risk_updated_at ? new Date(profile.risk_updated_at).toLocaleDateString("es-AR") : "—";
  const nextUpdate = profile?.risk_updated_at ? new Date(new Date(profile.risk_updated_at).setFullYear(new Date(profile.risk_updated_at).getFullYear()+1)).toLocaleDateString("es-AR") : "—";

  return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Mi Perfil</div>
      <div style={{ color:C.muted, fontSize:13, marginBottom:24 }}>Tu información y perfil de riesgo</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
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
              <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{profile?.full_name || "—"}</div>
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
          <div style={{ background:"rgba(38,236,200,0.05)", border:"1px solid rgba(38,236,200,0.15)", borderRadius:8, padding:"10px 14px", fontSize:12, color:C.muted }}>
            ℹ️ Se recomienda revisar el perfil anualmente.
          </div>
        </div>
      </div>

      {/* Contacto membresía */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22 }}>
        <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>Membresía QuickInvest</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <a href="mailto:membresiaparainversores@gmail.com" style={{ display:"flex", alignItems:"center", gap:10, background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px", textDecoration:"none", color:C.text }}>
            <span style={{ fontSize:20 }}>📧</span>
            <div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:2 }}>Email de contacto</div>
              <div style={{ fontSize:13, fontWeight:600 }}>membresiaparainversores@gmail.com</div>
            </div>
          </a>
          <a href="https://t.me/quickinvest" target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:10, background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px", textDecoration:"none", color:C.text }}>
            <span style={{ fontSize:20 }}>💬</span>
            <div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:2 }}>Canal Telegram</div>
              <div style={{ fontSize:13, fontWeight:600 }}>QuickInvest Membresía</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
