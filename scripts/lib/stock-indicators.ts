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

  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));

  // Calculate average gain and loss
  let avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return Math.round(rsi * 100) / 100;
}

export function calculateMovingAverage(
  prices: number[],
  period: number,
): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const recent = prices.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

export function calculateVolumeSurge(
  currentVolume: number,
  avgVolume: number,
): number {
  if (avgVolume === 0) return 0;
  return Math.round((currentVolume / avgVolume) * 100) / 100;
}

export function checkBreakout(
  history: PriceHistory[],
  period: number = 20,
): boolean {
  if (history.length < period) return false;

  const recent = history.slice(-period);
  const highs = recent.map((h) => h.high);
  const maxHigh = Math.max(...highs);
  const currentPrice = history[history.length - 1].close;

  // Breakout if current price is near or above 20-day high
  return currentPrice >= maxHigh * 0.98;
}

export function calculateRelativeStrength(history: PriceHistory[]): number {
  if (history.length < 252) return 50; // Need ~1 year of data

  // Calculate quarterly returns
  const quarters = [
    history.slice(-63, -42), // Q1 (3 months ago)
    history.slice(-42, -21), // Q2 (2 months ago)
    history.slice(-21, -7), // Q3 (1 month ago)
    history.slice(-7), // Q4 (recent)
  ];

  const quarterlyReturns = quarters.map((q) => {
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

  const prices = history.map((h) => h.close);
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

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2,
) {
  if (prices.length < period)
    return { upper: 0, middle: 0, lower: 0, width: 0, squeeze: false };

  const recent = prices.slice(-period);
  const sma = calculateMovingAverage(recent, period);

  // Calculate standard deviation
  const variance =
    recent.reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2);
    }, 0) / period;
  const std = Math.sqrt(variance);

  const upper = sma + stdDev * std;
  const lower = sma - stdDev * std;
  const width = (upper - lower) / sma; // Normalized width

  // Squeeze: width < 0.1 (10% of price)
  const squeeze = width < 0.1;

  return { upper, middle: sma, lower, width, squeeze };
}

/**
 * Calculate Average True Range (ATR)
 * Measures volatility
 */
