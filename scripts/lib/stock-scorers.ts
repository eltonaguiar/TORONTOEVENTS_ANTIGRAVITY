/**
 * Stock Scoring Algorithms (V1 Engine - Refactored)
 * Implements CAN SLIM, Technical Momentum, and Composite Rating.
 * This version centralizes indicator calculation and uses named constants for scoring.
 */

import { StockData, StockHistory } from "./stock-data-fetcher-enhanced";
import { PriceHistory } from "./stock-indicators";
import {
  calculateRSI,
  calculateMovingAverage,
  calculateVolumeSurge,
  checkBreakout,
  calculateRelativeStrength,
  checkStage2Uptrend,
  calculateBollingerBands,
  calculateATR,
  calculateVolumeZScore,
  calculateZScore,
  calculateYTDPerformance,
  calculateMTDPerformance,
  checkVCP,
  calculateVWAP,
  calculateADX,
  calculateAwesomeOscillator
} from "./stock-indicators";

// --- INTERFACES ---

export interface StockScore {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL";
  timeframe: "24h" | "3d" | "7d" | "2w" | "1m" | "3m" | "6m" | "1y";
  algorithm: string;
  score: number;
  risk: "Low" | "Medium" | "High" | "Very High";
  stopLoss?: number;
  indicators: Partial<CalculatedIndicators>; // Use the new interface
}

/** Alias for use in generator and UI; pickedAt is added when writing output. */
export type StockPick = StockScore & {
  pickedAt?: string;
  // V2 Scientific Metadata
  slippageSimulated?: boolean;
  simulatedEntryPrice?: number;
  pickHash?: string; // SHA256 of pick content
};

interface CalculatedIndicators {
  history: PriceHistory[];
  prices: number[];
  volumeHistory: number[];
  rsi: number;
  rsiZScore: number;
  sma5: number;       // New for Penny Sniper (Crossover)
  sma20: number;      // New for Penny Sniper
  sma50: number;
  sma200: number;
  volZ: number;
  atr: number;
  relVol: number;
  rsRating: number;
  stage2: boolean;
  breakout: boolean;
  bollinger: { bandWidth: number; squeeze: boolean };
  regime: "stress" | "bull" | "neutral";
  ytdPerf: number;
  mtdPerf: number;
  vcp: boolean;
  institutionalFootprint: boolean; // Price > VWAP
  adx: number;
  ao: number;
}

// --- SCORING CONSTANTS (NO MAGIC NUMBERS) ---

