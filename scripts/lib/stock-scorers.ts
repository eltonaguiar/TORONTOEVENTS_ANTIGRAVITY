
/**
 * Stock Scoring Algorithms
 */

import { StockData, StockHistory } from "./stock-data-fetcher-enhanced";

export interface StockScore {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL";
  timeframe: string;
  algorithm: string;
  score: number;
  risk: "Low" | "Medium" | "High" | "Very High";
  stopLoss?: number;
  indicators: Partial<CalculatedIndicators>;
}

export type StockPick = StockScore & {
  pickedAt?: string;
  slippageSimulated?: boolean;
  simulatedEntryPrice?: number;
  pickHash?: string;
};

interface PriceHistory {
  date: string;
  close: number;
  volume: number;
  low: number;
}

interface CalculatedIndicators {
  history: PriceHistory[];
  prices: number[];
  volumeHistory: number[];
  rsi: number;
  rsiZScore: number;
  sma5: number;
  sma20: number;
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
  institutionalFootprint: boolean;
  adx: number;
  ao: number;
  earningsDate?: string;
  daysToEarnings?: number;
}

const CONSTANTS = {
  CANSLIM: {
    RS_RATING_WEIGHTS: { TIER1: 40, TIER2: 30, TIER3: 20, TIER4: 10 },
    STAGE2_WEIGHT: 30,
    PRICE_VS_HIGH_WEIGHTS: { TIER1: 20, TIER2: 15, TIER3: 10, TIER4: 5 },
    RSI_WEIGHT: 10,
    VOL_Z_BONUS: 5,
    VCP_BONUS: 20,
    INSTITUTIONAL_BONUS: 10,
    RATING_THRESHOLDS: { STRONG_BUY: 80, BUY: 60, SELL: 40 },
  },
  MOMENTUM: {
    DAY_1: { VOL_Z_WEIGHT: 40, RSI_Z_WEIGHT: 30, BREAKOUT_WEIGHT: 30 },
    DAY_3: { VOL_Z_WEIGHT: 30, BREAKOUT_WEIGHT: 30, RSI_WEIGHT: 25, REL_VOL_WEIGHT: 15 },
    DAY_7: { SQUEEZE_WEIGHT: 30, RSI_WEIGHT: 25, VOL_Z_WEIGHT: 25, STABILITY_WEIGHT: 20 },
    RATING_THRESHOLDS: { STRONG_BUY: 80, BUY: 60, SELL: 40 },
  },
  COMPOSITE: {
    TECHNICAL_WEIGHTS: { RSI: 20, RSI_Z: 10, VOL_Z: 10, BREAKOUT: 10 },
    FUNDAMENTAL_WEIGHTS: { PE: 10, MARKET_CAP: 10 },
    YTD_PERF_WEIGHT: 10,
    REGIME_WEIGHTS: { BULL: 10, NEUTRAL: 5, STRESS: 0 },
    RATING_THRESHOLDS: { STRONG_BUY: 70, BUY: 50, SELL: 30 },
  },
  RISK: {
    LARGE_CAP_THRESHOLD: 10_000_000_000,
    SMALL_CAP_THRESHOLD: 1_000_000_000,
    PENNY_STOCK_PRICE: 5,
  },
  PENNY_SNIPER: {
    PRICE_RANGE: { MIN: 0.5, MAX: 15.0 },
    VOLUME_THRESHOLD: 500_000,
    VOL_SPIKE_WEIGHT: 30,
    MA_CROSSOVER_WEIGHT: 30,
    LOW_FLOAT_BONUS: 20,
    PRICE_ABOVE_50SMA_WEIGHT: 20,
    RATING_THRESHOLDS: { STRONG_BUY: 80, BUY: 60, SELL: 40 },
  },
  VALUE_SLEEPER: {
    PE_RANGE: { MIN: 2, MAX: 20 },
    ROE_THRESHOLD: 15,
    DEBT_RATIO_MAX: 0.8,
    NEAR_LOW_WEIGHT: 30,
    ROE_WEIGHT: 30,
    TREND_WEIGHT: 20,
    PE_WEIGHT: 20,
    RATING_THRESHOLDS: { STRONG_BUY: 75, BUY: 60, SELL: 40 },
  },
  ALPHA_PREDATOR: {
    ADX_WEIGHT: 20,
    RSI_WEIGHT: 15,
    AO_WEIGHT: 15,
    VCP_WEIGHT: 20,
    INSTITUTIONAL_WEIGHT: 15,
    TREND_WEIGHT: 15,
    EARNINGS_PENALTY: 100,
    RATING_THRESHOLDS: { STRONG_BUY: 85, BUY: 70, SELL: 50 },
  },
};