export function calculateATR(
  history: PriceHistory[],
  period: number = 14,
): number {
  if (history.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const high = history[i].high;
    const low = history[i].low;
    const prevClose = history[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose),
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
  const variance =
    history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calculate Volume Z-Score
 * Compares current volume to the distribution of past volume
 */
export function calculateVolumeZScore(
  currentVolume: number,
  volumeHistory: number[],
): number {
  return calculateZScore(currentVolume, volumeHistory);
}

/**
 * Calculate Year-to-Date (YTD) performance.
 */
export function calculateYTDPerformance(
  history: PriceHistory[],
  currentPrice: number,
): number {
  if (history.length === 0) return 0;

  const currentYear = parseInt(
    history[history.length - 1].date.split("-")[0],
    10,
  );
  const firstDayOfYear = history.find(
    (h) => parseInt(h.date.split("-")[0], 10) === currentYear,
  );

  if (!firstDayOfYear) return 0;

  const startPrice = firstDayOfYear.close;
  if (startPrice === 0) return 0;

  return ((currentPrice - startPrice) / startPrice) * 100;
}

/**
 * Calculate Month-to-Date (MTD) performance.
 */
export function calculateMTDPerformance(
  history: PriceHistory[],
  currentPrice: number,
): number {
  if (history.length === 0) return 0;

  const lastDayDateParts = history[history.length - 1].date.split("-");
  const currentYear = parseInt(lastDayDateParts[0], 10);
  const currentMonth = parseInt(lastDayDateParts[1], 10);

  const firstDayOfMonth = history.find((h) => {
    const dParts = h.date.split("-");
    return (
      parseInt(dParts[0], 10) === currentYear &&
      parseInt(dParts[1], 10) === currentMonth
    );
  });

  if (!firstDayOfMonth) return 0;

  const startPrice = firstDayOfMonth.close;
  if (startPrice === 0) return 0;

  return ((currentPrice - startPrice) / startPrice) * 100;
}

/**
 * Calculate VWAP (Volume Weighted Average Price)
 * Anchored to the start of the provided history window.
 */
export function calculateVWAP(history: PriceHistory[]): number {
  if (history.length === 0) return 0;

  let cumulativePV = 0;
  let cumulativeVol = 0;

  for (const day of history) {
    const typicalPrice = (day.high + day.low + day.close) / 3;
    cumulativePV += typicalPrice * day.volume;
    cumulativeVol += day.volume;
  }

  return cumulativeVol === 0 ? 0 : cumulativePV / cumulativeVol;
}

/**
 * Check for Volatility Contraction Pattern (VCP - Minervini style)
 * Logic: Volatility (measured by high-low range or StdDev) should decrease
 * as the stock consolidates.
 */
export function checkVCP(history: PriceHistory[]): boolean {
  if (history.length < 60) return false;

  // Split last 60 days into 3 contraction periods (20d, 20d, 20d)
  const p1 = history.slice(-20); // Most recent
  const p2 = history.slice(-40, -20); // Middle
  const p3 = history.slice(-60, -40); // Oldest

  const getVolatility = (subset: PriceHistory[]) => {
    const rangePcts = subset.map((d) => (d.high - d.low) / d.low);
    // Return average daily range %
    return rangePcts.reduce((a, b) => a + b, 0) / subset.length;
  };

  const v1 = getVolatility(p1);
  const v2 = getVolatility(p2);
  const v3 = getVolatility(p3);

  // Strict VCP: Volatility must contract (v1 < v2 < v3) OR
  // Recent volatility must be extremely tight (e.g. < 2%)
  const isContracting = v1 < v2 && v2 < v3;
  const isTight = v1 < 0.02;

  return isContracting || isTight;
}

/**
 * Calculate Average Directional Index (ADX)
 * Measures trend strength (0-100). > 25 usually indicates a strong trend.
 * Simplified implementation using 14 periods.
 */
export function calculateADX(history: PriceHistory[], period: number = 14): number {
  if (history.length < period * 2) return 0;

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < history.length; i++) {
    const high = history[i].high;
    const low = history[i].low;
    const prevClose = history[i - 1].close;
    const prevHigh = history[i - 1].high;
    const prevLow = history[i - 1].low;

    const currentTR = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    tr.push(currentTR);

    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    if (upMove > downMove && upMove > 0) plusDM.push(upMove);
    else plusDM.push(0);

    if (downMove > upMove && downMove > 0) minusDM.push(downMove);
    else minusDM.push(0);
  }

  // Smooth (Wilder's Smoothing) - Simple sum for first, then smooth
  // First period sum
  let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dxList: number[] = [];

  // Calculate subsequent smoothed values
  for (let i = period; i < tr.length; i++) {
    smoothTR = smoothTR - (smoothTR / period) + tr[i];
    smoothPlusDM = smoothPlusDM - (smoothPlusDM / period) + plusDM[i];
    smoothMinusDM = smoothMinusDM - (smoothMinusDM / period) + minusDM[i];

    const diPlus = (smoothPlusDM / smoothTR) * 100;
    const diMinus = (smoothMinusDM / smoothTR) * 100;

    if (diPlus + diMinus === 0) {
      dxList.push(0);
    } else {
      const dx = (Math.abs(diPlus - diMinus) / (diPlus + diMinus)) * 100;
      dxList.push(dx);
    }
  }

  // Average DX for ADX (usually over period)
  if (dxList.length < period) return 0;

  // Return the last ADX value (smoothed DX)
  // Typically ADX is also smoothed DX
  // First ADX = avg of first 'period' DX values
  // Next ADX = (Prior ADX * (period - 1) + Current DX) / period

  let adx = dxList.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < dxList.length; i++) {
    adx = (adx * (period - 1) + dxList[i]) / period;
  }

  return Math.round(adx * 100) / 100;
}

/**
 * Calculate Awesome Oscillator (AO)
 * AO = SMA(Median Price, 5) - SMA(Median Price, 34)
 */
export function calculateAwesomeOscillator(history: PriceHistory[]): number {
  if (history.length < 35) return 0;

  const medianPrices = history.map(h => (h.high + h.low) / 2);

  const sma5 = calculateMovingAverage(medianPrices, 5);
  const sma34 = calculateMovingAverage(medianPrices, 34);

  return sma5 - sma34;
}
