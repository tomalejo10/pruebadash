import { useState, useEffect, useCallback } from "react";
import { signOut, getAllClients, getPortfolio, upsertPortfolioAsset, deletePortfolioAsset, createAlert, getAlerts, deleteAlert, supabase } from "../lib/supabase";

const C = { bg:"#07090F", card:"#0D1117", card2:"#111720", border:"#1C2333", cyan:"#26ECC8", cyanDim:"rgba(38,236,200,0.12)", text:"#E2E8F0", muted:"#64748B", green:"#4ADE80", red:"#F87171", yellow:"#FFD166", mono:"'JetBrains Mono',monospace" };
const API = import.meta.env.VITE_API_URL || "/api";
const PC = { Conservador:"#4ECDC4", Moderado:"#FFD166", Agresivo:"#26ECC8" };
const PE = { Conservador:"🛡️", Moderado:"⚖️", Agresivo:"🚀" };
function fmt(n,d=2){if(n==null)return"—";return Number(n).toLocaleString("es-AR",{minimumFractionDigits:d,maximumFractionDigits:d});}
const inp = { background:"#090D15", border:`1px solid #1C2333`, borderRadius:8, color:"#E2E8F0", padding:"10px 14px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"inherit", outline:"none" };

export default function AdvisorApp({ session, profile }) {
  const [tab, setTab] = useState("clientes");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedClientTab, setSelectedClientTab] = useState("cartera");
  useEffect(()=>{ getAllClients().then(({data})=>setClients(data||[])); },[]);

  const nav = [{ id:"clientes",icon:"👥",label:"Clientes"},{ id:"watchlist",icon:"📡",label:"Watchlist"}];

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"'DM Sans',sans-serif", overflow:"hidden" }}>
      <div style={{ width:210, minWidth:210, background:C.card, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", padding:"22px 14px" }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ color:C.cyan, fontSize:18, fontWeight:800 }}>QuickInvest</div>
          <div style={{ color:"#F87171", fontSize:10, marginTop:2, textTransform:"uppercase" }}>Panel Asesor</div>
        </div>
        {nav.map(item=>(
          <div key={item.id} onClick={()=>{setTab(item.id);setSelectedClient(null);}} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:8, marginBottom:3, cursor:"pointer", fontSize:13, background:tab===item.id?C.cyanDim:"transparent", color:tab===item.id?C.cyan:C.muted, fontWeight:tab===item.id?700:400, borderLeft:`3px solid ${tab===item.id?C.cyan:"transparent"}` }}>
            <span>{item.icon}</span>{item.label}
          </div>
        ))}
        <div style={{ margin:"16px 0", padding:14, background:C.card2, border:`1px solid ${C.border}`, borderRadius:10 }}>
          <div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", marginBottom:8 }}>Resumen</div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ color:C.muted, fontSize:12 }}>Clientes</span><span style={{ color:C.cyan, fontFamily:C.mono, fontWeight:700, fontSize:12 }}>{clients.length}</span></div>
          <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted, fontSize:12 }}>Con perfil</span><span style={{ color:C.green, fontFamily:C.mono, fontWeight:700, fontSize:12 }}>{clients.filter(c=>c.risk_profile).length}</span></div>
        </div>
        <div style={{ marginTop:"auto" }}>
          <div style={{ color:C.muted, fontSize:11, marginBottom:6 }}>{profile?.email}</div>
          <button onClick={signOut} style={{ width:"100%", background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"8px", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Cerrar sesión</button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"28px 32px" }}>
        {tab==="clientes" && (
          selectedClient
            ? <ClientDetail client={selectedClient} advisorId={session.user.id} activeTab={selectedClientTab} setActiveTab={setSelectedClientTab} onBack={()=>setSelectedClient(null)}/>
            : <ClientsTab clients={clients} onSelect={c=>{setSelectedClient(c);setSelectedClientTab("cartera");}}/>
        )}
        {tab==="watchlist" && <AdvisorWatchlist />}
      </div>
    </div>
  );
}

