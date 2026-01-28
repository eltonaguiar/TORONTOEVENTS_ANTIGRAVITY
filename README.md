# Toronto Events 🍁
**[✨ LIVE DEMO: Click here to view the app ✨](https://eltonaguiar.github.io/TORONTOEVENTS_ANTIGRAVITY/)**

Welcome to the most curated feed of events happening in Toronto. We scrape, verify, and organize the best festivals, concerts, and meetups so you don't have to.

## Features
- **Daily Updates**: Fresh events every morning.
- **Verified Links**: We check if the event page is still active.
- **Smart Filtering**: Separate views for one-off events and multi-day festivals.
- **Clean Interface**: No ads, just events.

## How to Use
Simply browse the list above on our website. Click "View Details" to go directly to the official event page for tickets and more info.

---

## 📈 Find Stocks

**[🔗 Find Stocks Page](https://findtorontoevents.ca/STOCKS)** | **[Alternative URL](https://findtorontoevents.ca/findstocks)**

A comprehensive stock analysis tool powered by 11+ AI-validated algorithms from multiple repositories. Get daily stock picks based on proven methodologies.

### Stock Analysis Methods

**Long-Term Growth (3-12 months)**
- **CAN SLIM Growth Screener** - 60-70% accuracy
  - RS Rating ≥ 90
  - Stage-2 Uptrend detection
  - Revenue Growth ≥ 25% (SEC EDGAR data)
  - Institutional Accumulation

**Short-Term Momentum (24h - 1 week)**
- **Technical + Volume Analysis**
  - Volume Surge Detection
  - RSI Extremes
  - Breakout Patterns
  - Bollinger Band Squeeze
  - ⚠️ High Risk - Penny Stocks

**ML Portfolio Management**
- **ML Ensemble + Risk Management**
  - XGBoost/Gradient Boosting
  - Sentiment Analysis (NLP)
  - Portfolio Optimization
  - VaR, Sharpe Ratio metrics

### Daily Stock Generation

Generate daily stock picks:

```bash
npm run stocks:generate
```

This creates `data/daily-stocks.json` with picks from multiple algorithms.

### Sync to STOCKSUNIFY

Sync stock data and analysis documents to the [STOCKSUNIFY repository](https://github.com/eltonaguiar/STOCKSUNIFY):

```bash
npm run stocks:sync
```

Or run both generation and sync:

```bash
npm run stocks:full
```

### Analysis Documents

- [Stock Repository Analysis](STOCK_REPOSITORY_ANALYSIS.md) - Comprehensive analysis of 11 repositories
- [Algorithm Summary](STOCK_ALGORITHM_SUMMARY.md) - Quick reference guide
- [Google Gemini Analysis](STOCK_GOOGLEGEMINI_ANALYSIS.md) - AI assessment
- [Comet Browser AI Analysis](STOCK_COMETBROWSERAI_ANALYSIS.md) - Algorithm breakdown
- [ChatGPT Analysis](STOCK_CHATGPT_ANALYSIS.md) - Code inspection analysis
- [Decision Matrix](STOCK_ALGORITHM_DECISION_MATRIX.md) - Visual selector tool

### Source Repositories

- [STOCKSUNIFY](https://github.com/eltonaguiar/STOCKSUNIFY) - Unified stock data repository
- [mikestocks](https://github.com/eltonaguiar/mikestocks) - CAN SLIM Growth Screener
- [Stock Spike Replicator](https://github.com/eltonaguiar/eltonsstocks-apr24_2025) - ML + Risk Management
- [Penny Stock Screener](https://github.com/eltonaguiar/SCREENER_PENNYSTOCK_SKYROCKET_24HOURS_CURSOR) - Technical Momentum

**⚠️ Disclaimer:** Stock predictions are for informational purposes only and do not constitute financial advice. Always conduct your own research and consult with a licensed financial advisor before making investment decisions.

---
*Built with ❤️ for Toronto.*
<br>
[Visit the Live Site](https://eltonaguiar.github.io/TORONTOEVENTS_ANTIGRAVITY/)
