const BASE = import.meta.env.VITE_API_URL || "/api";

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Cotizaciones — AR stocks, cedears, bonos + cripto
export const getQuotes = (tickers) => apiFetch(`/quote?tickers=${tickers.join(",")}`);

// Solo cripto via Binance
export const getCrypto = (symbols) => apiFetch(`/crypto?symbols=${symbols.join(",")}`);

// Dólar MEP
export const getMEP = () => apiFetch(`/mep`);

// Dólar CCL
export const getCCL = () => apiFetch(`/ccl`);

// Histórico de un ticker
export const getHistorical = (ticker, type = "cedear") => apiFetch(`/historical?ticker=${ticker}&type=${type}`);

// Todos los símbolos disponibles
export const getSymbols = () => apiFetch(`/symbols`);
