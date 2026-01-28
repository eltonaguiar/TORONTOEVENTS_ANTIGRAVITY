
/**
 * Walk-Forward Optimization Engine (Version 2.0)
 * 
 * Logic:
 * 1. SCIENTIFIC COLD START: Load recent backtest simulations (public/data/scientific-tuning.json).
 * 2. LIVE FINE-TUNING: Use realized results (data/pick-performance.json) to nudge thresholds.
 */

import * as fs from "fs";
import * as path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data", "engine-config.json");
const PERF_PATH = path.join(process.cwd(), "data", "pick-performance.json");
const TUNING_PATH = path.join(process.cwd(), "public", "data", "scientific-tuning.json");

interface EngineConfig {
    lastOptimized: string;
    thresholds: Record<string, number>;
    adjustments: string[];
}

interface TuningResult {
    algorithm: string;
    threshold: number;
    totalTrades: number;
    winRate: number;
    avgReturn: number;
    sharpeRatio: number;
}

async function optimize() {
    console.log("🧠 Starting Walk-Forward Optimization v2.0...");

    if (!fs.existsSync(CONFIG_PATH)) {
        console.error("❌ Config not found!");
        process.exit(1);
    }

    const config: EngineConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    const today = new Date().toISOString().split("T")[0];
    let changed = false;

    // --- PHASE 1: SCIENTIFIC SIMULATION GUIDANCE ---
    if (fs.existsSync(TUNING_PATH)) {
        console.log("🔭 Loading simulation-guided optima...");
        const tuning = JSON.parse(fs.readFileSync(TUNING_PATH, "utf-8"));
        const results: TuningResult[] = tuning.results || [];

        const algorithms = Array.from(new Set(results.map(r => r.algorithm)));

        for (const algo of algorithms) {
            const algoResults = results.filter(r => r.algorithm === algo && r.totalTrades >= 3);
            if (algoResults.length === 0) continue;

            // Find best threshold based on Sharpe Ratio
            const best = algoResults.reduce((prev, current) =>
                (current.sharpeRatio > prev.sharpeRatio) ? current : prev
            );

            const current = config.thresholds[algo] || 50;
            if (Math.abs(best.threshold - current) >= 5) {
                console.log(`🔬 Simulation suggests ${algo} performs best at ${best.threshold} (Sharpe: ${best.sharpeRatio.toFixed(2)})`);
                // Nudge toward simulation (don't jump 100% to avoid overfitting)
                const nudge = best.threshold > current ? 5 : -5;
                config.thresholds[algo] += nudge;
                config.adjustments.push(`${today}: Scientific Nudge ${algo} to ${config.thresholds[algo]} (Simulated Optimum: ${best.threshold})`);
                changed = true;
            }
        }
    }

    // --- PHASE 2: LIVE PERFORMANCE FINE-TUNING ---
    if (fs.existsSync(PERF_PATH)) {
        console.log("📈 Applying live performance fine-tuning...");
        const perf = JSON.parse(fs.readFileSync(PERF_PATH, "utf-8"));

        for (const [algo, stats] of Object.entries(perf.byAlgorithm as any)) {
            const s = stats as any;
            if (s.verified < 5) continue;

            const currentThreshold = config.thresholds[algo] || 50;

            if (s.winRate < 40) {
                const newThreshold = Math.min(currentThreshold + 5, 90);
                if (newThreshold !== currentThreshold) {
                    config.thresholds[algo] = newThreshold;
                    config.adjustments.push(`${today}: Tightened ${algo} to ${newThreshold} due to poor Live Win Rate (${s.winRate}%)`);
                    console.log(`📉 ${algo} underperforming live (${s.winRate}%). Tightening to ${newThreshold}.`);
                    changed = true;
                }
            }
        }
    }

    if (changed) {
        config.lastOptimized = new Date().toISOString();
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        console.log("✅ Optimization complete. Config updated.");
    } else {
        console.log("✨ No immediate threshold adjustments required.");
    }
}

optimize();
