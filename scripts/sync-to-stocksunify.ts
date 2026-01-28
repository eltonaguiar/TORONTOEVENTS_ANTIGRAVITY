#!/usr/bin/env tsx
/**
 * Sync FindStocks data to STOCKSUNIFY GitHub repository (V1)
 * This script now uses the generic sync-helper.
 */

import * as fs from "fs";
import * as path from "path";
import { syncToRepo, SyncConfig } from "./lib/sync-helper";

const TARGET_DIR =
  process.env.STOCKSUNIFY_DIR || path.join(process.cwd(), "..", "STOCKSUNIFY");

// --- V1 Sync Configuration ---

const V1_SYNC_CONFIG: SyncConfig = {
  repoName: "STOCKSUNIFY (V1)",
  repoUrl: "https://github.com/eltonaguiar/STOCKSUNIFY.git",
  targetDir: TARGET_DIR,
  filesToCopy: [
    // Data
    { source: "data/daily-stocks.json", dest: "data/daily-stocks.json" },
    // Root analysis documents
    {
      source: "STOCK_REPOSITORY_ANALYSIS.md",
      dest: "STOCK_REPOSITORY_ANALYSIS.md",
    },
    {
      source: "STOCK_ALGORITHM_SUMMARY.md",
      dest: "STOCK_ALGORITHM_SUMMARY.md",
    },
    {
      source: "STOCK_GOOGLEGEMINI_ANALYSIS.md",
      dest: "STOCK_GOOGLEGEMINI_ANALYSIS.md",
    },
    {
      source: "STOCK_COMETBROWSERAI_ANALYSIS.md",
      dest: "STOCK_COMETBROWSERAI_ANALYSIS.md",
    },
    { source: "STOCK_CHATGPT_ANALYSIS.md", dest: "STOCK_CHATGPT_ANALYSIS.md" },
    {
      source: "STOCK_ALGORITHM_DECISION_MATRIX.md",
      dest: "STOCK_ALGORITHM_DECISION_MATRIX.md",
    },
    // Scripts
    {
      source: "scripts/generate-daily-stocks.ts",
      dest: "scripts/generate-daily-stocks.ts",
    },
    // Generated README
    { source: "temp_readme_v1.md", dest: "README.md" },
  ],
  commitMessage: `Auto-sync: Update V1 daily stock picks and analysis docs - ${new Date().toISOString().split("T")[0]}`,
};

/**
 * Generates the README for the V1 repo, including a summary of the latest picks.
 */
function generateV1Readme(): string {
  let stats = "No data available.";
  try {
    const dailyStocksPath = path.join(
      process.cwd(),
      "data",
      "daily-stocks.json",
    );
    const dailyStocks = JSON.parse(fs.readFileSync(dailyStocksPath, "utf8"));
    const strongBuys = dailyStocks.stocks.filter(
      (s: any) => s.rating === "STRONG BUY",
    ).length;
    const buys = dailyStocks.stocks.filter(
      (s: any) => s.rating === "BUY",
    ).length;
    const topPick = dailyStocks.stocks[0];
    stats = `
- **Total Picks**: ${dailyStocks.stocks.length}
- **Strong Buys**: ${strongBuys}
- **Buys**: ${buys}
- **Top Pick**: ${topPick.symbol} (${topPick.score}/100)
- **Last Updated**: ${dailyStocks.lastUpdated}
        `;
  } catch (e) {
    console.warn("⚠️ Could not generate dynamic stats for V1 README.");
  }

  return `# STOCKSUNIFY (V1 - Classic) 📈
This repository consolidates stock analysis data, algorithms, and daily picks from the V1 "Classic" engine.

## 📊 Latest Daily Picks
${stats}

[View the full JSON data here](./data/daily-stocks.json)

## 📚 Analysis Documents
- [Stock Repository Analysis](./STOCK_REPOSITORY_ANALYSIS.md)
- [Algorithm Summary](./STOCK_ALGORITHM_SUMMARY.md)
- [Decision Matrix](./STOCK_ALGORITHM_DECISION_MATRIX.md)
`;
}

function main() {
  console.log("🚀 Starting STOCKSUNIFY (V1) sync...\n");

  // 1. Generate the specific README for the V1 repo
  const readmeContent = generateV1Readme();
  const tempReadmePath = path.join(process.cwd(), "temp_readme_v1.md");
  fs.writeFileSync(tempReadmePath, readmeContent);
  console.log("✅ Generated custom README for V1 repo.");

  // 2. Run the generic sync process
  syncToRepo(V1_SYNC_CONFIG);

  // 3. Clean up temporary file
  fs.unlinkSync(tempReadmePath);
  console.log("✅ Cleaned up temporary files.");
}

if (require.main === module) {
  main();
}
