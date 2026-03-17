console.log("🚀 QuickInvest starting...");

process.on("uncaughtException", (err) => { console.error("UNCAUGHT:", err.message); });
process.on("unhandledRejection", (err) => { console.error("REJECTION:", err); });

const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());

// ── Yahoo Finance lazy loader ─────────────────────────────────────────────────
let yf = null;
async function getYF() {
  if (yf) return yf;
  try {
    const mod = await import("yahoo-finance2");
    yf = mod.default;
    console.log("✅ yahoo-finance2 ready");
    return yf;
  } catch (e) {
    console.error("❌ yahoo-finance2 failed:", e.message);
    return null;
  }
}

// ── Cache ─────────────────────────────────────────────────────────────────────
const cache = new Map();
const TTL = 5 * 60 * 1000;
const getCache = (k) => { const e = cache.get(k); if (!e || Date.now()-e.ts > TTL) { cache.delete(k); return null; } return e.data; };
const setCache = (k, d) => cache.set(k, { data: d, ts: Date.now() });

function cleanTicker(t) {
  return { BTC:"BTC-USD", ETH:"ETH-USD", SOL:"SOL-USD", XRP:"XRP-USD", GOLD:"GC=F" }[t] || t;
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "ok", ts: Date.now() }));

// ── /quote ────────────────────────────────────────────────────────────────────
app.get("/quote", async (req, res) => {
  const tickers = (req.query.tickers || "").split(",").map(t=>t.trim().toUpperCase()).filter(Boolean).slice(0,50);
  if (!tickers.length) return res.status(400).json({ error: "No tickers" });

  const key = "q_" + tickers.sort().join(",");
  const cached = getCache(key);
  if (cached) return res.json(cached);

  const yahoo = await getYF();
  if (!yahoo) return res.status(503).json({ error: "Yahoo Finance unavailable" });

  try {
    const results = await Promise.allSettled(tickers.map(t => yahoo.quote(cleanTicker(t))));
    const data = {};
    results.forEach((r, i) => {
      const t = tickers[i];
      if (r.status === "fulfilled" && r.value) {
        const q = r.value;
        data[t] = { ticker:t, price:q.regularMarketPrice??null, change:q.regularMarketChange??null,
          changePct:q.regularMarketChangePercent??null, volume:q.regularMarketVolume??null,
          marketCap:q.marketCap??null, pe:q.trailingPE??null,
          fiftyTwoWeekHigh:q.fiftyTwoWeekHigh??null, fiftyTwoWeekLow:q.fiftyTwoWeekLow??null,
          name:q.longName||q.shortName||t, currency:q.currency||"USD" };
      } else { data[t] = { ticker:t, error:"No data" }; }
    });
    setCache(key, data);
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── /markowitz ────────────────────────────────────────────────────────────────
app.get("/markowitz", async (req, res) => {
  const tickers = (req.query.tickers||"").split(",").map(t=>t.trim().toUpperCase()).filter(Boolean).slice(0,20);
  const period = req.query.period || "2y";
  if (tickers.length < 2) return res.status(400).json({ error: "Mínimo 2 tickers" });

  const key = `mz_${tickers.sort().join(",")}_${period}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  const yahoo = await getYF();
  if (!yahoo) return res.status(503).json({ error: "Yahoo Finance unavailable" });

  const days = { "1y":365,"2y":730,"5y":1825 }[period] || 730;
  const period1 = new Date(Date.now() - days*86400000).toISOString().split("T")[0];

  try {
    const results = await Promise.allSettled(
      tickers.map(t => yahoo.historical(cleanTicker(t), { period1, interval:"1mo" }))
    );
    const data = {};
    results.forEach((r, i) => {
      const t = tickers[i];
      if (r.status === "fulfilled" && r.value?.length > 2) {
        const prices = r.value.map(d => d.adjClose||d.close).filter(Boolean);
        const rets = [];
        for (let j=1; j<prices.length; j++) rets.push(Math.log(prices[j]/prices[j-1]));
        const mean = rets.reduce((a,b)=>a+b,0)/rets.length;
        const variance = rets.reduce((a,b)=>a+Math.pow(b-mean,2),0)/(rets.length-1);
        data[t] = { returns:rets, annualReturn:mean*12, annualVol:Math.sqrt(variance*12) };
      } else { data[t] = { error:"No data" }; }
    });
    setCache(key, data);
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── /history ──────────────────────────────────────────────────────────────────
app.get("/history", async (req, res) => {
  const ticker = (req.query.ticker||"").trim().toUpperCase();
  const period = req.query.period || "1y";
  if (!ticker) return res.status(400).json({ error: "No ticker" });

  const key = `h_${ticker}_${period}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  const yahoo = await getYF();
  if (!yahoo) return res.status(503).json({ error: "Yahoo Finance unavailable" });

  const days = { "1mo":30,"3mo":90,"6mo":180,"1y":365,"2y":730 }[period] || 365;
  const period1 = new Date(Date.now() - days*86400000).toISOString().split("T")[0];

  try {
    const raw = await yahoo.historical(cleanTicker(ticker), { period1, interval:"1d" });
    const data = raw.map(d => ({ date:d.date.toISOString().split("T")[0], open:d.open, high:d.high, low:d.low, close:d.close, volume:d.volume }));
    setCache(key, data);
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── /search ───────────────────────────────────────────────────────────────────
app.get("/search", async (req, res) => {
  const query = req.query.q || "";
  if (!query) return res.status(400).json({ error: "No query" });
  const yahoo = await getYF();
  if (!yahoo) return res.status(503).json({ error: "Yahoo Finance unavailable" });
  try {
    const r = await yahoo.search(query);
    res.json((r.quotes||[]).slice(0,8).map(q => ({ ticker:q.symbol, name:q.longname||q.shortname||q.symbol, exchange:q.exchDisp||"" })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on port ${PORT}`);
  getYF(); // precarga en background
});