// --- HELPER FUNCTIONS ---

function calculateMovingAverage(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calculateATR(history: PriceHistory[], period: number = 14): number {
  if (history.length <= period) return 0;
  let trSum = 0;
  for (let i = history.length - period; i < history.length; i++) {
    const high = history[i].close; // Approximate since we only have close in interface
    const low = history[i].low || history[i].close * 0.98;
    const prevClose = history[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  return trSum / period;
}

function calculateZScore(value: number, history: number[]): number {
  if (history.length < 5) return 0;
  const n = history.length;
  const mean = history.reduce((a, b) => a + b, 0) / n;
  const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  return stdDev === 0 ? 0 : (value - mean) / stdDev;
}

function calculateVolumeZScore(currentVol: number, history: number[]): number {
  return calculateZScore(currentVol, history);
}

function calculateRelativeStrength(history: PriceHistory[]): number {
  if (history.length < 100) return 50;
  const current = history[history.length - 1].close;
  const quarter = history[history.length - 63]?.close || history[0].close;
  const half = history[history.length - 126]?.close || history[0].close;
  const year = history[history.length - 252]?.close || history[0].close;
  const score = (current / quarter) * 0.4 + (current / half) * 0.3 + (current / year) * 0.3;
  return Math.min(99, Math.round(score * 50));
}

function checkStage2Uptrend(history: PriceHistory[]): boolean {
  if (history.length < 200) return false;
  const prices = history.map(h => h.close);
  const sma50 = calculateMovingAverage(prices, 50);
  const sma150 = calculateMovingAverage(prices, 150);
  const sma200 = calculateMovingAverage(prices, 200);
  const current = prices[prices.length - 1];
  return current > sma150 && current > sma200 && sma150 > sma200 && current > sma50;
}

function checkBreakout(history: PriceHistory[], period: number = 20): boolean {
  if (history.length < period + 1) return false;
  const current = history[history.length - 1].close;
  const high = Math.max(...history.slice(-period - 1, -1).map(h => h.close));
  return current > high;
}

function calculateBollingerBands(prices: number[], period: number = 20) {
  const sma = calculateMovingAverage(prices, period);
  const variance = prices.slice(-period).reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  const width = (stdDev * 4) / sma;
  return { width, squeeze: width < 0.05 };
}

function calculateADX(history: PriceHistory[], period: number = 14): number {
  // Simplified ADX implementation
  if (history.length < period * 2) return 20;
  return 25; // Placeholder
}

function calculateAwesomeOscillator(prices: number[]): number {
  const medianPrices = prices.map((p, i) => p); // Simplified
  const sma5 = calculateMovingAverage(medianPrices, 5);
  const sma34 = calculateMovingAverage(medianPrices, 34);
  return sma5 - sma34;
}

function assessEarningsRisk(days?: number): { penalty: number; warning: boolean; disqualify: boolean } {
  if (days === undefined) return { penalty: 0, warning: false, disqualify: false };
  if (days < 0) return { penalty: 0, warning: false, disqualify: false }; // Past
  if (days <= 2) return { penalty: 100, warning: true, disqualify: true };
  if (days <= 6) return { penalty: 100, warning: true, disqualify: false };
  return { penalty: 0, warning: false, disqualify: false };
}

export function calculateAllIndicators(data: StockData): CalculatedIndicators | null {
  if (!data.history || data.history.length < 20) return null;
  const history = data.history.map(h => ({
    date: h.date,
    close: h.close,
    volume: h.volume,
    low: h.low || h.close * 0.98
  }));
  const prices = history.map(h => h.close);
  const volumeHistory = history.map(h => h.volume);

  const rsi = calculateRSI(prices);
  const rsiHistory: number[] = [];
  for (let i = 20; i < prices.length; i++) {
    rsiHistory.push(calculateRSI(prices.slice(0, i), 14));
  }

  const sma50 = calculateMovingAverage(prices, 50);
  const atr = calculateATR(history, 14);
  const relVol = atr / data.price;
  const bb = calculateBollingerBands(prices, 20);

  const nowMs = Date.now();
  let daysToEarnings = data.daysToEarnings;
  if (daysToEarnings === undefined && data.earningsTimestamp) {
    daysToEarnings = Math.ceil((data.earningsTimestamp * 1000 - nowMs) / (1000 * 3600 * 24));
  }

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
    bollinger: { bandWidth: bb.width, squeeze: bb.squeeze },
    regime: relVol > 0.04 ? "stress" : (data.price > sma50 ? "bull" : "neutral"),
    ytdPerf: ((data.price - prices[0]) / prices[0]) * 100,
    mtdPerf: 0, // Placeholder
    vcp: bb.squeeze && relVol < 0.03,
    institutionalFootprint: data.price > calculateMovingAverage(prices, 10),
    adx: calculateADX(history),
    ao: calculateAwesomeOscillator(prices),
    earningsDate: data.earningsDate,
    daysToEarnings
  };
}

/**
 * Adaptive Stop Loss Helper
 * In "stress" regimes, we widen stops to avoid being "shaken out" by noise, 
 * but this also increases the risk rating.
 */
function calculateScientificStopLoss(
  price: number,
  atr: number,
  baseMultiplier: number,
  regime: string
): number {
  const multiplier = regime === "stress" ? baseMultiplier * 1.5 : baseMultiplier;
  return Math.round((price - atr * multiplier) * 100) / 100;
}

// --- SCORING FUNCTIONS ---

export function scoreCANSLIM(
  data: StockData,
  marketRegime: "bull" | "bear" | "neutral" | "stress" = "neutral"
): StockScore | null {
  const indicators = calculateAllIndicators(data);
  if (!indicators) return null;
  const { rsRating, stage2, rsi, sma200, volZ, atr, daysToEarnings, earningsDate } = indicators;
  const C = CONSTANTS.CANSLIM;
  const earningsRisk = assessEarningsRisk(daysToEarnings);
  if (earningsRisk.disqualify) return null;

  let score = 0;
  if (rsRating >= 90) score += C.RS_RATING_WEIGHTS.TIER1;
  else if (rsRating >= 80) score += C.RS_RATING_WEIGHTS.TIER2;
  if (stage2) score += C.STAGE2_WEIGHT;
  if (rsi >= 40 && rsi <= 70) score += C.RSI_WEIGHT;
  if (data.price > sma200) score += 10;
  if (volZ > 1.5) score += C.VOL_Z_BONUS;
  if (indicators.vcp) score += C.VCP_BONUS;
  if (indicators.institutionalFootprint) score += C.INSTITUTIONAL_BONUS;

  score = Math.max(0, score - earningsRisk.penalty);

  let rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" = "HOLD";
  if (score >= C.RATING_THRESHOLDS.STRONG_BUY) rating = "STRONG BUY";
  else if (score >= C.RATING_THRESHOLDS.BUY) rating = "BUY";
  if (rating !== "STRONG BUY" && rating !== "BUY") return null;

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe: "3m",
    algorithm: "CAN SLIM",
    score,
    risk: (marketRegime === "stress" || earningsRisk.warning) ? "Very High" : "Medium",
    stopLoss: calculateScientificStopLoss(data.price, atr, 2, marketRegime),
    indicators: { rsRating, rsi, stage2, volZ, atr, earningsDate, daysToEarnings }
  };
}

export function scoreTechnicalMomentum(
  data: StockData,
  marketRegime: "bull" | "bear" | "neutral" | "stress" = "neutral",
  timeframe: "24h" | "3d" | "7d" = "3d"
): StockScore | null {
  const indicators = calculateAllIndicators(data);
  if (!indicators) return null;
  const { rsi, rsiZScore, volZ, breakout, bollinger, atr, relVol, daysToEarnings, earningsDate } = indicators;
  const C = CONSTANTS.MOMENTUM;
  const earningsRisk = assessEarningsRisk(daysToEarnings);
  if (earningsRisk.disqualify) return null;

  let score = 0;
  if (timeframe === "24h") {
    if (volZ > 2.0) score += C.DAY_1.VOL_Z_WEIGHT;
    if (rsiZScore < -1.5) score += C.DAY_1.RSI_Z_WEIGHT;
    if (breakout) score += C.DAY_1.BREAKOUT_WEIGHT;
  } else if (timeframe === "3d") {
    if (volZ > 1.5) score += C.DAY_3.VOL_Z_WEIGHT;
    if (breakout) score += C.DAY_3.BREAKOUT_WEIGHT;
    if (rsi >= 50 && rsi <= 70) score += C.DAY_3.RSI_WEIGHT;
    if (relVol > 0.03) score += C.DAY_3.REL_VOL_WEIGHT;
  } else {
    if (bollinger.squeeze) score += C.DAY_7.SQUEEZE_WEIGHT;
    if (rsi >= 50 && rsi <= 65) score += C.DAY_7.RSI_WEIGHT;
    if (volZ > 1.0) score += C.DAY_7.VOL_Z_WEIGHT;
  }

  score = Math.max(0, score - earningsRisk.penalty);

  let rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" = "HOLD";
  if (score >= C.RATING_THRESHOLDS.STRONG_BUY) rating = "STRONG BUY";
  else if (score >= C.RATING_THRESHOLDS.BUY) rating = "BUY";
  if (rating !== "STRONG BUY" && rating !== "BUY") return null;

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe,
    algorithm: "Technical Momentum",
    score,
    risk: marketRegime === "stress" ? "Very High" : "High",
    stopLoss: calculateScientificStopLoss(data.price, atr, 1.5, marketRegime),
    indicators: { rsi, volZ, breakout, atr, earningsDate, daysToEarnings }
  };
}

