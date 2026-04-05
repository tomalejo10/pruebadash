import { useState, useEffect, useCallback } from "react";
import { getPortfolio, upsertPortfolioAsset, deletePortfolioAsset, supabase } from "../lib/supabase";

const C = { bg:"#07090F", card:"#0D1117", card2:"#111720", border:"#1C2333", cyan:"#26ECC8", cyanDim:"rgba(38,236,200,0.12)", text:"#E2E8F0", muted:"#64748B", green:"#4ADE80", red:"#F87171", yellow:"#FFD166", mono:"'JetBrains Mono',monospace" };
const API = import.meta.env.VITE_API_URL || "/api";

const COLORS = ["#26ECC8","#FFD166","#F87171","#60A5FA","#A78BFA","#34D399","#FB923C","#F472B6","#818CF8","#4ADE80"];

function fmt(n,d=2){if(n==null||isNaN(n))return"—";return Number(n).toLocaleString("es-AR",{minimumFractionDigits:d,maximumFractionDigits:d});}
function fmtUSD(n){if(n==null||isNaN(n))return"—";return"$"+fmt(n);}

// Gráfico de torta SVG simple
function PieChart({ data }) {
  if (!data?.length) return null;
  const total = data.reduce((s,d)=>s+d.value,0);
  if (total === 0) return null;
  
  let cumAngle = -90;
  const slices = data.map((d,i) => {
    const pct = d.value / total;
    const angle = pct * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const r = 80;
    const cx = 100, cy = 100;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    const path = `M${cx},${cy} L${x1},${y1} A${r},${r},0,${largeArc},1,${x2},${y2} Z`;
    return { path, color: COLORS[i % COLORS.length], label: d.label, pct: (pct*100).toFixed(1) };
  });

  return (
    <div style={{ display:"flex", alignItems:"center", gap:24 }}>
      <svg viewBox="0 0 200 200" width={180} height={180}>
        {slices.map((s,i) => <path key={i} d={s.path} fill={s.color} stroke={C.bg} strokeWidth={2}/>)}
        <circle cx={100} cy={100} r={45} fill={C.card}/>
      </svg>
      <div style={{ flex:1 }}>
        {slices.map((s,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
            <span style={{ fontSize:12, color:C.text, flex:1 }}>{s.label}</span>
            <span style={{ fontSize:12, fontFamily:C.mono, color:s.color }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const inp = { background:"#090D15", border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"10px 14px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"inherit", outline:"none" };

export default function PortfolioTracker({ userId, profile }) {
  const [portfolio, setPortfolio] = useState(null);
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAsset, setNewAsset] = useState({ ticker:"", quantity:"", avg_price:"", notes:"" });
  const [view, setView] = useState("tabla"); // tabla | torta

  const PC = { Conservador:"#4ECDC4", Moderado:"#FFD166", Agresivo:"#26ECC8" };
  const pc = PC[profile?.risk_profile] || C.cyan;

  const load = useCallback(async () => {
    setLoading(true);
    let { data } = await getPortfolio(userId);
    if (!data) {
      const { data: p } = await supabase.from("portfolios").insert({ user_id:userId, name:"Mi Cartera" }).select().single();
      data = { ...p, portfolio_assets: [] };
    }
    setPortfolio(data);

    if (data?.portfolio_assets?.length) {
      const tickers = [...new Set(data.portfolio_assets.map(a => a.ticker))].join(",");
      try {
        const r = await fetch(`${API}/quote?tickers=${tickers}`);
        const q = await r.json();
        setQuotes(q);
      } catch(e) { console.error(e); }
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!newAsset.ticker || !newAsset.quantity || !newAsset.avg_price) return;
    setSaving(true);
    const qty = parseFloat(newAsset.quantity);
    const price = parseFloat(newAsset.avg_price);
    const weight = null; // se calcula automático
    await upsertPortfolioAsset({
      portfolio_id: portfolio.id,
      ticker: newAsset.ticker.toUpperCase(),
      quantity: qty,
      avg_price: price,
      weight,
      notes: newAsset.notes || null,
    });
    await load();
    setNewAsset({ ticker:"", quantity:"", avg_price:"", notes:"" });
    setAdding(false);
    setSaving(false);
  }

  // Calcular métricas
  const assets = portfolio?.portfolio_assets || [];
  const enriched = assets.map(a => {
    const q = quotes[a.ticker];
    const currentPrice = q?.price || a.avg_price || 0;
    const qty = a.quantity || 0;
    const avgPrice = a.avg_price || 0;
    const currentValue = currentPrice * qty;
    const costBasis = avgPrice * qty;
    const pnl = currentValue - costBasis;
    const pnlPct = costBasis > 0 ? (pnl / costBasis * 100) : 0;
    return { ...a, currentPrice, currentValue, costBasis, pnl, pnlPct, hasQuote: !!q?.price };
  });

  const totalValue = enriched.reduce((s,a) => s + a.currentValue, 0);
  const totalCost  = enriched.reduce((s,a) => s + a.costBasis, 0);
  const totalPnL   = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost * 100) : 0;

  // Pesos automáticos para torta
  const pieData = enriched
    .filter(a => a.currentValue > 0)
    .map(a => ({ label: a.ticker, value: a.currentValue }))
    .sort((a,b) => b.value - a.value);

  if (loading) return <div style={{ color:C.muted, padding:20 }}>⏳ Cargando cartera...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Mi Cartera</div>
          <div style={{ color:C.muted, fontSize:13 }}>
            Perfil: <span style={{ color:pc, fontWeight:600 }}>{profile?.risk_profile || "Sin definir"}</span> · {assets.length} activos
          </div>
        </div>
        <button onClick={() => setAdding(!adding)} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"9px 18px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
          + Agregar activo
        </button>
      </div>

      {/* Métricas principales */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:14, marginBottom:18 }}>
        {[
          { label:"Valor total", value: fmtUSD(totalValue), color: C.cyan },
          { label:"Costo total", value: fmtUSD(totalCost), color: C.text },
          { label:"P&L total", value: (totalPnL >= 0 ? "+" : "") + fmtUSD(totalPnL), color: totalPnL >= 0 ? C.green : C.red },
          { label:"P&L %", value: (totalPnLPct >= 0 ? "+" : "") + fmt(totalPnLPct) + "%", color: totalPnLPct >= 0 ? C.green : C.red },
        ].map(m => (
          <div key={m.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px" }}>
            <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>{m.label}</div>
            <div style={{ color:m.color, fontSize:22, fontWeight:800, fontFamily:C.mono }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Formulario agregar */}
      {adding && (
        <div style={{ background:C.card, border:`1px solid ${C.cyan}`, borderRadius:12, padding:20, marginBottom:16 }}>
          <div style={{ color:C.cyan, fontSize:12, fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>Nuevo activo</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 2fr", gap:10, marginBottom:12 }}>
            {[["Ticker","ticker","AAPL"],["Cantidad","quantity","10"],["Precio Promedio (USD)","avg_price","150"],["Notas","notes","Long term"]].map(([label,key,ph]) => (
              <div key={key}>
                <label style={{ color:C.muted, fontSize:11, fontWeight:700, display:"block", marginBottom:4 }}>{label}</label>
                <input value={newAsset[key]} onChange={e => setNewAsset(p => ({...p,[key]:e.target.value}))} placeholder={ph} style={inp}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleAdd} disabled={saving || !newAsset.ticker || !newAsset.quantity || !newAsset.avg_price} style={{ background:C.cyan, color:"#07090F", border:"none", borderRadius:8, padding:"9px 20px", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", opacity:saving?0.6:1 }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => setAdding(false)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"9px 16px", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </div>
      )}

      {assets.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:48, textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>💼</div>
          <div style={{ color:C.text, fontWeight:600, marginBottom:6 }}>Tu cartera está vacía</div>
          <div style={{ color:C.muted, fontSize:13 }}>Agregá activos con el botón de arriba para empezar a trackear tu portfolio.</div>
        </div>
      ) : (
        <>
          {/* Tabs vista */}
          <div style={{ display:"flex", gap:6, marginBottom:16 }}>
            {[["tabla","📋 Tabla"],["torta","🥧 Distribución"]].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600, background:view===v?C.cyan:C.card2, color:view===v?"#07090F":C.muted }}>
                {l}
              </button>
            ))}
          </div>

          {/* Vista tabla */}
          {view === "tabla" && (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr 1fr 1fr 50px", padding:"10px 16px", borderBottom:`1px solid ${C.border}` }}>
                {["Ticker","Cant.","P.Prom","P.Actual","Costo","Valor","P&L",""].map(h => (
                  <div key={h} style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</div>
                ))}
              </div>
              {enriched.map(a => (
                <div key={a.id} style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr 1fr 1fr 50px", padding:"13px 16px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
                  <div>
                    <div style={{ fontFamily:C.mono, fontWeight:700, fontSize:13 }}>{a.ticker}</div>
                    {a.notes && <div style={{ color:C.muted, fontSize:10, marginTop:1 }}>{a.notes}</div>}
                  </div>
                  <span style={{ fontFamily:C.mono, fontSize:12, color:C.muted }}>{fmt(a.quantity,2)}</span>
                  <span style={{ fontFamily:C.mono, fontSize:12 }}>{fmtUSD(a.avg_price)}</span>
                  <span style={{ fontFamily:C.mono, fontSize:12, color:a.hasQuote?C.text:C.muted }}>{fmtUSD(a.currentPrice)}</span>
                  <span style={{ fontFamily:C.mono, fontSize:12, color:C.muted }}>{fmtUSD(a.costBasis)}</span>
                  <span style={{ fontFamily:C.mono, fontSize:12, color:C.cyan }}>{fmtUSD(a.currentValue)}</span>
                  <div>
                    <div style={{ fontFamily:C.mono, fontSize:12, color:a.pnl>=0?C.green:C.red }}>{a.pnl>=0?"+":""}{fmtUSD(a.pnl)}</div>
                    <div style={{ fontFamily:C.mono, fontSize:10, color:a.pnlPct>=0?C.green:C.red }}>{a.pnlPct>=0?"+":""}{fmt(a.pnlPct)}%</div>
                  </div>
                  <button onClick={() => deletePortfolioAsset(a.id).then(load)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.red, borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>✕</button>
                </div>
              ))}
              {/* Total row */}
              <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr 1fr 1fr 50px", padding:"13px 16px", background:C.card2, alignItems:"center" }}>
                <span style={{ fontWeight:800, fontSize:13 }}>TOTAL</span>
                <span/>
                <span/>
                <span/>
                <span style={{ fontFamily:C.mono, fontSize:12, color:C.muted }}>{fmtUSD(totalCost)}</span>
                <span style={{ fontFamily:C.mono, fontSize:13, color:C.cyan, fontWeight:700 }}>{fmtUSD(totalValue)}</span>
                <div>
                  <div style={{ fontFamily:C.mono, fontSize:13, color:totalPnL>=0?C.green:C.red, fontWeight:700 }}>{totalPnL>=0?"+":""}{fmtUSD(totalPnL)}</div>
                  <div style={{ fontFamily:C.mono, fontSize:10, color:totalPnLPct>=0?C.green:C.red }}>{totalPnLPct>=0?"+":""}{fmt(totalPnLPct)}%</div>
                </div>
                <span/>
              </div>
            </div>
          )}

          {/* Vista torta */}
          {view === "torta" && (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:24 }}>
              <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:18 }}>Distribución de cartera</div>
              <PieChart data={pieData} />
              <div style={{ marginTop:20, padding:"12px 16px", background:C.card2, borderRadius:8, fontSize:11, color:C.muted }}>
                ⚠️ Distribución basada en valor actual de mercado. Los pesos pueden diferir de tu asignación objetivo.
              </div>
            </div>
          )}
        </>
      )}
      <div style={{ marginTop:12, color:C.muted, fontSize:11 }}>⚠️ Datos orientativos. No constituyen asesoramiento financiero personalizado.</div>
    </div>
  );
}