const CONSTANTS = {
  CANSLIM: {
    RS_RATING_WEIGHTS: { TIER1: 40, TIER2: 30, TIER3: 20, TIER4: 10 },
    STAGE2_WEIGHT: 30,
    PRICE_VS_HIGH_WEIGHTS: { TIER1: 20, TIER2: 15, TIER3: 10, TIER4: 5 },
    RSI_WEIGHT: 10,
    VOL_Z_BONUS: 5,
    VCP_BONUS: 20, // New scientific validator
    INSTITUTIONAL_BONUS: 10, // Price > VWAP
    RATING_THRESHOLDS: { STRONG_BUY: 80, BUY: 60, SELL: 40 },
  },
  MOMENTUM: {
    DAY_1: { VOL_Z_WEIGHT: 40, RSI_Z_WEIGHT: 30, BREAKOUT_WEIGHT: 30 },
    DAY_3: {
      VOL_Z_WEIGHT: 30,
      BREAKOUT_WEIGHT: 30,
      RSI_WEIGHT: 25,
      REL_VOL_WEIGHT: 15,
    },
    DAY_7: {
      SQUEEZE_WEIGHT: 30,
      RSI_WEIGHT: 25,
      VOL_Z_WEIGHT: 25,
      STABILITY_WEIGHT: 20,
    },
    RATING_THRESHOLDS: { STRONG_BUY: 75, BUY: 50, SELL: 30 },
  },
  COMPOSITE: {
    TREND_WEIGHTS: { SMA50: 20, SMA200: 10 },
    RSI_WEIGHT: 10,
    VOL_Z_WEIGHTS: { TIER1: 20, TIER2: 15, TIER3: 10 },
    FUNDAMENTAL_WEIGHTS: { PE: 10, MARKET_CAP: 10 },
    YTD_PERF_WEIGHT: 10, // New weight
    REGIME_WEIGHTS: { BULL: 10, NEUTRAL: 5, STRESS: 0 }, // Adjusted weights
    RATING_THRESHOLDS: { STRONG_BUY: 70, BUY: 50, SELL: 30 },
  },
  RISK: {
    LARGE_CAP_THRESHOLD: 10_000_000_000,
    SMALL_CAP_THRESHOLD: 1_000_000_000,
    PENNY_STOCK_PRICE: 5,
  },
  PENNY_SNIPER: {
    PRICE_RANGE: { MIN: 0.5, MAX: 15.0 }, // Expanded range slightly
    VOLUME_THRESHOLD: 500_000,
    VOL_SPIKE_WEIGHT: 30, // 3x average
    MA_CROSSOVER_WEIGHT: 30, // 5 crossing above 20
    LOW_FLOAT_BONUS: 20,
    PRICE_ABOVE_50SMA_WEIGHT: 20,
    RATING_THRESHOLDS: { STRONG_BUY: 80, BUY: 60, SELL: 40 }
  },
  VALUE_SLEEPER: {
    PE_RANGE: { MIN: 2, MAX: 20 },
    ROE_THRESHOLD: 15, // Slightly lower than 20 to be lenient
    DEBT_RATIO_MAX: 0.8, // < 0.6 ideal, lenient to 0.8
    NEAR_LOW_WEIGHT: 30,
    ROE_WEIGHT: 30,
    TREND_WEIGHT: 20, // Above 200 SMA
    PE_WEIGHT: 20,
    RATING_THRESHOLDS: { STRONG_BUY: 75, BUY: 60, SELL: 40 }
  },
  ALPHA_PREDATOR: {
    RSI_WEIGHT: 15, // Bullish range
    ADX_WEIGHT: 20, // Strong trend
    AO_WEIGHT: 15,  // Momentum
    VCP_WEIGHT: 20, // Volatility Contraction
    INSTITUTIONAL_WEIGHT: 10,
    TREND_WEIGHT: 10, // Above 50 SMA
    RATING_THRESHOLDS: { STRONG_BUY: 85, BUY: 65, SELL: 40 }
  }
};

// --- CENTRALIZED INDICATOR CALCULATION ---

function calculateAllIndicators(data: StockData): CalculatedIndicators | null {
  if (!data.history || data.history.length < 200) return null;

  const history: PriceHistory[] = data.history.map((h: StockHistory) => ({
    date: h.date,
    close: h.close,
    volume: h.volume,
    high: h.high,
    low: h.low,
  }));

  const prices = history.map((h) => h.close);
  const volumeHistory = history.map((h) => h.volume);

  const rsi = calculateRSI(prices, 14);
  const rsiHistory: number[] = [];
  for (let i = 14; i <= prices.length; i++) {
    rsiHistory.push(calculateRSI(prices.slice(0, i), 14));
  }

  const sma50 = calculateMovingAverage(prices, 50);
  const atr = calculateATR(history, 14);
  const relVol = atr / data.price;
  const isTrending = prices[prices.length - 1] > sma50;

  const bb = calculateBollingerBands(prices, 20);

  return {
    history,
    prices,
    volumeHistory,
    rsi,
    rsiZScore: calculateZScore(rsi, rsiHistory.slice(-20)),
    sma5: calculateMovingAverage(prices, 5),
    sma20: calculateMovingAverage(prices, 20),
    sma50,
    sma200: calculateMovingAverage(prices, 200),
    volZ: calculateVolumeZScore(data.volume, volumeHistory.slice(-20)),
    atr,
    relVol,
    rsRating: calculateRelativeStrength(history),
    stage2: checkStage2Uptrend(history),
    breakout: checkBreakout(history, 20),
    bollinger: { bandWidth: bb.width, squeeze: bb.squeeze }, // Map width to bandWidth
    regime:
      relVol > 0.04
        ? "stress"
        : relVol < 0.02 && isTrending
          ? "bull"
          : "neutral",
    ytdPerf: calculateYTDPerformance(history, data.price),
    mtdPerf: calculateMTDPerformance(history, data.price),
    vcp: checkVCP(history),
    institutionalFootprint: data.price > calculateVWAP(history.slice(-63)),
    adx: calculateADX(history),
    ao: calculateAwesomeOscillator(history),
  };
}

// --- REFACTORED SCORING ALGORITHMS ---

