/**
 * Stock Data Fetcher
 * Fetches real stock data from Yahoo Finance API
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
  high52Week?: number;
  low52Week?: number;
  history?: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

export async function fetchStockData(symbol: string): Promise<StockData | null> {
  try {
    // Use Yahoo Finance API (free, no key required)
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`;
    const infoUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryProfile,financialData,defaultKeyStatistics`;

    const [quoteResponse, infoResponse] = await Promise.all([
      fetch(quoteUrl),
      fetch(infoUrl).catch(() => null) // Info is optional
    ]);

    if (!quoteResponse.ok) {
      console.warn(`⚠️  Failed to fetch data for ${symbol}: ${quoteResponse.status}`);
      return null;
    }

    const quoteData = await quoteResponse.json();
    const result = quoteData.chart?.result?.[0];

    if (!result) {
      return null;
    }

    const meta = result.meta || {};
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const volumes = result.indicators?.quote?.[0]?.volume || [];
    const highs = result.indicators?.quote?.[0]?.high || [];
    const lows = result.indicators?.quote?.[0]?.low || [];
    const opens = result.indicators?.quote?.[0]?.open || [];

    const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
    const previousClose = meta.previousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    // Calculate average volume (last 50 days)
    const recentVolumes = volumes.slice(-50).filter((v: number) => v > 0);
    const avgVolume = recentVolumes.length > 0
      ? recentVolumes.reduce((a: number, b: number) => a + b, 0) / recentVolumes.length
      : meta.regularMarketVolume || 0;

    // Build history
    const history = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: opens[i] || 0,
      high: highs[i] || 0,
      low: lows[i] || 0,
      close: closes[i] || 0,
      volume: volumes[i] || 0
    })).filter((h: any) => h.close > 0);

    // Get additional info if available
    let marketCap, pe, high52Week, low52Week;
    if (infoResponse?.ok) {
      try {
        const infoData = await infoResponse.json();
        const summary = infoData.quoteSummary?.result?.[0];
        if (summary) {
          marketCap = summary.summaryProfile?.marketCap || summary.defaultKeyStatistics?.marketCap?.raw;
          pe = summary.defaultKeyStatistics?.trailingPE?.raw;
          high52Week = summary.defaultKeyStatistics?.fiftyTwoWeekHigh?.raw;
          low52Week = summary.defaultKeyStatistics?.fiftyTwoWeekLow?.raw;
        }
      } catch (e) {
        // Ignore info parsing errors
      }
    }

    return {
      symbol: symbol.toUpperCase(),
      name: meta.longName || meta.shortName || symbol,
      price: currentPrice,
      change,
      changePercent,
      volume: meta.regularMarketVolume || 0,
      avgVolume,
      marketCap,
      pe,
      high52Week,
      low52Week,
      history
    };
  } catch (error) {
    console.error(`❌ Error fetching ${symbol}:`, error);
    return null;
  }
}

export async function fetchMultipleStocks(symbols: string[]): Promise<StockData[]> {
  const results: StockData[] = [];

  // Fetch in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(symbol => fetchStockData(symbol))
    );

    results.push(...batchResults.filter((r): r is StockData => r !== null));

    // Small delay between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}
