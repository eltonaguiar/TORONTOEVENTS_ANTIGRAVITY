import { describe, it, expect } from "vitest";
import {
  calculateRSI,
  calculateYTDPerformance,
  calculateVWAP,
  PriceHistory,
  calculateADX,
  calculateAwesomeOscillator,
} from "./stock-indicators";

describe("stock-indicators", () => {
  describe("calculateRSI", () => {
    // Test case from online RSI calculator for AAPL ending 2023-09-01
    const rsiTestData = [
      189.46, 187.87, 184.12, 180.19, 177.23, 175.01, 178.61, 180.57, 184.09,
      182.76, 179.3, 176.45, 174.21, 175.64, 174.48,
    ].reverse(); // Needs to be chronological

    it("should calculate RSI correctly", () => {
      const rsi = calculateRSI(rsiTestData, 14);
      // Expected value for Simple RSI is ~70.81
      expect(rsi).toBeCloseTo(70.81, 2);
    });
  });

  describe("calculateYTDPerformance", () => {
    const history: PriceHistory[] = [
      { date: "2025-12-31", close: 100, volume: 1, high: 1, low: 1 },
      { date: "2026-01-01", close: 110, volume: 1, high: 1, low: 1 },
      { date: "2026-01-15", close: 120, volume: 1, high: 1, low: 1 },
      { date: "2026-02-01", close: 150, volume: 1, high: 1, low: 1 },
    ];

    it("should calculate YTD performance correctly", () => {
      const ytd = calculateYTDPerformance(history, 150);
      // (150 - 110) / 110 = 36.36%
      expect(ytd).toBeCloseTo(36.36, 2);
    });
  });

  describe("calculateVWAP", () => {
    const history: PriceHistory[] = [
      { date: "2026-01-01", close: 100, volume: 100, high: 102, low: 98 },
      { date: "2026-01-02", close: 105, volume: 200, high: 106, low: 104 },
      { date: "2026-01-03", close: 102, volume: 150, high: 103, low: 101 },
    ];

    it("should calculate VWAP correctly", () => {
      const vwap = calculateVWAP(history);
      expect(vwap).toBeCloseTo(102.89, 2);
    });
  });

  describe("calculateADX", () => {
    const history: PriceHistory[] = Array.from({ length: 40 }, (_, i) => ({
      date: "2026-01-01",
      close: 100 + i,
      high: 100 + i + 0.5,
      low: 100 + i - 0.5,
      volume: 1000,
    }));
    it("should return a number", () => {
      const adx = calculateADX(history);
      expect(typeof adx).toBe("number");
    });
  });

  describe("calculateAwesomeOscillator", () => {
    const history: PriceHistory[] = Array.from({ length: 40 }, (_, i) => ({
      date: "2026-01-01",
      close: 100 + Math.sin(i / 10) * 5,
      high: 100 + Math.sin(i / 10) * 5 + 1,
      low: 100 + Math.sin(i / 10) * 5 - 1,
      volume: 1000,
    }));
    it("should return a number", () => {
      const ao = calculateAwesomeOscillator(history);
      expect(typeof ao).toBe("number");
    });
  });
});
