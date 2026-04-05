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

// Último valor conocido del dólar (persiste entre requests)
let lastKnownMEP = null;
let lastKnownCCL = null;

function fetchJSON(url) {
  return new Promise((resolve,reject) => {
    const req = https.get(url,{headers:{"User-Agent":"Mozilla/5.0","Accept":"application/json"}},(res) => {
      let data=""; res.on("data",c=>data+=c);
      res.on("end",()=>{try{resolve(JSON.parse(data))}catch(e){reject(new Error("Parse error"))}});
    });
    req.on("error",reject);
    req.setTimeout(15000,()=>{req.destroy();reject(new Error("Timeout"))});
  });
}

// ── Cache global data912 ──────────────────────────────────────────────────────
let d912 = { stocks:{}, cedears:{}, bonds:{}, usaStocks:{}, mep:null, ccl:[], ts:0 };

async function refreshD912() {
  if (Date.now() - d912.ts < 20000) return;
  console.log("📡 Refreshing data912...");
  try {
    const [stocks, cedears, bonds, usaStocks, mep, ccl] = await Promise.allSettled([
      fetchJSON("https://data912.com/live/arg_stocks"),
      fetchJSON("https://data912.com/live/arg_cedears"),
      fetchJSON("https://data912.com/live/arg_bonds"),
      fetchJSON("https://data912.com/live/usa_stocks"),
      fetchJSON("https://data912.com/live/mep"),
      fetchJSON("https://data912.com/live/ccl"),
    ]);

    if (stocks.status==="fulfilled"   && Array.isArray(stocks.value))    d912.stocks    = Object.fromEntries(stocks.value.map(s=>[s.symbol,s]));
    if (cedears.status==="fulfilled"  && Array.isArray(cedears.value))   d912.cedears   = Object.fromEntries(cedears.value.map(s=>[s.symbol,s]));
    if (bonds.status==="fulfilled"    && Array.isArray(bonds.value))     d912.bonds     = Object.fromEntries(bonds.value.map(s=>[s.symbol,s]));
    if (usaStocks.status==="fulfilled" && Array.isArray(usaStocks.value)) d912.usaStocks = Object.fromEntries(usaStocks.value.map(s=>[s.symbol,s]));

    // MEP — guardar último valor conocido
    if (mep.status==="fulfilled" && Array.isArray(mep.value) && mep.value.length > 0) {
      d912.mep = mep.value[0];
      lastKnownMEP = { ...mep.value[0], isLive:true, source:"data912" };
    } else if (lastKnownMEP) {
      d912.mep = { ...lastKnownMEP, isLive:false };
    }

    // CCL — guardar último valor conocido
    if (ccl.status==="fulfilled" && Array.isArray(ccl.value) && ccl.value.length > 0) {
      d912.ccl = ccl.value;
      lastKnownCCL = ccl.value.map(c=>({...c, isLive:true}));
    } else if (lastKnownCCL) {
      d912.ccl = lastKnownCCL.map(c=>({...c, isLive:false}));
    }

    d912.ts = Date.now();
    const mepPrice = d912.mep?.mark || d912.mep?.close || "—";
    console.log(`✅ data912: ${Object.keys(d912.stocks).length} stocks, ${Object.keys(d912.cedears).length} cedears, ${Object.keys(d912.usaStocks).length} USA, MEP: $${mepPrice}`);
  } catch(e) { console.error("data912 error:", e.message); }
}

