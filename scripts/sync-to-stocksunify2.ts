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
 * Generates the README for the V2 repo by populating the template with real-time data.
 */
function generateV2Readme(): string {
  const templatePath = path.join(process.cwd(), "scripts", "v2", "README_TEMPLATE.md");
  let template = "";

  if (fs.existsSync(templatePath)) {
    template = fs.readFileSync(templatePath, "utf8");
  } else {
    // Fallback minimal template if heavy template is missing
    return `# STOCKSUNIFY2 - Scientific Stock Analysis Engine\n\n[Full Documentation Missing] - Sync Error.`;
  }

  let data: any = { picks: [], regime: { status: "Unknown", reason: "N/A" }, runnerUps: {} };
  let lastUpdate = new Date().toISOString();

  try {
    const currentPath = path.join(process.cwd(), "public", "data", "v2", "current.json");
    if (fs.existsSync(currentPath)) {
      data = JSON.parse(fs.readFileSync(currentPath, "utf8"));
      lastUpdate = data.timestamp || lastUpdate;
    }
  } catch (e) {
    console.warn("⚠️ Could not load picks for README population.");
  }

  const picks = data.picks || [];
  const runnerUps = data.runnerUps || {};
  const regime = data.regime || { status: "Unknown", reason: "N/A" };
  const runSource = data.metadata?.runSource || "Local Manual Run";
  const runStatus = data.metadata?.runStatus || "Success";
  const durationMs = data.metadata?.durationMs || 0;
  const durationStr = (durationMs / 1000).toFixed(2) + "s";
  const dateStr = lastUpdate.split("T")[0];

  // Calculate counts and tops
  const getAlgoStats = (algoName: string) => {
    const filtered = picks.filter((p: any) => p.algorithm.includes(algoName));
    const top = filtered.length > 0 ? filtered.sort((a: any, b: any) => b.score - a.score)[0] : null;

    // Find runner up from the new runnerUps record
    const runnerUp = runnerUps[algoName] || runnerUps[algoName.replace(" (V2)", "")];
    const runnerUpStr = runnerUp ? `${runnerUp.symbol} (Score: ${runnerUp.score}) - *Close match, missed strict criteria*` : "None identified in current scan";

    return {
      count: filtered.length,
      top: top ? `${top.symbol} ${top.score}/100` : "-",
      runnerUp: runnerUpStr
    };
  };

  const alphaStats = getAlgoStats("Alpha Predator");
  const techStats = getAlgoStats("Technical Momentum");
  const canSlimStats = getAlgoStats("CAN SLIM");
  const compositeStats = getAlgoStats("Composite Rating");
  const pennyStats = getAlgoStats("Penny Sniper");
  const valueStats = getAlgoStats("Value Sleeper");

  // Format Top Picks Table
  const top5 = picks.slice(0, 5);
  const topPicksTable = top5.length > 0
    ? `| Symbol | Score | Algorithm |\n|---|---|---|\n` +
    top5.map((p: any) => `| ${p.symbol} | ${p.score} | ${p.algorithm} |`).join("\n")
    : "No picks available.";

  // Format Summary Items
  const topPicksSummary = top5.map((p: any) => {
    const indicators = p.indicators || {};
    let context = "";
    if (p.algorithm.includes("Technical Momentum")) context = `Breakout + Vol Spike (${indicators.volumeSurge || "N/A"}σ)${indicators.bollingerSqueeze ? " + Squeeze" : ""}.`;
    else if (p.algorithm.includes("Alpha Predator")) context = `Strong trend (ADX ${indicators.adx || "N/A"})${indicators.vcp ? " + VCP" : ""}.`;
    else context = `System Score: ${p.score}/100.`;

    return `- **${p.symbol}** (${p.score}/100) - ${p.algorithm} - ${p.rating}\n  - *Context:* ${context}`;
  }).join("\n");

  // Algorithm Distribution
  const algoDistribution = Array.from(new Set(picks.map((p: any) => p.algorithm)))
    .map(name => `- ${name}: ${picks.filter((p: any) => p.algorithm === name).length} picks`)
    .join("\n");

  // Calculate history path
  const [year, month, dayRaw] = dateStr.split("-");
  const day = dayRaw.split("T")[0]; // ensure clean day
  const historyFile = `./data/v2/history/${year}/${month}/${day}.json`;

  // Fill Template
  let result = template
    .replace(/{{REGIME_STATUS}}/g, regime.status)
    .replace(/{{REGIME_COLOR}}/g, regime.status === "BULLISH" ? "green" : "red")
    .replace(/{{REGIME_REASON}}/g, regime.reason)
    .replace(/{{PICK_COUNT}}/g, picks.length.toString())
    .replace(/{{LAST_UPDATE_DATE}}/g, dateStr)
    .replace(/{{LAST_UPDATE_TIME}}/g, lastUpdate.split("T")[1].split(".")[0])
    .replace(/{{RUN_SOURCE}}/g, runSource)
    .replace(/{{RUN_STATUS}}/g, runStatus)
    .replace(/{{RUN_DURATION}}/g, durationStr)
    .replace(/{{HISTORY_FILE}}/g, historyFile)
    .replace(/{{LAST_UPDATE_FULL}}/g, lastUpdate)
    .replace(/{{ALPHA_PRED_COUNT}}/g, alphaStats.count.toString())
    .replace(/{{ALPHA_PRED_TOP}}/g, alphaStats.top)
    .replace(/{{ALPHA_PRED_RUNNER_UP}}/g, alphaStats.runnerUp)
    .replace(/{{TECH_MOM_COUNT}}/g, techStats.count.toString())
    .replace(/{{TECH_MOM_TOP}}/g, techStats.top)
    .replace(/{{TECH_MOM_RUNNER_UP}}/g, techStats.runnerUp)
    .replace(/{{CAN_SLIM_COUNT}}/g, canSlimStats.count.toString())
    .replace(/{{CAN_SLIM_TOP}}/g, canSlimStats.top)
    .replace(/{{CAN_SLIM_RUNNER_UP}}/g, canSlimStats.runnerUp)
    .replace(/{{COMPOSITE_COUNT}}/g, compositeStats.count.toString())
    .replace(/{{COMPOSITE_TOP}}/g, compositeStats.top)
    .replace(/{{COMPOSITE_RUNNER_UP}}/g, compositeStats.runnerUp)
    .replace(/{{PENNY_SNIPER_COUNT}}/g, pennyStats.count.toString())
    .replace(/{{PENNY_SNIPER_RUNNER_UP}}/g, pennyStats.runnerUp)
    .replace(/{{VALUE_SLEEPER_COUNT}}/g, valueStats.count.toString())
    .replace(/{{VALUE_SLEEPER_RUNNER_UP}}/g, valueStats.runnerUp)
    .replace(/{{TOP_PICKS_TABLE}}/g, topPicksTable)
    .replace(/{{TOP_PICKS_SUMMARY}}/g, topPicksSummary)
    .replace(/{{ALGO_DISTRIBUTION}}/g, algoDistribution);

  return result;
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
