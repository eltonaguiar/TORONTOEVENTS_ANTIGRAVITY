
/**
 * Backtest Simulator
 * 
 * Purpose: Simulate algorithm performance across different thresholds to find the "Efficient Frontier".
 * 
 * Config:
 * - Tickers: SPY, QQQ, NVDA, AAPL, TSLA, AMD, MSFT, AMZN, GOOGL, META (Representative sample)
 * - Period: Past 6 months (approx 126 trading days)
 * - Algorithms: Multi-strategy test
 */

import { fetchStockData, StockData } from "./lib/stock-data-fetcher-enhanced";
import { scoreCANSLIM, scoreAlphaPredator, scoreComposite, scoreTechnicalMomentum } from "./lib/stock-scorers";
import * as fs from "fs";
import * as path from "path";

const TICKERS = ["SPY", "QQQ", "NVDA", "AAPL", "MSFT", "AMD", "TSLA", "META", "AMZN", "GOOGL"];
const OUTPUT_PATH = path.join(process.cwd(), "public", "data", "scientific-tuning.json");

interface BacktestResult {
    algorithm: string;
    threshold: number;
    totalTrades: number;
    winRate: number;
    avgReturn: number;
    sharpeRatio: number; // Simplified (Avg Return / StdDev of Returns)
}

async function runBacktest() {
    console.log("⏳ Starting Backtest Simulation...");
    console.log(`🎯 Universe: ${TICKERS.join(", ")}`);

    // 1. Fetch History
    const stocks: StockData[] = [];
    for (const ticker of TICKERS) {
        console.log(`Fetching ${ticker}...`);
        const data = await fetchStockData(ticker);
        if (data && data.history && data.history.length > 200) {
            stocks.push(data);
        }
    }

    console.log(`✅ Loaded ${stocks.length} stocks for simulation.`);

    const algorithms = [
        { name: "CAN SLIM", scorer: scoreCANSLIM },
        { name: "Alpha Predator", scorer: scoreAlphaPredator },
        { name: "Composite Rating", scorer: scoreComposite },
        // Technical Momentum is hard to simulate backtest without intraday data sometimes, but we'll try 7d
    ];

    const results: BacktestResult[] = [];
    const thresholds = [40, 50, 60, 70, 80, 85, 90];

    // 2. Run Simulation
    for (const algo of algorithms) {
        console.log(`\n⚙️ Testing ${algo.name}...`);

        for (const threshold of thresholds) {
            let trades = 0;
            let wins = 0;
            let totalReturn = 0;
            let returns: number[] = [];

            for (const stock of stocks) {
                // Simulate roughly last 30 verifiable days (offset by 7 days for result)
                // We need to slice history to simulate "past state".
                // This is expensive, so we'll do checks every 5 days to speed it up.
                const history = stock.history!;
                const maxIndex = history.length - 8; // Leave room for 7d forward return
                const minIndex = Math.max(0, history.length - 504); // Last ~2 years

                for (let i = minIndex; i < maxIndex; i += 10) {
                    // Create a "snapshot" stock object
                    const snapshotHistory = history.slice(0, i + 1);
                    const currentDay = snapshotHistory[snapshotHistory.length - 1];
                    const futureDay = history[i + 7]; // 7 days later

                    const snapshotData: StockData = {
                        ...stock,
                        price: currentDay.close,
                        change: currentDay.close - currentDay.open,
                        changePercent: (currentDay.close - currentDay.open) / currentDay.open * 100,
                        volume: currentDay.volume,
                        history: snapshotHistory,
                        // Nullify future knowledge
                        earningsTimestamp: undefined,
                        daysToEarnings: undefined
                    };

                    const score = algo.scorer(snapshotData, "neutral"); // Assume neutral for speed

                    if (score && score.score >= threshold) {
                        // Trade Taken!
                        trades++;
                        const exitPrice = futureDay.close;
                        const entryPrice = currentDay.close;
                        const tradeReturn = ((exitPrice - entryPrice) / entryPrice) * 100;

                        returns.push(tradeReturn);
                        totalReturn += tradeReturn;
                        if (tradeReturn > 0) wins++;
                    }
                }
            }

            if (trades > 0) {
                const winRate = (wins / trades) * 100;
                const avgReturn = totalReturn / trades;

                // Calculate StdDev for Sharpe
                const mean = avgReturn;
                const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / trades;
                const stdDev = Math.sqrt(variance);
                const sharpe = stdDev === 0 ? 0 : mean / stdDev;

                results.push({
                    algorithm: algo.name,
                    threshold,
                    totalTrades: trades,
                    winRate,
                    avgReturn,
                    sharpeRatio: sharpe
                });
                console.log(`  Threshold ${threshold}: ${trades} trades, WR: ${winRate.toFixed(1)}%, Avg: ${avgReturn.toFixed(2)}%`);
            } else {
                results.push({
                    algorithm: algo.name,
                    threshold,
                    totalTrades: 0,
                    winRate: 0,
                    avgReturn: 0,
                    sharpeRatio: 0
                });
            }
        }
    }

    // 3. Save Results
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
        lastRun: new Date().toISOString(),
        results
    }, null, 2));

    console.log(`\n💾 Results saved to ${OUTPUT_PATH}`);
}

runBacktest();