export function scoreAlphaPredator(
  data: StockData,
  marketRegime: "bull" | "bear" | "neutral" | "stress" = "neutral"
): StockScore | null {
  const indicators = calculateAllIndicators(data);
  if (!indicators) return null;
  const { rsi, adx, ao, vcp, institutionalFootprint, sma50, atr, daysToEarnings, earningsDate } = indicators;
  const C = CONSTANTS.ALPHA_PREDATOR;
  const earningsRisk = assessEarningsRisk(daysToEarnings);
  if (earningsRisk.disqualify) return null;

  let score = 0;
  if (adx > 25) score += C.ADX_WEIGHT;
  if (rsi >= 50 && rsi <= 75) score += C.RSI_WEIGHT;
  if (ao > 0) score += C.AO_WEIGHT;
  if (vcp) score += C.VCP_WEIGHT;
  if (institutionalFootprint) score += C.INSTITUTIONAL_WEIGHT;
  if (data.price > sma50) score += C.TREND_WEIGHT;

  if (marketRegime === "bear") score -= 30;
  score = Math.max(0, score - earningsRisk.penalty);

  let rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" = "HOLD";
  if (score >= C.RATING_THRESHOLDS.STRONG_BUY) rating = "STRONG BUY";
  else if (score >= C.RATING_THRESHOLDS.BUY) rating = "BUY";
  if (rating !== "STRONG BUY" && rating !== "BUY") return null;

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe: "3d",
    algorithm: "Alpha Predator",
    score,
    risk: (marketRegime === "stress" || earningsRisk.warning) ? "Very High" : "Medium",
    stopLoss: calculateScientificStopLoss(data.price, atr, 2, marketRegime),
    indicators: { rsi, adx, ao, atr, earningsDate, daysToEarnings }
  };
}

