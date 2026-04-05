console.log("🚀 QuickInvest API starting...");

const express = require("express");
const cors = require("cors");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json());

const cache = new Map();
const TTL = 20000;
const getCache = k => { const e=cache.get(k); if(!e||Date.now()-e.ts>TTL){cache.delete(k);return null;} return e.data; };
const setCache = (k,d) => cache.set(k,{data:d,ts:Date.now()});

function fetchJSON(url) {
  return new Promise((resolve,reject) => {
    const req = https.get(url,{headers:{"User-Agent":"Mozilla/5.0","Accept":"application/json"}},(res) => {
      let data=""; res.on("data",c=>data+=c);
      res.on("end",()=>{try{resolve(JSON.parse(data))}catch(e){reject(new Error("Parse error: "+data.slice(0,100)))}});
    });
    req.on("error",reject);
    req.setTimeout(15000,()=>{req.destroy();reject(new Error("Timeout"))});
  });
}

// ── Cache global de data912 ───────────────────────────────────────────────────
let d912 = { stocks:{}, cedears:{}, bonds:{}, mep:null, ccl:[], ts:0 };

async function refreshD912() {
  if (Date.now() - d912.ts < 20000) return;
  console.log("📡 Refreshing data912...");
  try {
    const [stocks, cedears, bonds, mep, ccl] = await Promise.allSettled([
      fetchJSON("https://data912.com/live/arg_stocks"),
      fetchJSON("https://data912.com/live/arg_cedears"),
      fetchJSON("https://data912.com/live/arg_bonds"),
      fetchJSON("https://data912.com/live/mep"),
      fetchJSON("https://data912.com/live/ccl"),
    ]);
    if (stocks.status==="fulfilled" && Array.isArray(stocks.value))
      d912.stocks = Object.fromEntries(stocks.value.map(s=>[s.symbol,s]));
    if (cedears.status==="fulfilled" && Array.isArray(cedears.value))
      d912.cedears = Object.fromEntries(cedears.value.map(s=>[s.symbol,s]));
    if (bonds.status==="fulfilled" && Array.isArray(bonds.value))
      d912.bonds = Object.fromEntries(bonds.value.map(s=>[s.symbol,s]));
    if (mep.status==="fulfilled" && Array.isArray(mep.value))
      d912.mep = mep.value[0] || null;
    if (ccl.status==="fulfilled" && Array.isArray(ccl.value))
      d912.ccl = ccl.value;
    d912.ts = Date.now();
    console.log(`✅ data912: ${Object.keys(d912.stocks).length} stocks, ${Object.keys(d912.cedears).length} cedears, ${Object.keys(d912.bonds).length} bonds`);
  } catch(e) { console.error("data912 refresh error:", e.message); }
}

function d912ToQuote(s, ticker) {
  return { ticker, price:s.c||null, change:null, changePct:s.pct_change||null, volume:s.q_op||null, name:ticker, currency:"ARS", bid:s.px_bid||null, ask:s.px_ask||null };
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/", (req,res) => res.json({ status:"ok", ts:Date.now() }));

// ── GET /mep ──────────────────────────────────────────────────────────────────
app.get("/mep", async (req,res) => {
  await refreshD912();
  if (d912.mep) return res.json(d912.mep);
  res.status(503).json({ error:"MEP not available" });
});

// ── GET /ccl ──────────────────────────────────────────────────────────────────
app.get("/ccl", async (req,res) => {
  await refreshD912();
  res.json(d912.ccl);
});

// ── GET /symbols — todos los tickers disponibles ──────────────────────────────
app.get("/symbols", async (req,res) => {
  await refreshD912();
  const all = [
    ...Object.keys(d912.stocks).map(s=>({symbol:s,type:"stock",currency:"ARS"})),
    ...Object.keys(d912.cedears).map(s=>({symbol:s,type:"cedear",currency:"ARS"})),
    ...Object.keys(d912.bonds).map(s=>({symbol:s,type:"bond",currency:"ARS"})),
  ];
  res.json(all);
});

// ── GET /quote?tickers=GGAL,AAPL,NVDA ────────────────────────────────────────
app.get("/quote", async (req,res) => {
  const tickers = (req.query.tickers||"").split(",").map(t=>t.trim().toUpperCase()).filter(Boolean).slice(0,50);
  if (!tickers.length) return res.status(400).json({ error:"No tickers" });

  const key = "q_"+tickers.sort().join(",");
  const cached = getCache(key);
  if (cached) return res.json(cached);

  await refreshD912();
  const result = {};

  for (const ticker of tickers) {
    if (d912.stocks[ticker])  { result[ticker] = d912ToQuote(d912.stocks[ticker], ticker); continue; }
    if (d912.cedears[ticker]) { result[ticker] = d912ToQuote(d912.cedears[ticker], ticker); continue; }
    if (d912.bonds[ticker])   { result[ticker] = d912ToQuote(d912.bonds[ticker], ticker); continue; }
    // fallback: intentar en data912 usa_stocks
    try {
      const usa = await fetchJSON(`https://data912.com/live/usa_stocks`);
      if (Array.isArray(usa)) {
        const found = usa.find(s=>s.symbol===ticker);
        if (found) { result[ticker] = d912ToQuote(found, ticker); continue; }
      }
    } catch(e) {}
    result[ticker] = { ticker, error:"No data" };
  }

  setCache(key, result);
  res.json(result);
});

// ── GET /historical?ticker=GGAL&type=stock ────────────────────────────────────
app.get("/historical", async (req,res) => {
  const ticker = (req.query.ticker||"").trim().toUpperCase();
  const type = req.query.type || "stock"; // stock | cedear | bond
  if (!ticker) return res.status(400).json({ error:"No ticker" });

  const key = `hist_${ticker}_${type}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  const endpointMap = { stock:"stocks", cedear:"cedears", bond:"bonds" };
  const endpoint = endpointMap[type] || "stocks";

  try {
    const data = await fetchJSON(`https://data912.com/historical/${endpoint}/${ticker}`);
    setCache(key, data);
    res.json(data);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server on port ${PORT}`);
  refreshD912();
  setInterval(refreshD912, 20000);
});
