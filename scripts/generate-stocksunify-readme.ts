#!/usr/bin/env tsx
/**
 * Generate Enhanced README.md for STOCKSUNIFY
 * 
 * This script generates a comprehensive README with:
 * - Daily picks organized by methodology
 * - Algorithm breakdown
 * - List of methodologies not yet automated
 */

import * as fs from 'fs';
import * as path from 'path';

interface StockPick {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  rating: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL';
  timeframe: string;
  algorithm: string;
  score: number;
  risk: string;
  indicators?: any;
}

interface DailyStocksData {
  lastUpdated: string;
  totalPicks: number;
  stocks: StockPick[];
}

function loadDailyStocks(): DailyStocksData | null {
  const dataPath = path.join(process.cwd(), 'data', 'daily-stocks.json');
  if (!fs.existsSync(dataPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading daily stocks:', error);
    return null;
  }
}

function generateMethodologySection(data: DailyStocksData): string {
  if (!data || data.stocks.length === 0) {
    return `## 📊 Daily Stock Picks

**Status:** No picks available yet. Run \`npm run stocks:generate\` to generate picks.

**Last Updated:** ${data?.lastUpdated || 'Never'}

`;
  }

  // Group picks by algorithm
  const byAlgorithm = new Map<string, StockPick[]>();
  for (const stock of data.stocks) {
    const key = stock.algorithm;
    if (!byAlgorithm.has(key)) {
      byAlgorithm.set(key, []);
    }
    byAlgorithm.get(key)!.push(stock);
  }

  // Group by timeframe within each algorithm
  const byAlgorithmAndTimeframe = new Map<string, Map<string, StockPick[]>>();
  for (const [algorithm, picks] of byAlgorithm.entries()) {
    const byTimeframe = new Map<string, StockPick[]>();
    for (const pick of picks) {
      const tf = pick.timeframe;
      if (!byTimeframe.has(tf)) {
        byTimeframe.set(tf, []);
      }
      byTimeframe.get(tf)!.push(pick);
    }
    byAlgorithmAndTimeframe.set(algorithm, byTimeframe);
  }

  let markdown = `## 📊 Daily Stock Picks

**Last Updated:** ${new Date(data.lastUpdated).toLocaleString()}  
**Total Picks:** ${data.totalPicks}  
**Data Source:** [data/daily-stocks.json](./data/daily-stocks.json)

### Summary by Rating
- **STRONG BUY:** ${data.stocks.filter(s => s.rating === 'STRONG BUY').length}
- **BUY:** ${data.stocks.filter(s => s.rating === 'BUY').length}
- **HOLD:** ${data.stocks.filter(s => s.rating === 'HOLD').length}

`;

  const lastUpdatedStr = new Date(data.lastUpdated).toLocaleString();

  // Generate sections for each algorithm
  for (const [algorithm, byTimeframe] of byAlgorithmAndTimeframe.entries()) {
    const allPicks = Array.from(byTimeframe.values()).flat();
    const strongBuys = allPicks.filter(p => p.rating === 'STRONG BUY').sort((a, b) => b.score - a.score);
    const buys = allPicks.filter(p => p.rating === 'BUY').sort((a, b) => b.score - a.score);
    
    markdown += `### ${algorithm}\n\n`;
    markdown += `**Total Picks:** ${allPicks.length}\n\n`;
    
    // Show picks by timeframe
    for (const [timeframe, picks] of byTimeframe.entries()) {
      if (picks.length > 0) {
        markdown += `#### ${timeframe.toUpperCase()} Timeframe (${picks.length} picks)\n\n`;
        markdown += `**Last updated:** ${lastUpdatedStr}\n\n`;
        
        // Show top picks
        const topPicks = picks.sort((a, b) => b.score - a.score).slice(0, 10);
        markdown += '| Symbol | Name | Score | Rating | Risk | Key Indicators |\n';
        markdown += '|--------|------|-------|--------|------|----------------|\n';
        
        for (const pick of topPicks) {
          const indicators = [];
          if (pick.indicators?.rsi) indicators.push(`RSI: ${pick.indicators.rsi}`);
          if (pick.indicators?.volumeSurge) indicators.push(`Vol: ${pick.indicators.volumeSurge}x`);
          if (pick.indicators?.breakout) indicators.push('Breakout');
          if (pick.indicators?.bollingerSqueeze) indicators.push('Bollinger Squeeze');
          if (pick.indicators?.rsRating) indicators.push(`RS: ${pick.indicators.rsRating}`);
          if (pick.indicators?.stage2Uptrend) indicators.push('Stage-2');
          
          const indicatorsStr = indicators.length > 0 ? indicators.join(', ') : 'N/A';
          markdown += `| ${pick.symbol} | ${pick.name.substring(0, 30)} | ${pick.score}/100 | ${pick.rating} | ${pick.risk} | ${indicatorsStr} |\n`;
        }
        markdown += '\n';
      }
    }
  }

  return markdown;
}

function generateNotAutomatedList(): string {
  return `## ⚠️ Methodologies Not Yet Automated

The following algorithms from the 11 stock repositories have been **identified but not yet integrated** into the automated daily pick generation:

### 1. ML Ensemble (XGBoost/Gradient Boosting)
- **Source:** Stock Spike Replicator (ML variant)
- **Status:** ❌ Not Automated
- **Features:**
  - RandomForest, GradientBoosting, XGBoost models
  - Next-day return prediction
  - Feature engineering (returns, gaps, MAs, volatility, RSI, MACD, Bollinger)
  - MSE, R², MAE metrics
- **Why Not Automated:** Requires ML model training infrastructure

### 2. Statistical Arbitrage / Pairs Trading
- **Source:** Stock Spike Replicator
- **Status:** ❌ Not Automated
- **Features:**
  - Correlated pairs detection
  - Z-score mean reversion
  - Market-neutral strategy
  - Sharpe ratio optimization
- **Why Not Automated:** Requires pairs analysis and correlation matrix

### 3. Revenue Growth (SEC XBRL Scraping)
- **Source:** mikestocks variants
- **Status:** ⚠️ Partially Automated (CAN SLIM uses RS but not XBRL)
- **Features:**
  - SEC EDGAR XBRL data extraction
  - 25%+ quarterly revenue growth filter
  - Real-time filing monitoring
- **Why Not Fully Automated:** Requires SEC EDGAR API/scraping

### 4. Institutional Accumulation Tracking
- **Source:** mikestocks variants
- **Status:** ❌ Not Automated
- **Features:**
  - Net institutional inflows/outflows
  - Quarterly ownership changes
  - Institutional flow tracking
- **Why Not Automated:** Requires institutional ownership data API

### 5. Sentiment Analysis (NLP)
- **Source:** Stock QuickPicks
- **Status:** ❌ Not Automated
- **Features:**
  - VADER sentiment analysis
  - FinBERT financial sentiment
  - News/article sentiment scoring
- **Why Not Automated:** Requires NLP libraries and news data sources

### 6. Website Prediction Tracking
- **Source:** Stock QuickPicks
- **Status:** ❌ Not Automated
- **Features:**
  - Trust score system
  - Prediction source reliability tracking
  - Accuracy tracking per source
- **Why Not Automated:** Requires web scraping infrastructure

### 7. Portfolio Optimization (Modern Portfolio Theory)
- **Source:** Stock Spike Replicator (Risk Management variant)
- **Status:** ❌ Not Automated
- **Features:**
  - Efficient Frontier calculation
  - Portfolio diversification
  - Risk-adjusted returns (Sharpe, Sortino, Calmar)
  - Position sizing (Kelly Criterion)
- **Why Not Automated:** Requires portfolio-level calculations

### 8. Market Regime Detection
- **Source:** Stock Spike Replicator (ML variant)
- **Status:** ⚠️ Partially Automated (Composite Rating has basic regime detection)
- **Features:**
  - Hidden Markov Models (HMM)
  - Regime classification (bull/bear/sideways)
  - Regime-based weight adjustments
- **Why Not Fully Automated:** Requires HMM implementation

### 9. Advanced Risk Metrics
- **Source:** Stock Spike Replicator (Risk Management variant)
- **Status:** ❌ Not Automated
- **Features:**
  - Value at Risk (VaR)
  - Expected Shortfall
  - ATR-based stop-loss/take-profit
  - Dynamic position sizing
- **Why Not Automated:** Requires risk calculation infrastructure

### 10. Backtesting with Transaction Costs
- **Source:** Multiple repositories
- **Status:** ❌ Not Automated
- **Features:**
  - Realistic backtesting
  - Slippage modeling
  - Transaction cost inclusion
  - Walk-forward analysis
- **Why Not Automated:** Requires backtesting framework

## 📋 Integration Priority

**High Priority (Most Impact):**
1. ✅ CAN SLIM Growth Screener - **DONE**
2. ✅ Technical Momentum (24h, 3d, 7d) - **DONE**
3. ✅ Composite Rating Engine - **DONE**
4. 🔄 ML Ensemble - **NEXT** (would add predictive power)
5. 🔄 Statistical Arbitrage - **NEXT** (market-neutral strategy)

**Medium Priority:**
6. Revenue Growth (SEC XBRL) - Would improve CAN SLIM accuracy
7. Sentiment Analysis - Would add catalyst detection
8. Portfolio Optimization - Would enable portfolio-level recommendations

**Low Priority (Nice to Have):**
9. Institutional Accumulation - Data lags by months
10. Website Prediction Tracking - Requires web scraping
11. Advanced Risk Metrics - More for portfolio management
12. Backtesting Framework - Validation tool, not pick generation

`;
}

function generateReadme(): string {
  const data = loadDailyStocks();
  const methodologySection = generateMethodologySection(data || { lastUpdated: '', totalPicks: 0, stocks: [] });
  const notAutomatedSection = generateNotAutomatedList();

  return `# STOCKSUNIFY 📈

**Unified Stock Analysis & Daily Picks**

This repository consolidates stock analysis data, algorithms, and daily picks from multiple AI-validated sources.

## 🌐 Live Site

**GitHub Pages:** [View Live Site](https://eltonaguiar.github.io/STOCKSUNIFY/)  
**Find Stocks Page:** [findtorontoevents.ca/findstocks](https://findtorontoevents.ca/findstocks/)

${methodologySection}

## 📚 Analysis Documents

All links point to this repository ([STOCKSUNIFY](https://github.com/eltonaguiar/STOCKSUNIFY)):

### Comprehensive Analysis
- [Stock Repository Analysis](https://github.com/eltonaguiar/STOCKSUNIFY/blob/main/STOCK_REPOSITORY_ANALYSIS.md) - Analysis of 11 stock repositories
- [Algorithm Summary](https://github.com/eltonaguiar/STOCKSUNIFY/blob/main/STOCK_ALGORITHM_SUMMARY.md) - Quick reference guide
- [Decision Matrix](https://github.com/eltonaguiar/STOCKSUNIFY/blob/main/STOCK_ALGORITHM_DECISION_MATRIX.md) - Visual algorithm selector

### AI Assessments
- [Google Gemini Analysis](https://github.com/eltonaguiar/STOCKSUNIFY/blob/main/STOCK_GOOGLEGEMINI_ANALYSIS.md) - Gemini's assessment
- [Comet Browser AI Analysis](https://github.com/eltonaguiar/STOCKSUNIFY/blob/main/STOCK_COMETBROWSERAI_ANALYSIS.md) - Comet Browser AI breakdown
- [ChatGPT Analysis](https://github.com/eltonaguiar/STOCKSUNIFY/blob/main/STOCK_CHATGPT_ANALYSIS.md) - ChatGPT code inspection

${notAutomatedSection}

## 🔧 Scripts

- [generate-daily-stocks.ts](./scripts/generate-daily-stocks.ts) - Daily stock picks generator

## 🚀 Usage

### Generate Daily Stock Picks

\`\`\`bash
npm install
npx tsx scripts/generate-daily-stocks.ts
\`\`\`

### View Data

The daily stock picks are available as JSON:
- **Local:** \`data/daily-stocks.json\`
- **Web:** \`https://eltonaguiar.github.io/STOCKSUNIFY/data/daily-stocks.json\`

## 📈 Algorithms Currently Integrated

### ✅ 1. CAN SLIM Growth Screener (Long-term: 3-12 months)
**Status:** ✅ **AUTOMATED**  
**Accuracy:** 60-70% (based on O'Neil research)  
**Source:** mikestocks repository

**Criteria:**
- RS Rating ≥ 90 (weighted 12-month momentum)
- Stage-2 Uptrend (Minervini methodology)
- Price vs 52-week high
- RSI momentum (50-70 ideal)
- Volume surge detection

**Timeframes:** 3m, 6m, 1y

### ✅ 2. Technical Momentum Screener (Short-term: 24h-1 week)
**Status:** ✅ **AUTOMATED**  
**Source:** SCREENER_PENNYSTOCK_SKYROCKET_24HOURS repositories

**Timeframes:**
- **24h:** Volume surge (40 pts), RSI extremes (30 pts), Breakout (30 pts)
- **3d:** Volume (30 pts), Breakout (30 pts), RSI momentum (25 pts), Volatility (15 pts)
- **7d:** Bollinger squeeze (30 pts), RSI extremes (25 pts), Volume (25 pts), Institutional (20 pts)

**Indicators:**
- RSI (14-day)
- Volume Surge (current vs 10-day avg)
- Breakout detection (20-day high)
- Bollinger Band Squeeze

### ✅ 3. Composite Rating Engine (Medium-term: 1-3 months)
**Status:** ✅ **AUTOMATED**  
**Source:** Stock Spike Replicator (Composite Rating variant)

**Components:**
- Technical (40 pts): Price vs SMAs, RSI
- Volume (20 pts): Volume surge analysis
- Fundamental (20 pts): PE ratio, Market cap
- Regime Adjustment (20 pts): Normal/low-vol/high-vol market conditions

## 🔗 Source Repositories

This data is synced from:
- [TORONTOEVENTS_ANTIGRAVITY](https://github.com/eltonaguiar/TORONTOEVENTS_ANTIGRAVITY) - Main repository
- [mikestocks](https://github.com/eltonaguiar/mikestocks) - CAN SLIM Growth Screener
- [Stock Spike Replicator](https://github.com/eltonaguiar/eltonsstocks-apr24_2025) - ML + Risk Management
- [Penny Stock Screener](https://github.com/eltonaguiar/SCREENER_PENNYSTOCK_SKYROCKET_24HOURS_CURSOR) - Technical Momentum

## ⚠️ Disclaimer

Stock predictions are for informational purposes only and do not constitute financial advice. Always conduct your own research and consult with a licensed financial advisor before making investment decisions.

## 📅 Auto-Update

This README is automatically updated when \`npm run stocks:sync\` is run. The daily picks section reflects the latest data from \`data/daily-stocks.json\`.

---

*Powered by 11+ AI-validated stock analysis algorithms*  
*Last README Update: ${new Date().toISOString()}*
`;
}

async function main() {
  console.log('📝 Generating enhanced README.md for STOCKSUNIFY...\n');
  
  const readmeContent = generateReadme();
  const readmePath = path.join(process.cwd(), 'STOCKSUNIFY_README.md');
  
  fs.writeFileSync(readmePath, readmeContent);
  console.log(`✅ Generated README at: ${readmePath}`);
  console.log(`📊 README includes daily picks organized by methodology`);
  console.log(`📋 README includes list of methodologies not yet automated`);
}

if (require.main === module) {
  main();
}

export { generateReadme };
