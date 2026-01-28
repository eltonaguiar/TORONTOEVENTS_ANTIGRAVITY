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
import { STOCK_UNIVERSE } from "./lib/stock-universe";

const ALGORITHM_THRESHOLDS = {
  "CAN SLIM": 40,
  "Technical Momentum": 45,
  "Composite Rating": 50,
  "Penny Sniper": 60, // Stricter
  "Value Sleeper": 50,
  "Alpha Predator": 60 // Minimum for consideration
};

/**
 * Takes a raw array of picks, de-duplicates by symbol, merges algo tags, and returns top 30.
 */
function processAndRankPicks(picks: StockPick[]): StockPick[] {
  const uniquePicks = new Map<string, StockPick>();

  // Track all algos triggering for this symbol
  const algoMap = new Map<string, Set<string>>();

  for (const pick of picks) {
    // Dedup primarily by symbol
    const key = pick.symbol;

    // Track algo tags
    if (!algoMap.has(key)) algoMap.set(key, new Set());
    algoMap.get(key)!.add(pick.algorithm);

    const existing = uniquePicks.get(key);

    // Logic: Keep the highest scoring instance as the "base" pick
    // But we will merge the algo tags into it later
    if (!existing || pick.score > existing.score) {
      uniquePicks.set(key, pick);
    }
    // If tie, prefer longer timeframe
    else if (pick.score === existing.score) {
      if (parseTimeframePriority(pick.timeframe) > parseTimeframePriority(existing.timeframe)) {
        uniquePicks.set(key, pick);
      }
    }
  }

  // Merge algo names back into the chosen picks
  const mergedPicks = Array.from(uniquePicks.values()).map(pick => {
    const algos = Array.from(algoMap.get(pick.symbol) || []);
    // If multiple algos, join them. If "Alpha Predator" is in there, prioritize showing it?
    // For now, simple join, but maybe limit length in UI
    const primaryAlgo = pick.algorithm; // Keep the one that scored highest
    const otherAlgos = algos.filter(a => a !== primaryAlgo);

    return {
      ...pick,
      // We keep the primary algorithm as the main label for now to keep UI clean,
      // but we could add a new field `contributingAlgorithms`
      algorithm: otherAlgos.length > 0 ? `${primaryAlgo} + ${otherAlgos.length}` : primaryAlgo,
      // Store full list for curious users
      allAlgorithms: algos
    };
  });

  // Sort by rating priority (STRONG BUY > BUY > HOLD) then by score
  mergedPicks.sort((a, b) => {
    const ratingOrder = { "STRONG BUY": 3, BUY: 2, HOLD: 1, SELL: 0 };
    const ratingDiff =
      (ratingOrder[b.rating] || 0) - (ratingOrder[a.rating] || 0);
    if (ratingDiff !== 0) return ratingDiff;
    return b.score - a.score;
  });

  return mergedPicks.slice(0, 30);
}

// Helper for timeframe priority
function parseTimeframePriority(tf: string): number {
  if (tf === "1m" || tf === "3m") return 3;
  if (tf === "3d" || tf === "7d") return 2;
  return 1; // 24h
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

  // Scientific Validation Step 2: Slippage Torture & Data Integrity
  const torturedPicks = rankedPicks.map(p => {
    // Dynamic slippage logic inline to avoid double import or circular dep
    let slippage = 0.005;
    if (p.price < 5) slippage = 0.03;
    else if (p.price < 10) slippage = 0.01;

    return {
      ...p,
      slippageSimulated: true,
      // CRITICAL FIX: Explicitly record entryPrice for verifier
      entryPrice: p.price,
      simulatedEntryPrice: p.price * (1 + slippage)
    };
  });

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
