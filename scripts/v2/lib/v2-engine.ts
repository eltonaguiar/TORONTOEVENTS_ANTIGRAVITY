/**
 * STOCKSUNIFY2: Scientific Engine
 *
 * Orchestrates data fetching, strategy execution, and audit logging.
 */

import {
  fetchMultipleStocks,
  fetchStockData,
} from "../../lib/stock-data-fetcher-enhanced";
import {
  scoreRAR,
  scoreVAM,
  scoreLSP,
  scoreScientificCANSLIM,
  scoreAdversarialTrend,
  scoreInstitutionalFootprint,
  V2Pick,
} from "./strategies";

// The "Standard" Scientific Universe - Expanded for comprehensive coverage
const V2_UNIVERSE = [
  // Market Index (Regime Baseline)
  "SPY",

  // Mega-Cap Tech (Quality Growth)
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "GOOGL",
  "META",
  "TSLA",
  "AVGO",
  "COST",
  "V",
  "MA",
  "NFLX",
  "AMD",
  "LRCX",

  // Additional Large-Cap Tech
  "CRM",
  "ADBE",
  "ORCL",
  "INTC",
  "QCOM",
  "NOW",
  "SNOW",
  "PANW",

  // Strong Fundamentals (Financials)
  "JPM",
  "UNH",
  "LLY",
  "JNJ",
  "PG",
  "XOM",
  "CAT",
  "GE",
  "BAC",
  "WFC",
  "GS",
  "MS",
  "BLK",
  "AXP",

  // Healthcare
  "ABBV",
  "MRK",
  "PFE",
  "TMO",
  "DHR",
  "ABT",

  // Consumer & Industrial
  "WMT",
  "HD",
  "MCD",
  "NKE",
  "SBUX",
  "TGT",
  "LOW",
  "DE",
  "HON",
  "UPS",
  "RTX",
  "LMT",
  "BA",

  // Energy & Materials
  "CVX",
  "COP",
  "SLB",
  "EOG",
  "LIN",
  "APD",
  "FCX",

  // High Beta / Speculative (Stress Test verification)
  "COIN",
  "MSTR",
  "UPST",
  "AFRM",
  "PLTR",
  "SOFI",
  "HOOD",
  "SQ",

  // EV & Clean Energy
  "RIVN",
  "LCID",
  "F",
  "GM",
  "ENPH",
  "FSLR",

  // Penny / Micro-cap universe for LSP strategy
  "GME",
  "AMC",
  "SNDL",
  "MULN",
  "XELA",
  "HSTO",
  "BB",
  "NAKD",
];

export async function generateScientificPicks(): Promise<{
  picks: V2Pick[];
  regime: any;
  runnerUps?: Record<string, V2Pick>;
}> {
  console.log("📡 Engine: Fetching Market Regime Baseline (SPY)...");
  const spyData = await fetchStockData("SPY");

  let spySMA200 = 0;
  if (spyData?.history && spyData.history.length >= 200) {
    const closes = spyData.history.map((h) => h.close);
    // Calculate SMA200 using the last 200 closing prices
    spySMA200 = closes.slice(-200).reduce((a, b) => a + b, 0) / 200;
  }

  const isBullish = (spyData?.price || 0) > spySMA200;
  const regime = {
    symbol: "SPY",
    price: spyData?.price || 0,
    sma200: spySMA200,
    status: isBullish ? "BULLISH" : "BEARISH",
    reason: isBullish ? "Price is above long-term 200-day average" : "Price is below long-term 200-day average",
  };

  console.log("📡 Engine: Fetching Strategic Universe...");
  const allData = await fetchMultipleStocks(V2_UNIVERSE);

  // Filter out SPY from the pool (it's for regime/benchmark only)
  const stockPool = allData.filter((d) => d.symbol !== "SPY");

  const v2Picks: V2Pick[] = [];

  console.log("🔬 Engine: Running Interrogations...");

  const runnerUpsByAlgo: Record<string, V2Pick> = {};

  const trackRunnerUp = (algo: string, result: V2Pick | null) => {
    if (!result) return;
    if (!runnerUpsByAlgo[algo] || result.score > runnerUpsByAlgo[algo].score) {
      runnerUpsByAlgo[algo] = result;
    }
  };

  for (const data of stockPool) {
    // 1. Run RAR (Regime Aware)
    const rar = scoreRAR(data, spyData || undefined, true);
    if (rar) v2Picks.push(rar);
    else trackRunnerUp("Regime-Aware Reversion (V2)", scoreRAR(data, spyData || undefined, false));

    // 2. Run VAM (Volatility Adjusted)
    const vam = scoreVAM(data, true);
    if (vam) v2Picks.push(vam);
    else trackRunnerUp("Volatility-Adjusted Momentum (V2)", scoreVAM(data, false));

    // 3. Run LSP (Liquidity Shielded)
    const lsp = scoreLSP(data, true);
    if (lsp) v2Picks.push(lsp);
    else trackRunnerUp("Liquidity-Shielded Penny (V2)", scoreLSP(data, false));

    // 4. Run SCS (Scientific CAN SLIM)
    const scs = scoreScientificCANSLIM(data, spyData || undefined, true);
    if (scs) v2Picks.push(scs);
    else trackRunnerUp("Scientific CAN SLIM (V2)", scoreScientificCANSLIM(data, spyData || undefined, false));

    // 5. Run AT (Adversarial Trend)
    const at = scoreAdversarialTrend(data, true);
    if (at) v2Picks.push(at);
    else trackRunnerUp("Adversarial Trend (V2)", scoreAdversarialTrend(data, false));

    // 6. Run IF (Institutional Footprint)
    const instFp = scoreInstitutionalFootprint(data, true);
    if (instFp) v2Picks.push(instFp);
    else trackRunnerUp("Institutional Footprint (V2)", scoreInstitutionalFootprint(data, false));
  }

  // Sort by scientific score
  v2Picks.sort((a, b) => b.score - a.score);

  console.log(`✅ Engine: Generated ${v2Picks.length} Scientific Picks`);

  // Return top 20 verified picks, the regime context, and QA runner-ups
  return {
    picks: v2Picks.slice(0, 20),
    regime,
    runnerUps: runnerUpsByAlgo
  };
}
