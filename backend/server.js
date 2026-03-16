const express = require("express");
const cors = require("cors");
const yahooFinance = require("yahoo-finance2").default;

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
// En producción, reemplazá "*" por tu dominio de Vercel
// Ej: "https://quickinvest.vercel.app"
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json());

// ── CACHE simple en memoria (5 min) ──────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ── HELPER: limpia ticker para Yahoo Finance ──────────────────────────────────
function cleanTicker(ticker) {
  // BTC → BTC-USD, ETH → ETH-USD, GOLD → GC=F, etc.
  const cryptoMap = { BTC:"BTC-USD", ETH:"ETH-USD", SOL:"SOL-USD", XRP:"XRP-USD" };
  const commodMap = { GOLD:"GC=F", SILVER:"SI=F" };
  return cryptoMap[ticker] || commodMap[ticker] || ticker;
}

// ── GET /quote?tickers=NVDA,AAPL,MSFT ─────────────────────────────────────────
app.get("/quote", async (req, res) => {
  const raw = req.query.tickers || "";
  const tickers = raw.split(",").map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 50);
  if (!tickers.length) return res.status(400).json({ error: "No tickers provided" });

  const cacheKey = "quote_" + tickers.sort().join(",");
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const results = await Promise.allSettled(
      tickers.map(t => yahooFinance.quote(cleanTicker(t)))
    );

    const data = {};
    results.forEach((r, i) => {
      const ticker = tickers[i];
      if (r.status === "fulfilled" && r.value) {
        const q = r.value;
        data[ticker] = {
          ticker,
          price: q.regularMarketPrice ?? null,
          change: q.regularMarketChange ?? null,
          changePct: q.regularMarketChangePercent ?? null,
          volume: q.regularMarketVolume ?? null,
          marketCap: q.marketCap ?? null,
          pe: q.trailingPE ?? null,
          eps: q.epsTrailingTwelveMonths ?? null,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
          name: q.longName || q.shortName || ticker,
          currency: q.currency || "USD",
        };
      } else {
        data[ticker] = { ticker, error: "No data" };
      }
    });

    setCache(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error("Quote error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /history?ticker=NVDA&period=1y ────────────────────────────────────────
// period: 1mo | 3mo | 6mo | 1y | 2y | 5y
app.get("/history", async (req, res) => {
  const ticker = (req.query.ticker || "").trim().toUpperCase();
  const period = req.query.period || "1y";
  if (!ticker) return res.status(400).json({ error: "No ticker" });

  const cacheKey = `history_${ticker}_${period}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const periodMap = { "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730, "5y": 1825 };
  const days = periodMap[period] || 365;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const raw = await yahooFinance.historical(cleanTicker(ticker), {
      period1: startDate.toISOString().split("T")[0],
      interval: "1d",
    });

    const data = raw.map(d => ({
      date: d.date.toISOString().split("T")[0],
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
      adjClose: d.adjClose,
    }));

    setCache(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error("History error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /markowitz?tickers=NVDA,AAPL,MSFT&period=2y ──────────────────────────
// Devuelve retornos diarios para calcular covarianza real en el frontend
app.get("/markowitz", async (req, res) => {
  const raw = req.query.tickers || "";
  const tickers = raw.split(",").map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 20);
  const period = req.query.period || "2y";
  if (tickers.length < 2) return res.status(400).json({ error: "Mínimo 2 tickers" });

  const cacheKey = `markowitz_${tickers.sort().join(",")}_${period}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const days = { "1y": 365, "2y": 730, "5y": 1825 }[period] || 730;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const results = await Promise.allSettled(
      tickers.map(t =>
        yahooFinance.historical(cleanTicker(t), {
          period1: startDate.toISOString().split("T")[0],
          interval: "1mo", // mensual para Markowitz
        })
      )
    );

    const data = {};
    results.forEach((r, i) => {
      const ticker = tickers[i];
      if (r.status === "fulfilled" && r.value?.length > 2) {
        const prices = r.value.map(d => d.adjClose || d.close).filter(Boolean);
        // Retornos logarítmicos mensuales
        const returns = [];
        for (let j = 1; j < prices.length; j++) {
          returns.push(Math.log(prices[j] / prices[j - 1]));
        }
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
        data[ticker] = {
          returns,
          annualReturn: mean * 12,
          annualVol: Math.sqrt(variance * 12),
        };
      } else {
        data[ticker] = { error: "No data" };
      }
    });

    setCache(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /search?q=apple ───────────────────────────────────────────────────────
app.get("/search", async (req, res) => {
  const query = req.query.q || "";
  if (!query) return res.status(400).json({ error: "No query" });
  try {
    const results = await yahooFinance.search(query);
    const items = (results.quotes || []).slice(0, 8).map(q => ({
      ticker: q.symbol,
      name: q.longname || q.shortname || q.symbol,
      exchange: q.exchDisp || "",
      type: q.typeDisp || "",
    }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "ok", service: "QuickInvest API" }));

app.listen(PORT, () => console.log(`✅ QuickInvest API running on port ${PORT}`));
