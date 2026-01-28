# TORONTOEVENTS_ANTIGRAVITY // STOCKSUNIFY Engine

[![STOCKSUNIFY CI](https://github.com/eltonaguiar/TORONTOEVENTS_ANTIGRAVITY/actions/workflows/ci.yml/badge.svg)](https://github.com/eltonaguiar/TORONTOEVENTS_ANTIGRAVITY/actions/workflows/ci.yml)

This repository contains the full source code and data for the STOCKSUNIFY V1 and V2 algorithmic stock selection engines. It serves as the primary development and data generation environment.

---

## 🚀 Core Features

### 1. STOCKSUNIFY V1 ("Classic")
- **Methodology**: A composite score based on CAN SLIM principles, technical momentum indicators, and fundamental data.
- **Output**: Generates a list of 30 stock picks daily.
- **Syncs To**: [github.com/eltonaguiar/stocksunify](https://github.com/eltonaguiar/stocksunify)

### 2. STOCKSUNIFY V2 ("Scientific")
- **Methodology**: A multi-strategy engine based on academic research and quantitative principles. It is "regime-aware" and designed to be falsifiable.
- **Strategies**:
    - **RAR**: Regime-Aware Reversion
    - **VAM**: Volatility-Adjusted Momentum
    - **LSP**: Liquidity-Shielded Penny
    - **SCS**: Scientific CAN SLIM
    - **AT**: Adversarial Trend
    - **IF**: Institutional Footprint
- **Output**: Generates a daily "Immutable Ledger" of scientific picks.
- **Syncs To**: [github.com/eltonaguiar/stocksunify2](https://github.com/eltonaguiar/stocksunify2)

### 3. The Truth Engine (Performance Verification)
- **Purpose**: Automatically verifies the performance of V2 picks after their recommended holding period has passed.
- **Process**:
    1. A GitHub Action runs every 6 hours (`.github/workflows/verify-picks.yml`).
    2. The verification engine (`verify-picks.ts`) checks for matured picks based on their unique `timeframe` (e.g., 24h, 3d, 7d).
    3. Matured picks are validated against real-market data from Yahoo Finance.
    4. **Slippage Simulation**: Entry prices include a simulated slippage penalty (high/low/close avg) to ensure realistic returns.
    5. The results are strictly recorded as **WIN** (Positive Return) or **LOSS** (Negative Return or Stop Loss Hit).
    6. All data is committed to the **Immutable Ledger**: [`data/pick-performance.json`](data/pick-performance.json).

#### 🛡️ Immutable Audit Trail
To ensure 100% intellectual honesty, every stock pick generated is:
- **Timestamped**: `pickedAt` ensures no retroactive editing.
- **Hashed**: A SHA-256 hash (`pickHash`) seals the symbol, price, and timestamp.
- **Archived**: Original raw picks are stored in `data/picks-archive/` before any price movement occurs.

**[View Live Performance Data (JSON)](data/pick-performance.json)**

---

## 🔬 Strategy Deep Dive

This table outlines the methodology, pros, cons, and current status of each primary algorithm in the V1 and V2 engines.

| Strategy | Pros | Cons | Current State | Ideal Stock Type | Holding Period |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **V2: Regime-Aware Reversion (RAR)** | Market-aware (shuts down in bear markets). Simple, robust logic (RSI mean-reversion). | Only works for stocks already in a long-term uptrend. | **Implemented**: Yes<br>**Job Setup**: Yes (Daily)<br>**Backtested**: No (Forward-tested via Truth Engine) | Quality, large-cap stocks in a confirmed uptrend experiencing a short-term pullback. | 7 Days |
| **V2: Volatility-Adjusted Momentum (VAM)** | Prioritizes smooth, low-volatility gains (high Martin Ratio). Includes YTD performance for better long-term context. | May underperform in speculative "junk-on" rallies. | **Implemented**: Yes<br>**Job Setup**: Yes (Daily)<br>**Backtested**: No (Forward-tested via Truth Engine) | Any stock with consistent, non-erratic price appreciation. | 1 Month |
| **V2: Liquidity-Shielded Penny (LSP)** | Specifically designed for high-risk stocks. "Slippage Torture Test" validates liquidity. | Inherently very high risk. Model is sensitive to execution costs. | **Implemented**: Yes<br>**Job Setup**: Yes (Daily)<br>**Backtested**: No (Forward-tested via Truth Engine) | Penny stocks (sub-$5) with high volume and catalysts. | 24 Hours |
| **V2: Scientific CAN SLIM (SCS)** | Improves on V1 CAN SLIM with a market regime filter. | Still lacks fundamental data (earnings, etc.) that the full CAN SLIM model requires. | **Implemented**: Yes<br>**Job Setup**: Yes (Daily)<br>**Backtested**: No (Forward-tested via Truth Engine) | Mid to large-cap growth stocks. | 1 Year |
| **V2: Adversarial Trend (AT)** | Volatility-normalized, making it more stable than pure price momentum. | Can be slower to react than simpler momentum strategies. | **Implemented**: Yes<br>**Job Setup**: Yes (Daily)<br>**Backtested**: No (Forward-tested via Truth Engine) | Stocks with strong, established trends in any sector. | 1 Month |
| **V2: Institutional Footprint (IF)** | Uses Volume Z-Score to detect statistically significant institutional activity. | Volume spikes can sometimes be misleading (e.g., ETF rebalancing). | **Implemented**: Yes<br>**Job Setup**: Yes (Daily)<br>**Backtested**: No (Forward-tested via Truth Engine) | Mid to large-cap stocks showing signs of accumulation. | 7 Days |
| **V1: CAN SLIM (Classic)** | Based on a historically proven methodology. | Technical-only implementation. Is not market-regime aware. | **Implemented**: Yes<br>**Job Setup**: Yes (Daily)<br>**Backtested**: No | Growth stocks, typically $10+. | 3-12 Months |
| **V1: Technical Momentum** | Multi-timeframe (24h, 3d, 7d) provides flexibility. | Can be noisy and produce false breakouts without a volatility filter. | **Implemented**: Yes<br>**Job Setup**: Yes (Daily)<br>**Backtested**: No | Any stock with short-term catalysts. High risk for penny stocks. | 24h to 7d |
| **V1: Composite Rating** | Multi-factor approach. Uses YTD performance as a long-term momentum factor. | Uses fixed, heuristic weights for its factors. Simple regime detection. | **Implemented**: Yes<br>**Job Setup**: Yes (Daily)<br>**Backtested**: No | Any stock, good for general watchlist ranking. | 1-3 Months |
| **V1: Penny Sniper** | Specifically designed for high-risk penny stocks with volume and momentum triggers. | Inherently very high risk; can produce many false signals. | **Implemented**: Yes<br>**Job Setup**: Yes (Daily)<br>**Backtested**: No | Penny stocks (<$15) with high volume and catalysts. | 24 Hours |
| **V1: Value Sleeper** | Seeks undervalued mid/large-cap companies near their 52-week lows but still in a long-term uptrend. | Requires fundamental data (PE, ROE, Debt) which can be sparse or inaccurate. | **Implemented**: Yes<br>**Job Setup**: Yes (Daily)<br>**Backtested**: No | Mid to large-cap stocks with solid fundamentals that are currently out of favor. | 3+ Months |
| **V1: Alpha Predator** | A scientific composite that combines Trend (ADX), Momentum (AO), and Structure (VCP) for a robust signal. | More complex and can be slower to react than pure momentum strategies. | **Implemented**: Yes<br>**Job Setup**: Yes (Daily)<br>**Backtested**: No | Any stock exhibiting a combination of strong trend, momentum, and price structure. | 3-7 Days |

---

## 🛠️ How to Use

### Installation
```bash
npm install
```

### Key Scripts

- **Generate V1 & V2 Picks Daily**:
  ```bash
  # Runs the full pipeline for both engines
  npm run stocks:all
  ```

- **Generate V2 Picks Only**:
  ```bash
  # Generate ledger and sync to STOCKSUNIFY2 repo
  npm run stocks:v2:full
  ```

- **Run Performance Verification Manually**:
  *Note: This runs automatically on Sundays via GitHub Actions.*
  ```bash
  # 1. Run the verification engine
  npm run stocks:v2:verify
  
  # 2. Aggregate the results for the frontend
  npm run stocks:v2:aggregate
  ```

- **Run Development Server**:
  ```bash
  npm run dev
  ```

---

## 🧪 Testing

This project uses [Vitest](https://vitest.dev/) for unit testing to ensure the quality and correctness of the core algorithmic logic. The test suite is run automatically on every push and pull request to the `main` branch via the CI workflow.

### Run Test Suite
To run all unit tests, use the following command:
```bash
npm test
```
---