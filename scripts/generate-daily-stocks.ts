#!/usr/bin/env tsx
/**
 * Daily Stock Picks Generator (V1 Engine - Refactored)
 *
 * This script generates daily stock picks by combining multiple algorithms
 * and is now refactored for efficiency and readability.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { fetchMultipleStocks, fetchStockData } from "./lib/stock-data-fetcher-enhanced";
import {
  scoreCANSLIM,
  scoreTechnicalMomentum,
  scoreComposite,
  scorePennySniper,
  scoreValueSleeper,
  scoreAlphaPredator,
  StockPick,
} from "./lib/stock-scorers";

const STOCK_UNIVERSE = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "META",
  "TSLA",
  "NFLX",
  "AMD",
  "INTC",
  "CRM",
  "ADBE",
  "PYPL",
  "NOW",
  "SNOW",
  "PLTR",
  "JPM",
  "BAC",
  "GS",
  "MS",
  "V",
  "MA",
  "WMT",
  "TGT",
  "HD",
  "NKE",
  "SBUX",
  "XOM",
  "CVX",
  "SLB",
  "JNJ",
  "PFE",
  "UNH",
  "ABBV",
  "GME",
  "AMC",
  "BB",
  "SNDL",
  "NAKD",
  "RIVN",
  "LCID",
  "F",
  "GM",
];

const ALGORITHM_THRESHOLDS = {
  "CAN SLIM": 40,
  "Technical Momentum": 45,
  "Composite Rating": 50,
  "Penny Sniper": 60, // Stricter
  "Value Sleeper": 50,
  "Alpha Predator": 60 // Minimum for consideration
};

/**
 * Takes a raw array of picks, de-duplicates, sorts, and returns the top 30.
 */
function processAndRankPicks(picks: StockPick[]): StockPick[] {
  // Remove duplicates (same symbol + algorithm + timeframe) - keep highest score
  const uniquePicks = new Map<string, StockPick>();
  for (const pick of picks) {
    const key = `${pick.symbol}-${pick.algorithm}-${pick.timeframe}`;
    const existing = uniquePicks.get(key);
    if (!existing || pick.score > existing.score) {
      uniquePicks.set(key, pick);
    }
  }

  const finalPicks = Array.from(uniquePicks.values());

  // Sort by rating priority (STRONG BUY > BUY > HOLD) then by score
  finalPicks.sort((a, b) => {
    const ratingOrder = { "STRONG BUY": 3, BUY: 2, HOLD: 1, SELL: 0 };
    const ratingDiff =
      (ratingOrder[b.rating] || 0) - (ratingOrder[a.rating] || 0);
    if (ratingDiff !== 0) return ratingDiff;
    return b.score - a.score;
  });

  return finalPicks.slice(0, 30);
}


/**
 * Detect Global Market Regime using SPY
 * Bull: Price > 200 SMA
 * Bear: Price < 200 SMA
 */
async function determineMarketRegime(): Promise<"bull" | "bear" | "neutral"> {
  const spyData = await fetchStockData("SPY");

  if (!spyData || !spyData.price || !spyData.history || spyData.history.length < 200) {
    console.warn("⚠️ Could not fetch SPY data for regime detection. Defaulting to NEUTRAL.");
    return "neutral";
  }

  // Calculate 200 SMA manually if not pre-calculated
  const closes = spyData.history.map(h => h.close);
  const sma200 = closes.slice(-200).reduce((a, b) => a + b, 0) / 200;

  const regime = spyData.price > sma200 ? "bull" : "bear";
  console.log(`🌍 Market Regime Detected (SPY vs 200 SMA): ${regime.toUpperCase()} (SPY: ${spyData.price}, SMA200: ${sma200.toFixed(2)})`);

  return regime;
}

