import { describe, it, expect } from "vitest";
import {
  calculateRSI,
  calculateYTDPerformance,
  calculateVWAP,
  PriceHistory,
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
      // Typical Price * Volume for each day:
      // Day 1: ((102+98+100)/3) * 100 = 100 * 100 = 10000
      // Day 2: ((106+104+105)/3) * 200 = 105 * 200 = 21000
      // Day 3: ((103+101+102)/3) * 150 = 102 * 150 = 15300
      // Total PV = 10000 + 21000 + 15300 = 46300
      // Total Volume = 100 + 200 + 150 = 450
      // VWAP = 46300 / 450 = 102.888...
      const vwap = calculateVWAP(history);
      expect(vwap).toBeCloseTo(102.89, 2);
    });
  });
});
