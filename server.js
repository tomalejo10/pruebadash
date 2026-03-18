console.log("🚀 Starting QuickInvest API...");

const express = require("express");
const cors = require("cors");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3001;
const TD_KEY = process.env.TD_KEY || "";

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json());

const cache = new Map();
const TTL = 5 * 60 * 1000;
const getCache = k => { const e=cache.get(k); if(!e||Date.now()-e.ts>TTL){cache.delete(k);return null;} return e.data; };
const setCache = (k,d) => cache.set(k,{data:d,ts:Date.now()});

function fetchJSON(url) {
  return new Promise((resolve,reject) => {
    const req = https.get(url,{headers:{"User-Agent":"Mozilla/5.0"}},(res) => {
      let data=""; res.on("data",c=>data+=c); res.on("end",()=>{try{resolve(JSON.parse(data))}catch(e){reject(e)}});
    });
    req.on("error",reject);
    req.setTimeout(15000,()=>{req.destroy();reject(new Error("Timeout"))});
  });
}

// Twelve Data — batch quotes
async function tdQuotes(tickers) {
  const symbols = tickers.join(",");
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols)}&apikey=${TD_KEY}`;
  const data = await fetchJSON(url);
  const result = {};
  // Si es un solo ticker, la respuesta no es un objeto anidado
  const items = tickers.length === 1 ? { [tickers[0]]: data } : data;
  for (const ticker of tickers) {
    const q = items[ticker];
    if (!q || q.status === "error") { result[ticker] = { ticker, error: q?.message || "No data" }; continue; }
    result[ticker] = {
      ticker,
      price: parseFloat(q.close) || parseFloat(q.price) || null,
      change: parseFloat(q.change) || null,
      changePct: parseFloat(q.percent_change) || null,
      volume: parseInt(q.volume) || null,
      marketCap: null, // Twelve Data free no incluye mkt cap
      pe: null,
      fiftyTwoWeekHigh: parseFloat(q.fifty_two_week?.high) || null,
      fiftyTwoWeekLow: parseFloat(q.fifty_two_week?.low) || null,
      name: q.name || ticker,
      currency: q.currency || "USD",
    };
  }
  return result;
}

// Twelve Data — batch prices para mkt cap usamos statistics endpoint
async function tdStats(ticker) {
  const url = `https://api.twelvedata.com/statistics?symbol=${encodeURIComponent(ticker)}&apikey=${TD_KEY}`;
  const data = await fetchJSON(url);
  return data?.statistics?.valuations_metrics?.market_capitalization || null;
}

// Twelve Data — histórico mensual para Markowitz
async function tdHistory(ticker, months = 24) {
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(ticker)}&interval=1month&outputsize=${months}&apikey=${TD_KEY}`;
  const data = await fetchJSON(url);
  if (!data?.values) return [];
  return data.values
    .map(d => ({ date: d.datetime, close: parseFloat(d.close) }))
    .reverse();
}

app.get("/", (req, res) => res.json({ status:"ok", ts:Date.now() }));

// GET /quote?tickers=NVDA,AAPL,BTC
app.get("/quote", async (req, res) => {
  const tickers = (req.query.tickers||"").split(",").map(t=>t.trim().toUpperCase()).filter(Boolean).slice(0,50);
  if (!tickers.length) return res.status(400).json({ error:"No tickers" });

  const key = "q_"+tickers.sort().join(",");
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    // Separar cripto de acciones
    const CRYPTO = ["BTC","ETH","SOL","XRP"];
    const cryptoTickers = tickers.filter(t=>CRYPTO.includes(t)).map(t=>t+"/USD");
    const stockTickers = tickers.filter(t=>!CRYPTO.includes(t));

    const allTickers = [...stockTickers, ...cryptoTickers];
    const data = await tdQuotes(allTickers);

    // Re-mapear cripto keys (BTC/USD → BTC)
    const result = {};
    for (const ticker of tickers) {
      const CRYPTO_LIST = ["BTC","ETH","SOL","XRP"];
      const key2 = CRYPTO_LIST.includes(ticker) ? ticker+"/USD" : ticker;
      result[ticker] = { ...(data[key2]||{ ticker, error:"No data" }), ticker };
    }

    setCache(key, result);
    res.json(result);
  } catch(e) {
    console.error("Quote error:", e.message);
    res.status(500).json({ error:e.message });
  }
});

// GET /markowitz?tickers=NVDA,AAPL&period=2y
app.get("/markowitz", async (req, res) => {
  const tickers = (req.query.tickers||"").split(",").map(t=>t.trim().toUpperCase()).filter(Boolean).slice(0,10);
  const months = req.query.period === "1y" ? 12 : 24;
  if (tickers.length < 2) return res.status(400).json({ error:"Mínimo 2 tickers" });

  const key = `mz_${tickers.sort().join(",")}_${months}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  const data = {};
  for (const ticker of tickers) {
    try {
      const history = await tdHistory(ticker, months);
      if (history.length > 3) {
        const prices = history.map(d=>d.close).filter(Boolean);
        const rets = [];
        for (let j=1; j<prices.length; j++) rets.push(Math.log(prices[j]/prices[j-1]));
        const mean = rets.reduce((a,b)=>a+b,0)/rets.length;
        const variance = rets.reduce((a,b)=>a+Math.pow(b-mean,2),0)/(rets.length-1);
        data[ticker] = { returns:rets, annualReturn:mean*12, annualVol:Math.sqrt(variance*12) };
      } else { data[ticker] = { error:"Insufficient data" }; }
    } catch(e) { data[ticker] = { error:e.message }; }
    await new Promise(r=>setTimeout(r,250));
  }

  setCache(key, data);
  res.json(data);
});

// GET /history?ticker=NVDA&period=1y
app.get("/history", async (req, res) => {
  const ticker = (req.query.ticker||"").trim().toUpperCase();
  const months = req.query.period === "2y" ? 24 : 12;
  if (!ticker) return res.status(400).json({ error:"No ticker" });

  const key = `h_${ticker}_${months}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const data = await tdHistory(ticker, months);
    setCache(key, data);
    res.json(data);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server on port ${PORT}`);
  console.log(`🔑 TD_KEY: ${TD_KEY ? "configured" : "MISSING"}`);
});
