import { useState, useEffect, useCallback, useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { getQuotes, getMarkowitzData, searchTicker } from "./api";
import { buildFrontier } from "./markowitz";
import { C, S, WATCHLIST, QUESTIONS, PROFILES, getProfile } from "./constants";

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Spinner() {
  return <div style={{ color: C.muted, fontSize: 13, padding: 20 }}>⏳ Cargando...</div>;
}

function ErrorMsg({ msg }) {
  return <div style={{ color: C.red, fontSize: 13, padding: 12, background: "rgba(248,113,113,0.08)", borderRadius: 8 }}>❌ {msg}</div>;
}

function StatChip({ value, label, color }) {
  return (
    <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: C.mono, color: color || C.text }}>{value}</div>
      <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function fmt(n, decimals = 2) {
  if (n == null) return "—";
  return Number(n).toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtBig(n) {
  if (n == null) return "—";
  if (n >= 1e12) return "$" + fmt(n / 1e12, 1) + "T";
  if (n >= 1e9)  return "$" + fmt(n / 1e9, 1) + "B";
  if (n >= 1e6)  return "$" + fmt(n / 1e6, 1) + "M";
  return "$" + fmt(n);
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ tab, setTab, profile }) {
  const items = [
    { id: "perfil",    icon: "🎯", label: "Perfil de Riesgo" },
    { id: "watchlist", icon: "📡", label: "Watchlist" },
    { id: "optimizer", icon: "📊", label: "Optimizador" },
    { id: "reporte",   icon: "✨", label: "Reporte IA" },
  ];
  return (
    <div style={{ width: 210, minWidth: 210, background: C.card, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "22px 14px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ color: C.cyan, fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" }}>QuickInvest</div>
        <div style={{ color: C.muted, fontSize: 10, marginTop: 2, letterSpacing: "0.5px", textTransform: "uppercase" }}>Portfolio Manager</div>
      </div>
      {items.map(item => (
        <div key={item.id} onClick={() => setTab(item.id)} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
          borderRadius: 8, marginBottom: 3, cursor: "pointer", fontSize: 13,
          background: tab === item.id ? C.cyanDim : "transparent",
          color: tab === item.id ? C.cyan : C.muted,
          fontWeight: tab === item.id ? 700 : 400,
          borderLeft: `3px solid ${tab === item.id ? C.cyan : "transparent"}`,
          transition: "all 0.15s",
        }}>
          <span>{item.icon}</span>{item.label}
        </div>
      ))}
      <div style={{ marginTop: "auto", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
        <div style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Tu perfil</div>
        {profile
          ? <div style={{ fontSize: 13, fontWeight: 700, color: profile.color }}>{profile.emoji} {profile.name}</div>
          : <div style={{ fontSize: 13, color: C.muted }}>Sin definir</div>}
      </div>
    </div>
  );
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────
function PerfilInversor({ onProfileSet }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const score = useMemo(() => Object.values(answers).reduce((a, b) => a + b, 0), [answers]);
  const profile = useMemo(() => submitted ? getProfile(score) : null, [submitted, score]);

  useEffect(() => { if (submitted && profile) onProfileSet(profile); }, [submitted]);

  if (submitted && profile) {
    return (
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Tu Perfil de Inversor</div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Score: {score}/24 puntos</div>
        <div style={{ ...S.card, border: `2px solid ${profile.color}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
            <div style={{ fontSize: 52 }}>{profile.emoji}</div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: profile.color }}>{profile.name}</div>
              <div style={{ color: C.muted, fontSize: 13 }}>Score: {score}/24 puntos</div>
            </div>
          </div>
          <p style={{ color: "#94A3B8", lineHeight: 1.65, marginBottom: 20, fontSize: 14 }}>{profile.desc}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
            {Object.entries(profile.alloc).map(([k, v]) => (
              <div key={k} style={{ background: "#090D15", borderRadius: 10, padding: 14, textAlign: "center" }}>
                <div style={{ color: profile.color, fontSize: 22, fontWeight: 800, fontFamily: C.mono }}>{v}%</div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 4, textTransform: "capitalize" }}>{k.replace("_", " ")}</div>
              </div>
            ))}
          </div>
          <button style={S.btn} onClick={() => { setSubmitted(false); setAnswers({}); }}>Rehacer cuestionario</button>
        </div>
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Perfil de Riesgo</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Respondé 6 preguntas para definir tu perfil</div>
      <div style={{ display: "flex", gap: 4, marginBottom: 22 }}>
        {QUESTIONS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: answers[i] != null ? C.cyan : C.border, transition: "background 0.3s" }} />
        ))}
      </div>
      {QUESTIONS.map((q, i) => (
        <div key={i} style={S.card}>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>PREGUNTA {i+1} DE {QUESTIONS.length}</div>
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>{q.q}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {q.opts.map((opt, j) => {
              const sel = answers[i] === q.scores[j];
              return (
                <button key={j} onClick={() => setAnswers(p => ({ ...p, [i]: q.scores[j] }))} style={{
                  background: sel ? C.cyanDim : "#090D15",
                  border: `1px solid ${sel ? C.cyan : C.border}`,
                  borderRadius: 8, padding: "9px 13px",
                  color: sel ? C.cyan : C.text,
                  cursor: "pointer", fontSize: 12, textAlign: "left",
                  fontFamily: "inherit", fontWeight: sel ? 600 : 400,
                }}>{opt}</button>
              );
            })}
          </div>
        </div>
      ))}
      <button
        style={{ ...S.btn, width: "100%", padding: 13, fontSize: 14, opacity: answered === QUESTIONS.length ? 1 : 0.4 }}
        disabled={answered < QUESTIONS.length}
        onClick={() => setSubmitted(true)}
      >Ver Mi Perfil →</button>
    </div>
  );
}

// ─── WATCHLIST ────────────────────────────────────────────────────────────────
function Watchlist() {
  const [cat, setCat] = useState("MEMBRESÍA");
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState({});
  const [error, setError] = useState(null);

  const allTickers = useMemo(() => WATCHLIST[cat] || [], [cat]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getQuotes(allTickers);
      setQuotes(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [allTickers]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Watchlist</div>
          <div style={{ color: C.muted, fontSize: 13 }}>Precios en tiempo real vía Yahoo Finance</div>
        </div>
        <button style={S.btnGhost} onClick={load}>🔄 Actualizar</button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {Object.keys(WATCHLIST).map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            cursor: "pointer", border: "none", fontFamily: "inherit",
            background: cat === c ? C.cyan : C.cyanDim,
            color: cat === c ? "#07090F" : C.cyan,
          }}>{c} ({WATCHLIST[c].length})</button>
        ))}
      </div>

      {error && <ErrorMsg msg={error} />}

      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr auto", gap: 0, padding: "0 8px 10px", borderBottom: `1px solid ${C.border}` }}>
          {["Ticker / Nombre", "Precio", "Cambio", "%", "Mkt Cap", "Alerta"].map(h => (
            <div key={h} style={{ color: C.muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</div>
          ))}
        </div>

        {loading && <Spinner />}

        {!loading && allTickers.map(ticker => {
          const q = quotes[ticker];
          const pos = q?.changePct >= 0;
          const on = alerts[ticker];
          return (
            <div key={ticker} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr auto", gap: 0, padding: "11px 8px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 13 }}>{ticker}</div>
                {q?.name && <div style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>{q.name.length > 22 ? q.name.slice(0,22)+"…" : q.name}</div>}
              </div>
              <span style={{ fontFamily: C.mono, fontSize: 13 }}>{q?.price != null ? "$" + fmt(q.price) : "—"}</span>
              <span style={{ color: q ? (pos ? C.green : C.red) : C.muted, fontFamily: C.mono, fontSize: 12 }}>
                {q?.change != null ? (pos?"+":"") + fmt(q.change) : "—"}
              </span>
              <span style={{ color: q ? (pos ? C.green : C.red) : C.muted, fontFamily: C.mono, fontSize: 12 }}>
                {q?.changePct != null ? (pos?"+":"") + fmt(q.changePct) + "%" : "—"}
              </span>
              <span style={{ color: C.muted, fontSize: 11 }}>{fmtBig(q?.marketCap)}</span>
              <button onClick={() => setAlerts(p => ({ ...p, [ticker]: !p[ticker] }))} style={{
                background: on ? C.cyanDim : "transparent",
                border: `1px solid ${on ? C.cyan : C.border}`,
                borderRadius: 6, padding: "3px 10px",
                color: on ? C.cyan : C.muted,
                cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
              }}>{on ? "🔔 ON" : "🔕 OFF"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── OPTIMIZER ────────────────────────────────────────────────────────────────
function Optimizer() {
  const [tickerInput, setTickerInput] = useState("NVDA,MSFT,AAPL,AMZN,META,GOOGL");
  const [rf, setRf] = useState("2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const run = async () => {
    const tickers = tickerInput.split(",").map(t => t.trim().toUpperCase()).filter(Boolean);
    if (tickers.length < 2) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const rawData = await getMarkowitzData(tickers, "2y");
      const frontier = buildFrontier(rawData, tickers, parseFloat(rf) / 100 || 0.02);
      if (!frontier) throw new Error("No hay suficientes datos históricos para estos tickers.");
      setResult({ frontier, rawData });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Optimizador Markowitz</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Frontera eficiente con datos históricos reales (Yahoo Finance)</div>

      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={S.label}>Tickers (separados por coma)</label>
            <input style={S.input} value={tickerInput} onChange={e => setTickerInput(e.target.value)} placeholder="NVDA, MSFT, AAPL..." />
          </div>
          <div>
            <label style={S.label}>Rf (%)</label>
            <input style={S.input} value={rf} onChange={e => setRf(e.target.value)} type="number" step="0.5" />
          </div>
        </div>
        <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} onClick={run} disabled={loading}>
          {loading ? "⏳ Calculando..." : "Calcular Frontera Eficiente"}
        </button>
      </div>

      {error && <ErrorMsg msg={error} />}

      {result && <>
        <div style={S.card}>
          <div style={S.cardTitle}>Frontera Eficiente — {result.frontier.tickers.length} activos × 600 carteras simuladas</div>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 24, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="vol" name="Volatilidad" unit="%" tick={{ fill: C.muted, fontSize: 10 }} label={{ value: "Volatilidad (%)", position: "insideBottom", offset: -10, fill: C.muted, fontSize: 11 }} />
              <YAxis dataKey="ret" name="Retorno" unit="%" tick={{ fill: C.muted, fontSize: 10 }} label={{ value: "Retorno (%)", angle: -90, position: "insideLeft", fill: C.muted, fontSize: 11 }} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [v + "%", n]} />
              <Scatter data={result.frontier.portfolios} fill={`${C.cyan}30`} />
              <Scatter data={[result.frontier.optimal]} fill={C.cyan} />
              <Scatter data={[result.frontier.minVol]}  fill={C.yellow} />
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
            <span style={{ color: C.cyan }}>● Max Sharpe</span>
            <span style={{ color: C.yellow }}>● Mín. Volatilidad</span>
            <span style={{ color: `${C.cyan}50` }}>● Carteras simuladas</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { portfolio: result.frontier.optimal, color: C.cyan,   label: "🎯 Max Sharpe (óptimo)" },
            { portfolio: result.frontier.minVol,  color: C.yellow, label: "🛡️ Mínima Volatilidad" },
          ].map(({ portfolio, color, label }) => (
            <div key={label} style={{ ...S.card, borderColor: `${color}40` }}>
              <div style={{ ...S.cardTitle, color }}>{label}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                <StatChip value={portfolio.ret + "%"} label="Retorno anual" color={color} />
                <StatChip value={portfolio.vol + "%"} label="Volatilidad" />
              </div>
              {result.frontier.tickers.map((t, i) => (
                <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                  <span style={{ fontFamily: C.mono, fontWeight: 600 }}>{t}</span>
                  <span style={{ color, fontFamily: C.mono }}>{(portfolio.weights[i] * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}

// ─── REPORTE IA ───────────────────────────────────────────────────────────────
function ReporteIA({ profile }) {
  const [tickers, setTickers] = useState("NVDA, MSFT, AAPL, AMZN, META");
  const [capital, setCapital] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [quotes, setQuotes] = useState(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const fetchAndGenerate = async () => {
    const tickerList = tickers.split(",").map(t => t.trim().toUpperCase()).filter(Boolean);
    setLoading(true); setReport(""); setLoadingQuotes(true);

    let quoteContext = "";
    try {
      const q = await getQuotes(tickerList);
      setQuotes(q);
      quoteContext = tickerList.map(t => {
        const d = q[t];
        if (!d || d.error) return `${t}: sin datos`;
        return `${t}: $${fmt(d.price)} (${d.changePct >= 0 ? "+" : ""}${fmt(d.changePct)}% hoy) | P/E: ${d.pe ? fmt(d.pe, 1) : "N/A"} | Mkt Cap: ${fmtBig(d.marketCap)}`;
      }).join("\n");
    } catch {}
    setLoadingQuotes(false);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          messages: [{
            role: "user",
            content: `Sos un asesor financiero experto para el mercado internacional y argentino.
Generá un reporte de cartera en español argentino (informal, directo, preciso) para un cliente con:

- Perfil de riesgo: ${profile?.name || "Moderado"}
- Activos en cartera: ${tickers}
- Capital estimado: USD ${capital}
- Asignación por perfil: ${JSON.stringify(profile?.alloc || { renta_fija: 35, acciones: 45, cash: 10, cripto: 10 })}

COTIZACIONES ACTUALES:
${quoteContext || "No disponibles"}

Estructura requerida (usá emojis, sé concreto):

📌 RESUMEN EJECUTIVO
(2-3 oraciones de síntesis)

📊 ANÁLISIS DE ACTIVOS
(1 línea por activo con tesis y perspectiva)

💼 DISTRIBUCIÓN SUGERIDA
(% por activo sumando 100%)

🎯 TOP 3 RECOMENDACIONES

⚠️ RIESGOS A MONITOREAR

💡 CONVICCIÓN
(1 frase de cierre)`
          }],
        }),
      });
      const data = await res.json();
      setReport(data.content?.[0]?.text || "Error al generar reporte.");
    } catch { setReport("❌ Error al conectar con la IA."); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Reporte IA</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Análisis personalizado con cotizaciones reales + IA</div>

      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Activos en cartera</label>
            <input style={S.input} value={tickers} onChange={e => setTickers(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Capital estimado (USD)</label>
            <input style={S.input} value={capital} onChange={e => setCapital(e.target.value)} type="number" />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {profile && (
            <div style={{ background: C.cyanDim, border: `1px solid ${profile.color}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, color: profile.color, fontWeight: 600 }}>
              {profile.emoji} Perfil: {profile.name}
            </div>
          )}
          <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} onClick={fetchAndGenerate} disabled={loading}>
            {loadingQuotes ? "📡 Obteniendo cotizaciones..." : loading ? "⏳ Generando reporte..." : "✨ Generar Reporte IA"}
          </button>
        </div>
      </div>

      {report && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ color: C.cyan, fontWeight: 700, fontSize: 15 }}>📋 Reporte de Cartera</span>
            <span style={{ color: C.muted, fontSize: 12 }}>{new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}</span>
          </div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 13.5, color: C.text, background: "#090D15", borderRadius: 10, padding: 22, border: `1px solid ${C.border}` }}>
            {report}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("perfil");
  const [profile, setProfile] = useState(null);

  const pages = {
    perfil:    <PerfilInversor onProfileSet={setProfile} />,
    watchlist: <Watchlist />,
    optimizer: <Optimizer />,
    reporte:   <ReporteIA profile={profile} />,
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans','Segoe UI',sans-serif", overflow: "hidden" }}>
      <Sidebar tab={tab} setTab={setTab} profile={profile} />
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {pages[tab]}
      </div>
    </div>
  );
}
