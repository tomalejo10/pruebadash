// ── Markowitz con datos reales del backend ────────────────────────────────────

function dot(a, b) {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Matriz de covarianza (anualizada: * 12 para retornos mensuales)
function covMatrix(returnsMap, tickers) {
  const n = tickers.length;
  const means = tickers.map(t => mean(returnsMap[t]));
  const cov = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const ri = returnsMap[tickers[i]];
      const rj = returnsMap[tickers[j]];
      const len = Math.min(ri.length, rj.length);
      let sum = 0;
      for (let k = 0; k < len; k++) {
        sum += (ri[k] - means[i]) * (rj[k] - means[j]);
      }
      const c = (sum / (len - 1)) * 12; // anualizar
      cov[i][j] = c;
      cov[j][i] = c;
    }
  }
  return cov;
}

// Genera N carteras aleatorias con pesos normalizados
function simulatePortfolios(tickers, annualReturns, cov, rf, N = 600) {
  const n = tickers.length;
  const portfolios = [];

  for (let s = 0; s < N; s++) {
    // pesos pseudoaleatorios seeded para reproducibilidad
    const raws = tickers.map((_, j) => {
      let h = (s * 2654435761 + j * 31337) >>> 0;
      h ^= h << 13; h ^= h >> 17; h ^= h << 5;
      return (h >>> 0) / 4294967295;
    });
    const sum = raws.reduce((a, b) => a + b, 0);
    const w = raws.map(r => r / sum);

    const ret = dot(w, annualReturns);
    let varP = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        varP += w[i] * w[j] * cov[i][j];
    const vol = Math.sqrt(Math.max(varP, 0));
    const sharpe = vol > 0 ? (ret - rf) / vol : 0;

    portfolios.push({ vol: +(vol * 100).toFixed(2), ret: +(ret * 100).toFixed(2), sharpe: +sharpe.toFixed(3), weights: w });
  }

  return portfolios;
}

export function buildFrontier(markowitzData, tickers, rf = 0.02) {
  // Filtrar tickers con datos válidos
  const validTickers = tickers.filter(t => markowitzData[t] && !markowitzData[t].error && markowitzData[t].returns?.length > 3);
  if (validTickers.length < 2) return null;

  const returnsMap = {};
  validTickers.forEach(t => { returnsMap[t] = markowitzData[t].returns; });
  const annualReturns = validTickers.map(t => markowitzData[t].annualReturn);
  const cov = covMatrix(returnsMap, validTickers);

  const portfolios = simulatePortfolios(validTickers, annualReturns, cov, rf);
  const optimal = portfolios.reduce((b, p) => p.sharpe > b.sharpe ? p : b, portfolios[0]);
  const minVol  = portfolios.reduce((b, p) => p.vol < b.vol ? p : b, portfolios[0]);

  return {
    portfolios,
    optimal,
    minVol,
    tickers: validTickers,
    annualReturns,
  };
}
