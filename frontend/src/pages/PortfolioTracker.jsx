import { useState, useEffect, useCallback } from "react";
import { getPortfolio, upsertPortfolioAsset, deletePortfolioAsset, supabase } from "../lib/supabase";
import { getQuotes, getCrypto } from "../api";

const C = { bg:"#07090F", card:"#0D1117", card2:"#111720", border:"#1C2333", cyan:"#26ECC8", cyanDim:"rgba(38,236,200,0.12)", text:"#E2E8F0", muted:"#64748B", green:"#4ADE80", red:"#F87171", yellow:"#FFD166", mono:"'JetBrains Mono',monospace" };

const COMPANIES = {
  GOOG:"Google",GOOGL:"Alphabet",WMT:"Walmart",URA:"Global X Uranium ETF",PM:"Philip Morris",AMZN:"Amazon",
  ASTS:"AST SpaceMobile",QCOM:"Qualcomm",NIO:"NIO Inc",SONY:"Sony Group",MSFT:"Microsoft",BIIB:"Biogen",
  NU:"Nu Holdings",GGAL:"Banco Galicia",V:"Visa",PG:"Procter & Gamble",UBER:"Uber",UNH:"UnitedHealth",
  PAGS:"PagSeguro",ORCL:"Oracle",NFLX:"Netflix",META:"Meta",RBLX:"Roblox",CRM:"Salesforce",
  RACE:"Ferrari",TMUS:"T-Mobile",MELI:"MercadoLibre",JD:"JD.com",NKE:"Nike",ADBE:"Adobe",
  DIS:"Disney",HPQ:"HP Inc",PYPL:"PayPal",AAPL:"Apple",INTC:"Intel",NVDA:"Nvidia",
  GE:"GE Aerospace",ABBV:"AbbVie",AVGO:"Broadcom",CAT:"Caterpillar",AMD:"AMD",MCO:"Moody's",
  COST:"Costco",LMT:"Lockheed Martin",LLY:"Eli Lilly",TSLA:"Tesla",MU:"Micron",MRVL:"Marvell",
  BTC:"Bitcoin",ETH:"Ethereum",SOL:"Solana",XRP:"XRP",BNB:"BNB",
  BRKB:"Berkshire Hathaway",AI:"C3.ai",SAN:"Banco Santander",
  YPFD:"YPF",PAMP:"Pampa Energía",BBAR:"BBVA Argentina",TGSU2:"Transportadora Gas Sur",
};

const CRIPTO_LIST = ["BTC","ETH","SOL","XRP","BNB","ADA","DOGE","AVAX"];
const PC = { Conservador:"#4ECDC4", Moderado:"#FFD166", Agresivo:"#26ECC8" };

function fmt(n,d=2){if(n==null||isNaN(n))return"—";return Number(n).toLocaleString("es-AR",{minimumFractionDigits:d,maximumFractionDigits:d});}
function fmtUSD(n){if(n==null||isNaN(n))return"—";return"$"+fmt(n);}
const today = new Date().toISOString().split("T")[0];