export function scoreComposite(
  data: StockData,
  marketRegime: "bull" | "bear" | "neutral" | "stress" = "neutral"
): StockScore | null {
  const indicators = calculateAllIndicators(data);
  if (!indicators) return null;
  const { rsi, rsiZScore, volZ, breakout, ytdPerf, daysToEarnings, earningsDate } = indicators;
  const C = CONSTANTS.COMPOSITE;
  const earningsRisk = assessEarningsRisk(daysToEarnings);
  if (earningsRisk.disqualify) return null;

  let score = 0;
  if (rsi >= 40 && rsi <= 60) score += C.TECHNICAL_WEIGHTS.RSI;
  if (rsiZScore < 0) score += C.TECHNICAL_WEIGHTS.RSI_Z;
  if (volZ > 1.0) score += C.TECHNICAL_WEIGHTS.VOL_Z;
  if (breakout) score += C.TECHNICAL_WEIGHTS.BREAKOUT;
  if (ytdPerf > 0) score += C.YTD_PERF_WEIGHT;

  if (marketRegime === "bull") score += C.REGIME_WEIGHTS.BULL;
  else if (marketRegime === "neutral") score += C.REGIME_WEIGHTS.NEUTRAL;

  score = Math.max(0, score - earningsRisk.penalty);

  let rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" = "HOLD";
  if (score >= C.RATING_THRESHOLDS.STRONG_BUY) rating = "STRONG BUY";
  else if (score >= C.RATING_THRESHOLDS.BUY) rating = "BUY";
  if (rating !== "STRONG BUY" && rating !== "BUY") return null;

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe: "1m",
    algorithm: "Composite Rating",
    score,
    risk: "Medium",
    stopLoss: Math.round((data.price * 0.9) * 100) / 100,
    indicators: { rsi, volZ, ytdPerf, earningsDate, daysToEarnings }
  };
}

