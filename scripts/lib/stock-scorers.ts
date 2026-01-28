/**
 * Stock Scoring Algorithms
 * Implements CAN SLIM, Technical Momentum, and Composite Rating
 */

import { StockData } from './stock-data-fetcher';
import { PriceHistory } from './stock-indicators';
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
  calculateZScore
} from './stock-indicators';

export interface StockScore {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  rating: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL';
  timeframe: '24h' | '3d' | '7d' | '2w' | '1m' | '3m' | '6m' | '1y';
  algorithm: string;
  score: number;
  risk: 'Low' | 'Medium' | 'High' | 'Very High';
  stopLoss?: number;
  indicators: {
    rsi?: number;
    rsiZScore?: number;
    volumeSurge?: number;
    volumeZScore?: number;
    breakout?: boolean;
    revenueGrowth?: number;
    rsRating?: number;
    stage2Uptrend?: boolean;
    bollingerSqueeze?: boolean;
    atr?: number;
  };
}

/** Alias for use in generator and UI; pickedAt is added when writing output. */
export type StockPick = StockScore & { pickedAt?: string };

/**
 * CAN SLIM Growth Screener
 * Best for: Long-term growth stocks (3-12 months)
 */
export function scoreCANSLIM(data: StockData): StockScore | null {
  if (!data.history || data.history.length < 200) return null;

  const history: PriceHistory[] = data.history.map((h: any) => ({
    date: h.date,
    close: h.close,
    volume: h.volume,
    high: h.high,
    low: h.low
  }));

  const prices = history.map((h: any) => h.close);
  const volumeHistory = history.map((h: any) => h.volume);
  const rsRating = calculateRelativeStrength(history);
  const stage2 = checkStage2Uptrend(history);
  const rsi = calculateRSI(prices, 14);
  const sma200 = calculateMovingAverage(prices, 200);
  const atr = calculateATR(history, 14);
  const volZ = calculateVolumeZScore(data.volume, volumeHistory.slice(-20));

  // CAN SLIM criteria scoring
  let score = 0;

  // Hard Filter: Trend Enforcement
  // No Strong Buy/Buy if below 200-day simple moving average
  const isAbove200MA = data.price >= sma200;

  // RS Rating (40 points max)
  if (rsRating >= 90) score += 40;
  else if (rsRating >= 80) score += 30;
  else if (rsRating >= 70) score += 20;
  else if (rsRating >= 60) score += 10;

  // Stage-2 Uptrend (30 points)
  if (stage2) score += 30;

  // Price vs 52-week high (20 points)
  if (data.high52Week && data.price) {
    const priceVsHigh = data.price / data.high52Week;
    if (priceVsHigh >= 0.9) score += 20;
    else if (priceVsHigh >= 0.8) score += 15;
    else if (priceVsHigh >= 0.7) score += 10;
    else if (priceVsHigh >= 0.5) score += 5;
  }

  // RSI momentum (10 points)
  if (rsi >= 50 && rsi <= 70) score += 10; // Healthy momentum

  // Volume Z-Score (Bonus 5 points for significant institutional footprint)
  if (volZ > 2.0) score += 5;

  // Determine rating with Trend Filter
  let rating: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
  if (score >= 80 && isAbove200MA) rating = 'STRONG BUY';
  else if (score >= 60 && isAbove200MA) rating = 'BUY';
  else if (score < 40 || !isAbove200MA) rating = 'SELL';

  // Determine timeframe (based on stage-2 and RS)
  let timeframe: '3m' | '6m' | '1y' = '3m';
  if (rsRating >= 95 && stage2) timeframe = '1y';
  else if (rsRating >= 85) timeframe = '6m';

  // Risk assessment
  let risk: 'Low' | 'Medium' | 'High' = 'Medium';
  if (data.marketCap && data.marketCap > 10_000_000_000) risk = 'Low';
  else if (data.marketCap && data.marketCap < 1_000_000_000) risk = 'High';

  // ATR-based Stop Loss (2 * ATR)
  const stopLoss = data.price - (atr * 2);

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe,
    algorithm: 'CAN SLIM',
    score: Math.min(100, score),
    risk,
    stopLoss: Math.round(stopLoss * 100) / 100,
    indicators: {
      rsRating: Math.round(rsRating),
      rsi: Math.round(rsi),
      stage2Uptrend: stage2,
      volumeSurge: calculateVolumeSurge(data.volume, data.avgVolume),
      volumeZScore: Math.round(volZ * 100) / 100,
      atr: Math.round(atr * 100) / 100
    }
  };
}

/**
 * Technical Momentum Screener
 * Best for: Short-term momentum (24h - 1 week)
 */
