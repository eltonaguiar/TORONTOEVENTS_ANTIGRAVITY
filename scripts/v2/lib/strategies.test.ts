
import { describe, it, expect } from 'vitest';
import {
    scoreRAR,
    scoreVAM,
    scoreLSP,
    scoreScientificCANSLIM
} from './strategies';
import { StockData } from './strategies';

// --- MOCK DATA (re-using and extending from V1 tests) ---

const baseMockHistory = Array.from({ length: 252 }, (_, i) => ({
    date: `2026-01-01`,
    close: 100 + (i * 0.1),
    volume: 1000000,
    high: 100 + (i * 0.1) + 1,
    low: 100 + (i * 0.1) - 1,
}));

const mockSmoothUptrend: StockData = {
    symbol: 'VAM_GOOD',
    name: 'Smooth Co',
    price: 150,
    change: 1,
    changePercent: 0.67,
    volume: 1000000,
    avgVolume: 1000000,
    marketCap: 20_000_000_000,
    pe: 20,
    history: Array.from({ length: 252 }, (_, i) => ({
        ...baseMockHistory[i],
        close: 120 + (i * 0.12), // Very smooth, low volatility uptrend
    })),
};

const mockDipStock: StockData = {
    ...mockSmoothUptrend,
    symbol: 'DIP',
    name: 'Dip Corp',
    price: 140,
    history: Array.from({ length: 252 }, (_, i) => {
        const price = i < 240 ? 120 + (i * 0.12) : 150 - ((i - 239) * 1); // Recent dip
        return {
            ...baseMockHistory[i],
            close: price,
        };
    }),
};

const mockPennyStock: StockData = {
    symbol: 'PNY',
    name: 'Penny Inc.',
    price: 4.5,
    change: 0.5,
    changePercent: 12.5,
    volume: 5000000,
    avgVolume: 1000000,
    marketCap: 50_000_000,
    history: Array.from({ length: 252 }, (_, i) => ({
        ...baseMockHistory[i],
        close: 1 + (i * 0.015),
    })),
};

const mockMarketDataBull: StockData = {
    ...mockSmoothUptrend,
    symbol: 'SPY',
    price: 500,
    history: Array.from({ length: 252 }, (_, i) => ({
        ...baseMockHistory[i],
        close: 400 + (i * 0.4), // Strong uptrend, above 200dma
    }))
};

const mockMarketDataBear: StockData = {
    ...mockSmoothUptrend,
    symbol: 'SPY',
    price: 350,
    history: Array.from({ length: 252 }, (_, i) => ({
        ...baseMockHistory[i],
        close: 450 - (i * 0.4), // Strong downtrend, below 200dma
    }))
};


describe('V2 Strategy Scorers', () => {

    describe('scoreRAR (Regime-Aware Reversion)', () => {
        it('should trigger on a dipping stock during a bull market', () => {
            const result = scoreRAR(mockDipStock, mockMarketDataBull);
            expect(result).not.toBeNull();
            expect(result!.rating).toBe('STRONG BUY');
        });

        it('should NOT trigger on a dipping stock during a bear market', () => {
            const result = scoreRAR(mockDipStock, mockMarketDataBear);
            expect(result).toBeNull();
        });

        it('should NOT trigger on a non-dipping stock', () => {
            const result = scoreRAR(mockSmoothUptrend, mockMarketDataBull);
            expect(result).toBeNull();
        });
    });

    describe('scoreVAM (Volatility-Adjusted Momentum)', () => {
        it('should give a high score to a stock with a smooth uptrend', () => {
            const result = scoreVAM(mockSmoothUptrend);
            expect(result).not.toBeNull();
            expect(result!.score).toBeGreaterThan(80);
            expect(result!.metrics.ytdReturn).toBeDefined();
        });
    });

    describe('scoreLSP (Liquidity-Shielded Penny)', () => {
        it('should trigger for a high-volume penny stock with a recent price surge', () => {
            const result = scoreLSP(mockPennyStock);
            expect(result).not.toBeNull();
            expect(result!.rating).toBe('STRONG BUY');
        });

        it('should NOT trigger for a low-volume penny stock', () => {
            const lowVolPenny = { ...mockPennyStock, avgVolume: 10000 }; // Not enough liquidity
            const result = scoreLSP(lowVolPenny);
            expect(result).toBeNull();
        });
    });

    describe('scoreScientificCANSLIM (SCS)', () => {
        it('should give a high score in a bull market', () => {
            const result = scoreScientificCANSLIM(mockSmoothUptrend, mockMarketDataBull);
            expect(result).not.toBeNull();
            expect(result!.score).toBeGreaterThan(60);
        });

        it('should NOT trigger in a bear market', () => {
            const result = scoreScientificCANSLIM(mockSmoothUptrend, mockMarketDataBear);
            expect(result).toBeNull();
        });
    });

});
