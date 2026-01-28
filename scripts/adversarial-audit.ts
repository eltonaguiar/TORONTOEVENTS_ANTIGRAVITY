
/**
 * Adversarial Audit Engine
 * 
 * Purpose: Simulate "Black Swan" and "Flash Crash" scenarios.
 * Logic:
 * - Identifies periods of market stress (SPY drops > 5% in 5 days).
 * - Forces algorithms to trade during these periods.
 * - Measures "Max Adverse Excursion" (MAE) and Recovery Time.
 */

import { fetchStockData, StockData } from "./lib/stock-data-fetcher-enhanced";
import { scoreCANSLIM, scoreAlphaPredator, scoreComposite } from "./lib/stock-scorers";
import * as fs from "fs";
import * as path from "path";

const STRESS_TARGETS = ["SPY", "QQQ", "NVDA"];
const OUTPUT_PATH = path.join(process.cwd(), "public", "data", "adversarial-audit.json");

async function runAudit() {
    console.log("⚠️ Starting Adversarial Audit...");

    const stocks: StockData[] = [];
    for (const ticker of STRESS_TARGETS) {
        const data = await fetchStockData(ticker);
        if (data && data.history) stocks.push(data);
    }

    const results: any[] = [];

    for (const stock of stocks) {
        const history = stock.history!;
        console.log(`\n🔍 Auditing ${stock.symbol} for stress resilience...`);

        // Identify Stress Periods (Price Drop > 3% in 5 days)
        for (let i = 20; i < history.length - 10; i++) {
            const startPrice = history[i - 5].close;
            const currentPrice = history[i].close;
            const drop = ((currentPrice - startPrice) / startPrice) * 100;

            if (drop < -3) {
                // We are in a stress period!
                const snapshotHistory = history.slice(0, i + 1);
                const snapshotData: StockData = {
                    ...stock,
                    price: currentPrice,
                    history: snapshotHistory
                };

                const csScore = scoreCANSLIM(snapshotData, "stress");
                const apScore = scoreAlphaPredator(snapshotData, "stress");

                if ((csScore && csScore.score > 50) || (apScore && apScore.score > 50)) {
                    // Algorithm fired a signal DURING a crash. Let's see if it was a "Falling Knife".
                    const futureMaxDrop = Math.min(...history.slice(i, i + 5).map(h => h.low));
                    const recoveryPrice = history[i + 10]?.close || history[history.length - 1].close;

                    const drawdown = ((futureMaxDrop - currentPrice) / currentPrice) * 100;
                    const recovery = ((recoveryPrice - currentPrice) / currentPrice) * 100;

                    results.push({
                        date: history[i].date,
                        symbol: stock.symbol,
                        dropAtSignal: drop,
                        maxDrawdownAfter: drawdown,
                        tenDayResult: recovery,
                        signals: {
                            canslim: csScore?.score || 0,
                            predator: apScore?.score || 0
                        }
                    });
                }
            }
        }
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
        lastRun: new Date().toISOString(),
        stressEventsFound: results.length,
        results
    }, null, 2));

    console.log(`✅ Audit complete. ${results.length} stress signals captured.`);
}

runAudit();
