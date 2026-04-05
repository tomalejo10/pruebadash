import { useState, useEffect, useCallback } from "react";
import PortfolioTracker from "./PortfolioTracker";
import { signOut, getFavorites, toggleFavorite, getAlerts, createAlert, deleteAlert, getPortfolio, upsertPortfolioAsset, deletePortfolioAsset, upsertProfile, supabase } from "../lib/supabase";

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
const inp = { background:"#090D15", border:`1px solid #1C2333`, borderRadius:8, color:"#E2E8F0", padding:"10px 14px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"inherit", outline:"none" };

export default function ClientApp({ session, profile, onProfileUpdate }) {
  const [tab, setTab] = useState("watchlist");
  const nav = [
    { id:"watchlist", icon:"📡", label:"Watchlist" },
    { id:"cartera",   icon:"💼", label:"Mi Cartera" },
    { id:"alertas",   icon:"🔔", label:"Alertas" },
    { id:"salud",     icon:"📈", label:"Salud Cartera" },
    { id:"perfil",    icon:"🎯", label:"Mi Perfil" },
  ];
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
        {tab==="cartera"   && <PortfolioTracker userId={session.user.id} profile={profile} />}
        {tab==="alertas"   && <AlertasTab userId={session.user.id} />}
        {tab==="salud"     && <SaludCartera userId={session.user.id} profile={profile} />}
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
        <div><div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Watchlist</div><div style={{ color:C.muted, fontSize:13 }}>Precios actualizados · ⭐ para favoritos</div></div>
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
        {loading && <div style={{ padding:20, color:C.muted, fontSize:13 }}>⏳ Cargando precios...</div>}
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
  const [adding, setAdding] = useState(false);
  const [newAsset, setNewAsset] = useState({ ticker:"", weight:"", quantity:"", avg_price:"", notes:"" });
  const [saving, setSaving] = useState(false);
  const [quotes, setQuotes] = useState({});
  const pc = PC[profile?.risk_profile] || C.cyan;

  const load = useCallback(async()=>{
    setLoading(true);
    let { data } = await getPortfolio(userId);
    if(!data){
      const {data:p} = await supabase.from("portfolios").insert({user_id:userId,name:"Mi Cartera"}).select().single();
      data = {...p, portfolio_assets:[]};
    }
    setPortfolio(data);
    if(data?.portfolio_assets?.length){
      const tickers = data.portfolio_assets.map(a=>a.ticker).join(",");
      try { const r=await fetch(`${API}/quote?tickers=${tickers}`); setQuotes(await r.json()); } catch(e){}
    }
    setLoading(false);
  },[userId]);

  useEffect(()=>{ load(); },[load]);

  async function handleAdd(){
    if(!newAsset.ticker) return; setSaving(true);
    await upsertPortfolioAsset({ portfolio_id:portfolio.id, ticker:newAsset.ticker.toUpperCase(), weight:parseFloat(newAsset.weight)||null, quantity:parseFloat(newAsset.quantity)||null, avg_price:parseFloat(newAsset.avg_price)||null, notes:newAsset.notes||null });
    await load(); setNewAsset({ticker:"",weight:"",quantity:"",avg_price:"",notes:""}); setAdding(false); setSaving(false);
  }

  const assets = portfolio?.portfolio_assets || [];
  const totalW = assets.reduce((a,b)=>a+(b.weight||0),0);

  if(loading) return <div style={{ color:C.muted, padding:20 }}>⏳ Cargando...</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Mi Cartera</div>
          <div style={{ color:C.muted, fontSize:13 }}>Perfil: <span style={{ color:pc }}>{PE[profile?.risk_profile]} {profile?.risk_profile}</span> · {assets.length} activos</div>
        </div>
        <button onClick={()=>setAdding(!adding)} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"9px 18px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>+ Agregar activo</button>
      </div>

      {adding && (
        <div style={{ background:C.card, border:`1px solid ${C.cyan}`, borderRadius:12, padding:20, marginBottom:16 }}>
          <div style={{ color:C.muted, fontSize:11, fontWeight:700, marginBottom:12, textTransform:"uppercase" }}>Nuevo activo</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 2fr", gap:10, marginBottom:12 }}>
            {[["Ticker","ticker","AAPL"],["Peso %","weight","40"],["Cantidad","quantity","10"],["Precio Prom.","avg_price","150"],["Notas","notes","Long term"]].map(([label,key,ph])=>(
              <div key={key}><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:4 }}>{label}</label><input value={newAsset[key]} onChange={e=>setNewAsset(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={inp}/></div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleAdd} disabled={saving||!newAsset.ticker} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"9px 20px", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", opacity:saving||!newAsset.ticker?0.5:1 }}>{saving?"Guardando...":"Guardar"}</button>
            <button onClick={()=>setAdding(false)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"9px 16px", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </div>
      )}

      {assets.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:40, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>💼</div>
          <div style={{ color:C.muted, fontSize:13 }}>Tu cartera está vacía. Agregá activos con el botón de arriba.</div>
        </div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr 2fr 60px", padding:"10px 16px", borderBottom:`1px solid ${C.border}` }}>
            {["Ticker","Peso","Cant.","P.Prom","Precio Act.","Notas",""].map(h=>(<div key={h} style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{h}</div>))}
          </div>
          {assets.map(a=>{
            const q=quotes[a.ticker];
            const gainPct = q?.price && a.avg_price ? ((q.price - a.avg_price)/a.avg_price*100) : null;
            return (
              <div key={a.id} style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr 2fr 60px", padding:"12px 16px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
                <div>
                  <div style={{ fontFamily:C.mono, fontWeight:700 }}>{a.ticker}</div>
                  {gainPct!=null && <div style={{ fontSize:10, color:gainPct>=0?C.green:C.red, marginTop:2 }}>{gainPct>=0?"+":""}{fmt(gainPct)}%</div>}
                </div>
                <div>
                  <span style={{ color:pc, fontFamily:C.mono, fontWeight:700 }}>{a.weight?a.weight+"%":"—"}</span>
                  {a.weight && <div style={{ height:3, borderRadius:2, background:C.border, marginTop:4, width:"80%" }}><div style={{ width:`${Math.min((a.weight/Math.max(totalW,1))*100,100)}%`, height:"100%", background:pc, borderRadius:2 }}/></div>}
                </div>
                <span style={{ fontFamily:C.mono, color:C.muted, fontSize:12 }}>{a.quantity||"—"}</span>
                <span style={{ fontFamily:C.mono, color:C.muted, fontSize:12 }}>{a.avg_price?"$"+fmt(a.avg_price):"—"}</span>
                <span style={{ fontFamily:C.mono, fontSize:12, color:q?.price?C.text:C.muted }}>{q?.price?"$"+fmt(q.price):"—"}</span>
                <span style={{ color:C.muted, fontSize:12 }}>{a.notes||"—"}</span>
                <button onClick={()=>deletePortfolioAsset(a.id).then(load)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.red, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ marginTop:12, color:C.muted, fontSize:11 }}>⚠️ Información orientativa. No constituye asesoramiento financiero personalizado.</div>
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

  const load = useCallback(async()=>{
    const data = await getAlerts(userId);
    setAlerts(data);
  },[userId]);

  useEffect(()=>{ load(); },[load]);

  async function handleCreate(){
    if(!ticker||!price) return; setSaving(true);
    await createAlert({ user_id:userId, ticker:ticker.toUpperCase(), type, alert_type:alertType, target_price:parseFloat(price), email_notify:true, active:true, created_by:userId });
    await load(); setTicker(""); setPrice(""); setSaving(false);
  }

  async function handleDelete(id){ await deleteAlert(id); await load(); }

  const alertTypeColor = { buy:C.green, sell:C.red, price:C.cyan };
  const alertTypeLabel = { buy:"🟢 COMPRA", sell:"🔴 VENTA", price:"🔵 PRECIO" };

  return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Alertas</div>
      <div style={{ color:C.muted, fontSize:13, marginBottom:24 }}>Alertas de compra, venta y precio. Recibís un email cuando se activen.</div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22, marginBottom:18 }}>
        <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>Nueva alerta</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr auto", gap:12, alignItems:"end" }}>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>TICKER</label><input value={ticker} onChange={e=>setTicker(e.target.value)} placeholder="AAPL" style={inp}/></div>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>TIPO</label>
            <select value={alertType} onChange={e=>setAlertType(e.target.value)} style={{...inp}}>
              <option value="price">🔵 Alerta de precio</option>
              <option value="buy">🟢 Zona de compra</option>
              <option value="sell">🔴 Zona de venta</option>
            </select>
          </div>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>CONDICIÓN</label>
            <select value={type} onChange={e=>setType(e.target.value)} style={{...inp}}>
              <option value="price_above">Precio sube a</option>
              <option value="price_below">Precio baja a</option>
            </select>
          </div>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>PRECIO USD</label><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="150.00" type="number" style={inp}/></div>
          <button onClick={handleCreate} disabled={saving||!ticker||!price} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", opacity:saving||!ticker||!price?0.5:1 }}>{saving?"...":"+ Crear"}</button>
        </div>
      </div>

      {alerts.length===0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:40, textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔔</div>
          <div style={{ color:C.muted, fontSize:13 }}>No tenés alertas activas. Tu asesor también puede crearte alertas.</div>
        </div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 60px", padding:"10px 16px", borderBottom:`1px solid ${C.border}` }}>
            {["Ticker","Tipo","Condición","Precio","Creada por",""].map(h=>(<div key={h} style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{h}</div>))}
          </div>
          {alerts.map(a=>{
            const color = alertTypeColor[a.alert_type||"price"];
            const isAdvisor = a.created_by && a.created_by !== userId;
            return (
              <div key={a.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 60px", padding:"13px 16px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
                <span style={{ fontFamily:C.mono, fontWeight:700 }}>{a.ticker}</span>
                <span style={{ background:`${color}20`, color, border:`1px solid ${color}`, borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:700, display:"inline-block" }}>{alertTypeLabel[a.alert_type||"price"]}</span>
                <span style={{ color:C.muted, fontSize:12 }}>{a.type==="price_above"?"↑ Sube a":"↓ Baja a"}</span>
                <span style={{ color, fontFamily:C.mono, fontWeight:700 }}>${fmt(a.target_price)}</span>
                <span style={{ fontSize:11, color:isAdvisor?C.yellow:C.muted }}>{isAdvisor?"👨‍💼 Asesor":"Yo"}</span>
                {!isAdvisor && <button onClick={()=>handleDelete(a.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.red, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>✕</button>}
                {isAdvisor && <span style={{ color:C.muted, fontSize:10 }}>—</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SaludCartera({ userId, profile }) {
  const [portfolio, setPortfolio] = useState(null);
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const pc = PC[profile?.risk_profile] || C.cyan;
  const profileAlloc = { Conservador:{renta_fija:60,acciones:20,cash:15,cripto:5}, Moderado:{renta_fija:35,acciones:45,cash:10,cripto:10}, Agresivo:{renta_fija:10,acciones:65,cash:5,cripto:20} };
  const targetAlloc = profileAlloc[profile?.risk_profile] || profileAlloc.Moderado;

  const CRIPTO_TICKERS = ["BTC","ETH","SOL","XRP"];

  useEffect(()=>{
    async function load(){
      const {data} = await getPortfolio(userId);
      setPortfolio(data);
      if(data?.portfolio_assets?.length){
        const tickers = data.portfolio_assets.map(a=>a.ticker).join(",");
        try { const r=await fetch(`${API}/quote?tickers=${tickers}`); setQuotes(await r.json()); } catch(e){}
      }
      setLoading(false);
    }
    load();
  },[userId]);

  if(loading) return <div style={{ color:C.muted, padding:20 }}>⏳ Cargando...</div>;
  if(!portfolio?.portfolio_assets?.length) return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Salud de Cartera</div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:40, textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📈</div>
        <div style={{ color:C.muted, fontSize:13 }}>Agregá activos a tu cartera para ver el análisis de salud.</div>
      </div>
    </div>
  );

  const assets = portfolio.portfolio_assets;
  const totalW = assets.reduce((a,b)=>a+(b.weight||0),0);

  // Clasificar activos
  const criptoW = assets.filter(a=>CRIPTO_TICKERS.includes(a.ticker)).reduce((s,a)=>s+(a.weight||0),0);
  const accionesW = assets.filter(a=>!CRIPTO_TICKERS.includes(a.ticker)).reduce((s,a)=>s+(a.weight||0),0);
  const currentAlloc = { acciones: totalW>0?(accionesW/totalW*100):0, cripto: totalW>0?(criptoW/totalW*100):0 };

  // Score de salud
  const diffAcciones = Math.abs(currentAlloc.acciones - targetAlloc.acciones);
  const diffCripto = Math.abs(currentAlloc.cripto - targetAlloc.cripto);
  const healthScore = Math.max(0, 100 - diffAcciones - diffCripto*2);
  const healthColor = healthScore >= 75 ? C.green : healthScore >= 50 ? C.yellow : C.red;
  const healthLabel = healthScore >= 75 ? "Saludable ✅" : healthScore >= 50 ? "Atención ⚠️" : "Desbalanceada 🔴";

  // Diversificación
  const maxConcentration = assets.length > 0 ? Math.max(...assets.map(a=>a.weight||0)) : 0;
  const diversificationOk = assets.length >= 5 && maxConcentration <= 40;

  return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Salud de Cartera</div>
      <div style={{ color:C.muted, fontSize:13, marginBottom:24 }}>Análisis de alineación con tu perfil {profile?.risk_profile}</div>

      {/* Score principal */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:18 }}>
        <div style={{ background:C.card, border:`2px solid ${healthColor}`, borderRadius:12, padding:22, textAlign:"center" }}>
          <div style={{ fontSize:42, fontWeight:800, color:healthColor, fontFamily:C.mono }}>{Math.round(healthScore)}</div>
          <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>Score de salud / 100</div>
          <div style={{ color:healthColor, fontSize:13, fontWeight:700, marginTop:6 }}>{healthLabel}</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22, textAlign:"center" }}>
          <div style={{ fontSize:42, fontWeight:800, color:diversificationOk?C.green:C.yellow, fontFamily:C.mono }}>{assets.length}</div>
          <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>Activos en cartera</div>
          <div style={{ color:diversificationOk?C.green:C.yellow, fontSize:13, fontWeight:700, marginTop:6 }}>{diversificationOk?"Diversificada ✅":"Poco diversificada ⚠️"}</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22, textAlign:"center" }}>
          <div style={{ fontSize:42, fontWeight:800, color:maxConcentration<=40?C.green:C.red, fontFamily:C.mono }}>{fmt(maxConcentration,0)}%</div>
          <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>Mayor concentración</div>
          <div style={{ color:maxConcentration<=40?C.green:C.red, fontSize:13, fontWeight:700, marginTop:6 }}>{maxConcentration<=40?"Concentración OK ✅":"Alta concentración 🔴"}</div>
        </div>
      </div>

      {/* Comparación perfil vs cartera */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22, marginBottom:18 }}>
        <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:16 }}>Cartera actual vs. perfil {profile?.risk_profile}</div>
        {[
          ["Acciones", currentAlloc.acciones, targetAlloc.acciones],
          ["Cripto",   currentAlloc.cripto,   targetAlloc.cripto],
        ].map(([label, current, target])=>{
          const diff = current - target;
          const ok = Math.abs(diff) <= 10;
          return (
            <div key={label} style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>{label}</span>
                <span style={{ fontSize:12, color:ok?C.green:C.yellow }}>{fmt(current,0)}% actual · {target}% objetivo {ok?"✅":`(${diff>0?"+":""}${fmt(diff,0)}%)`}</span>
              </div>
              <div style={{ height:8, borderRadius:4, background:C.border, position:"relative" }}>
                <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${Math.min(current,100)}%`, background:ok?C.green:C.yellow, borderRadius:4, transition:"width 0.5s" }}/>
                <div style={{ position:"absolute", top:-2, height:12, width:2, background:pc, left:`${target}%`, borderRadius:1 }}/>
              </div>
              <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>La línea vertical indica el objetivo de tu perfil</div>
            </div>
          );
        })}
      </div>

      {/* Recomendaciones */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22 }}>
        <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>Sugerencias de rebalanceo</div>
        {healthScore >= 75 && <div style={{ color:C.green, fontSize:13 }}>✅ Tu cartera está bien alineada con tu perfil. Mantené el rumbo.</div>}
        {currentAlloc.acciones > targetAlloc.acciones + 10 && <div style={{ color:C.yellow, fontSize:13, marginBottom:8 }}>⚠️ Tenés más exposición en acciones de lo recomendado para tu perfil. Considerá reducir posición.</div>}
        {currentAlloc.acciones < targetAlloc.acciones - 10 && <div style={{ color:C.yellow, fontSize:13, marginBottom:8 }}>⚠️ Tenés menos acciones de lo recomendado. Podrías incrementar exposición gradualmente.</div>}
        {currentAlloc.cripto > targetAlloc.cripto + 10 && <div style={{ color:C.red, fontSize:13, marginBottom:8 }}>🔴 Alta exposición en cripto. Tu perfil recomienda máximo {targetAlloc.cripto}%.</div>}
        {maxConcentration > 40 && <div style={{ color:C.red, fontSize:13, marginBottom:8 }}>🔴 Un activo representa más del 40% de tu cartera. Considerá diversificar.</div>}
        {assets.length < 5 && <div style={{ color:C.yellow, fontSize:13, marginBottom:8 }}>⚠️ Cartera con pocos activos. Se recomienda mínimo 5-8 posiciones para diversificar el riesgo.</div>}
        <div style={{ marginTop:14, padding:"10px 14px", background:"rgba(38,236,200,0.05)", border:"1px solid rgba(38,236,200,0.15)", borderRadius:8, fontSize:11, color:C.muted }}>
          ℹ️ Estas sugerencias son orientativas y no constituyen asesoramiento financiero personalizado. Consultá con tu asesor antes de tomar decisiones.
        </div>
      </div>
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
          <div style={{ background:"rgba(38,236,200,0.05)", border:"1px solid rgba(38,236,200,0.15)", borderRadius:8, padding:"10px 14px", fontSize:12, color:C.muted }}>ℹ️ Se recomienda revisar anualmente o ante cambios en tu situación financiera.</div>
        </div>
      </div>
    </div>
  );
}