/**
 * CAN SLIM Growth Screener (Refactored)
 * Updated with V2 Scientific Validation: VCP + Regime Awareness
 */
export function scoreCANSLIM(
  data: StockData,
  marketRegime: "bull" | "bear" | "neutral" = "neutral"
): StockScore | null {
  const indicators = calculateAllIndicators(data);
  if (!indicators) return null;

  const { rsRating, stage2, rsi, sma200, volZ, atr } = indicators;
  let score = 0;

  const C = CONSTANTS.CANSLIM;

  // RS Rating
  if (rsRating >= 90) score += C.RS_RATING_WEIGHTS.TIER1;
  else if (rsRating >= 80) score += C.RS_RATING_WEIGHTS.TIER2;
  else if (rsRating >= 70) score += C.RS_RATING_WEIGHTS.TIER3;
  else if (rsRating >= 60) score += C.RS_RATING_WEIGHTS.TIER4;

  // Stage-2 Uptrend
  if (stage2) score += C.STAGE2_WEIGHT;

  // Price vs 52-week high
  if (data.high52Week && data.price) {
    const priceVsHigh = data.price / data.high52Week;
    if (priceVsHigh >= 0.9) score += C.PRICE_VS_HIGH_WEIGHTS.TIER1;
    else if (priceVsHigh >= 0.8) score += C.PRICE_VS_HIGH_WEIGHTS.TIER2;
    else if (priceVsHigh >= 0.7) score += C.PRICE_VS_HIGH_WEIGHTS.TIER3;
    else if (priceVsHigh >= 0.5) score += C.PRICE_VS_HIGH_WEIGHTS.TIER4;
  }

  // RSI momentum
  if (rsi >= 50 && rsi <= 70) score += C.RSI_WEIGHT;

  // Volume Bonus
  if (volZ > 2.0) score += C.VOL_Z_BONUS;

  // V2 Scientific Validators
  if (indicators.vcp) score += C.VCP_BONUS;
  if (indicators.institutionalFootprint) score += C.INSTITUTIONAL_BONUS;

  // Regime Awareness (Engine Shutdown/Penalty)
  if (marketRegime === "bear") {
    score -= 30; // Massive penalty in bear market
  }

  const isAbove200MA = data.price >= sma200;
  let rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" = "HOLD";
  if (score >= C.RATING_THRESHOLDS.STRONG_BUY && isAbove200MA)
    rating = "STRONG BUY";
  else if (score >= C.RATING_THRESHOLDS.BUY && isAbove200MA) rating = "BUY";
  else if (score < C.RATING_THRESHOLDS.SELL || !isAbove200MA) rating = "SELL";

  let timeframe: "3m" | "6m" | "1y" = "3m";
  if (rsRating >= 95 && stage2) timeframe = "1y";
  else if (rsRating >= 85) timeframe = "6m";

  let risk: "Low" | "Medium" | "High" = "Medium";
  if (data.marketCap && data.marketCap > CONSTANTS.RISK.LARGE_CAP_THRESHOLD)
    risk = "Low";
  else if (
    data.marketCap &&
    data.marketCap < CONSTANTS.RISK.SMALL_CAP_THRESHOLD
  )
    risk = "High";

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe,
    algorithm: "CAN SLIM",
    score: Math.min(100, score),
    risk,
    stopLoss: Math.round((data.price - atr * 2) * 100) / 100,
    indicators: {
      rsRating,
      rsi,
      stage2: stage2, // Map stage2 to interface property
      volZ: volZ,     // Map volZ to interface property
      atr,
      vcp: indicators.vcp, // Add VCP to output
      institutionalFootprint: indicators.institutionalFootprint, // Add Institutional Footprint
    },
  };
}

/**
 * Technical Momentum Screener (Refactored)
 */
