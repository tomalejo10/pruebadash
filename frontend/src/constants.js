export const C = {
  bg: "#07090F", card: "#0D1117", card2: "#111720", border: "#1C2333",
  cyan: "#26ECC8", cyanDim: "rgba(38,236,200,0.12)", cyanGlow: "rgba(38,236,200,0.25)",
  text: "#E2E8F0", muted: "#64748B", green: "#4ADE80", red: "#F87171", yellow: "#FFD166",
  mono: "'JetBrains Mono','Courier New',monospace",
};

export const WATCHLIST = {
  "MEMBRESÍA":  ["ADBE","AI","BRK-B","DIS","GGAL","GOOGL","HPQ","JD","MELI","MSFT","NKE","PBR","PEP","PYPL","TSLA","UNH","URA","VIST"],
  "CRIPTO":     ["BTC","ETH","SOL","XRP"],
  "RADAR":      ["BB","FCX","MSTR","PM","RACE","TMUS","CVX","PAGS","TXN","PFE","TGT","MDT","EWZ"],
  "ACTIVAS":    ["RBLX","LMT","META","NVDA","AMZN","ORCL"],
  "TECH":       ["CRM","AVGO","SAP","PATH","MRVL","SNOW","QCOM","IBM"],
  "SEGUIMIENTO":["NU","SWKS","COST","OXY","NFLX","MDLZ","ADP","MU","LRCX","ASML","PAM","UBER","SONY","AAPL","PLTR","NIO"],
};

export const QUESTIONS = [
  { q: "¿Cuál es tu horizonte de inversión?",       opts: ["Menos de 1 año","1-3 años","3-7 años","Más de 7 años"],          scores: [1,2,3,4] },
  { q: "Si tu cartera cae 30%, ¿qué hacés?",         opts: ["Vendo todo","Vendo algo","Me quedo quieto","Compro más"],          scores: [1,2,3,4] },
  { q: "¿Cuál es tu objetivo principal?",            opts: ["Preservar capital","Renta estable","Crecimiento moderado","Máximo rendimiento"], scores: [1,2,3,4] },
  { q: "¿Qué % de tu patrimonio invertís?",          opts: ["Menos del 10%","10-25%","25-50%","Más del 50%"],                  scores: [1,2,3,4] },
  { q: "¿Cuánta experiencia tenés en inversiones?",  opts: ["Ninguna","Menos de 2 años","2-5 años","Más de 5 años"],           scores: [1,2,3,4] },
  { q: "¿Qué rendimiento anual esperás?",            opts: ["5-10%","10-20%","20-40%","Más del 40%"],                          scores: [1,2,3,4] },
];

export const PROFILES = [
  {
    name: "Conservador", range: [6,12], color: "#4ECDC4", emoji: "🛡️",
    alloc: { renta_fija: 60, acciones: 20, cash: 15, cripto: 5 },
    desc: "Priorizás preservar capital. Carteras de baja volatilidad con predominio de renta fija y activos defensivos.",
  },
  {
    name: "Moderado", range: [13,18], color: "#FFD166", emoji: "⚖️",
    alloc: { renta_fija: 35, acciones: 45, cash: 10, cripto: 10 },
    desc: "Buscás equilibrio entre rendimiento y riesgo. Mix balanceado entre acciones growth y renta fija.",
  },
  {
    name: "Agresivo", range: [19,24], color: "#26ECC8", emoji: "🚀",
    alloc: { renta_fija: 10, acciones: 65, cash: 5, cripto: 20 },
    desc: "Aceptás alta volatilidad a cambio de máximo rendimiento. Enfoque en acciones growth y criptoactivos.",
  },
];

export function getProfile(score) {
  return PROFILES.find(p => score >= p.range[0] && score <= p.range[1]) || PROFILES[1];
}

export const S = {
  card:     { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22, marginBottom: 18 },
  btn:      { background: C.cyan, color: "#07090F", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit" },
  btnGhost: { background: "transparent", color: C.cyan, border: `1px solid ${C.cyan}`, borderRadius: 8, padding: "9px 22px", fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "inherit" },
  btnSm:    { background: C.cyanDim, color: C.cyan, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 12px", fontWeight: 600, cursor: "pointer", fontSize: 11, fontFamily: "inherit" },
  input:    { background: "#090D15", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "10px 14px", fontSize: 13, width: "100%", boxSizing: "border-box", fontFamily: "inherit", outline: "none" },
  label:    { color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 },
  cardTitle:{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 },
};