const inp = { background:"#090D15", border:`1px solid #1C2333`, borderRadius:8, color:"#E2E8F0", padding:"10px 14px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"inherit", outline:"none" };

// Gráfico torta SVG
function PieChart({ data }) {
  if (!data?.length) return null;
  const total = data.reduce((s,d)=>s+d.value,0);
  if (total === 0) return null;
  const COLORS = ["#26ECC8","#FFD166","#F87171","#60A5FA","#A78BFA","#34D399","#FB923C","#F472B6","#818CF8","#4ADE80","#FBBF24","#38BDF8"];
  let cumAngle = -90;
  const slices = data.map((d,i) => {
    const pct = d.value/total;
    const angle = pct*360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const r=80, cx=100, cy=100;
    const startRad=(startAngle*Math.PI)/180;
    const endRad=((startAngle+angle)*Math.PI)/180;
    const x1=cx+r*Math.cos(startRad), y1=cy+r*Math.sin(startRad);
    const x2=cx+r*Math.cos(endRad), y2=cy+r*Math.sin(endRad);
    const largeArc=angle>180?1:0;
    return { path:`M${cx},${cy} L${x1},${y1} A${r},${r},0,${largeArc},1,${x2},${y2} Z`, color:COLORS[i%COLORS.length], label:d.label, pct:(pct*100).toFixed(1) };
  });
  return (
    <div style={{ display:"flex", alignItems:"center", gap:24 }}>
      <svg viewBox="0 0 200 200" width={160} height={160}>
        {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} stroke={C.bg} strokeWidth={2}/>)}
        <circle cx={100} cy={100} r={45} fill={C.card}/>
      </svg>
      <div style={{ flex:1 }}>
        {slices.map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
            <span style={{ fontSize:11, color:C.text, flex:1 }}>{s.label}</span>
            <span style={{ fontSize:11, fontFamily:C.mono, color:s.color }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioTracker({ userId, profile, dolarPrice }) {
  const [portfolio, setPortfolio] = useState(null);
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("tabla");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [newAsset, setNewAsset] = useState({ ticker:"", company_name:"", quantity:"", avg_price:"", purchase_date:today, notes:"" });

  const pc = PC[profile?.risk_profile] || C.cyan;

  const load = useCallback(async () => {
    setLoading(true);
    let { data } = await getPortfolio(userId);
    if (!data) {
      const { data:p } = await supabase.from("portfolios").insert({ user_id:userId, name:"Mi Cartera" }).select().single();
      data = { ...p, portfolio_assets:[] };
    }
    setPortfolio(data);
    if (data?.portfolio_assets?.length) {
      const assets = data.portfolio_assets;
      const cryptoTickers = assets.filter(a=>CRIPTO_LIST.includes(a.ticker)).map(a=>a.ticker);
      const stockTickers = assets.filter(a=>!CRIPTO_LIST.includes(a.ticker)).map(a=>a.ticker);
      const [stockQ, cryptoQ] = await Promise.all([
        stockTickers.length ? getQuotes(stockTickers) : Promise.resolve({}),
        cryptoTickers.length ? getCrypto(cryptoTickers) : Promise.resolve({}),
      ]);
      setQuotes({ ...stockQ, ...cryptoQ });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Buscador de tickers
  function handleSearch(val) {
    setSearch(val);
    if (!val.trim()) { setSearchResults([]); return; }
    const v = val.toUpperCase();
    const results = Object.entries(COMPANIES)
      .filter(([ticker, name]) => ticker.includes(v) || name.toUpperCase().includes(v))
      .slice(0, 6)
      .map(([ticker, name]) => ({ ticker, name }));
    setSearchResults(results);
  }

  function selectTicker(ticker, name) {
    setNewAsset(p => ({ ...p, ticker, company_name:name }));
    setSearch(`${ticker} — ${name}`);
    setSearchResults([]);
  }

  async function handleAdd() {
    if (!newAsset.ticker || !newAsset.quantity || !newAsset.avg_price) return;
    setSaving(true);
    await upsertPortfolioAsset({
      portfolio_id: portfolio.id,
      ticker: newAsset.ticker.toUpperCase(),
      company_name: newAsset.company_name || COMPANIES[newAsset.ticker.toUpperCase()] || newAsset.ticker,
      quantity: parseFloat(newAsset.quantity),
      avg_price: parseFloat(newAsset.avg_price),
      purchase_date: newAsset.purchase_date || today,
      notes: newAsset.notes || null,
      weight: null,
    });
    await load();
    setNewAsset({ ticker:"", company_name:"", quantity:"", avg_price:"", purchase_date:today, notes:"" });
    setSearch("");
    setAdding(false);
    setSaving(false);
  }

  const assets = portfolio?.portfolio_assets || [];

  // Enriquecer con precios
  const enriched = assets.map(a => {
    const q = quotes[a.ticker];
    const isCrypto = CRIPTO_LIST.includes(a.ticker);
    let currentPriceUSD = null;
    if (isCrypto && q?.price) currentPriceUSD = q.price;
    else if (q?.price && dolarPrice) currentPriceUSD = q.price / dolarPrice;
    else if (q?.price) currentPriceUSD = q.price;

    const qty = a.quantity || 0;
    const avgPrice = a.avg_price || 0;
    const currentValue = currentPriceUSD ? currentPriceUSD * qty : null;
    const costBasis = avgPrice * qty;
    const pnl = currentValue != null ? currentValue - costBasis : null;
    const pnlPct = costBasis > 0 && pnl != null ? (pnl/costBasis*100) : null;
    const changePct = q?.changePct || null;
    const dailyPnl = currentValue && changePct ? (currentValue * changePct/100) : null;
    const companyName = a.company_name || COMPANIES[a.ticker] || a.ticker;
    return { ...a, currentPriceUSD, currentValue, costBasis, pnl, pnlPct, dailyPnl, changePct, companyName };
  });

  const totalValue = enriched.reduce((s,a)=>s+(a.currentValue||0),0);
  const totalCost = enriched.reduce((s,a)=>s+a.costBasis,0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL/totalCost*100) : 0;
  const totalDailyPnL = enriched.reduce((s,a)=>s+(a.dailyPnl||0),0);
  const pieData = enriched.filter(a=>a.currentValue>0).map(a=>({ label:a.ticker, value:a.currentValue })).sort((a,b)=>b.value-a.value);

  if (loading) return <div style={{ color:C.muted, padding:20 }}>⏳ Cargando cartera...</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Mi Cartera</div>
          <div style={{ color:C.muted, fontSize:13 }}>
            Perfil: <span style={{ color:pc, fontWeight:600 }}>{profile?.risk_profile||"Sin definir"}</span> · {assets.length} activos
            {dolarPrice && <span> · MEP: <span style={{ color:C.cyan }}>${fmt(dolarPrice)}</span></span>}
          </div>
        </div>
        <button onClick={()=>setAdding(!adding)} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"9px 18px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
          + Agregar activo
        </button>
      </div>

      {/* Métricas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        {[
          { label:"Valor total USD", value:fmtUSD(totalValue), color:C.cyan },
          { label:"Costo total", value:fmtUSD(totalCost), color:C.text },
          { label:"P&L total", value:(totalPnL>=0?"+":"")+fmtUSD(totalPnL), color:totalPnL>=0?C.green:C.red },
          { label:"P&L diario", value:(totalDailyPnL>=0?"+":"")+fmtUSD(totalDailyPnL), color:totalDailyPnL>=0?C.green:C.red },
        ].map(m=>(
          <div key={m.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 18px" }}>
            <div style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{m.label}</div>
            <div style={{ color:m.color, fontSize:20, fontWeight:800, fontFamily:C.mono }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Formulario agregar */}
      {adding && (
        <div style={{ background:C.card, border:`1px solid ${C.cyan}`, borderRadius:12, padding:22, marginBottom:16 }}>
          <div style={{ color:C.cyan, fontSize:12, fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>Nuevo activo</div>

          {/* Buscador */}
          <div style={{ marginBottom:14, position:"relative" }}>
            <label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>BUSCAR TICKER O EMPRESA</label>
            <input value={search} onChange={e=>handleSearch(e.target.value)} placeholder="Ej: Apple, AAPL, Google..." style={inp}/>
            {searchResults.length > 0 && (
              <div style={{ position:"absolute", top:"100%", left:0, right:0, background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, zIndex:10, marginTop:4 }}>
                {searchResults.map(r=>(
                  <div key={r.ticker} onClick={()=>selectTicker(r.ticker,r.name)} style={{ padding:"10px 14px", cursor:"pointer", display:"flex", gap:10, alignItems:"center", borderBottom:`1px solid ${C.border}` }}
                    onMouseOver={e=>e.currentTarget.style.background=C.cyanDim}
                    onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                    <span style={{ fontFamily:C.mono, fontWeight:700, fontSize:13, color:C.cyan, minWidth:60 }}>{r.ticker}</span>
                    <span style={{ color:C.muted, fontSize:12 }}>{r.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:12 }}>
            <div>
              <label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>CANTIDAD</label>
              <input value={newAsset.quantity} onChange={e=>setNewAsset(p=>({...p,quantity:e.target.value}))} placeholder="10" type="number" style={inp}/>
            </div>
            <div>
              <label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>PRECIO COMPRA (USD)</label>
              <input value={newAsset.avg_price} onChange={e=>setNewAsset(p=>({...p,avg_price:e.target.value}))} placeholder="150.00" type="number" style={inp}/>
            </div>
            <div>
              <label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>FECHA COMPRA</label>
              <input value={newAsset.purchase_date} onChange={e=>setNewAsset(p=>({...p,purchase_date:e.target.value}))} type="date" style={inp}/>
            </div>
            <div>
              <label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>NOTAS</label>
              <input value={newAsset.notes} onChange={e=>setNewAsset(p=>({...p,notes:e.target.value}))} placeholder="Long term..." style={inp}/>
            </div>
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleAdd} disabled={saving||!newAsset.ticker||!newAsset.quantity||!newAsset.avg_price} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"10px 24px", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", opacity:saving||!newAsset.ticker?0.5:1 }}>
              {saving?"Guardando...":"Guardar"}
            </button>
            <button onClick={()=>{setAdding(false);setSearch("");setSearchResults([]);}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"10px 16px", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </div>
      )}

      {assets.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:48, textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>💼</div>
          <div style={{ color:C.text, fontWeight:600, marginBottom:6 }}>Tu cartera está vacía</div>
          <div style={{ color:C.muted, fontSize:13 }}>Agregá activos con el botón de arriba.</div>
        </div>
      ) : (
        <>
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {[["tabla","📋 Tabla"],["torta","🥧 Distribución"]].map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600, background:view===v?C.cyan:C.card2, color:view===v?"#07090F":C.muted }}>
                {l}
              </button>
            ))}
          </div>

          {view === "tabla" && (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"auto" }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 50px", padding:"10px 16px", borderBottom:`1px solid ${C.border}`, minWidth:900 }}>
                {["Activo","Cant.","P.Compra","P.Actual","Costo","Valor","P&L $","P&L %",""].map(h=>(
                  <div key={h} style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{h}</div>
                ))}
              </div>
              {enriched.map(a=>(
                <div key={a.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 50px", padding:"12px 16px", borderBottom:`1px solid ${C.border}`, alignItems:"center", minWidth:900 }}>
                  <div>
                    <div style={{ fontFamily:C.mono, fontWeight:700, fontSize:13 }}>{a.ticker}</div>
                    <div style={{ color:C.muted, fontSize:11 }}>{a.companyName}</div>
                    {a.purchase_date && <div style={{ color:C.muted, fontSize:10 }}>📅 {a.purchase_date}</div>}
                  </div>
                  <span style={{ fontFamily:C.mono, fontSize:12, color:C.muted }}>{fmt(a.quantity,0)}</span>
                  <span style={{ fontFamily:C.mono, fontSize:12 }}>{fmtUSD(a.avg_price)}</span>
                  <span style={{ fontFamily:C.mono, fontSize:12, color:a.currentPriceUSD?C.text:C.muted }}>{fmtUSD(a.currentPriceUSD)}</span>
                  <span style={{ fontFamily:C.mono, fontSize:12, color:C.muted }}>{fmtUSD(a.costBasis)}</span>
                  <span style={{ fontFamily:C.mono, fontSize:12, color:C.cyan }}>{fmtUSD(a.currentValue)}</span>
                  <span style={{ fontFamily:C.mono, fontSize:12, color:a.pnl!=null?(a.pnl>=0?C.green:C.red):C.muted }}>
                    {a.pnl!=null?(a.pnl>=0?"+":"")+fmtUSD(a.pnl):"—"}
                  </span>
                  <span style={{ fontFamily:C.mono, fontSize:12, color:a.pnlPct!=null?(a.pnlPct>=0?C.green:C.red):C.muted }}>
                    {a.pnlPct!=null?(a.pnlPct>=0?"+":"")+fmt(a.pnlPct)+"%":"—"}
                  </span>
                  <button onClick={()=>deletePortfolioAsset(a.id).then(load)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.red, borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>✕</button>
                </div>
              ))}
              {/* Total */}
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 50px", padding:"12px 16px", background:C.card2, alignItems:"center", minWidth:900 }}>
                <span style={{ fontWeight:800, fontSize:13 }}>TOTAL</span>
                <span/><span/><span/>
                <span style={{ fontFamily:C.mono, fontSize:12, color:C.muted }}>{fmtUSD(totalCost)}</span>
                <span style={{ fontFamily:C.mono, fontSize:13, color:C.cyan, fontWeight:700 }}>{fmtUSD(totalValue)}</span>
                <span style={{ fontFamily:C.mono, fontSize:13, color:totalPnL>=0?C.green:C.red, fontWeight:700 }}>{(totalPnL>=0?"+":"")+fmtUSD(totalPnL)}</span>
                <span style={{ fontFamily:C.mono, fontSize:13, color:totalPnLPct>=0?C.green:C.red, fontWeight:700 }}>{(totalPnLPct>=0?"+":"")+fmt(totalPnLPct)+"%"}</span>
                <span/>
              </div>
            </div>
          )}

          {view === "torta" && (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:24 }}>
              <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:18 }}>Distribución por valor actual</div>
              <PieChart data={pieData}/>
            </div>
          )}
        </>
      )}
      <div style={{ marginTop:12, color:C.muted, fontSize:11 }}>⚠️ Precios orientativos. No constituyen asesoramiento financiero.</div>
    </div>
  );
}