export function scoreTechnicalMomentum(
  data: StockData,
  timeframe: "24h" | "3d" | "7d" = "7d",
): StockScore | null {
  const indicators = calculateAllIndicators(data);
  if (!indicators) return null;

  const { rsi, rsiZScore, volZ, breakout, bollinger, atr, relVol } = indicators;
  let score = 0;

  const C = CONSTANTS.MOMENTUM;

  if (timeframe === "24h") {
    if (volZ > 3.0) score += C.DAY_1.VOL_Z_WEIGHT;
    else if (volZ > 1.5) score += C.DAY_1.VOL_Z_WEIGHT - 10;
    if (rsiZScore < -2.0) score += C.DAY_1.RSI_Z_WEIGHT;
    else if (rsiZScore > 2.0) score += C.DAY_1.RSI_Z_WEIGHT - 10;
    if (breakout) score += C.DAY_1.BREAKOUT_WEIGHT;
  } else if (timeframe === "3d") {
    if (volZ > 2.0) score += C.DAY_3.VOL_Z_WEIGHT;
    if (breakout) score += C.DAY_3.BREAKOUT_WEIGHT;
    if (rsi >= 50 && rsi <= 70) score += C.DAY_3.RSI_WEIGHT;
    if (relVol > 0.03) score += C.DAY_3.REL_VOL_WEIGHT;
  } else {
    // 7d
    if (bollinger.squeeze) score += C.DAY_7.SQUEEZE_WEIGHT;
    if (rsi >= 50 && rsi <= 65) score += C.DAY_7.RSI_WEIGHT;
    if (volZ > 1.0) score += C.DAY_7.VOL_Z_WEIGHT;
    if (
      data.marketCap &&
      data.marketCap > CONSTANTS.RISK.SMALL_CAP_THRESHOLD &&
      volZ > 1.5
    ) {
      score += C.DAY_7.STABILITY_WEIGHT;
    }
  }

  let rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" = "HOLD";
  if (score >= C.RATING_THRESHOLDS.STRONG_BUY) rating = "STRONG BUY";
  else if (score >= C.RATING_THRESHOLDS.BUY) rating = "BUY";
  else if (score < C.RATING_THRESHOLDS.SELL) rating = "SELL";

  let risk: "Low" | "Medium" | "High" | "Very High" = "High";
  if (
    data.price >= 10 &&
    data.marketCap &&
    data.marketCap > CONSTANTS.RISK.SMALL_CAP_THRESHOLD
  )
    risk = "Medium";
  else if (data.price < CONSTANTS.RISK.PENNY_STOCK_PRICE - 1)
    risk = "Very High";

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe,
    algorithm: "Technical Momentum",
    score: Math.min(100, score),
    risk,
    stopLoss: Math.round((data.price - atr * 1.5) * 100) / 100,
    indicators: {
      rsi,
      rsiZScore,
      volZ: volZ,       // Map volZ to interface property
      breakout,
      // Map bollinger properties
      bollinger: { bandWidth: bollinger.bandWidth, squeeze: bollinger.squeeze },
      atr,
    },
  };
}

/**
 * Composite Rating Engine (Refactored)
 * Updated with V2 Scientific Validation: Regime Awareness
 */
export function scoreComposite(
  data: StockData,
  marketRegime: "bull" | "bear" | "neutral" = "neutral"
): StockScore | null {
  const indicators = calculateAllIndicators(data);
  if (!indicators) return null;

  const { rsi, sma50, sma200, volZ, atr, regime, ytdPerf } = indicators;
  let score = 0;

  const C = CONSTANTS.COMPOSITE;

  // Technical
  if (data.price >= sma50) score += C.TREND_WEIGHTS.SMA50;
  if (data.price >= sma200) score += C.TREND_WEIGHTS.SMA200;
  if (rsi >= 50 && rsi <= 70) score += C.RSI_WEIGHT;

  // Volume
  if (volZ > 2.0) score += C.VOL_Z_WEIGHTS.TIER1;
  else if (volZ > 1.0) score += C.VOL_Z_WEIGHTS.TIER2;
  else if (volZ > 0) score += C.VOL_Z_WEIGHTS.TIER3;

  // Fundamental
  if (data.pe && data.pe > 0 && data.pe < 25) score += C.FUNDAMENTAL_WEIGHTS.PE;
  if (data.marketCap && data.marketCap > CONSTANTS.RISK.SMALL_CAP_THRESHOLD)
    score += C.FUNDAMENTAL_WEIGHTS.MARKET_CAP;

  // YTD Performance
  if (ytdPerf > 10) score += C.YTD_PERF_WEIGHT;

  // Regime
  if (regime === "bull") score += C.REGIME_WEIGHTS.BULL;
  else if (regime === "neutral") score += C.REGIME_WEIGHTS.NEUTRAL;
  else score += C.REGIME_WEIGHTS.STRESS;

  // V2 Regime Awareness: Global Market Filter
  if (marketRegime === "bear") {
    score = Math.min(score, 40); // Cap at 40 (SELL/HOLD) in bear market
  }

  let rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" = "HOLD";
  if (score >= C.RATING_THRESHOLDS.STRONG_BUY) rating = "STRONG BUY";
  else if (score >= C.RATING_THRESHOLDS.BUY) rating = "BUY";
  else if (score < C.RATING_THRESHOLDS.SELL) rating = "SELL";

  const timeframe: "1m" | "3m" = "1m";
  let risk: "Low" | "Medium" | "High" = "Medium";
  if (data.marketCap && data.marketCap > CONSTANTS.RISK.LARGE_CAP_THRESHOLD)
    risk = "Low";
  else if (data.price < CONSTANTS.RISK.PENNY_STOCK_PRICE) risk = "High";

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe,
    algorithm: "Composite Rating",
    score: Math.min(100, score),
    risk,
    stopLoss: Math.round((data.price - atr * 2.5) * 100) / 100,
    // Map proper keys to match interface
    indicators: { rsi, volZ: volZ, atr, ytdPerf, regime },
  };
}

