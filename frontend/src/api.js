// ── Apunta al backend de Railway en producción,
//    o al proxy local de Vite en desarrollo
const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : "/api";

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Cotizaciones actuales (precio, cambio, volumen, fundamentals)
export async function getQuotes(tickers) {
  return apiFetch(`/quote?tickers=${tickers.join(",")}`);
}

// Histórico OHLCV de un ticker
// period: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y"
export async function getHistory(ticker, period = "1y") {
  return apiFetch(`/history?ticker=${ticker}&period=${period}`);
}

// Datos de retornos mensuales para Markowitz real
export async function getMarkowitzData(tickers, period = "2y") {
  return apiFetch(`/markowitz?tickers=${tickers.join(",")}&period=${period}`);
}

// Búsqueda de tickers
export async function searchTicker(query) {
  return apiFetch(`/search?q=${encodeURIComponent(query)}`);
}
