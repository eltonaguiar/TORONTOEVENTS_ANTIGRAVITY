/**
 * Stock Universe Configuration
 * Organized by category for better algorithm targeting
 */

// Large Cap Growth (Current - for CAN SLIM, Momentum, Composite)
export const LARGE_CAP_GROWTH = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
    "META", "TSLA", "NFLX", "AMD", "INTC",
    "CRM", "ADBE", "PYPL", "NOW", "SNOW", "PLTR"
];

// Large Cap Value & Financials (for Value Sleeper, Composite)
export const LARGE_CAP_VALUE = [
    "JPM", "BAC", "GS", "MS", "WFC", "C", "AXP", // Financials
    "V", "MA",                  // Payments
    "JNJ", "PFE", "UNH", "ABBV", "MRK", "BMY", "LLY", // Healthcare
    "XOM", "CVX", "SLB", "COP", "EOG",        // Energy
    "WMT", "TGT", "HD", "COST", "LOW", "DG", // Retail
    "NKE", "SBUX", "MCD", "YUM",              // Consumer
    "CAT", "MMM", "GE", "DE", "HON", "RTX", "LMT", // Industrials/Defense
    "T", "VZ", "TMUS",                  // Telecom
    "DUK", "SO", "NEE", "AEP", "D",         // Utilities (dividend value)
    "PG", "KO", "PEP", "PM", "MO", "CL", "KMB", // Consumer Staples
];

// Mid Cap Value (for Value Sleeper - near 52w lows, good fundamentals)
export const MID_CAP_VALUE = [
    "ALLY", "KEY", "CF", "MOS", "AA", "CLF", "X", "APA", "DVN", "MRO", "HAL",
    "BAX", "VTRS", "F", "GM", "KHC", "K", "CAG", "GIS", "CPB", // Food
    "HPE", "HPQ", "STX", "WDC", // Legacy Tech
    "LUV", "UAL", "DAL", "AAL", // Airlines
    "CCL", "RCL", "NCLH", // Cruise Lines
    "MGM", "LVS", "WYNN", // Casinos
];

// Sector ETFs (New for V2.1 - Capture Sector Rotation)
export const SECTOR_ETFS = [
    "XLE", "XLF", "XLK", "XLV", "XLY", "XLP", "XLI", "XLU", "XLB", "XLRE", "XLC", // SPDR Sectors
    "SMH", "XBI", "KRE", "XOP", "GDX", "JETS", "TAN", "URA", // Industry specific
    "TQQQ", "SQQQ", "SOXL", "LABU", // Leveraged (High volatility)
];

// Small Cap/Microcap with Liquidity (for Penny Sniper)
// Criteria: $0.50-$15 price, >500k avg volume
export const PENNY_STOCKS_LIQUID = [
    // $3-$15 range (lower risk microcaps)
    "BBBY", "SUNW", "PLUG", "CLSK", "RIOT", "MARA", "SOS", "EBON",
    "GNUS", "NNDM", "IDEX", "WKHS", "RIDE", "XPEV", "NIO", "LCID", "SOFI", "OPEN", "DKNG", "HOOD",

    // $1-$5 range (higher risk)
    "SNDL", "TLRY", "CGC", "ACB", "CRON", "OCGN", "BNGO", "ZOM", "SENS",
    "GEVO", "FCEL", "NCTY", "MULN", "CEI", "BBIG",

    // Meme stock universe (high volume)
    "AMC", "GME", "BB", "NAKD", "KOSS",
];

// Crypto-exposed stocks (volatile, good for momentum)
export const CRYPTO_EXPOSED = [
    "COIN", "MSTR", "MARA", "RIOT", "CLSK", "HUT", "BITF", "HIVE",
];

// REITs (for Value Sleeper - dividend yield, near lows)
export const REITS = [
    "O", "VNQ", "SPG", "PLD", "AMT", "CCI", "VICI", "EQIX", "PSA", "DLR",
];

// Combine into master universe
export const STOCK_UNIVERSE_FULL = [
    ...LARGE_CAP_GROWTH,
    ...LARGE_CAP_VALUE,
    ...MID_CAP_VALUE,
    ...SECTOR_ETFS,
    ...PENNY_STOCKS_LIQUID,
    ...CRYPTO_EXPOSED,
    ...REITS,
];

// Remove duplicates
export const STOCK_UNIVERSE = Array.from(new Set(STOCK_UNIVERSE_FULL));

// Export categorized lists for targeted screening
export const UNIVERSE_BY_STRATEGY = {
    "CAN SLIM": [...LARGE_CAP_GROWTH, ...MID_CAP_VALUE],
    "Technical Momentum": STOCK_UNIVERSE, // All stocks + ETFs
    "Composite Rating": [...LARGE_CAP_GROWTH, ...LARGE_CAP_VALUE, ...MID_CAP_VALUE, ...SECTOR_ETFS],
    "Penny Sniper": PENNY_STOCKS_LIQUID,
    "Value Sleeper": [...LARGE_CAP_VALUE, ...MID_CAP_VALUE, ...REITS],
    "Alpha Predator": [...LARGE_CAP_GROWTH, ...LARGE_CAP_VALUE, ...MID_CAP_VALUE, ...SECTOR_ETFS],
};

/**
 * Universe Statistics:
 * - Large Cap Growth: ~16 stocks
 * - Large Cap Value: ~40 stocks
 * - Mid Cap Value: ~30 stocks
 * - Sector ETFs: ~18 ETFs
 * - Penny Stocks: ~40 stocks
 * - Crypto-Exposed: ~8 stocks
 * - REITs: ~10 stocks
 * 
 * Total Unique: ~160 stocks (after deduplication)

 * 
 * Expected Pick Distribution:
 * - Technical Momentum: 15-20 (from full universe)
 * - Alpha Predator: 12-15 (large/mid caps)
 * - CAN SLIM: 5-8 (growth stocks)
 * - Composite: 5-8 (quality stocks)
 * - Penny Sniper: 3-7 (liquid microcaps with setups)
 * - Value Sleeper: 2-5 (value stocks near lows)
 * 
 * Target: 42-63 daily picks (up from 30)
 */
