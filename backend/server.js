import express from "express";
import cors from "cors";
import yahooFinance from "yahoo-finance2";

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json());

// ── CACHE simple en memoria (5 min) ──────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ── HELPER: limpia ticker para Yahoo Finance ──────────────────────────────────
function cleanTicker(ticker) {
  const cryptoMap = {
    BTC: "BTC-USD",
    ETH: "ETH-USD",
    SOL: "SOL-USD",
    XRP: "XRP-USD",
  };

  const commodMap = {
    GOLD: "GC=F",
    SILVER: "SI=F",
  };

  return cryptoMap[ticker] || commodMap[ticker] || ticker;
}

// ── GET /quote?tickers=NVDA,AAPL,MSFT ─────────────────────────────────────────
app.get("/quote", async (req, res) => {
  const raw = req.query.tickers || "";
  const tickers = raw
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50);

  if (!tickers.length) {
    return res.status(400).json({ error: "No tickers provided" });
  }

  const sortedTickers = [...tickers].sort();
  const cacheKey = "quote_" + sortedTickers.join(",");
  const cached = getCache(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  try {
    const results = await Promise.allSettled(
      tickers.map((t) => yahooFinance.quote(cleanTicker(t)))
    );

    const data = {};

    results.forEach((result, i) => {
      const ticker = tickers[i];

      if (result.status === "fulfilled" && result.value) {
        const q = result.value;

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
        data[ticker] = {
          ticker,
          error: "No data",
        };
      }
    });

    setCache(cacheKey, data);
    return res.json(data);
  } catch (err) {
    console.error("Quote error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ── GET /history?ticker=NVDA&period=1y ────────────────────────────────────────
// period: 1mo | 3mo | 6mo | 1y | 2y | 5y
app.get("/history", async (req, res) => {
  const ticker = (req.query.ticker || "").trim().toUpperCase();
  const period = req.query.period || "1y";

  if (!ticker) {
    return res.status(400).json({ error: "No ticker" });
  }

  const cacheKey = `history_${ticker}_${period}`;
  const cached = getCache(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  const periodMap = {
    "1mo": 30,
    "3mo": 90,
    "6mo": 180,
    "1y": 365,
    "2y": 730,
    "5y": 1825,
  };

  const days = periodMap[period] || 365;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const raw = await yahooFinance.historical(cleanTicker(ticker), {
      period1: startDate.toISOString().split("T")[0],
      interval: "1d",
    });

    const data = (raw || []).map((d) => ({
      date: d.date?.toISOString?.().split("T")[0] ?? null,
      open: d.open ?? null,
      high: d.high ?? null,
      low: d.low ?? null,
      close: d.close ?? null,
      volume: d.volume ?? null,
      adjClose: d.adjClose ?? null,
    }));

    setCache(cacheKey, data);
    return res.json(data);
  } catch (err) {
    console.error("History error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ── GET /markowitz?tickers=NVDA,AAPL,MSFT&period=2y ──────────────────────────
// Devuelve retornos para calcular covarianza en el frontend
app.get("/markowitz", async (req, res) => {
  const raw = req.query.tickers || "";
  const tickers = raw
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 20);

  const period = req.query.period || "2y";

  if (tickers.length < 2) {
    return res.status(400).json({ error: "Mínimo 2 tickers" });
  }

  const sortedTickers = [...tickers].sort();
  const cacheKey = `markowitz_${sortedTickers.join(",")}_${period}`;
  const cached = getCache(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  const periodDays = {
    "1y": 365,
    "2y": 730,
    "5y": 1825,
  };

  const days = periodDays[period] || 730;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const results = await Promise.allSettled(
      tickers.map((t) =>
        yahooFinance.historical(cleanTicker(t), {
          period1: startDate.toISOString().split("T")[0],
          interval: "1mo",
        })
      )
    );

    const data = {};

    results.forEach((result, i) => {
      const ticker = tickers[i];

      if (result.status === "fulfilled" && result.value?.length > 2) {
        const prices = result.value
          .map((d) => d.adjClose || d.close)
          .filter((v) => typeof v === "number" && v > 0);

        if (prices.length < 3) {
          data[ticker] = { error: "No data" };
          return;
        }

        const returns = [];
        for (let j = 1; j < prices.length; j += 1) {
          returns.push(Math.log(prices[j] / prices[j - 1]));
        }

        const mean =
          returns.reduce((acc, value) => acc + value, 0) / returns.length;

        const variance =
          returns.length > 1
            ? returns.reduce((acc, value) => acc + (value - mean) ** 2, 0) /
              (returns.length - 1)
            : 0;

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
    return res.json(data);
  } catch (err) {
    console.error("Markowitz error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ── GET /search?q=apple ───────────────────────────────────────────────────────
app.get("/search", async (req, res) => {
  const query = (req.query.q || "").trim();

  if (!query) {
    return res.status(400).json({ error: "No query" });
  }

  try {
    const results = await yahooFinance.search(query);

    const items = (results.quotes || []).slice(0, 8).map((q) => ({
      ticker: q.symbol,
      name: q.longname || q.shortname || q.symbol,
      exchange: q.exchDisp || "",
      type: q.typeDisp || "",
    }));

    return res.json(items);
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ── Health checks ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "QuickInvest API" });
});

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

// ── Startup ───────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ QuickInvest API running on port ${PORT}`);
});