export function scoreTechnicalMomentum(data: StockData, timeframe: '24h' | '3d' | '7d' = '7d'): StockScore | null {
  if (!data.history || data.history.length < 20) return null;

  const history: PriceHistory[] = data.history.map((h: any) => ({
    date: h.date,
    close: h.close,
    volume: h.volume,
    high: h.high,
    low: h.low
  }));

  const prices = history.map((h: any) => h.close);
  const volumeHistory = history.map((h: any) => h.volume);
  const rsi = calculateRSI(prices, 14);
  const rsiHistory = [];
  for (let i = 14; i <= prices.length; i++) {
    rsiHistory.push(calculateRSI(prices.slice(0, i), 14));
  }
  const rsiZ = calculateZScore(rsi, rsiHistory.slice(-20));

  const volZ = calculateVolumeZScore(data.volume, volumeHistory.slice(-20));
  const breakout = checkBreakout(history, 20);
  const bollinger = calculateBollingerBands(prices, 20);
  const atr = calculateATR(history, 14);

  // Timeframe-based scoring
  let score = 0;

  if (timeframe === '24h') {
    // 24-hour focus: Volume Z-Score (40), RSI Z-Score (30), Breakout (30)
    if (volZ > 3.0) score += 40;
    else if (volZ > 1.5) score += 30;

    if (rsiZ < -2.0) score += 30; // Oversold panic
    else if (rsiZ > 2.0) score += 20; // Momentum blowoff

    if (breakout) score += 30;
  } else if (timeframe === '3d') {
    // 3-day: Vol Z (30), Breakout (30), RSI (25), Volatility (15)
    if (volZ > 2.0) score += 30;
    if (breakout) score += 30;

    if (rsi >= 50 && rsi <= 70) score += 25;

    // Relative Volatility (ATR / Price)
    const relVol = atr / data.price;
    if (relVol > 0.03) score += 15;
  } else {
    // 7-day: Bollinger squeeze (30), RSI (25), Vol Z (25), Market Cap/Stability (20)
    if (bollinger.squeeze) score += 30;

    if (rsi >= 50 && rsi <= 65) score += 25;
    if (volZ > 1.0) score += 25;

    if (data.marketCap && data.marketCap > 1_000_000_000 && volZ > 1.5) {
      score += 20;
    }
  }

  // Determine rating
  let rating: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
  if (score >= 75) rating = 'STRONG BUY';
  else if (score >= 50) rating = 'BUY';
  else if (score < 30) rating = 'SELL';

  // Risk
  let risk: 'Low' | 'Medium' | 'High' | 'Very High' = 'High';
  if (data.price >= 10 && data.marketCap && data.marketCap > 1_000_000_000) {
    risk = 'Medium';
  } else if (data.price < 4) {
    risk = 'Very High';
  }

  // ATR-based Stop Loss (1.5 * ATR for short-term)
  const stopLoss = data.price - (atr * 1.5);

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe,
    algorithm: 'Technical Momentum',
    score: Math.min(100, score),
    risk,
    stopLoss: Math.round(stopLoss * 100) / 100,
    indicators: {
      rsi: Math.round(rsi),
      rsiZScore: Math.round(rsiZ * 100) / 100,
      volumeSurge: calculateVolumeSurge(data.volume, data.avgVolume),
      volumeZScore: Math.round(volZ * 100) / 100,
      breakout,
      bollingerSqueeze: bollinger.squeeze,
      atr: Math.round(atr * 100) / 100
    }
  };
}

/**
 * Composite Rating Engine
 * Combines multiple factors with regime-based weights
 */
export function scoreComposite(data: StockData): StockScore | null {
  if (!data.history || data.history.length < 50) return null;

  const history: PriceHistory[] = data.history.map((h: any) => ({
    date: h.date,
    close: h.close,
    volume: h.volume,
    high: h.high,
    low: h.low
  }));

  const prices = history.map((h: any) => h.close);
  const volumeHistory = history.map((h: any) => h.volume);
  const rsi = calculateRSI(prices, 14);
  const sma50 = calculateMovingAverage(prices, 50);
  const sma200 = calculateMovingAverage(prices, 200);
  const volZ = calculateVolumeZScore(data.volume, volumeHistory.slice(-20));
  const atr = calculateATR(history, 14);

  // Determine market regime (Volatility + Trend)
  const relVol = atr / data.price;
  const isTrending = prices[prices.length - 1] > sma50;

  const regime = relVol > 0.04 ? 'stress' :
    (relVol < 0.02 && isTrending) ? 'bull' : 'neutral';

  let score = 0;

  // Technical (40 points) - Favor trend
  if (data.price >= sma50) score += 20;
  if (data.price >= sma200) score += 10;
  if (rsi >= 50 && rsi <= 70) score += 10;

  // Volume (20 points) - Use Z-Score
  if (volZ > 2.0) score += 20;
  else if (volZ > 1.0) score += 15;
  else if (volZ > 0) score += 10;

  // Fundamental (20 points) - Quality proxy
  if (data.pe && data.pe > 0 && data.pe < 25) score += 10;
  if (data.marketCap && data.marketCap > 1_000_000_000) score += 10;

  // Regime adjustment (20 points)
  if (regime === 'bull') score += 20;
  else if (regime === 'neutral') score += 15;
  else score += 5; // stress regime = lower score

  // Determine rating
  let rating: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
  if (score >= 70) rating = 'STRONG BUY';
  else if (score >= 50) rating = 'BUY';
  else if (score < 30) rating = 'SELL';

  // Timeframe: Medium-term for composite
  const timeframe: '1m' | '3m' = '1m';

  // Risk
  let risk: 'Low' | 'Medium' | 'High' = 'Medium';
  if (data.marketCap && data.marketCap > 10_000_000_000) risk = 'Low';
  else if (data.price < 5) risk = 'High';

  // ATR-based Stop Loss (2.5 * ATR for composite/swing)
  const stopLoss = data.price - (atr * 2.5);

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    rating,
    timeframe,
    algorithm: 'Composite Rating',
    score: Math.min(100, score),
    risk,
    stopLoss: Math.round(stopLoss * 100) / 100,
    indicators: {
      rsi: Math.round(rsi),
      volumeZScore: Math.round(volZ * 100) / 100,
      atr: Math.round(atr * 100) / 100
    }
  };
}
