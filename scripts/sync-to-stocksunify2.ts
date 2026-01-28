#!/usr/bin/env tsx
/**
 * Sync V2 Scientific Engine data to STOCKSUNIFY2 GitHub repository.
 * This script now uses the generic sync-helper.
 */

import * as fs from "fs";
import * as path from "path";
import { syncToRepo, SyncConfig } from "./lib/sync-helper";

const TARGET_DIR =
  process.env.STOCKSUNIFY2_DIR ||
  path.join(process.cwd(), "..", "STOCKSUNIFY2");

// --- V2 Sync Configuration ---

const V2_SYNC_CONFIG: SyncConfig = {
  repoName: "STOCKSUNIFY2 (V2)",
  repoUrl: "https://github.com/eltonaguiar/stocksunify2.git",
  targetDir: TARGET_DIR,
  filesToCopy: [
    { source: "public/data/v2/current.json", dest: "data/v2/current.json" },
    { source: "data/v2/ledger-index.json", dest: "data/v2/ledger-index.json" },
    {
      source: "STOCK_RESEARCH_ANALYSIS.md",
      dest: "STOCK_RESEARCH_ANALYSIS.md",
    },
    {
      source: "STOCK_ALGORITHM_PROSCONS_AND_IMPROVEMENTS.md",
      dest: "STOCK_ALGORITHM_PROSCONS_AND_IMPROVEMENTS.md",
    },
    { source: "STOCK_ALGORITHMS.md", dest: "STOCK_ALGORITHMS.md" },
    {
      source: "STOCK_ALGORITHM_SUMMARY.md",
      dest: "STOCK_ALGORITHM_SUMMARY.md",
    },
    {
      source: "STOCK_ALGORITHM_DECISION_MATRIX.md",
      dest: "STOCK_ALGORITHM_DECISION_MATRIX.md",
    },
    {
      source: "scripts/lib/stock-data-fetcher-enhanced.ts",
      dest: "scripts/lib/stock-data-fetcher-enhanced.ts",
    },
    {
      source: "scripts/lib/stock-api-keys.ts",
      dest: "scripts/lib/stock-api-keys.ts",
    },
    { source: "temp_readme_v2.md", dest: "README.md" },
  ],
  directoriesToCopy: [
    { source: "data/v2/history", dest: "data/v2/history" },
    { source: "scripts/v2", dest: "scripts/v2" },
  ],
  commitMessage: `V2 Scientific Audit: ${new Date().toISOString().split("T")[0]} - Auto-sync from TORONTOEVENTS_ANTIGRAVITY`,
};

/**
 * Generates the README for the V2 repo, including a summary of the latest picks.
 */
function generateV2Readme(): string {
  let pickCount = 0;
  let lastUpdate = new Date().toISOString();
  let regimeStatus = "Unknown";
  let topPicks: any[] = [];

  try {
    const currentPath = path.join(
      process.cwd(),
      "public",
      "data",
      "v2",
      "current.json",
    );
    if (fs.existsSync(currentPath)) {
      const data = JSON.parse(fs.readFileSync(currentPath, "utf8"));
      pickCount = data.picks?.length || 0;
      lastUpdate = data.timestamp || lastUpdate;
      regimeStatus = data.regime?.status || "Unknown";
      topPicks = (data.picks || []).slice(0, 5);
    }
  } catch (e) {
    console.warn("⚠️ Could not generate dynamic stats for V2 README.");
  }

  const topPicksTable =
    topPicks.length > 0
      ? `| Symbol | Score | Algorithm |\n|---|---|---|\n` +
        topPicks
          .map((p) => `| ${p.symbol} | ${p.score} | ${p.algorithm} |`)
          .join("\n")
      : "No picks available.";

  return `# STOCKSUNIFY2 - Scientific Stock Analysis Engine
[![Daily Audit](https://img.shields.io/badge/Audit-Daily%2021%3A00%20UTC-blue)](https://github.com/eltonaguiar/stocksunify2/actions)
[![Regime](https://img.shields.io/badge/Market%20Regime-${regimeStatus}-${regimeStatus === "BULLISH" ? "green" : "red"})](./data/v2/current.json)
[![Picks](https://img.shields.io/badge/Active%20Picks-${pickCount}-purple)](./data/v2/current.json)

## Overview
STOCKSUNIFY2 is the **Scientific Validation Engine** for algorithmic stock analysis, enforcing temporal isolation, regime awareness, and slippage modeling.

## Latest Top Picks
${topPicksTable}

[View All Current Picks](./data/v2/current.json)

## Live Data
| Resource | Link |
|---|---|
| Historical Ledgers | [data/v2/history/](./data/v2/history/) |
| Research Paper | [STOCK_RESEARCH_ANALYSIS.md](./STOCK_RESEARCH_ANALYSIS.md) |

---
*Last Updated: ${lastUpdate}*
`;
}

function main() {
  console.log("🔬 Starting STOCKSUNIFY2 (V2) sync...\n");

  // 1. Generate the specific README for the V2 repo
  const readmeContent = generateV2Readme();
  const tempReadmePath = path.join(process.cwd(), "temp_readme_v2.md");
  fs.writeFileSync(tempReadmePath, readmeContent);
  console.log("✅ Generated custom README for V2 repo.");

  // 2. Run the generic sync process
  syncToRepo(V2_SYNC_CONFIG);

  // 3. Clean up temporary file
  fs.unlinkSync(tempReadmePath);
  console.log("✅ Cleaned up temporary files.");
}

if (require.main === module) {
  main();
}
