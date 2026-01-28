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
    "JPM", "BAC", "GS", "MS",  // Financials
    "V", "MA",                  // Payments
    "JNJ", "PFE", "UNH", "ABBV", // Healthcare
    "XOM", "CVX", "SLB",        // Energy
    "WMT", "TGT", "HD",         // Retail
    "NKE", "SBUX",              // Consumer
    "CAT", "MMM", "GE",         // Industrials
    "T", "VZ",                  // Telecom
    "DUK", "SO", "NEE",         // Utilities (dividend value)
    "PG", "KO", "PEP",          // Consumer Staples
];

// Mid Cap Value (for Value Sleeper - near 52w lows, good fundamentals)
export const MID_CAP_VALUE = [
    "ALLY",  // Ally Financial (Auto lending, low PE)
    "KEY",   // KeyCorp (Regional bank)
    "CF",    // CF Industries (Fertilizer)
    "MOS",   // Mosaic (Agriculture)
    "AA",    // Alcoa (Aluminum - cyclical value)
    "CLF",   // Cleveland-Cliffs (Steel)
    "X",     // US Steel
    "APA",   // APA Corp (Oil & Gas)
    "DVN",   // Devon Energy
    "MRO",   // Marathon Oil
    "HAL",   // Halliburton
    "BAX",   // Baxter (Medical devices)
    "VTRS",  // Viatris (Generic pharma)
    "F",     // Ford (Auto, dividend)
    "GM",    // General Motors
];

// Small Cap/Microcap with Liquidity (for Penny Sniper)
// Criteria: $0.50-$15 price, >500k avg volume
export const PENNY_STOCKS_LIQUID = [
    // $3-$15 range (lower risk microcaps)
    "BBBY",  // Bed Bath & Beyond (if still trading)
    "SUNW",  // Sunworks (Solar)
    "PLUG",  // Plug Power (Hydrogen - if drops to range)
    "CLSK",  // CleanSpark (Bitcoin mining)
    "RIOT",  // Riot Platforms (Bitcoin)
    "MARA",  // Marathon Digital (Bitcoin)
    "SOS",   // SOS Limited (Crypto/commodity)
    "EBON",  // Ebang International (Crypto)
    "GNUS",  // Genius Brands
    "NNDM",  // Nano Dimension (3D printing)
    "IDEX",  // Ideanomics
    "WKHS",  // Workhorse (EV)
    "RIDE",  // Lordstown Motors (EV)
    "XPEV",  // XPeng (Chinese EV - if drops)
    "NIO",   // NIO (Chinese EV - if drops)

    // $1-$5 range (higher risk)
    "SNDL",  // Sundial Growers (Cannabis)
    "TLRY",  // Tilray (Cannabis)
    "CGC",   // Canopy Growth (Cannabis)
    "ACB",   // Aurora Cannabis
    "CRON",  // Cronos Group (Cannabis)
    "OCGN", // Ocugen (Biotech)
    "BNGO", // Bionano Genomics
    "ZOM",  // Zomedica (Animal health)
    "SENS", // Senseonics (Medical devices)
    "GEVO", // Gevo (Renewable fuels)
    "FCEL", // FuelCell Energy
    "NCTY", // The9 Limited

    // Meme stock universe (high volume)
    "AMC",  // AMC Entertainment
    "GME",  // GameStop (if drops to range)
    "BB",   // BlackBerry
    "NAKD", // Naked Brand Group
    "KOSS", // Koss Corporation
];

// Crypto-exposed stocks (volatile, good for momentum)
export const CRYPTO_EXPOSED = [
    "COIN", // Coinbase
    "MSTR", // MicroStrategy (Bitcoin treasury)
    "MARA", // Marathon Digital
    "RIOT", // Riot Platforms
    "CLSK", // CleanSpark
    "HUT",  // Hut 8 Mining
];

// REITs (for Value Sleeper - dividend yield, near lows)
export const REITS = [
    "O",    // Realty Income
    "VNQ",  // Vanguard Real Estate ETF
    "SPG",  // Simon Property Group
    "PLD",  // Prologis
    "AMT",  // American Tower
    "CCI",  // Crown Castle
];

// Combine into master universe
export const STOCK_UNIVERSE_FULL = [
    ...LARGE_CAP_GROWTH,
    ...LARGE_CAP_VALUE,
    ...MID_CAP_VALUE,
    ...PENNY_STOCKS_LIQUID,
    ...CRYPTO_EXPOSED,
    ...REITS,
];

// Remove duplicates
export const STOCK_UNIVERSE = Array.from(new Set(STOCK_UNIVERSE_FULL));

// Export categorized lists for targeted screening
export const UNIVERSE_BY_STRATEGY = {
    "CAN SLIM": [...LARGE_CAP_GROWTH, ...MID_CAP_VALUE],
    "Technical Momentum": STOCK_UNIVERSE, // All stocks
    "Composite Rating": [...LARGE_CAP_GROWTH, ...LARGE_CAP_VALUE, ...MID_CAP_VALUE],
    "Penny Sniper": PENNY_STOCKS_LIQUID,
    "Value Sleeper": [...LARGE_CAP_VALUE, ...MID_CAP_VALUE, ...REITS],
    "Alpha Predator": [...LARGE_CAP_GROWTH, ...LARGE_CAP_VALUE, ...MID_CAP_VALUE],
};

/**
 * Universe Statistics:
 * - Large Cap Growth: 16 stocks
 * - Large Cap Value: 27 stocks
 * - Mid Cap Value: 15 stocks
 * - Penny Stocks: 33 stocks
 * - Crypto-Exposed: 6 stocks
 * - REITs: 6 stocks
 * 
 * Total Unique: ~100 stocks (after deduplication)
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
