#!/usr/bin/env tsx
/**
 * STOCKSUNIFY2: Performance Verification Script
 *
 * "Life-on-the-line" Truth Engine.
 * This script looks back at archived picks and verifies their performance.
 */

import * as fs from "fs";
import * as path from "path";
import { fetchStockData } from "../lib/stock-data-fetcher-enhanced";

/**
 * Parses a timeframe string (e.g., "7d", "1m", "24h", "1y") into a number of days.
 */
function parseTimeframeToDays(timeframe: string): number {
  if (!timeframe) return 7; // Default to 7 days if undefined

  const unit = timeframe.slice(-1).toLowerCase();
  const value = parseInt(timeframe.slice(0, -1), 10);

  if (isNaN(value)) return 7;

  switch (unit) {
    case "h":
      return Math.ceil(value / 24); // 24h -> 1 day
    case "d":
      return value; // 7d -> 7
    case "m":
      return value * 30; // 1m -> 30
    case "y":
      return value * 365; // 1y -> 365
    default:
      return 7;
  }
}

async function main() {
  console.log("🏁 STOCKSUNIFY2: Truth Engine Initializing...");

  const indexPath = path.join(process.cwd(), "data", "v2", "ledger-index.json");
  if (!fs.existsSync(indexPath)) {
    console.error("❌ Ledger index missing. Nothing to verify.");
    return;
  }

  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const performanceDir = path.join(process.cwd(), "data", "v2", "performance");
  if (!fs.existsSync(performanceDir)) {
    fs.mkdirSync(performanceDir, { recursive: true });
  }

  const today = new Date();

  for (const entry of index) {
    const pickDate = new Date(entry.date);
    const daysPassed = Math.floor(
      (today.getTime() - pickDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Only process ledgers that are at least a day old
    if (daysPassed >= 1) {
      console.log(
        `🔍 Evaluating ledger from ${entry.date} (${daysPassed} days ago)...`,
      );
      await verifyLedger(entry.date, daysPassed);
    }
  }
}

async function verifyLedger(dateStr: string, daysPassed: number) {
  const [year, month, day] = dateStr.split("-");
  const ledgerPath = path.join(
    process.cwd(),
    "data",
    "v2",
    "history",
    year,
    month,
    `${day}.json`,
  );

  if (!fs.existsSync(ledgerPath)) return;

  const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  const verifiedPicks = [];

  for (const pick of ledger.picks) {
    const requiredDays = parseTimeframeToDays(pick.timeframe);

    // Check if this specific pick is mature enough to be verified
    if (daysPassed >= requiredDays) {
      console.log(
        `  ↪ Checking ${pick.symbol} (timeframe: ${pick.timeframe}, days passed: ${daysPassed})...`,
      );
      const currentData = await fetchStockData(pick.symbol);

      if (currentData) {
        const entryPrice = pick.metrics.price || pick.price; // Fallback to recorded price
        const exitPrice = currentData.price;
        const realizedReturn = ((exitPrice - entryPrice) / entryPrice) * 100;

        verifiedPicks.push({
          ...pick,
          exitPrice,
          realizedReturn,
          verifiedAt: new Date().toISOString(),
        });
      }
    }
  }

  if (verifiedPicks.length > 0) {
    const resultsPath = path.join(
      process.cwd(),
      "data",
      "v2",
      "performance",
      `${dateStr}-audit.json`,
    );
    fs.writeFileSync(
      resultsPath,
      JSON.stringify(
        {
          date: dateStr,
          totalPicks: verifiedPicks.length,
          avgReturn:
            verifiedPicks.reduce((acc, p) => acc + p.realizedReturn, 0) /
            verifiedPicks.length,
          picks: verifiedPicks,
        },
        null,
        2,
      ),
    );

    console.log(
      `📊 Result for ${dateStr}: ${verifiedPicks.length} picks mature and verified. Stats written to disk.`,
    );
  } else {
    console.log(
      `  -> No picks from ${dateStr} are mature for verification yet.`,
    );
  }
}

main();
