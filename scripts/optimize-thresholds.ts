
/**
 * Walk-Forward Optimization Engine
 * 
 * Purpose: Automatically adjust algorithm thresholds based on realized performance.
 * Logic:
 * - Reads verified performance from data/pick-performance.json
 * - If Win Rate < 40% (Underperforming) -> INCREASE Validation Threshold (Be stricter)
 * - If Win Rate > 60% (Overperforming) -> DECREASE Validation Threshold (Be greedier)
 */

import * as fs from "fs";
import * as path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data", "engine-config.json");
const PERF_PATH = path.join(process.cwd(), "data", "pick-performance.json");

interface EngineConfig {
    lastOptimized: string;
    thresholds: Record<string, number>;
    adjustments: string[];
}

interface PerformanceData {
    byAlgorithm: Record<string, {
        winRate: number;
        verified: number;
    }>;
}

async function optimize() {
    console.log("🧠 Starting Walk-Forward Optimization...");

    if (!fs.existsSync(CONFIG_PATH)) {
        console.error("❌ Config not found!");
        process.exit(1);
    }

    if (!fs.existsSync(PERF_PATH)) {
        console.log("⚠️ No performance data yet. Skipping optimization.");
        return;
    }

    const config: EngineConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    const perf: PerformanceData = JSON.parse(fs.readFileSync(PERF_PATH, "utf-8"));

    let changed = false;
    const today = new Date().toISOString().split("T")[0];

    for (const [algo, stats] of Object.entries(perf.byAlgorithm)) {
        // Only optimize if we have statistical significance (e.g., > 5 verified picks)
        if (stats.verified < 5) continue;

        const currentThreshold = config.thresholds[algo] || 50;

        if (stats.winRate < 40) {
            // Underperforming: Tighten criteria
            const newThreshold = Math.min(currentThreshold + 5, 90);
            if (newThreshold !== currentThreshold) {
                config.thresholds[algo] = newThreshold;
                config.adjustments.push(`${today}: Tightened ${algo} to ${newThreshold} (Win Rate: ${stats.winRate}%)`);
                console.log(`📉 ${algo} underperforming (${stats.winRate}%). Tightening threshold to ${newThreshold}.`);
                changed = true;
            }
        } else if (stats.winRate > 60) {
            // Overperforming: Loosen criteria to catch more trades
            const newThreshold = Math.max(currentThreshold - 2, 40);
            if (newThreshold !== currentThreshold) {
                config.thresholds[algo] = newThreshold;
                config.adjustments.push(`${today}: Loosened ${algo} to ${newThreshold} (Win Rate: ${stats.winRate}%)`);
                console.log(`📈 ${algo} overperforming (${stats.winRate}%). Loosening threshold to ${newThreshold}.`);
                changed = true;
            }
        }
    }

    if (changed) {
        config.lastOptimized = new Date().toISOString();
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        console.log("✅ Optimization complete. Config updated.");
    } else {
        console.log("✨ No optimization needed. Thresholds appear stable.");
    }
}

optimize();