function ClientsTab({ clients, onSelect }) {
  return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Clientes</div>
      <div style={{ color:C.muted, fontSize:13, marginBottom:24 }}>Gestioná carteras, alertas y perfiles</div>
      {clients.length===0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:40, textAlign:"center" }}><div style={{ fontSize:40, marginBottom:12 }}>👥</div><div style={{ color:C.muted, fontSize:13 }}>Ningún cliente registrado todavía.</div></div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
          {clients.map(client=>{
            const pc=PC[client.risk_profile]||C.muted;
            return (
              <div key={client.id} onClick={()=>onSelect(client)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, cursor:"pointer" }} onMouseOver={e=>e.currentTarget.style.borderColor=C.cyan} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div><div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{client.full_name}</div><div style={{ color:C.muted, fontSize:11 }}>{client.email}</div></div>
                  {client.risk_profile&&<div style={{ background:`${pc}20`, border:`1px solid ${pc}`, borderRadius:6, padding:"3px 9px", fontSize:11, color:pc, fontWeight:700 }}>{PE[client.risk_profile]} {client.risk_profile}</div>}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ color:C.muted, fontSize:11 }}>{client.risk_profile?`Score: ${client.risk_score}/24`:"Sin perfil"}</span>
                  <span style={{ color:C.cyan, fontSize:12, fontWeight:600 }}>Gestionar →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClientDetail({ client, advisorId, activeTab, setActiveTab, onBack }) {
  const pc = PC[client.risk_profile]||C.muted;
  const tabs = [{ id:"cartera",label:"💼 Cartera"},{ id:"alertas",label:"🔔 Alertas"}];
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={onBack} style={{ background:C.cyanDim, border:`1px solid ${C.border}`, color:C.cyan, borderRadius:8, padding:"7px 14px", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:600 }}>← Volver</button>
        <div><div style={{ fontSize:20, fontWeight:800 }}>{client.full_name}</div><div style={{ color:C.muted, fontSize:12 }}>{client.email}</div></div>
        {client.risk_profile&&<div style={{ marginLeft:"auto", background:`${pc}20`, border:`1px solid ${pc}`, borderRadius:8, padding:"6px 14px", fontSize:13, color:pc, fontWeight:700 }}>{PE[client.risk_profile]} {client.risk_profile} · {client.risk_score}/24</div>}
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600, background:activeTab===t.id?C.cyan:C.card2, color:activeTab===t.id?"#07090F":C.muted }}>
            {t.label}
          </button>
        ))}
      </div>
      {activeTab==="cartera" && <AdvisorCartera client={client} />}
      {activeTab==="alertas" && <AdvisorAlertas client={client} advisorId={advisorId} />}
    </div>
  );
}

