console.log("🚀 Starting QuickInvest API...");

const express = require("express");
const cors = require("cors");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3001;
const AV_KEY = process.env.AV_KEY || "";

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json());

// ── Cache ─────────────────────────────────────────────────────────────────────
const cache = new Map();
const TTL = 10 * 60 * 1000; // 10 min (Alpha Vantage tiene límite de 500/día)
const getCache = k => { const e=cache.get(k); if(!e||Date.now()-e.ts>TTL){cache.delete(k);return null;} return e.data; };
const setCache = (k,d) => cache.set(k,{data:d,ts:Date.now()});

// ── HTTP helper ───────────────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

// ── Alpha Vantage helpers ─────────────────────────────────────────────────────
function cleanTicker(t) {
  return { BTC:"BTC","ETH":"ETH","SOL":"SOL","XRP":"XRP" }[t] || t;
}

async function avQuote(ticker) {
  const isCrypto = ["BTC","ETH","SOL","XRP"].includes(ticker);
  let url, price, change, changePct, volume, name;

  if (isCrypto) {
    url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${ticker}&to_currency=USD&apikey=${AV_KEY}`;
    const data = await fetchJSON(url);
    const r = data["Realtime Currency Exchange Rate"];
    if (!r) throw new Error("No crypto data");
    price = parseFloat(r["5. Exchange Rate"]);
    name = r["1. From_Currency Name"] || ticker;
    change = null; changePct = null; volume = null;
  } else {
    url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${AV_KEY}`;
    const data = await fetchJSON(url);
    const q = data["Global Quote"];
    if (!q || !q["05. price"]) throw new Error("No data");
    price = parseFloat(q["05. price"]);
    change = parseFloat(q["09. change"]);
    changePct = parseFloat(q["10. change percent"]?.replace("%",""));
    volume = parseInt(q["06. volume"]);
    name = ticker;
  }

  return { ticker, price, change, changePct, volume, marketCap: null, pe: null,
    fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null, name, currency: "USD" };
}

async function avHistory(ticker, period = "2y") {
  const outputsize = ["1mo","3mo"].includes(period) ? "compact" : "full";
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${ticker}&apikey=${AV_KEY}&outputsize=${outputsize}`;
  const data = await fetchJSON(url);
  const series = data["Monthly Adjusted Time Series"];
  if (!series) throw new Error("No history data");

  const cutoffDays = { "1y":365,"2y":730,"5y":1825,"3mo":90,"6mo":180 }[period] || 730;
  const cutoff = new Date(Date.now() - cutoffDays * 86400000);

  return Object.entries(series)
    .filter(([date]) => new Date(date) >= cutoff)
    .map(([date, v]) => ({ date, close: parseFloat(v["5. adjusted close"]) }))
    .sort((a,b) => new Date(a.date) - new Date(b.date));
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "ok", ts: Date.now() }));

app.get("/quote", async (req, res) => {
  const tickers = (req.query.tickers||"").split(",").map(t=>t.trim().toUpperCase()).filter(Boolean).slice(0,20);
  if (!tickers.length) return res.status(400).json({ error: "No tickers" });

  const key = "q_" + tickers.sort().join(",");
  const cached = getCache(key);
  if (cached) return res.json(cached);

  // Alpha Vantage free: 25 req/min — procesamos de a 5 con delay
  const data = {};
  for (let i = 0; i < tickers.length; i++) {
    const t = tickers[i];
    try {
      data[t] = await avQuote(t);
    } catch(e) {
      data[t] = { ticker: t, error: e.message };
    }
    if (i < tickers.length - 1) await new Promise(r => setTimeout(r, 300));
  }

  setCache(key, data);
  res.json(data);
});

app.get("/markowitz", async (req, res) => {
  const tickers = (req.query.tickers||"").split(",").map(t=>t.trim().toUpperCase()).filter(Boolean).slice(0,10);
  const period = req.query.period || "2y";
  if (tickers.length < 2) return res.status(400).json({ error: "Mínimo 2 tickers" });

  const key = `mz_${tickers.sort().join(",")}_${period}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  const data = {};
  for (let i = 0; i < tickers.length; i++) {
    const t = tickers[i];
    try {
      const history = await avHistory(t, period);
      if (history.length > 3) {
        const prices = history.map(d => d.close).filter(Boolean);
        const rets = [];
        for (let j = 1; j < prices.length; j++) rets.push(Math.log(prices[j]/prices[j-1]));
        const mean = rets.reduce((a,b)=>a+b,0)/rets.length;
        const variance = rets.reduce((a,b)=>a+Math.pow(b-mean,2),0)/(rets.length-1);
        data[t] = { returns: rets, annualReturn: mean*12, annualVol: Math.sqrt(variance*12) };
      } else {
        data[t] = { error: "Insufficient data" };
      }
    } catch(e) {
      data[t] = { error: e.message };
    }
    if (i < tickers.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  setCache(key, data);
  res.json(data);
});

app.get("/history", async (req, res) => {
  const ticker = (req.query.ticker||"").trim().toUpperCase();
  const period = req.query.period || "1y";
  if (!ticker) return res.status(400).json({ error: "No ticker" });

  const key = `h_${ticker}_${period}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const data = await avHistory(ticker, period);
    setCache(key, data);
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server on port ${PORT}`);
  console.log(`🔑 AV_KEY: ${AV_KEY ? "configured" : "MISSING"}`);
});
