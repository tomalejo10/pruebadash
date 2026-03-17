console.log("🚀 Starting...");
const express = require("express");
const cors = require("cors");
const https = require("https");
const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors({ origin: "*" }));
app.use(express.json());
const cache = new Map();
const TTL = 5*60*1000;
const getCache = k => { const e=cache.get(k); if(!e||Date.now()-e.ts>TTL){cache.delete(k);return null;} return e.data; };
const setCache = (k,d) => cache.set(k,{data:d,ts:Date.now()});
function cleanTicker(t) { return {BTC:"BTC-USD",ETH:"ETH-USD",SOL:"SOL-USD",XRP:"XRP-USD",GOLD:"GC=F"}[t]||t; }
function fetchJSON(url) {
  return new Promise((resolve,reject) => {
    const req = https.get(url,{headers:{"User-Agent":"Mozilla/5.0","Accept":"application/json"}},(res) => {
      let data=""; res.on("data",c=>data+=c); res.on("end",()=>{try{resolve(JSON.parse(data))}catch(e){reject(e)}});
    });
    req.on("error",reject);
    req.setTimeout(10000,()=>{req.destroy();reject(new Error("Timeout"))});
  });
}
async function yahooQuote(ticker) {
  const t=encodeURIComponent(cleanTicker(ticker));
  const data=await fetchJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=1d`);
  const meta=data?.chart?.result?.[0]?.meta;
  if(!meta) throw new Error("No data");
  return { ticker, price:meta.regularMarketPrice??null,
    change:meta.regularMarketPrice&&meta.previousClose ? +(meta.regularMarketPrice-meta.previousClose).toFixed(4):null,
    changePct:meta.regularMarketPrice&&meta.previousClose ? +((meta.regularMarketPrice-meta.previousClose)/meta.previousClose*100).toFixed(4):null,
    volume:meta.regularMarketVolume??null, marketCap:meta.marketCap??null,
    name:meta.longName||meta.shortName||ticker, currency:meta.currency||"USD",
    fiftyTwoWeekHigh:meta.fiftyTwoWeekHigh??null, fiftyTwoWeekLow:meta.fiftyTwoWeekLow??null, pe:null };
}
async function yahooHistory(ticker,period="1y") {
  const range={"1mo":"1mo","3mo":"3mo","6mo":"6mo","1y":"1y","2y":"2y","5y":"5y"}[period]||"1y";
  const t=encodeURIComponent(cleanTicker(ticker));
  const data=await fetchJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1mo&range=${range}`);
  const result=data?.chart?.result?.[0];
  if(!result) throw new Error("No data");
  const timestamps=result.timestamp||[];
  const closes=result.indicators?.adjclose?.[0]?.adjclose||result.indicators?.quote?.[0]?.close||[];
  return timestamps.map((ts,i)=>({date:new Date(ts*1000).toISOString().split("T")[0],close:closes[i]??null})).filter(d=>d.close!=null);
}
app.get("/",(req,res)=>{ console.log("GET /"); res.json({status:"ok",ts:Date.now()}); });
app.get("/quote",async(req,res)=>{
  const tickers=(req.query.tickers||"").split(",").map(t=>t.trim().toUpperCase()).filter(Boolean).slice(0,50);
  if(!tickers.length) return res.status(400).json({error:"No tickers"});
  const key="q_"+tickers.sort().join(",");
  const cached=getCache(key); if(cached) return res.json(cached);
  const results=await Promise.allSettled(tickers.map(t=>yahooQuote(t)));
  const data={};
  results.forEach((r,i)=>{ const t=tickers[i]; data[t]=r.status==="fulfilled"?r.value:{ticker:t,error:r.reason?.message||"failed"}; });
  setCache(key,data); res.json(data);
});
app.get("/markowitz",async(req,res)=>{
  const tickers=(req.query.tickers||"").split(",").map(t=>t.trim().toUpperCase()).filter(Boolean).slice(0,20);
  const period=req.query.period||"2y";
  if(tickers.length<2) return res.status(400).json({error:"Mínimo 2 tickers"});
  const key=`mz_${tickers.sort().join(",")}_${period}`;
  const cached=getCache(key); if(cached) return res.json(cached);
  const results=await Promise.allSettled(tickers.map(t=>yahooHistory(t,period)));
  const data={};
  results.forEach((r,i)=>{ const t=tickers[i];
    if(r.status==="fulfilled"&&r.value?.length>3){
      const prices=r.value.map(d=>d.close).filter(Boolean);
      const rets=[]; for(let j=1;j<prices.length;j++) rets.push(Math.log(prices[j]/prices[j-1]));
      const mean=rets.reduce((a,b)=>a+b,0)/rets.length;
      const variance=rets.reduce((a,b)=>a+Math.pow(b-mean,2),0)/(rets.length-1);
      data[t]={returns:rets,annualReturn:mean*12,annualVol:Math.sqrt(variance*12)};
    } else { data[t]={error:r.reason?.message||"No data"}; }
  });
  setCache(key,data); res.json(data);
});
app.get("/history",async(req,res)=>{
  const ticker=(req.query.ticker||"").trim().toUpperCase();
  const period=req.query.period||"1y";
  if(!ticker) return res.status(400).json({error:"No ticker"});
  const key=`h_${ticker}_${period}`; const cached=getCache(key); if(cached) return res.json(cached);
  try { const data=await yahooHistory(ticker,period); setCache(key,data); res.json(data); }
  catch(e){ res.status(500).json({error:e.message}); }
});
app.listen(PORT,"0.0.0.0",()=>{ console.log(`✅ Server on port ${PORT}`); });
