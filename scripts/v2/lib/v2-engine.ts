/**
 * STOCKSUNIFY2: Scientific Engine
 * 
 * Orchestrates data fetching, strategy execution, and audit logging.
 */

import { fetchMultipleStocks, fetchStockData } from '../../lib/stock-data-fetcher-enhanced';
import { scoreRAR, scoreVAM, scoreLSP, V2Pick } from './strategies';

// The "Standard" Scientific Universe
const V2_UNIVERSE = [
    // Top Index
    'SPY',
    // Quality Growth
    'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA',
    'AVGO', 'COST', 'V', 'MA', 'NFLX', 'AMD', 'LRCX',
    // Strong Fundamentals
    'JPM', 'UNH', 'LLY', 'JNJ', 'PG', 'XOM', 'CAT', 'GE',
    // High Beta / Speculative (for Stress Test verification)
    'COIN', 'MSTR', 'UPST', 'AFRM', 'PLTR', 'SOFI',
    // Penny / Micro-cap universe for LSP strategy
    'GME', 'AMC', 'SNDL', 'MULN', 'XELA', 'HSTO'
];

export async function generateScientificPicks(): Promise<V2Pick[]> {
    console.log('📡 Engine: Fetching Market Regime Baseline (SPY)...');
    const spyData = await fetchStockData('SPY');

    console.log('📡 Engine: Fetching Strategic Universe...');
    const allData = await fetchMultipleStocks(V2_UNIVERSE);

    // Filter out SPY from the pool (it's for regime/benchmark only)
    const stockPool = allData.filter(d => d.symbol !== 'SPY');

    const v2Picks: V2Pick[] = [];

    console.log('🔬 Engine: Running Interrogations...');

    for (const data of stockPool) {
        // 1. Run RAR (Regime Aware)
        const rar = scoreRAR(data, spyData || undefined);
        if (rar) v2Picks.push(rar);

        // 2. Run VAM (Volatility Adjusted)
        const vam = scoreVAM(data);
        if (vam) v2Picks.push(vam);

        // 3. Run LSP (Liquidity Shielded)
        const lsp = scoreLSP(data);
        if (lsp) v2Picks.push(lsp);
    }


    // Sort by scientific score
    v2Picks.sort((a, b) => b.score - a.score);

    console.log(`✅ Engine: Generated ${v2Picks.length} Scientific Picks`);

    // Return top 20 verified picks
    return v2Picks.slice(0, 20);
}
