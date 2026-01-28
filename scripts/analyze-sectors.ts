
/**
 * Sector Rotation Analysis Engine
 * 
 * Purpose: Analyze the relative strength of 11 Major Sectors vs SPY.
 * Output: Classifies sectors into Leading, Weakening, Lagging, Improving.
 * 
 * Methodology:
 * 1. Fetch SPY and all Sector ETFs.
 * 2. Calculate "Relative Strength Ratio" (RsRatio) = ETF / SPY.
 * 3. Calculate "Relative Strength Momentum" (RsMom) = Rate of change of RsRatio.
 * 4. Plot on a sophisticated quadrant model (conceptually).
 */

import * as fs from "fs";
import * as path from "path";
import { fetchMultipleStocks, StockData } from "./lib/stock-data-fetcher-enhanced";
import { SECTOR_ETFS } from "./lib/stock-universe";

// Only focus on the core SPDR Select Sector ETFs for the macro view
const CORE_SECTORS = [
    "XLE", // Energy
    "XLF", // Financials
    "XLK", // Technology
    "XLV", // Healthcare
    "XLY", // Consumer Discretionary
    "XLP", // Consumer Staples
    "XLI", // Industrials
    "XLU", // Utilities
    "XLB", // Materials
    "XLRE", // Real Estate
    "XLC", // Communications
];

interface SectorAnalysis {
    symbol: string;
    name: string;
    price: number;
    change1m: number;
    rsRatio: number; // Current Relative Performance vs SPY
    rsMomentum: number; // Rate of change of RS
    quadrant: "Leading" | "Weakening" | "Lagging" | "Improving";
    score: number; // 0-100 composite strength
}

async function analyzeSectors() {
    console.log("🌍 Starting Macro Sector Analysis...");

    // 1. Fetch SPY Benchmark
    const spyDataArray = await fetchMultipleStocks(["SPY"]);
    const spy = spyDataArray[0];

    if (!spy || !spy.history || spy.history.length < 50) {
        console.error("❌ Failed to fetch SPY benchmark data.");
        process.exit(1);
    }

    console.log(`✅ Benchmark SPY loaded: $${spy.price}`);

    // 2. Fetch Core Sectors
    const sectors = await fetchMultipleStocks(CORE_SECTORS);
    console.log(`✅ Loaded ${sectors.length} sector ETFs.`);

    const analysis: SectorAnalysis[] = [];

    // 3. Process each sector
    for (const sector of sectors) {
        if (!sector.history || sector.history.length < 50) continue;

        // Sync dates with SPY (approximate alignment)
        // We look at the last 20 days (approx 1 month) for momentum
        const lookback = 20;

        const currentPrice = sector.price;
        const pastPrice = sector.history[sector.history.length - lookback]?.close || currentPrice;

        const spyCurrent = spy.price;
        const spyPast = spy.history[spy.history.length - lookback]?.close || spyCurrent;

        // Relative Strength Ratio (Current)
        const rsRatioCurrent = (currentPrice / spyCurrent) * 100;

        // Relative Strength Ratio (Past)
        const rsRatioPast = (pastPrice / spyPast) * 100;

        // Momentum of the RS Ratio (Rate of Change)
        // Positive means the sector is OUTPERFORMING SPY over the last month
        const rsMomentum = ((rsRatioCurrent - rsRatioPast) / rsRatioPast) * 100;

        // Trend Logic (Simplistic RRG)
        // We also need a longer term trend (SMA of RS) to fully classify
        // For now, we compare 1m performance vs SPY 1m performance

        const sectorPerf = ((currentPrice - pastPrice) / pastPrice) * 100;
        const spyPerf = ((spyCurrent - spyPast) / spyPast) * 100;

        const relativePerf = sectorPerf - spyPerf; // Approx same as RS Momentum direction

        // Quadrant Logic
        // Leading: Positive Trend, Positive Momentum
        // Weakening: Positive Trend, Negative Momentum (losing steam)
        // Lagging: Negative Trend, Negative Momentum
        // Improving: Negative Trend, Positive Momentum (waking up)

        // We need a "Trend" baseline. Let's use 50-day SMA of the ETF vs SPY
        const closes = sector.history.slice(-50).map(h => h.close);
        const sma50 = closes.reduce((a, b) => a + b, 0) / closes.length;
        const isAboveTrend = currentPrice > sma50;

        let quadrant: "Leading" | "Weakening" | "Lagging" | "Improving";

        if (isAboveTrend && rsMomentum > 0) quadrant = "Leading";
        else if (isAboveTrend && rsMomentum <= 0) quadrant = "Weakening";
        else if (!isAboveTrend && rsMomentum <= 0) quadrant = "Lagging";
        else quadrant = "Improving";

        analysis.push({
            symbol: sector.symbol,
            name: sector.name.replace("Select Sector SPDR", "").replace("ETF", "").trim(),
            price: currentPrice,
            change1m: parseFloat(sectorPerf.toFixed(2)),
            rsRatio: parseFloat(rsRatioCurrent.toFixed(4)),
            rsMomentum: parseFloat(rsMomentum.toFixed(2)),
            quadrant,
            score: (isAboveTrend ? 50 : 0) + (rsMomentum > 0 ? 50 : 0) // Simple 0, 50, 100 score
        });
    }

    // Sort by Score (Leaders first)
    analysis.sort((a, b) => b.score - a.score || b.rsMomentum - a.rsMomentum);

    // Save Output
    const output = {
        scanDate: new Date().toISOString(),
        benchmark: {
            symbol: "SPY",
            price: spy.price,
            change1m: ((spy.price - (spy.history[spy.history.length - 20]?.close || spy.price)) / (spy.history[spy.history.length - 20]?.close || spy.price) * 100).toFixed(2) + "%"
        },
        sectors: analysis
    };

    const dataPath = path.join(process.cwd(), "data", "sector-rotation.json");
    const publicPath = path.join(process.cwd(), "public", "data", "sector-rotation.json");

    fs.writeFileSync(dataPath, JSON.stringify(output, null, 2));

    // Ensure public dir exists
    if (!fs.existsSync(path.dirname(publicPath))) fs.mkdirSync(path.dirname(publicPath), { recursive: true });
    fs.writeFileSync(publicPath, JSON.stringify(output, null, 2));

    console.log(`\n💾 Saved Sector Analysis to ${dataPath}`);

    // Console Summary
    console.log("\n📊 SECTOR ROTATION MATRIX:");
    console.log("---------------------------");
    console.log("🚀 LEADING (Buy Strength):");
    analysis.filter(s => s.quadrant === "Leading").forEach(s => console.log(`  - ${s.symbol} (${s.name}): +${s.change1m}% (MoM)`));

    console.log("\n🌱 IMPROVING (Watch List):");
    analysis.filter(s => s.quadrant === "Improving").forEach(s => console.log(`  - ${s.symbol} (${s.name}): +${s.change1m}% (MoM)`));

    console.log("\n⚠️ WEAKENING (Take Profits):");
    analysis.filter(s => s.quadrant === "Weakening").forEach(s => console.log(`  - ${s.symbol} (${s.name}): +${s.change1m}% (MoM)`));

    console.log("\n🔻 LAGGING (Avoid):");
    analysis.filter(s => s.quadrant === "Lagging").forEach(s => console.log(`  - ${s.symbol} (${s.name}): ${s.change1m}% (MoM)`));
}

// Run if called directly
if (require.main === module) {
    analyzeSectors().catch(console.error);
}

export { analyzeSectors };
