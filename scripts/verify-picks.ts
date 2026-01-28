#!/usr/bin/env tsx
/**
 * Stock Pick Performance Verification Script
 * 
 * Purpose: Verify historical picks against actual market performance
 * Runs: Daily via GitHub Actions (every 6 hours)
 * 
 * Logic:
 * 1. Load picks from data/picks-archive/
 * 2. Check if timeframe has passed (24h, 3d, 7d, etc.)
 * 3. Fetch current/historical prices
 * 4. Calculate return (entry with slippage → current/exit price)
 * 5. Mark as WIN (positive) or LOSS (negative)
 * 6. Update data/pick-performance.json
 */

import * as fs from "fs";
import * as path from "path";
import { fetchStockData } from "./lib/stock-data-fetcher-enhanced";

interface ArchvedPick {
    symbol: string;
    price: number;
    simulatedEntryPrice: number;
    rating: string;
    algorithm: string;
    score: number;
    timeframe: string;
    pickedAt: string;
    pickHash: string;
    stopLoss?: number;
}

interface VerifiedPick extends ArchvedPick {
    verifiedAt: string;
    currentPrice: number;
    returnPercent: number;
    status: "WIN" | "LOSS" | "PENDING";
    daysHeld: number;
}

interface PerformanceReport {
    lastVerified: string;
    totalPicks: number;
    verified: number;
    pending: number;
    wins: number;
    losses: number;
    winRate: number;
    avgReturn: number;
    byAlgorithm: Record<string, {
        picks: number;
        verified: number;
        wins: number;
        losses: number;
        winRate: number;
        avgReturn: number;
    }>;
    recentHits: VerifiedPick[];
    allPicks: VerifiedPick[];
}

/**
 * Parse timeframe string to days
 */
function parseTimeframeToDays(timeframe: string): number {
    const match = timeframe.match(/^(\d+)([hdwmy])$/);
    if (!match) return 7; // default 7 days if unparseable

    const [, num, unit] = match;
    const value = parseInt(num);

    switch (unit) {
        case 'h': return value / 24;
        case 'd': return value;
        case 'w': return value * 7;
        case 'm': return value * 30;
        case 'y': return value * 365;
        default: return 7;
    }
}

/**
 * Load all picks from archive directory
 */