async function generateStockPicks(): Promise<StockPick[]> {
  console.log("📊 Fetching stock data for V2 Scientific Engine...");

  // 1. Detect Regime First (Scientific Validation Step 1)
  const regime = await determineMarketRegime();
  if (regime === "bear") {
    console.log("🛑 BEAR MARKET DETECTED. Engine will apply strict penalties to all long signals.");
  }

  const stockData = await fetchMultipleStocks(STOCK_UNIVERSE);
  console.log(
    `✅ Fetched data for ${stockData.length} stocks. Running V2 Regime-Aware Scorers...`,
  );

  const allFoundPicks: StockPick[] = [];
  const momentumTimeframes: Array<"24h" | "3d" | "7d"> = ["24h", "3d", "7d"];

  for (const data of stockData) {
    // 1. CAN SLIM
    const canslimScore = scoreCANSLIM(data, regime);
    if (
      canslimScore &&
      canslimScore.score >= ALGORITHM_THRESHOLDS["CAN SLIM"]
    ) {
      allFoundPicks.push(canslimScore);
    }

    // 2. Technical Momentum (all timeframes)
    // Momentum strategies are less regime-dependent but higher risk
    for (const timeframe of momentumTimeframes) {
      const momentumScore = scoreTechnicalMomentum(data, timeframe);
      if (
        momentumScore &&
        momentumScore.score >= ALGORITHM_THRESHOLDS["Technical Momentum"]
      ) {
        allFoundPicks.push(momentumScore);
      }
    }

    // 3. Composite Rating
    const compositeScore = scoreComposite(data, regime);
    if (
      compositeScore &&
      compositeScore.score >= ALGORITHM_THRESHOLDS["Composite Rating"]
    ) {
      allFoundPicks.push(compositeScore);
    }

    // 4. Penny Sniper
    const pennyScore = scorePennySniper(data);
    if (pennyScore && pennyScore.score >= ALGORITHM_THRESHOLDS["Penny Sniper"]) {
      allFoundPicks.push(pennyScore);
    }

    // 5. Value Sleeper
    const valueScore = scoreValueSleeper(data);
    if (valueScore && valueScore.score >= ALGORITHM_THRESHOLDS["Value Sleeper"]) {
      allFoundPicks.push(valueScore);
    }

    // 6. Alpha Predator (The Scientific Composite)
    const alphaScore = scoreAlphaPredator(data, regime);
    if (alphaScore && alphaScore.score >= ALGORITHM_THRESHOLDS["Alpha Predator"]) {
      allFoundPicks.push(alphaScore);
    }
  }

  console.log(
    `🔍 Found ${allFoundPicks.length} potential picks (pre-filtering).`,
  );

  const rankedPicks = processAndRankPicks(allFoundPicks);

  // Scientific Validation Step 2: Slippage Torture
  // Simulate buying at worst-case prices (e.g., +0.5% slippage on entry)
  // For generation purposes, we just log this as metadata, but we could filter out marginally profitable ones.
  // Here we just attach the metadata.
  const torturedPicks = rankedPicks.map(p => ({
    ...p,
    slippageSimulated: true,
    simulatedEntryPrice: p.price * 1.005 // +0.5% slippage
  }));

  return torturedPicks;
}

function logSummary(picks: StockPick[]) {
  console.log("\n📊 V1 Engine Summary:");
  console.log(`  • Total Picks Generated: ${picks.length}`);
  console.log(
    `  • STRONG BUY: ${picks.filter((s) => s.rating === "STRONG BUY").length}`,
  );
  console.log(`  • BUY: ${picks.filter((s) => s.rating === "BUY").length}`);
  console.log(`  • HOLD: ${picks.filter((s) => s.rating === "HOLD").length}`);

  const byAlgorithm = new Map<string, StockPick[]>();
  for (const pick of picks) {
    // Group by main algorithm, not timeframe specific
    const key = pick.algorithm;
    if (!byAlgorithm.has(key)) {
      byAlgorithm.set(key, []);
    }
    byAlgorithm.get(key)!.push(pick);
  }

  console.log("\n📈 Picks by Algorithm:");
  for (const [algorithm, algorithmPicks] of byAlgorithm.entries()) {
    algorithmPicks.sort((a, b) => b.score - a.score); // Sort before getting top pick
    console.log(`  • ${algorithm}: ${algorithmPicks.length} picks`);
    const topPick = algorithmPicks[0];
    if (topPick) {
      console.log(
        `    Top: ${topPick.symbol} (${topPick.score}/100, ${topPick.rating})`,
      );
    }
  }

  if (picks.length > 0) {
    console.log(
      `\n🏆 Top Overall V1 Pick: ${picks[0].symbol} (${picks[0].score}/100, ${picks[0].rating})`,
    );
  }
}

async function main() {
  console.log("📈 Generating V1 daily stock picks...\n");

  try {
    const finalPicks = await generateStockPicks();
    const lastUpdated = new Date().toISOString();

    const stampedPicks = finalPicks.map((p) => {
      // Create a deterministic hash of the pick content (Symbol + Score + Algo + Rating)
      // This serves as the "Immutable Audit Trail" validation signature
      const contentToHash = `${p.symbol}-${p.score}-${p.algorithm}-${p.rating}-${lastUpdated}`;
      const pickHash = crypto.createHash("sha256").update(contentToHash).digest("hex");

      return {
        ...p,
        pickedAt: lastUpdated,
        pickHash,
      };
    });

    const output = {
      lastUpdated,
      totalPicks: stampedPicks.length,
      stocks: stampedPicks,
    };

    const dataDir = path.join(process.cwd(), "data");
    const archiveDir = path.join(dataDir, "picks-archive");
    const publicDataDir = path.join(process.cwd(), "public", "data");

    fs.mkdirSync(archiveDir, { recursive: true });
    fs.mkdirSync(publicDataDir, { recursive: true });

    const dateKey = lastUpdated.slice(0, 10);
    const archivePath = path.join(archiveDir, `${dateKey}.json`);
    fs.writeFileSync(archivePath, JSON.stringify(output, null, 2));
    console.log(`\n📁 Archived to ${archivePath}`);

    const outputPath = path.join(dataDir, "daily-stocks.json");
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`📁 Saved to: ${outputPath}`);

    const publicOutputPath = path.join(publicDataDir, "daily-stocks.json");
    fs.writeFileSync(publicOutputPath, JSON.stringify(output, null, 2));
    console.log(`📁 Also saved to: ${publicOutputPath}`);

    logSummary(stampedPicks);
  } catch (error) {
    console.error("❌ Error generating V1 stock picks:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { generateStockPicks };
