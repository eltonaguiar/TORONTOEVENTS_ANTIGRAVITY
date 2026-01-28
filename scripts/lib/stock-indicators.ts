/**
 * Technical Indicators Calculator
 * Implements RSI, Moving Averages, Volume Analysis, etc.
 */

export interface PriceHistory {
  date: string;
  close: number;
  volume: number;
  high: number;
  low: number;
}

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50; // Neutral if not enough data

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? -c : 0);

  // Calculate average gain and loss
  let avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Math.round(rsi * 100) / 100;
}

export function calculateMovingAverage(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const recent = prices.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

export function calculateVolumeSurge(currentVolume: number, avgVolume: number): number {
  if (avgVolume === 0) return 0;
  return Math.round((currentVolume / avgVolume) * 100) / 100;
}

export function checkBreakout(history: PriceHistory[], period: number = 20): boolean {
  if (history.length < period) return false;

  const recent = history.slice(-period);
  const highs = recent.map(h => h.high);
  const maxHigh = Math.max(...highs);
  const currentPrice = history[history.length - 1].close;

  // Breakout if current price is near or above 20-day high
  return currentPrice >= maxHigh * 0.98;
}

export function calculateRelativeStrength(history: PriceHistory[]): number {
  if (history.length < 252) return 50; // Need ~1 year of data

  // Calculate quarterly returns
  const quarters = [
    history.slice(-63, -42),   // Q1 (3 months ago)
    history.slice(-42, -21),   // Q2 (2 months ago)
    history.slice(-21, -7),    // Q3 (1 month ago)
    history.slice(-7)           // Q4 (recent)
  ];

  const quarterlyReturns = quarters.map(q => {
    if (q.length < 2) return 0;
    const start = q[0].close;
    const end = q[q.length - 1].close;
    return start > 0 ? ((end - start) / start) * 100 : 0;
  });

  // Weighted average: 0.2, 0.2, 0.2, 0.4
  const rs =
    quarterlyReturns[0] * 0.2 +
    quarterlyReturns[1] * 0.2 +
    quarterlyReturns[2] * 0.2 +
    quarterlyReturns[3] * 0.4;

  return Math.round(rs * 100) / 100;
}

export function checkStage2Uptrend(history: PriceHistory[]): boolean {
  if (history.length < 200) return false;

  const prices = history.map(h => h.close);
  const currentPrice = prices[prices.length - 1];

  const sma50 = calculateMovingAverage(prices, 50);
  const sma200 = calculateMovingAverage(prices, 200);
  const sma10 = calculateMovingAverage(prices.slice(-10), 10);
  const sma20 = calculateMovingAverage(prices.slice(-20), 20);

  const high52Week = Math.max(...prices.slice(-252));
  const priceVsHigh = currentPrice / high52Week;

  // Stage-2 criteria:
  // 1. Price >= 50-day SMA
  // 2. Price >= 200-day SMA
  // 3. 10-day SMA >= 20-day SMA >= 50-day SMA
  // 4. Price >= 50% of 52-week high
  return (
    currentPrice >= sma50 &&
    currentPrice >= sma200 &&
    sma10 >= sma20 &&
    sma20 >= sma50 &&
    priceVsHigh >= 0.5
  );
}

export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
  if (prices.length < period) return { upper: 0, middle: 0, lower: 0, width: 0, squeeze: false };

  const recent = prices.slice(-period);
  const sma = calculateMovingAverage(recent, period);

  // Calculate standard deviation
  const variance = recent.reduce((sum, price) => {
    return sum + Math.pow(price - sma, 2);
  }, 0) / period;
  const std = Math.sqrt(variance);

  const upper = sma + (stdDev * std);
  const lower = sma - (stdDev * std);
  const width = (upper - lower) / sma; // Normalized width

  // Squeeze: width < 0.1 (10% of price)
  const squeeze = width < 0.1;

  return { upper, middle: sma, lower, width, squeeze };
}

/**
 * Calculate Average True Range (ATR)
 * Measures volatility
 */
export function calculateATR(history: PriceHistory[], period: number = 14): number {
  if (history.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const high = history[i].high;
    const low = history[i].low;
    const prevClose = history[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  // Simple average of True Ranges
  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((a, b) => a + b, 0) / period;
}

/**
 * Calculate Z-Score for a value relative to its history
 * Formula: (Value - Mean) / StdDev
 */
export function calculateZScore(value: number, history: number[]): number {
  if (history.length < 2) return 0;

  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calculate Volume Z-Score
 * Compares current volume to the distribution of past volume
 */
export function calculateVolumeZScore(currentVolume: number, volumeHistory: number[]): number {
  return calculateZScore(currentVolume, volumeHistory);
}