/**
 * Penny Stock "Sniper" (High Risk, High Reward)
 * Targets: Low Float, High Vol Spike, MA Crossover
 */
export function scorePennySniper(data: StockData): StockScore | null {
  const indicators = calculateAllIndicators(data);
  if (!indicators) return null;

  const { sma5, sma20, sma50, volZ, atr } = indicators;
  const C = CONSTANTS.PENNY_SNIPER;
  let score = 0;

  // Filter 1: Price Range
  if (data.price < C.PRICE_RANGE.MIN || data.price > C.PRICE_RANGE.MAX) return null;

  // Filter 2: Volume Liquidity
  if (data.avgVolume < C.VOLUME_THRESHOLD && data.volume < C.VOLUME_THRESHOLD)
    return null;

  // Criteria 1: Volume Spike (> 3x avg approximately volZ > 3 covers this, but let's be strict)
  // roughly volZ > 3 is a huge spike. Crossover usually needs interest.
  if (volZ > 3.0) score += C.VOL_SPIKE_WEIGHT;
  else if (volZ > 1.5) score += C.VOL_SPIKE_WEIGHT / 2;

  // Criteria 2: Golden Cross Start (5 crosses above 20)
  // We check if 5 > 20 now. Ideally we want "just crossed", but keeping it simple: is above.
  if (sma5 > sma20) score += C.MA_CROSSOVER_WEIGHT;

  // Criteria 3: Above 50 SMA (Trend alignment)
  if (data.price > sma50) score += C.PRICE_ABOVE_50SMA_WEIGHT;

  // Criteria 4: Low Float (Shares Outstanding)
  // If undefined, we skip bonus or use Market Cap as proxy (< 1B)
  const shares = data.sharesOutstanding;
  if (shares && shares < 50_000_000) score += C.LOW_FLOAT_BONUS;
  else if (data.marketCap && data.marketCap < CONSTANTS.RISK.SMALL_CAP_THRESHOLD) score += C.LOW_FLOAT_BONUS / 2;

  let rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" = "HOLD";
  if (score >= C.RATING_THRESHOLDS.STRONG_BUY) rating = "STRONG BUY";
  else if (score >= C.RATING_THRESHOLDS.BUY) rating = "BUY";
  else if (score < C.RATING_THRESHOLDS.SELL) rating = "SELL";

  if (rating === "SELL" || rating === "HOLD") return null; // Only return actionable snipes

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe: "24h", // Snipes are short term
    algorithm: "Penny Sniper",
    score: Math.min(100, score),
    risk: "Very High",
    stopLoss: Math.round((data.price - atr * 2) * 100) / 100,
    indicators: { volZ, atr },
  };
}

/**
 * Value "Sleepers" (Fundamental + Reversion)
 * Targets: Low PE, High ROE, Near Lows but Stable
 */
