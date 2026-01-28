/**
 * STOCKSUNIFY2: Technical & Statistical Strategies
 * 
 * These strategies focus on "Falsifiability" and "Regime Awareness"
 */

export interface StockData {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    avgVolume: number;
    marketCap?: number;
    pe?: number;
    history?: {
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }[];
}

export interface V2Pick {
    symbol: string;
    name: string;
    score: number;
    rating: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL';
    algorithm: string;
    timeframe: string;
    risk: 'Low' | 'Medium' | 'High' | 'Very High';
    metrics: Record<string, any>;
    v2_hash: string;
}

/**
 * Strategy A: Regime-Aware Reversion (RAR)
 * Uses Market Regime + RSI + Trend Verification
 */
export function scoreRAR(data: StockData, marketData?: StockData): V2Pick | null {
    if (!data.history || data.history.length < 200) return null;

    const prices = data.history.map(h => h.close);
    const currentPrice = data.price;

    // 1. Regime Check (Is market calm/bullish?)
    // If marketData provided, check if S&P 500 is > 200-day MA
    let isBullishRegime = true;
    if (marketData && marketData.history) {
        const spyPrices = marketData.history.map(h => h.close);
        const spySMA200 = spyPrices.slice(-200).reduce((a, b) => a + b, 0) / 200;
        isBullishRegime = marketData.price > spySMA200;
    }

    if (!isBullishRegime) return null; // Strategy shuts down in Bear/Storm

    // 2. Trend Verification (Is stock currently in long-term uptrend?)
    const sma200 = prices.slice(-200).reduce((a, b) => a + b, 0) / 200;
    const isUptrend = currentPrice > sma200;
    if (!isUptrend) return null;

    // 3. RSI Overbought/Oversold
    const rsi = calculateRSI(prices, 14);

    // Strategy: Buy high-quality stocks in an uptrend that have a short-term dip
    if (rsi < 40) {
        const score = Math.min(100, Math.max(0, (40 - rsi) * 2 + 60));
        return {
            symbol: data.symbol,
            name: data.name,
            score: Math.round(score),
            rating: score > 80 ? 'STRONG BUY' : 'BUY',
            algorithm: 'Regime-Aware Reversion (V2)',
            timeframe: '7d',
            risk: 'Medium',
            metrics: { rsi, sma200, regime: 'Bullish' },
            v2_hash: 'rar-v2.0.0-alpha'
        };
    }

    return null;
}

/**
 * Strategy B: Volatility-Adjusted Momentum (VAM)
 * Ranks stocks by Return / Ulcer Index
 */
export function scoreVAM(data: StockData): V2Pick | null {
    if (!data.history || data.history.length < 50) return null;

    const prices = data.history.map(h => h.close).slice(-60); // Last 60 days
    const totalReturn = (data.price - prices[0]) / prices[0] * 100;

    // Only care if it's actually going up
    if (totalReturn < 5) return null;

    const ulcerIndex = calculateUlcerIndex(prices);

    // Performance Ratio (Similar to Martin Ratio)
    // We want maximum return with minimum drawdown "duration/depth"
    const scoreVal = (totalReturn / (ulcerIndex + 1)) * 10;
    const score = Math.min(100, Math.max(0, scoreVal + 40));

    if (score > 60) {
        return {
            symbol: data.symbol,
            name: data.name,
            score: Math.round(score),
            rating: score > 85 ? 'STRONG BUY' : 'BUY',
            algorithm: 'Volatility-Adjusted Momentum (V2)',
            timeframe: '1m',
            risk: 'Low',
            metrics: { ulcerIndex, totalReturn, martinRatio: totalReturn / ulcerIndex },
            v2_hash: 'vam-v2.0.0-alpha'
        };
    }

    return null;
}

/**
 * Utility: RSI Calculation
 */
function calculateRSI(prices: number[], periods: number = 14): number {
    if (prices.length < periods + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - periods; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
}

/**
 * Utility: Ulcer Index Calculation
 * Measures the square root of the mean of squared "Drawdowns from Peak"
 */
function calculateUlcerIndex(prices: number[]): number {
    let maxPrice = 0;
    let sumSquaredDrawdowns = 0;

    for (const price of prices) {
        if (price > maxPrice) {
            maxPrice = price;
        } else {
            const drawdown = (price - maxPrice) / maxPrice * 100;
            sumSquaredDrawdowns += Math.pow(drawdown, 2);
        }
    }

    return Math.sqrt(sumSquaredDrawdowns / prices.length);
}

/**
 * Strategy C: Liquidity-Shielded Penny (LSP)
 * Implements "Slippage Torture" and "Volume Cap" checks
 */
export function scoreLSP(data: StockData): V2Pick | null {
    // 1. Penny Stock Definition: Price < $5
    if (data.price > 5 || data.price < 0.1) return null;

    // 2. Volume Cap Interrogation
    // Never assume we can trade >2% of daily volume
    const maxTradeDollars = data.avgVolume * data.price * 0.02;
    if (maxTradeDollars < 5000) return null; // If we can't trade $5k without moving the market, ignore it

    // 3. Slippage Torture Test
    // Expected return must survive a 3x "Slippage Multiplier" (e.g. 3% penalty)
    const shortTermReturn = data.changePercent;
    const slippagePenalty = 3.0; // 3%
    const tortureAdjustedReturn = shortTermReturn - slippagePenalty;

    if (tortureAdjustedReturn < 1.0) return null; // If it doesn't survive 3% slippage, it's a "Liquidity Mirage"

    // 4. Momentum Check
    if (data.changePercent < 2) return null;

    const score = Math.min(100, Math.max(0, (tortureAdjustedReturn * 10) + 50));

    return {
        symbol: data.symbol,
        name: data.name,
        score: Math.round(score),
        rating: score > 80 ? 'STRONG BUY' : 'BUY',
        algorithm: 'Liquidity-Shielded Penny (V2)',
        timeframe: '24h',
        risk: 'Very High',
        metrics: {
            avgVolume: data.avgVolume,
            liquidityCap: maxTradeDollars,
            tortureReturn: tortureAdjustedReturn
        },
        v2_hash: 'lsp-v2.0.0-alpha'
    };
}