function AdvisorCartera({ client }) {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newAsset, setNewAsset] = useState({ ticker:"", weight:"", quantity:"", avg_price:"", notes:"" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    let { data } = await getPortfolio(client.id);
    if(!data){ const {data:p}=await supabase.from("portfolios").insert({user_id:client.id,name:"Mi Cartera"}).select().single(); data={...p,portfolio_assets:[]}; }
    setPortfolio(data); setLoading(false);
  },[client.id]);

  useEffect(()=>{ load(); },[load]);

  async function handleAdd(){
    if(!newAsset.ticker) return; setSaving(true);
    await upsertPortfolioAsset({ portfolio_id:portfolio.id, ticker:newAsset.ticker.toUpperCase(), weight:parseFloat(newAsset.weight)||null, quantity:parseFloat(newAsset.quantity)||null, avg_price:parseFloat(newAsset.avg_price)||null, notes:newAsset.notes||null });
    await load(); setNewAsset({ticker:"",weight:"",quantity:"",avg_price:"",notes:""}); setAdding(false); setSaving(false);
  }

  const pc = PC[client.risk_profile]||C.muted;
  const assets = portfolio?.portfolio_assets||[];
  const totalW = assets.reduce((a,b)=>a+(b.weight||0),0);

  if(loading) return <div style={{ color:C.muted }}>⏳ Cargando...</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ color:C.muted, fontSize:13 }}>Cartera: <span style={{ color:C.text, fontWeight:600 }}>{assets.length} activos</span></div>
        <button onClick={()=>setAdding(!adding)} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>+ Agregar activo</button>
      </div>
      {adding&&(
        <div style={{ background:C.card, border:`1px solid ${C.cyan}`, borderRadius:12, padding:20, marginBottom:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 2fr", gap:10, marginBottom:12 }}>
            {[["Ticker","ticker","AAPL"],["Peso %","weight","40"],["Cantidad","quantity","10"],["Precio Prom.","avg_price","150"],["Notas","notes","Core holding"]].map(([label,key,ph])=>(
              <div key={key}><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:4 }}>{label}</label><input value={newAsset[key]} onChange={e=>setNewAsset(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={inp}/></div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleAdd} disabled={saving||!newAsset.ticker} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"9px 20px", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", opacity:saving||!newAsset.ticker?0.5:1 }}>{saving?"Guardando...":"Guardar"}</button>
            <button onClick={()=>setAdding(false)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"9px 16px", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </div>
      )}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr 2fr 80px", padding:"10px 16px", borderBottom:`1px solid ${C.border}` }}>
          {["Ticker","Peso %","Cantidad","Precio Prom.","Notas",""].map(h=>(<div key={h} style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{h}</div>))}
        </div>
        {assets.length===0 ? <div style={{ padding:24, textAlign:"center", color:C.muted, fontSize:13 }}>Sin activos. Usá "+ Agregar activo".</div>
        : assets.map(a=>(
          <div key={a.id} style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr 2fr 80px", padding:"12px 16px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
            <span style={{ fontFamily:C.mono, fontWeight:700 }}>{a.ticker}</span>
            <div><span style={{ color:pc, fontFamily:C.mono, fontWeight:700 }}>{a.weight?a.weight+"%":"—"}</span>
              {a.weight&&<div style={{ height:3, borderRadius:2, background:C.border, marginTop:4, width:"80%" }}><div style={{ width:`${Math.min((a.weight/Math.max(totalW,1))*100,100)}%`, height:"100%", background:pc, borderRadius:2 }}/></div>}
            </div>
            <span style={{ fontFamily:C.mono, color:C.muted }}>{a.quantity||"—"}</span>
            <span style={{ fontFamily:C.mono, color:C.muted }}>{a.avg_price?"$"+a.avg_price:"—"}</span>
            <span style={{ color:C.muted, fontSize:12 }}>{a.notes||"—"}</span>
            <button onClick={()=>deletePortfolioAsset(a.id).then(load)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.red, borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>Borrar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdvisorAlertas({ client, advisorId }) {
  const [alerts, setAlerts] = useState([]);
  const [ticker, setTicker] = useState("");
  const [type, setType] = useState("price_above");
  const [alertType, setAlertType] = useState("price");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async()=>{
    const data = await getAlerts(client.id);
    setAlerts(data);
  },[client.id]);

  useEffect(()=>{ load(); },[load]);

  async function handleCreate(){
    if(!ticker||!price) return; setSaving(true);
    await createAlert({ user_id:client.id, ticker:ticker.toUpperCase(), type, alert_type:alertType, target_price:parseFloat(price), email_notify:true, active:true, created_by:advisorId, visible_to_client:true });
    await load(); setTicker(""); setPrice(""); setSaving(false);
  }

  const alertTypeColor = { buy:C.green, sell:C.red, price:C.cyan };
  const alertTypeLabel = { buy:"🟢 COMPRA", sell:"🔴 VENTA", price:"🔵 PRECIO" };

  return (
    <div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22, marginBottom:18 }}>
        <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>Crear alerta para {client.full_name}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr auto", gap:12, alignItems:"end" }}>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>TICKER</label><input value={ticker} onChange={e=>setTicker(e.target.value)} placeholder="AAPL" style={inp}/></div>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>TIPO</label>
            <select value={alertType} onChange={e=>setAlertType(e.target.value)} style={inp}>
              <option value="price">🔵 Precio</option>
              <option value="buy">🟢 Zona de compra</option>
              <option value="sell">🔴 Zona de venta</option>
            </select>
          </div>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>CONDICIÓN</label>
            <select value={type} onChange={e=>setType(e.target.value)} style={inp}>
              <option value="price_above">↑ Precio sube a</option>
              <option value="price_below">↓ Precio baja a</option>
            </select>
          </div>
          <div><label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>PRECIO USD</label><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="150.00" type="number" style={inp}/></div>
          <button onClick={handleCreate} disabled={saving||!ticker||!price} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", opacity:saving||!ticker||!price?0.5:1 }}>{saving?"...":"+ Crear"}</button>
        </div>
      </div>
      {alerts.length===0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:32, textAlign:"center" }}><div style={{ fontSize:32, marginBottom:8 }}>🔔</div><div style={{ color:C.muted, fontSize:13 }}>No hay alertas para este cliente.</div></div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 60px", padding:"10px 16px", borderBottom:`1px solid ${C.border}` }}>
            {["Ticker","Tipo","Condición","Precio","Creada por",""].map(h=>(<div key={h} style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{h}</div>))}
          </div>
          {alerts.map(a=>{
            const color = alertTypeColor[a.alert_type||"price"];
            const byAdvisor = a.created_by === advisorId;
            return (
              <div key={a.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 60px", padding:"13px 16px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
                <span style={{ fontFamily:C.mono, fontWeight:700 }}>{a.ticker}</span>
                <span style={{ background:`${color}20`, color, border:`1px solid ${color}`, borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:700, display:"inline-block" }}>{alertTypeLabel[a.alert_type||"price"]}</span>
                <span style={{ color:C.muted, fontSize:12 }}>{a.type==="price_above"?"↑ Sube a":"↓ Baja a"}</span>
                <span style={{ color, fontFamily:C.mono, fontWeight:700 }}>${fmt(a.target_price)}</span>
                <span style={{ fontSize:11, color:byAdvisor?C.yellow:C.muted }}>{byAdvisor?"👨‍💼 Vos":"👤 Cliente"}</span>
                <button onClick={()=>deleteAlert(a.id).then(load)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.red, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdvisorWatchlist() {
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const TICKERS = ["NVDA","MSFT","AAPL","AMZN","META","GOOGL","TSLA","BTC","ETH","MELI","GGAL","VIST"];
  useEffect(()=>{
    setLoading(true);
    fetch(`${API}/quote?tickers=${TICKERS.join(",")}`).then(r=>r.json()).then(setQuotes).finally(()=>setLoading(false));
  },[]);
  return (
    <div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Watchlist</div>
      <div style={{ color:C.muted, fontSize:13, marginBottom:24 }}>Activos principales</div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        {loading&&<div style={{ padding:20, color:C.muted }}>⏳ Cargando...</div>}
        {TICKERS.map(t=>{ const q=quotes[t]; const pos=q?.changePct>=0; return (
          <div key={t} style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr", padding:"12px 16px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
            <span style={{ fontFamily:C.mono, fontWeight:700 }}>{t}</span>
            <span style={{ fontFamily:C.mono }}>{q?.price?"$"+q.price.toFixed(2):"—"}</span>
            <span style={{ color:q?(pos?C.green:C.red):C.muted, fontFamily:C.mono, fontSize:12 }}>{q?.changePct!=null?(pos?"+":"")+q.changePct.toFixed(2)+"%":"—"}</span>
            <span style={{ color:C.muted, fontSize:11 }}>{q?.name?.slice(0,20)||"—"}</span>
          </div>
        );})}
      </div>
    </div>
  );
}