export function scoreValueSleeper(data: StockData): StockScore | null {
  const indicators = calculateAllIndicators(data);
  if (!indicators) return null;

  const { sma200, atr, rsi } = indicators;
  const C = CONSTANTS.VALUE_SLEEPER;
  let score = 0;

  // Filter: Market Cap > 1B (Mid/Large Cap Safety)
  if (!data.marketCap || data.marketCap < CONSTANTS.RISK.SMALL_CAP_THRESHOLD) return null;

  // 1. PE Ratio (Cheap?)
  if (data.pe && data.pe >= C.PE_RANGE.MIN && data.pe <= C.PE_RANGE.MAX) {
    score += C.PE_WEIGHT;
  } else {
    // Penalty for missing PE or high PE
    return null;
  }

  // 2. ROE (Quality?)
  if (data.roe && data.roe > C.ROE_THRESHOLD) {
    score += C.ROE_WEIGHT;
  } else if (!data.roe) {
    // optional: allow if unknown but other stats good? No, strict value.
  }

  // 3. Debt (Safety?) - debtToEquity is often returned as a ratio e.g. 50 (50%) or 0.5. 
  // Yahoo typically returns it as a percentage number (e.g. 150 for 150% debt).
  // Let's assume percentage if > 10, ratio if < 10. 
  // Safety check: < 80% (0.8) is good. 
  if (data.debtToEquity !== undefined) {
    const debtRatio = data.debtToEquity > 10 ? data.debtToEquity / 100 : data.debtToEquity;
    if (debtRatio < C.DEBT_RATIO_MAX) score += 10; // Bonus
  }

  // 4. Mean Reversion (Near 52 week low)
  if (data.low52Week && data.high52Week) {
    const range = data.high52Week - data.low52Week;
    const position = (data.price - data.low52Week) / range; // 0 = at low, 1 = at high

    if (position < 0.2) score += C.NEAR_LOW_WEIGHT; // Bottom 20% of range
    else if (position < 0.4) score += C.NEAR_LOW_WEIGHT / 2;
  }

  // 5. Trend Safety (Above 200 SMA) - Sleepers shouldn't be crashing
  if (data.price > sma200) score += C.TREND_WEIGHT;

  let rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" = "HOLD";
  if (score >= C.RATING_THRESHOLDS.STRONG_BUY) rating = "STRONG BUY";
  else if (score >= C.RATING_THRESHOLDS.BUY) rating = "BUY";
  else if (score < C.RATING_THRESHOLDS.SELL) rating = "SELL";

  if (rating === "SELL" || rating === "HOLD") return null;

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe: "3m", // Value plays take time
    algorithm: "Value Sleeper",
    score: Math.min(100, score),
    risk: "Low",
    stopLoss: Math.round((data.price - atr * 3) * 100) / 100, // Wide stop
    indicators: { rsi, atr },
  };
}

/**
 * Alpha Predator (Scientific Composite)
 * Combines Trend (ADX), Momentum (RSI, AO), and Structure (VCP)
 */
export function scoreAlphaPredator(
  data: StockData,
  marketRegime: "bull" | "bear" | "neutral" = "neutral"
): StockScore | null {
  const indicators = calculateAllIndicators(data);
  if (!indicators) return null;

  const { rsi, adx, ao, vcp, institutionalFootprint, sma50, atr } = indicators;
  const C = CONSTANTS.ALPHA_PREDATOR;
  let score = 0;

  // 1. Trend Strength (ADX)
  if (adx > 25) score += C.ADX_WEIGHT;
  else if (adx > 20) score += C.ADX_WEIGHT / 2;

  // 2. Momentum (RSI) - Bullish sweet spot
  if (rsi >= 50 && rsi <= 75) score += C.RSI_WEIGHT;

  // 3. Momentum (Awesome Oscillator)
  if (ao > 0) score += C.AO_WEIGHT;

  // 4. Structure (VCP)
  if (vcp) score += C.VCP_WEIGHT;

  // 5. Institutional Support
  if (institutionalFootprint) score += C.INSTITUTIONAL_WEIGHT;

  // 6. Trend Trend
  if (data.price > sma50) score += C.TREND_WEIGHT;

  // Regime Penalty
  if (marketRegime === "bear") {
    score -= 30;
  }

  let rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" = "HOLD";
  if (score >= C.RATING_THRESHOLDS.STRONG_BUY) rating = "STRONG BUY";
  else if (score >= C.RATING_THRESHOLDS.BUY) rating = "BUY";
  else if (score < C.RATING_THRESHOLDS.SELL) rating = "SELL";

  if (rating === "SELL") return null;

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe: "3d", // Swing trade horizon
    algorithm: "Alpha Predator",
    score: Math.min(100, score),
    risk: "Medium",
    stopLoss: Math.round((data.price - atr * 2) * 100) / 100,
    indicators: { rsi, adx, ao, vcp, institutionalFootprint, atr },
  };
}
