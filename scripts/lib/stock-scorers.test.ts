import { describe, it, expect } from "vitest";
import {
  scoreCANSLIM,
  scoreComposite,
  scorePennySniper,
  scoreValueSleeper,
  scoreAlphaPredator,
} from "./stock-scorers";
import { StockData } from "./stock-data-fetcher-enhanced";

// --- MOCK DATA ---

const baseMockHistory = Array.from({ length: 252 }, (_, i) => ({
  date: `2026-01-01`, // Date doesn't matter for most indicators here
  close: 100 + i * 0.1, // Gentle uptrend
  volume: 1000000,
  high: 100 + i * 0.1 + 1,
  low: 100 + i * 0.1 - 1,
}));

const mockPerfectGrowthStock: StockData = {
  symbol: "GROW",
  name: "Growth Inc.",
  price: 150,
  change: 2,
  changePercent: 1.5,
  volume: 2000000,
  avgVolume: 1000000,
  marketCap: 50_000_000_000,
  pe: 25,
  high52Week: 151,
  low52Week: 80,
  history: Array.from({ length: 252 }, (_, i) => ({
    ...baseMockHistory[i],
    close: 80 + i * 0.28, // Strong uptrend from 80 to ~150
    volume: 1000000 + i * 10000, // Increasing volume
  })),
  roe: 20,
  debtToEquity: 0.5,
  sharesOutstanding: 200_000_000,
};

const mockDowntrendStock: StockData = {
  ...mockPerfectGrowthStock,
  symbol: "FALL",
  name: "Falling Co.",
  price: 80,
  high52Week: 160,
  history: Array.from({ length: 252 }, (_, i) => ({
    ...baseMockHistory[i],
    close: 150 - i * 0.28, // Strong downtrend
  })),
};

const mockPennyStock: StockData = {
  symbol: "PNY",
  name: "Penny Inc.",
  price: 4.5,
  change: 0.5,
  changePercent: 12.5,
  volume: 5_000_000,
  avgVolume: 1_000_000,
  marketCap: 50_000_000,
  sharesOutstanding: 11_000_000,
  history: Array.from({ length: 252 }, (_, i) => ({
    ...baseMockHistory[i],
    close: 1 + i * (3.5 / 251), // Uptrend from 1 to 4.5
  })),
};

describe("V1 Stock Scorers", () => {
  describe("scoreCANSLIM", () => {
    it("should give a high score and STRONG BUY rating to a perfect growth stock", () => {
      const result = scoreCANSLIM(mockPerfectGrowthStock, "bull");
      expect(result).not.toBeNull();
      expect(result!.rating).toBe("STRONG BUY");
      expect(result!.score).toBeGreaterThanOrEqual(80);
    });

    it("should give a low score and SELL rating to a stock in a downtrend", () => {
      const result = scoreCANSLIM(mockDowntrendStock, "bull");
      expect(result).not.toBeNull();
      expect(result!.rating).toBe("SELL");
      expect(result!.score).toBeLessThan(40);
    });

    it("should apply a massive penalty in a bear market regime", () => {
      const bullMarketResult = scoreCANSLIM(mockPerfectGrowthStock, "bull");
      const bearMarketResult = scoreCANSLIM(mockPerfectGrowthStock, "bear");
      expect(bullMarketResult).not.toBeNull();
      expect(bearMarketResult).not.toBeNull();
      expect(
        bullMarketResult!.score - bearMarketResult!.score,
      ).toBeGreaterThanOrEqual(30);
      expect(bearMarketResult!.rating).not.toBe("STRONG BUY");
    });
  });

  describe("scoreComposite", () => {
    it("should give a high score to a good stock in a bull regime", () => {
      const result = scoreComposite(mockPerfectGrowthStock, "bull");
      expect(result).not.toBeNull();
      expect(result!.rating).toBe("BUY");
      expect(result!.score).toBeGreaterThanOrEqual(50);
    });

    it("should cap the score and give a low rating in a bear market regime", () => {
      const result = scoreComposite(mockPerfectGrowthStock, "bear");
      expect(result).not.toBeNull();
      expect(result!.rating).not.toBe("STRONG BUY");
      expect(result!.score).toBeLessThanOrEqual(40);
    });

    it("should give a low score to a downtrend stock", () => {
      const result = scoreComposite(mockDowntrendStock, "bull");
      expect(result).not.toBeNull();
      expect(result!.rating).not.toBe("STRONG BUY");
      expect(result!.rating).not.toBe("BUY");
    });
  });

  // --- Tests for new scorers from other developer ---

  describe("scorePennySniper", () => {
    it("should return a score object for a valid penny stock", () => {
      const result = scorePennySniper(mockPennyStock);
      expect(result).not.toBeNull();
      expect(result!.algorithm).toBe("Penny Sniper");
    });

    it("should return null for a non-penny stock", () => {
      const result = scorePennySniper(mockPerfectGrowthStock);
      expect(result).toBeNull();
    });
  });

  describe("scoreValueSleeper", () => {
    it("should return a score object for a valid value stock", () => {
      const valueStock = {
        ...mockPerfectGrowthStock,
        pe: 15,
        debtToEquity: 0.4,
      };
      const result = scoreValueSleeper(valueStock);
      if (result) {
        expect(result.algorithm).toBe("Value Sleeper");
      } else {
        expect(result).toBeNull();
      }
    });
  });

  describe("scoreAlphaPredator", () => {
    it("should return a score object for valid input", () => {
      const result = scoreAlphaPredator(mockPerfectGrowthStock, "bull");
      if (result) {
        expect(result.algorithm).toBe("Alpha Predator");
      } else {
        expect(result).toBeNull();
      }
    });
  });
});