function loadArchivedPicks(): ArchvedPick[] {
    const archiveDir = path.join(process.cwd(), "data", "picks-archive");

    if (!fs.existsSync(archiveDir)) {
        console.log("⚠️ No archive directory found. Creating...");
        fs.mkdirSync(archiveDir, { recursive: true });
        return [];
    }

    const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.json'));
    const allPicks: ArchvedPick[] = [];

    for (const file of files) {
        const filePath = path.join(archiveDir, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        if (content.stocks && Array.isArray(content.stocks)) {
            allPicks.push(...content.stocks);
        }
    }

    console.log(`📂 Loaded ${allPicks.length} picks from ${files.length} archive files`);
    return allPicks;
}

/**
 * Verify a single pick
 */
async function verifyPick(pick: ArchvedPick): Promise<VerifiedPick> {
    const pickedDate = new Date(pick.pickedAt);
    const now = new Date();
    const daysHeld = (now.getTime() - pickedDate.getTime()) / (1000 * 60 * 60 * 24);
    const timeframeDays = parseTimeframeToDays(pick.timeframe);

    // If timeframe hasn't passed, mark as PENDING
    if (daysHeld < timeframeDays) {
        return {
            ...pick,
            verifiedAt: now.toISOString(),
            currentPrice: pick.price,
            returnPercent: 0,
            status: "PENDING",
            daysHeld
        };
    }

    // Fetch current price
    try {
        const stockData = await fetchStockData(pick.symbol);

        if (!stockData || !stockData.price) {
            console.log(`⚠️ Could not fetch price for ${pick.symbol}`);
            return {
                ...pick,
                verifiedAt: now.toISOString(),
                currentPrice: pick.price,
                returnPercent: 0,
                status: "PENDING",
                daysHeld
            };
        }

        const entryPrice = pick.simulatedEntryPrice || pick.price;
        const exitPrice = stockData.price;
        const returnPercent = ((exitPrice - entryPrice) / entryPrice) * 100;

        // Determine WIN/LOSS
        // WIN if return > 0, LOSS if return < 0 OR hit stop loss
        let status: "WIN" | "LOSS" = returnPercent > 0 ? "WIN" : "LOSS";

        // Check stop loss if available
        if (pick.stopLoss && exitPrice <= pick.stopLoss) {
            status = "LOSS";
        }

        return {
            ...pick,
            verifiedAt: now.toISOString(),
            currentPrice: exitPrice,
            returnPercent: Math.round(returnPercent * 100) / 100,
            status,
            daysHeld: Math.round(daysHeld * 10) / 10
        };

    } catch (error) {
        console.error(`❌ Error verifying ${pick.symbol}:`, error);
        return {
            ...pick,
            verifiedAt: now.toISOString(),
            currentPrice: pick.price,
            returnPercent: 0,
            status: "PENDING",
            daysHeld
        };
    }
}

/**
 * Generate performance report
 */
function generateReport(verifiedPicks: VerifiedPick[]): PerformanceReport {
    const verified = verifiedPicks.filter(p => p.status !== "PENDING");
    const wins = verified.filter(p => p.status === "WIN");
    const losses = verified.filter(p => p.status === "LOSS");
    const pending = verifiedPicks.filter(p => p.status === "PENDING");

    const winRate = verified.length > 0
        ? Math.round((wins.length / verified.length) * 100 * 10) / 10
        : 0;

    const avgReturn = verified.length > 0
        ? Math.round((verified.reduce((sum, p) => sum + p.returnPercent, 0) / verified.length) * 100) / 100
        : 0;

    // Group by algorithm
    const byAlgorithm: Record<string, any> = {};

    for (const pick of verifiedPicks) {
        if (!byAlgorithm[pick.algorithm]) {
            byAlgorithm[pick.algorithm] = {
                picks: 0,
                verified: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                avgReturn: 0,
                returns: []
            };
        }

        byAlgorithm[pick.algorithm].picks++;

        if (pick.status !== "PENDING") {
            byAlgorithm[pick.algorithm].verified++;
            byAlgorithm[pick.algorithm].returns.push(pick.returnPercent);

            if (pick.status === "WIN") {
                byAlgorithm[pick.algorithm].wins++;
            } else {
                byAlgorithm[pick.algorithm].losses++;
            }
        }
    }

    // Calculate algorithm stats
    for (const algo in byAlgorithm) {
        const stats = byAlgorithm[algo];
        stats.winRate = stats.verified > 0
            ? Math.round((stats.wins / stats.verified) * 100 * 10) / 10
            : 0;
        stats.avgReturn = stats.returns.length > 0
            ? Math.round((stats.returns.reduce((a: number, b: number) => a + b, 0) / stats.returns.length) * 100) / 100
            : 0;
        delete stats.returns; // Remove temp array
    }

    // Get recent hits (top 10 wins)
    const recentHits = wins
        .sort((a, b) => b.returnPercent - a.returnPercent)
        .slice(0, 10);

    return {
        lastVerified: new Date().toISOString(),
        totalPicks: verifiedPicks.length,
        verified: verified.length,
        pending: pending.length,
        wins: wins.length,
        losses: losses.length,
        winRate,
        avgReturn,
        byAlgorithm,
        recentHits,
        allPicks: verifiedPicks
    };
}

/**
 * Main verification function
 */
async function main() {
    console.log("🔍 Starting pick verification...\n");

    // Load archived picks
    const archivedPicks = loadArchivedPicks();

    if (archivedPicks.length === 0) {
        console.log("⚠️ No picks to verify. Exiting.");
        process.exit(0);
    }

    console.log(`📊 Verifying ${archivedPicks.length} picks...\n`);

    // Verify each pick
    const verifiedPicks: VerifiedPick[] = [];

    for (const pick of archivedPicks) {
        const verified = await verifyPick(pick);
        verifiedPicks.push(verified);

        if (verified.status === "WIN") {
            console.log(`✅ ${pick.symbol} (${pick.algorithm}): +${verified.returnPercent}%`);
        } else if (verified.status === "LOSS") {
            console.log(`❌ ${pick.symbol} (${pick.algorithm}): ${verified.returnPercent}%`);
        } else {
            console.log(`⏳ ${pick.symbol} (${pick.algorithm}): Pending (${verified.daysHeld.toFixed(1)}/${parseTimeframeToDays(pick.timeframe)} days)`);
        }

        // Rate limit to avoid API throttling
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Generate report
    const report = generateReport(verifiedPicks);

    // Save report
    const reportPath = path.join(process.cwd(), "data", "pick-performance.json");
    const publicReportPath = path.join(process.cwd(), "public", "data", "pick-performance.json");

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    if (fs.existsSync(path.dirname(publicReportPath))) {
        fs.writeFileSync(publicReportPath, JSON.stringify(report, null, 2));
    }

    console.log(`\n📁 Saved to: ${reportPath}`);

    // Print summary
    console.log("\n📊 Performance Summary:");
    console.log(`  • Total Picks: ${report.totalPicks}`);
    console.log(`  • Verified: ${report.verified}`);
    console.log(`  • Pending: ${report.pending}`);
    console.log(`  • Win Rate: ${report.winRate}% (${report.wins}/${report.verified})`);
    console.log(`  • Avg Return: ${report.avgReturn}%`);

    console.log("\n📈 By Algorithm:");
    for (const [algo, stats] of Object.entries(report.byAlgorithm)) {
        console.log(`  • ${algo}: ${stats.winRate}% win rate, ${stats.avgReturn}% avg return (${stats.verified}/${stats.picks} verified)`);
    }

    if (report.recentHits.length > 0) {
        console.log("\n🏆 Top Picks:");
        for (const hit of report.recentHits.slice(0, 5)) {
            console.log(`  • ${hit.symbol} (${hit.algorithm}): +${hit.returnPercent}%`);
        }
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    });
}

export { main as verifyPicks };