function d912ToQuote(s, ticker, currency="ARS") {
  return { ticker, price:s.c||null, change:null, changePct:s.pct_change||null, volume:s.q_op||null, name:ticker, currency, bid:s.px_bid||null, ask:s.px_ask||null };
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/", (req,res) => res.json({ status:"ok", ts:Date.now() }));

// ── GET /mep ──────────────────────────────────────────────────────────────────
app.get("/mep", async (req,res) => {
  await refreshD912();
  if (d912.mep) return res.json(d912.mep);
  // Fallback: dolarito API
  try {
    const data = await fetchJSON("https://dolarapi.com/v1/dolares/bolsa");
    const result = { mark:data.venta, bid:data.compra, ask:data.venta, close:data.venta, isLive:true, source:"dolarapi" };
    lastKnownMEP = result;
    res.json(result);
  } catch(e) {
    res.json(lastKnownMEP || { error:"MEP not available" });
  }
});

// ── GET /ccl ──────────────────────────────────────────────────────────────────
app.get("/ccl", async (req,res) => {
  await refreshD912();
  if (d912.ccl?.length > 0) return res.json(d912.ccl);
  // Fallback: dolarito API
  try {
    const data = await fetchJSON("https://dolarapi.com/v1/dolares/contadoconliqui");
    const result = [{ CCL_mark:data.venta, CCL_bid:data.compra, CCL_ask:data.venta, CCL_close:data.venta, isLive:true, source:"dolarapi" }];
    lastKnownCCL = result;
    res.json(result);
  } catch(e) {
    res.json(lastKnownCCL || []);
  }
});

// ── GET /symbols ──────────────────────────────────────────────────────────────
app.get("/symbols", async (req,res) => {
  await refreshD912();
  const all = [
    ...Object.keys(d912.stocks).map(s=>({symbol:s,type:"stock",market:"BYMA",currency:"ARS"})),
    ...Object.keys(d912.cedears).map(s=>({symbol:s,type:"cedear",market:"CEDEAR",currency:"ARS"})),
    ...Object.keys(d912.bonds).map(s=>({symbol:s,type:"bond",market:"BYMA",currency:"ARS"})),
    ...Object.keys(d912.usaStocks).map(s=>({symbol:s,type:"usa_stock",market:"USA",currency:"USD"})),
    ...["BTC","ETH","SOL","XRP","BNB","ADA","DOGE","AVAX"].map(s=>({symbol:s,type:"crypto",market:"Crypto",currency:"USD"})),
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
  const cryptoTickers = [];

  for (const ticker of tickers) {
    if (d912.cedears[ticker])       { result[ticker] = d912ToQuote(d912.cedears[ticker], ticker, "ARS"); continue; }
    if (d912.stocks[ticker])        { result[ticker] = d912ToQuote(d912.stocks[ticker], ticker, "ARS"); continue; }
    if (d912.bonds[ticker])         { result[ticker] = d912ToQuote(d912.bonds[ticker], ticker, "ARS"); continue; }
    if (d912.usaStocks[ticker])     { result[ticker] = d912ToQuote(d912.usaStocks[ticker], ticker, "USD"); continue; }
    if (["BTC","ETH","SOL","XRP","BNB","ADA","DOGE","AVAX"].includes(ticker)) { cryptoTickers.push(ticker); continue; }
    result[ticker] = { ticker, error:"Not found" };
  }

  // Cripto via Binance
  if (cryptoTickers.length > 0) {
    await Promise.all(cryptoTickers.map(async s => {
      try {
        const data = await fetchJSON(`https://api.binance.com/api/v3/ticker/24hr?symbol=${s}USDT`);
        result[s] = { ticker:s, price:parseFloat(data.lastPrice), change:parseFloat(data.priceChange), changePct:parseFloat(data.priceChangePercent), volume:parseFloat(data.quoteVolume), name:s, currency:"USD" };
      } catch(e) { result[s] = { ticker:s, error:"No data" }; }
    }));
  }

  setCache(key, result);
  res.json(result);
});

// ── GET /crypto?symbols=BTC,ETH ───────────────────────────────────────────────
app.get("/crypto", async (req,res) => {
  const symbols = (req.query.symbols||"BTC,ETH,SOL,XRP").split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);
  const key = "crypto_"+symbols.sort().join(",");
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const result = {};
  await Promise.all(symbols.map(async s => {
    try {
      const data = await fetchJSON(`https://api.binance.com/api/v3/ticker/24hr?symbol=${s}USDT`);
      result[s] = { ticker:s, price:parseFloat(data.lastPrice), change:parseFloat(data.priceChange), changePct:parseFloat(data.priceChangePercent), volume:parseFloat(data.quoteVolume), name:s, currency:"USD" };
    } catch(e) { result[s] = { ticker:s, error:"No data" }; }
  }));
  setCache(key, result);
  res.json(result);
});

// ── GET /historical?ticker=GGAL&type=stock ────────────────────────────────────
app.get("/historical", async (req,res) => {
  const ticker = (req.query.ticker||"").trim().toUpperCase();
  const type = req.query.type || "stock";
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