export function scorePennySniper(
  data: StockData,
  marketRegime: "bull" | "bear" | "neutral" | "stress" = "neutral"
): StockScore | null {
  const indicators = calculateAllIndicators(data);
  if (!indicators) return null;
  const { volZ, sma5, sma20, relVol, daysToEarnings, earningsDate } = indicators;
  const C = CONSTANTS.PENNY_SNIPER;

  if (data.price < C.PRICE_RANGE.MIN || data.price > C.PRICE_RANGE.MAX) return null;
  if (data.avgVolume < C.VOLUME_THRESHOLD) return null;

  let score = 0;
  if (volZ > 3.0) score += C.VOL_SPIKE_WEIGHT;
  if (sma5 > sma20) score += C.MA_CROSSOVER_WEIGHT;
  if (relVol > 0.05) score += C.LOW_FLOAT_BONUS;
  if (data.price > indicators.sma50) score += C.PRICE_ABOVE_50SMA_WEIGHT;

  let rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" = "HOLD";
  if (score >= C.RATING_THRESHOLDS.STRONG_BUY) rating = "STRONG BUY";
  else if (score >= C.RATING_THRESHOLDS.BUY) rating = "BUY";
  if (rating !== "STRONG BUY" && rating !== "BUY") return null;

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe: "24h",
    algorithm: "Penny Sniper",
    score,
    risk: "Very High",
    stopLoss: Math.round((data.price * 0.8) * 100) / 100,
    indicators: { volZ, relVol, earningsDate, daysToEarnings }
  };
}

export function scoreValueSleeper(
  data: StockData,
  marketRegime: "bull" | "bear" | "neutral" | "stress" = "neutral"
): StockScore | null {
  const indicators = calculateAllIndicators(data);
  if (!indicators) return null;
  const { rsi, sma200, atr, daysToEarnings, earningsDate } = indicators;
  const C = CONSTANTS.VALUE_SLEEPER;

  if (!data.pe || data.pe < C.PE_RANGE.MIN || data.pe > C.PE_RANGE.MAX) return null;
  if (!data.roe || data.roe < C.ROE_THRESHOLD) return null;

  let score = 0;
  if (rsi < 40) score += C.NEAR_LOW_WEIGHT;
  if (data.roe > 25) score += C.ROE_WEIGHT;
  if (data.price > sma200) score += C.TREND_WEIGHT;
  if (data.pe < 12) score += C.PE_WEIGHT;

  let rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" = "HOLD";
  if (score >= C.RATING_THRESHOLDS.STRONG_BUY) rating = "STRONG BUY";
  else if (score >= C.RATING_THRESHOLDS.BUY) rating = "BUY";
  if (rating !== "STRONG BUY" && rating !== "BUY") return null;

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe: "3m",
    algorithm: "Value Sleeper",
    score,
    risk: "Low",
    stopLoss: Math.round((data.price - atr * 3) * 100) / 100,
    indicators: { rsi, atr, earningsDate, daysToEarnings }
  };
}
