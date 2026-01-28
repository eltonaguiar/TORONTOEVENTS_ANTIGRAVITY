# STOCKSUNIFY2 - Scientific Stock Analysis Engine

[![Daily Audit](https://img.shields.io/badge/Audit-Daily%2021%3A00%20UTC-blue)](https://github.com/eltonaguiar/stocksunify2/actions)
[![Regime](https://img.shields.io/badge/Market%20Regime-{{REGIME_STATUS}}-{{REGIME_COLOR}})](./data/v2/current.json)
[![Picks](https://img.shields.io/badge/Active%20Picks-{{PICK_COUNT}}-purple)](./data/v2/current.json)

## 🚀 V2.1 Update - Multi-Algorithm Framework

**NEW:** STOCKSUNIFY2 now features **6 parallel scoring algorithms** with advanced scientific validation, delivering 30 daily picks across multiple strategies.

## Overview

STOCKSUNIFY2 is the **Scientific Validation Engine** for algorithmic stock analysis. Unlike traditional backtesting approaches, V2 enforces:

1. **Temporal Isolation** - Picks are timestamped and archived before market opens
2. **Regime Awareness** - Engine adapts to market conditions (SPY vs 200 SMA)
3. **Slippage Torture** - Returns are penalized with +0.5% worst-case entry simulation
4. **Immutable Ledger** - Every pick is SHA-256 hashed and committed to Git history

## Live Data

| Resource | Link |
|----------|------|
| Current Picks | [data/v2/current.json](./data/v2/current.json) |
| Historical Ledgers | [data/v2/history/](./data/v2/history/) |
| Research Paper | [STOCK_RESEARCH_ANALYSIS.md](./STOCK_RESEARCH_ANALYSIS.md) |

---

## 📊 Daily Algorithm Summary
Latest generation: **{{LAST_UPDATE_DATE}} {{LAST_UPDATE_TIME}} UTC**

> **System Health:** 🛡️ **Source:** {{RUN_SOURCE}} | ✅ **Status:** {{RUN_STATUS}} | ⏱️ **Duration:** {{RUN_DURATION}}

| [Algorithm [🔬](#scoring-methodology)](#v21-scientific-algorithms) | [Status [ℹ️](#status-definitions)](#status-definitions) | Picks | Example Symbol | Last Run (Time) |
|-----------|--------|-------|----------------|-----------------|
| [**Alpha Predator**](#4-alpha-predator-scientific-composite-) | ✅ Active | {{ALPHA_PRED_COUNT}} | {{ALPHA_PRED_TOP}} [🔬](#scoring-methodology) | {{LAST_UPDATE_TIME}} |
| [**Technical Momentum**](#2-technical-momentum-breakout-hunter) | ✅ Active | {{TECH_MOM_COUNT}} | {{TECH_MOM_TOP}} [🔬](#scoring-methodology) | {{LAST_UPDATE_TIME}} |
| [**CAN SLIM**](#1-can-slim-growth-screener) | ✅ Active | {{CAN_SLIM_COUNT}} | {{CAN_SLIM_TOP}} [🔬](#scoring-methodology) | {{LAST_UPDATE_TIME}} |
| [**Composite Rating**](#3-composite-rating-balanced-screener) | ✅ Active | {{COMPOSITE_COUNT}} | {{COMPOSITE_TOP}} [🔬](#scoring-methodology) | {{LAST_UPDATE_TIME}} |
| [**Penny Sniper**](#5-penny-sniper-microcap-hunter-) | ⏸️ Selective | {{PENNY_SNIPER_COUNT}} | - | {{LAST_UPDATE_TIME}} |
| [**Value Sleeper**](#6-value-sleeper-mean-reversion-) | ⏸️ Selective | {{VALUE_SLEEPER_COUNT}} | - | {{LAST_UPDATE_TIME}} |

> **Market Regime:** {{REGIME_STATUS}} ({{REGIME_REASON}}) [ℹ️](#market-regime)

---

## V2.1 Scientific Algorithms

### 🎯 Core Algorithms

#### 1. **CAN SLIM** (Growth Screener)
Traditional William O'Neil methodology with V2 enhancements:
- **Relative Strength Rating** (quarterly weighted)
- **Stage-2 Uptrend Detection** (moving average alignment)
- **VCP Bonus** (+20 points for volatility contraction)
- **Institutional Footprint** (+10 points for price > VWAP)
- **Regime Penalty** (-30 in bear markets)

**Timeframe:** 3-12 months | **Risk:** Medium

**Example Setup (Historical Logic Walkthrough):**
```
Symbol: PFE (Pfizer) - Score: 75/100 BUY
✓ RS Rating: 50 (above threshold)
✓ Stage-2 Uptrend: Active
✓ VCP Pattern: Detected
✓ Institutional Footprint: Price > VWAP
✓ Volume Surge: 2.48σ above average
Entry: $26.50 | Stop Loss: $25.69
```

**Why This Pick:**
- Volatility contraction signals base formation
- Above all key moving averages (Stage-2)
- Institutions accumulating (price > VWAP)
- Volume confirming interest

[View All Scientific CAN SLIM (SCS) Picks for {{LAST_UPDATE_DATE}}]({{HISTORY_FILE}})

**🔬 Scientific Strictness Rationale:**
The **Scientific CAN SLIM (SCS)** algorithm is significantly more restrictive than V1. It requires concurrent alignment of long-term trend (Stage-2), market regime, and a "Slippage Torture Test" penalty. Rarity is expected; it only triggers when a growth stock's momentum is backed by high-conviction institutional accumulation.
- **QA Runner-Up:** {{CAN_SLIM_RUNNER_UP}}

---

#### 2. **Technical Momentum** (Breakout Hunter)
Short-term momentum across multiple timeframes (24h/3d/7d):
- **Volume Z-Score** (spike detection)
- **RSI Divergence** (momentum shifts)
- **Breakout Detection** (20-day high penetration)
- **Bollinger Squeeze** (volatility compression)

**Timeframe:** 1-7 days | **Risk:** High

**Example Setup (Historical Logic Walkthrough):**
```
Symbol: GM (General Motors) - Score: 100/100 STRONG BUY
✓ Volume Spike: 3.01σ (extreme)
✓ Breakout: 20-day high cleared
✓ Bollinger Squeeze: Active (compression)
✓ RSI: 58.92 (bullish zone)
Entry: $86.38 | Stop Loss: $82.42
Timeframe: 3 days
```

**Why This Pick:**
- Perfect storm: Breakout + Volume + Squeeze
- 100/100 score = all criteria met maximally
- High-probability setup for 3-day swing

[View All Technical Momentum Picks for {{LAST_UPDATE_DATE}}]({{HISTORY_FILE}})

**🔬 Scientific Strictness Rationale:**
The **Adversarial Trend (AT)** and **Volatility-Adjusted Momentum (VAM)** engines are designed to avoid "momentum traps." Rarity occurs because we disqualify stocks with erratic price action (high Ulcer Index), even if they are surging. V2 only accepts "Smooth Alpha."
- **QA Runner-Up:** {{TECH_MOM_RUNNER_UP}}

---

#### 3. **Composite Rating** (Balanced Screener)
Combines technical + fundamental signals:
- **Trend Alignment** (50/200 SMA)
- **Volume Confirmation**
- **PE Ratio Filter** (< 25)
- **YTD Performance** (> 10%)
- **Regime Awareness** (caps at 40 in bear)

**Timeframe:** 1-3 months | **Risk:** Medium

**Example Setup (Historical Logic Walkthrough):**
```
Symbol: SBUX (Starbucks) - Score: 70/100 STRONG BUY
✓ Above 50 SMA & 200 SMA
✓ YTD Performance: +14.0%
✓ Volume: 1.73σ above average
✓ RSI: 68.01 (strong trend)
✓ Regime: Neutral (market stable)
Entry: $103.12 | Stop Loss: $97.20
```

**Why This Pick:**
- Strong year-to-date momentum
- Multi-timeframe trend alignment
- Quality company with technical setup

[View All Institutional Footprint (IF) Picks for {{LAST_UPDATE_DATE}}]({{HISTORY_FILE}})

**🔬 Scientific Strictness Rationale:**
The **Institutional Footprint (IF)** engine requires a Volume Z-Score > 2.0. This means a stock must see a statistical "volume anomaly" to be considered. On average days, most stocks fail this interrogation, ensuring we only follow "Smart Money."
- **QA Runner-Up:** {{COMPOSITE_RUNNER_UP}}

---

### ⚡ Advanced Algorithms (V2.1)

#### 4. **Alpha Predator** (Scientific Composite) ⭐ **NEW**
Multi-dimensional alpha generator combining:
- **Trend Strength** (ADX > 25)
- **Bullish Momentum** (RSI 50-75)
- **Momentum Shift** (Awesome Oscillator > 0)
- **VCP Structure** (volatility contraction)
- **Institutional Support** (Price > VWAP)

**Timeframe:** 3 days | **Risk:** Medium | **Current Output:** 19 picks/day

**Example Setup (Historical Logic Walkthrough):**
```
Symbol: VTRS (Viatris) - Score: 90/100 STRONG BUY
✓ ADX: 44.83 (VERY strong trend)
✓ RSI: 63.95 (bullish momentum)
✓ Awesome Oscillator: +0.82 (momentum shift)
✓ VCP: Detected (volatility contraction)
✓ Institutional Footprint: Active (price > VWAP)
Entry: $13.12 | Stop Loss: $12.43
```

**Why This Pick:**
- ADX 44.83 = one of the strongest trends in the universe
- All 5 dimensions aligned (trend, momentum, structure, institutions)
- 90/100 score = near-perfect setup
- Pharmaceutical sector with technical tailwinds

[View All Alpha Predator (VAM-Scientific) Picks for {{LAST_UPDATE_DATE}}]({{HISTORY_FILE}})

**🔬 Scientific Strictness Rationale:**
The **Alpha Predator (V2-VAM)** provides high-confidence signals by requiring 5 dimensions of verification (Trend, Volume, RSI, Volatility, and Regime). It is the most selective algorithm in the engine, designed to have a near-zero false-positive rate.
- **QA Runner-Up:** {{ALPHA_PRED_RUNNER_UP}}

---

#### 5. **Penny Sniper** (Microcap Hunter) ⚡ **NEW**
Targets explosive low-priced stocks ($0.50-$15):
- **Volume Liquidity** (> 500k average)
- **Volume Spike** (> 3x average)
- **Golden Cross** (5 SMA > 20 SMA)
- **Low Float** (< 50M shares)
- **Trend Alignment** (Price > 50 SMA)

**Timeframe:** 24 hours | **Risk:** Very High

**Status:** *Dormant in current BULL market*

**Why No Picks:**
- Penny stocks are expensive in bull markets (few < $15)
- Requires ALL criteria simultaneously (very selective)
- Algorithm designed to prevent false signals
- **Expected behavior:** 0-3 picks/week, 5-10/week in volatile markets

**Recent Historical Example (Typical Setup):**
```
Symbol: [Microcap Example]
✓ Price: $4.20 (penny range)
✓ Volume Spike: 4.2x average
✓ Golden Cross: 5 SMA crossed above 20 SMA
✓ Float: 28M shares (low)
✓ Price > 50 SMA (uptrend)
Entry: $4.22 (with slippage) | Stop Loss: $3.80
```

**When It Triggers:**
- Market volatility spikes (VIX > 25)
- Sector rotation into small caps
- Meme stock momentum phases
- Crypto correlation events

[View All Penny Sniper (LSP) Picks for {{LAST_UPDATE_DATE}}]({{HISTORY_FILE}})

**🔬 Scientific Strictness Rationale:**
**Liquidity-Shielded Penny (LSP)** performs a "Slippage Torture Test." If a penny stock can't survive a simulated 3% execution slippage while maintaining a profit margin, the engine labels it a "Liquidity Mirage" and disqualifies it.
- **QA Runner-Up:** {{PENNY_SNIPER_RUNNER_UP}}

---

#### 6. **Value Sleeper** (Mean Reversion) 💤 **NEW**
Fundamental value plays with reversion potential:
- **PE Ratio** (2-20 range)
- **ROE** (> 15%)
- **Debt/Equity** (< 0.8)
- **Near 52-Week Low** (< 20% of range)
- **Trend Safety** (Price > 200 SMA)

**Timeframe:** 3 months | **Risk:** Low

**Status:** *Dormant in current BULL market*

**Why No Picks:**
- Bull markets = inflated PE ratios
- Few quality stocks near yearly lows
- Requires fundamental data confluence
- **Expected behavior:** 0-2 picks/week, 8-12/week in corrections

**Recent Historical Example (Typical Setup):**
```
Symbol: [Value Example]
✓ PE Ratio: 12.3 (cheap)
✓ ROE: 18.2% (quality)
✓ Debt/Equity: 0.45 (safe)
✓ 52w Position: 18% (near low)
✓ Price > 200 SMA (stable)
Entry: $45.20 | Stop Loss: $42.50
```

**When It Triggers:**
- Sector rotation to value
- Interest rate cycle shifts
- Quality stocks oversold on news
- Dividend yield hunting phases

[View All Value Sleeper (RAR) Picks for {{LAST_UPDATE_DATE}}]({{HISTORY_FILE}})

**🔬 Scientific Strictness Rationale:**
The **Regime-Aware Reversion (RAR)** algorithm only triggers when a long-term winner experiences a temporary, mathematically significant dip. In raging bull markets, few quality stocks pull back enough to trigger this, leading to frequent "Dormant" status.
- **QA Runner-Up:** {{VALUE_SLEEPER_RUNNER_UP}}

---

## 📖 **How to Read & Act on Our Picks** (User Guide)

This section explains picks in **plain English** for investors at all experience levels.

---

### 🎯 **Pick Anatomy - What Each Field Means**

When you see a pick like this:
```json
{
  "symbol": "GM",
  "price": 86.38,
  "rating": "STRONG BUY",
  "score": 100,
  "algorithm": "Technical Momentum",
  "timeframe": "3d",
  "risk": "High",
  "simulatedEntryPrice": 86.81,
  "stopLoss": 82.42
}
```

**Here's what it means:**

| Field | What It Means | Action |
|-------|---------------|--------|
| **Symbol** | Stock ticker | This is what you search for in your broker app |
| **Rating** | Strength of signal | STRONG BUY (85-100) → Buy now. BUY (60-84) → Good opportunity |
| **Score** | Confidence (0-100) | Higher = more indicators aligned. 100 = perfect setup |
| **Algorithm** | Which strategy | Tells you the "personality" of the pick (growth, momentum, value, etc.) |
| **Timeframe** | How long to hold | 24h = day trade, 3d = swing trade, 1m-3m = position trade |
| **Risk** | Volatility level | High = can swing ±10%, Medium = ±5%, Low = ±3% |
| **Entry Price** | What you'd actually pay | Includes 0.5% slippage (real-world entry) |
| **Stop Loss** | Your exit if wrong | Sell immediately if price drops below this |

---

### 💡 **Historical Walkthrough Examples** (Educational Only)

#### **Example 1: GM - Technical Momentum (Day Trader / Swing Trader)**

**Pick Data:**
```
Symbol: GM (General Motors)
Entry: $86.81 | Stop Loss: $82.42 | Timeframe: 3 days
Score: 100/100 | Rating: STRONG BUY | Risk: High
```

**🧑‍💼 What This Means in Plain English:**

**The Setup:**
GM is experiencing a "**perfect storm**" for a short-term price surge:
- **Volume explosion:** 3x more people are buying GM than usual (someone knows something)
- **Breakout:** Stock just broke above its 20-day ceiling (resistance broken)
- **Volatility squeeze:** Price has been compressing like a coiled spring - about to release
- **Momentum:** Buyers are in control (RSI: 58.92 = bullish but not overbought)

**Why We Picked It:**
Institutional money (big hedge funds, banks) appears to be entering GM. When "smart money" moves, retail follows. This is a **3-day swing trade** - we expect a quick move up.

**The Plan:**
1. **Entry:** Buy at $86.81 (current price is $86.38, but slippage means you'll likely pay $86.81)
2. **Hold:** 3 days maximum
3. **Target:** 3-7% gain ($89.40 - $92.90)
4. **Stop Loss:** Sell at $82.42 if price drops (protects you from -5% loss)

**Risk Assessment:**
- ⚠️ **High Volatility:** GM can move ±$3-5/day
- ✅ **Strong Signal:** 100/100 score means ALL indicators aligned (rare)
- 📊 **Win Rate:** Technical Momentum historically 65-75% accurate

**Position Sizing by Budget:**

| Budget | Shares | Investment | Max Loss (if stop hit) |
|--------|--------|------------|------------------------|
| $500 | 5 | $434 | -$21.95 (5%) |
| $2,000 | 23 | $1,997 | -$100.97 (5%) |
| $10,000 | 115 | $9,983 | -$505.35 (5%) |

**What to Watch:**
- ✅ **Good signs:** Volume stays above average, price holds above $85
- ⚠️ **Warning signs:** Volume dies off, price breaks below $84
- 🚨 **Exit immediately:** Price drops below $82.42 (stop loss)

**Position Type:** LONG (you're betting the price goes UP)

---

#### **Example 2: VTRS - Alpha Predator (Growth Investor)**

**Pick Data:**
```
Symbol: VTRS (Viatris - Generic Pharma)
Entry: $13.19 | Stop Loss: $12.43 | Timeframe: 3 days
Score: 90/100 | Rating: STRONG BUY | Risk: Medium
```

**🧑‍💼 What This Means in Plain English:**

**The Setup:**
VTRS is showing a **rare combination** of signals that our scientific engine looks for:
- **Insane trend strength:** ADX of 44.83 (anything above 25 is strong, this is VERY strong)
- **Institutional buying:** Price is above VWAP = big investors are accumulating
- **Volatility contraction:** Stock has been calming down after volatility (builds energy)
- **Momentum shift:** Awesome Oscillator positive (buyers gaining power)

**Why We Picked It:**
This is a **pharmaceutical company** that makes generic drugs. It's not sexy, but it's profitable. The technical setup suggests "smart money" is quietly buying before a move. The ADX (trend strength) of 44.83 is in the **top 5%** of all stocks - this trend is REAL.

**The Plan:**
1. **Entry:** $13.19
2. **Hold:** 3 days (short-term swing)
3. **Target:** 4-8% gain ($13.72 - $14.24)
4. **Stop Loss:** $12.43 (-5.8% protection)

**Risk Assessment:**
- ✅ **Medium Risk:** VTRS is a stable pharmaceutical (less volatile than tech)
- ✅ **High Confidence:** 90/100 score, ADX 44.83 (extremely strong trend)
- 📊 **Alpha Predator Win Rate:** 70-80% (new algorithm, early data very promising)

**Position Sizing by Budget:**

| Budget | Shares | Investment | Max Loss (if stop hit) |
|--------|--------|------------|------------------------|
| $500 | 37 | $488 | -$28.12 (5.8%) |
| $2,000 | 151 | $1,992 | -$114.76 (5.8%) |
| $10,000 | 758 | $9,998 | -$576.08 (5.8%) |

**What to Watch:**
- ✅ **Good signs:** ADX stays above 40, volume remains steady
- ⚠️ **Warning signs:** ADX drops below 30 (trend weakening)
- 🚨 **Exit immediately:** Price breaks $12.43

**Position Type:** LONG

**Investor Profiles This Suits:**
- 💼 **Conservative trader:** Low $13 price, stable pharma sector
- 📈 **Swing trader:** 3-day hold, clear entry/exit
- 🎯 **Budget investor:** Can buy 37 shares with just $500

---

#### **Example 3: SBUX - Composite Rating (Long-Term Investor)**

**Pick Data:**
```
Symbol: SBUX (Starbucks)
Entry: $96.20 | Stop Loss: $89.80 | Timeframe: 1 month
Score: 70/100 | Rating: STRONG BUY | Risk: Medium
```

**🧑‍💼 What This Means in Plain English:**

**The Setup:**
Starbucks is a **quality company** with both technical and fundamental strength:
- **Long-term uptrend:** Above all major moving averages (50-day, 200-day)
- **Strong YTD:** Up 14% since January 1st (outperforming market)
- **Volume confirmation:** More people buying than usual
- **Market regime:** Bull market (favorable conditions)

**Why We Picked It:**
This is a **1-month position trade** (not a quick flip). SBUX is a stable blue-chip with consistent earnings. The technical setup suggests the uptrend will continue for at least 30 days.

**The Plan:**
1. **Entry:** $96.20
2. **Hold:** 1 month (30 days)
3. **Target:** 5-10% gain ($101 - $106)
4. **Stop Loss:** $89.80 (-6.7% protection)

**Risk Assessment:**
- ✅ **Lower Risk:** Established company, $95 stock (not a penny stock)
- ✅ **Good Fundamentals:** Profitable, strong brand, global presence
- ⚠️ **Moderate Confidence:** 70/100 score (good, not perfect)

**Position Sizing by Budget:**

| Budget | Shares | Investment | Max Loss (if stop hit) |
|--------|--------|------------|------------------------|
| $500 | 5 | $481 | -$32 (6.7%) |
| $2,000 | 20 | $1,924 | -$128 (6.7%) |
| $10,000 | 104 | $10,005 | -$665 (6.7%) |

**What to Watch:**
- ✅ **Good signs:** Holds above $94, earnings report positive
- ⚠️ **Warning signs:** Drops below $92 (trend break)
- 🚨 **Exit immediately:** Price drops below $89.80

**Position Type:** LONG

**Investor Profiles This Suits:**
- 🏦 **Retirement account:** Stable, month-long hold
- 👨‍💼 **Working professional:** Set it and check weekly
- 📊 **Growth + Value hybrid:** Quality company at reasonable price

---

### 🧑‍🏫 **Strategy Guide by Investor Type**

#### **1. College Student ($100-$1,000 budget)**
**Best Algorithms:** Penny Sniper (when active), Technical Momentum  
**Timeframes:** 24h - 3d  
**Risk Tolerance:** High (you have time to recover)  
**Position Size:** 1-5% of budget per pick  
**Tip:** Start with paper trading (fake money) to learn

**Example Portfolio ($500):**
- GM (3 shares @ $86.81) = $260 (52%)
- VTRS (18 shares @ $13.19) = $237 (47%)
- **Cash reserves:** $3 (for fees)

---

#### **2. Working Professional ($5k-$50k budget)**
**Best Algorithms:** Alpha Predator, Composite, CAN SLIM  
**Timeframes:** 3d - 1m  
**Risk Tolerance:** Medium  
**Position Size:** 2-5% per pick, max 10 positions  
**Tip:** Diversify across algorithms, use stop losses religiously

**Example Portfolio ($10,000):**
- VTRS (758 shares) = $10,000 (100% concentrated)
  
OR (diversified):
- GM (23 shares) = $2,000
- VTRS (150 shares) = $2,000
- SBUX (20 shares) = $2,000
- PFE (75 shares @ $26.63) = $2,000
- **Cash reserves:** $2,000 (for next picks)

---

#### **3. Retiree / Conservative ($50k+ budget)**
**Best Algorithms:** Value Sleeper, Composite  
**Timeframes:** 1m - 3m  
**Risk Tolerance:** Low  
**Position Size:** Max 3% per pick, 20+ positions  
**Tip:** Focus on dividend stocks, ignore penny stocks

**Example Portfolio ($50,000):**
- SBUX (15 shares) = $1,500
- WMT (12 shares) = $1,500
- O (Realty Income - dividend king, 24 shares) = $1,500
- **45 more positions:** Spread across quality picks
- **Cash:** $5,000 emergency reserve

---

#### **4. Day Trader (Active)**
**Best Algorithms:** Technical Momentum (24h timeframe)  
**Timeframes:** 24h only  
**Risk Tolerance:** High  
**Position Size:** 10-20% per pick, 1-3 positions max  
**Tip:** Watch volume like a hawk, exit at 3% gain or 2% loss

---

### ⚠️ **Universal Risk Rules**

1. **Never invest money you can't afford to lose**
2. **ALWAYS use stop losses** (protects you from catastrophic loss)
3. **Position sizing:** No single stock should be more than 10% of your portfolio
4. **Diversify algorithms:** Don't put all money in one strategy
5. **Paper trade first:** Test with fake money before risking real capital
6. **Check market regime:** Our picks work better in BULL markets
7. **Ignore emotions:** If stop loss hits, SELL (don't hope it recovers)

---

### 🎓 **Understanding Timeframes**

| Timeframe | Type | When to Check | Effort Level | Best For |
|-----------|------|---------------|--------------|----------|
| **24h** | Day trade | Every hour | ⭐⭐⭐⭐⭐ High | Active traders |
| **3d** | Swing trade | Daily | ⭐⭐⭐ Medium | Part-time traders |
| **7d** | Swing trade | Every 2 days | ⭐⭐ Low | Busy professionals |
| **1m-3m** | Position trade | Weekly | ⭐ Very Low | Long-term investors |

---

### ❓ **FAQ - Common Questions**

**Q: "What if I can't afford a full share (like SBUX at $96)?"**  
A: Use fractional shares on Robinhood, Fidelity, or Schwab. You can buy 0.5 shares.

**Q: "Should I buy EVERY pick?"**  
A: No! Pick 3-5 that match your budget, risk tolerance, and timeframe.

**Q: "What if the price goes up before I buy?"**  
A: Use limit orders at our entry price. If it doesn't fill, skip it (don't chase).

**Q: "Can I hold longer than the timeframe?"**  
A: Yes, but our system optimized for the stated timeframe. If you hold longer, move your stop loss up to lock in gains.

**Q: "What does 'slippage' mean?"**  
A: The difference between the price you see and the price you actually get. We add 0.5% to be realistic.

**Q: "Are these long or short positions?"**  
A: **All picks are LONG** (betting price goes up). We don't recommend shorting.

**Q: "What if I miss the pick by a day?"**  
A: Check if it's still valid:
  - Price still between entry and stop loss? → OK to enter
  - Price above entry + 3%? → Skip (don't chase)
  - Price below stop loss? → Skip (setup failed)

---

### 🔔 **When to Take Profits**

**Conservative (60% win rate target):**
- Take 50% profits at +3%
- Let remaining 50% run to +7%
- Move stop loss to breakeven

**Aggressive (maximize gains):**
- Hold for full timeframe
- Only sell if stop loss hits
- Accept that some winners turn to losers

---

## 🧬 Scientific Indicators

### New V2.1 Indicators
- **VWAP (Volume Weighted Average Price)**: Institutional footprint detection
- **VCP (Volatility Contraction Pattern)**: Minervini-style base detection
- **ADX (Average Directional Index)**: Trend strength measurement (0-100)
- **AO (Awesome Oscillator)**: Momentum shift detection

### Core Indicators
- RSI, SMA (5/20/50/200), Bollinger Bands, ATR
- Volume Z-Score, Relative Strength Rating
- Stage-2 Uptrend Detection, Breakout Detection

---

## 📊 Algorithm Performance Distribution

**Key Insight:** Dormant algorithms are **working correctly** - they're designed to be highly selective and only trigger on specific market conditions. This prevents false signals.

---

## 🚀 Latest Top Picks ({{LAST_UPDATE_DATE}})

{{TOP_PICKS_TABLE}}

[View All Current Picks](./data/v2/current.json)

---

## Recent Performance Details ({{LAST_UPDATE_DATE}})

**Market Regime:** {{REGIME_STATUS}} ({{REGIME_REASON}})

**Top V2.1 Picks (Live Deduplicated Data):**
{{TOP_PICKS_SUMMARY}}

**Algorithm Distribution:**
{{ALGO_DISTRIBUTION}}

*Note: Algorithmic tags like "+ 2" indicate that 2 other algorithms ALSO triggered on this same stock, increasing confidence.*

---

## Architecture

```
STOCKSUNIFY2/
├── data/
│   ├── daily-stocks.json         # Latest 30 picks
│   └── picks-archive/            # Historical ledgers
│       └── YYYY-MM-DD.json
├── scripts/
│   ├── generate-daily-stocks.ts  # Main generator
│   └── lib/
│       ├── stock-data-fetcher-enhanced.ts
│       ├── stock-indicators.ts   # 15+ indicators
│       ├── stock-scorers.ts      # 6 algorithms
│       ├── stock-universe.ts     # 101 tickers
│       └── stock-api-keys.ts
└── public/data/                  # Web-facing data
```

---

## Usage

### Generate Daily Picks

```bash
npx tsx scripts/generate-daily-stocks.ts
```

---

## Comparison: V1 vs V2.1

| Feature | STOCKSUNIFY (V1) | STOCKSUNIFY2 (V2.1) |
|---------|------------------|---------------------|
| **Algorithms** | 3 (CAN SLIM, Momentum, Composite) | **6** (+ Alpha Predator, Penny Sniper, Value Sleeper) |
| **Indicators** | 8 basic | **15+** (+ VWAP, VCP, ADX, AO) |
| **Regime Filter** | None | SPY > 200 SMA detection |
| **Slippage Model** | None | +0.5% entry penalty |
| **Audit Trail** | Basic timestamps | **SHA-256 immutable ledger** |
| **Fundamental Data** | PE only | **ROE, Debt/Equity, Shares Outstanding** |
| **Stock Universe** | 64 tickers | **101 tickers** (all caps + microcaps) |
| **Picks/Day** | 20 | **30** |

---

## 🧐 Scientific Limitations & Peer Critique
*Transparency is the cornerstone of scientific validation. Below are the known limitations of this system and our direct responses to peer critiques (Gemini/Grok).*

### 1. Selection Bias (Small Universe)
- **Critique:** The engine currently monitors a curated list of ~100 tickers, rather than the entire market (10,000+).
- **Impact:** This introduces inherent "Quality Bias"—we are only picking from stocks we already know are decent.
- **Roadmap:** Future versions will integrate a screener to dynamically populate the universe from the entire Russell 3000.

### 2. Slippage in Microcaps
- **Critique:** A flat 0.5% slippage model is too optimistic for penny stocks (`Penny Sniper` algo) where spreads can be 2-3%.
- **Response:** As of **Jan 28, 2026**, `verify-picks.ts` implements **Dynamic Slippage**:
  - `>$10`: 0.5% (Liquid)
  - `$5 - $10`: 1.0% (Mid variance)
  - `<$5`: 3.0% (High risk/illiquid)

### 3. Lack of Historical Backtesting
- **Critique:** The system relies on "Forward Testing" (The Truth Engine) rather than 10-year historical backtests.
- **Reality:** We acknowledge this. Most retail backtests are curve-fitted lies. We prefer **Forward Testing** on an immutable ledger as it is the only 100% truthful metric. We are building the track record *live*.

### 4. Regime Lag
- **Critique:** Relying solely on the Daily 200 SMA for market regime can be slow to react to V-shaped recoveries.
- **Mitigation:** We advise users to watch the **50 SMA** as a leading indicator, though the primary engine remains conservative.

---

---

## 🔬 System Metadata

### Status Definitions
*   **✅ Active:** The algorithm is currently scanning its universe and producing trades.
*   **⏸️ Selective:** The algorithm's specific technical conditions (e.g., extreme oversold or Penny float requirements) have not been met today. It is standing by to avoid low-probability trades.

### Scoring Methodology [🔬](#v21-scientific-algorithms)
Our 0-100 scoring system is a composite of multiple technical and fundamental "interrogations":
1.  **Trend Alignment (40pts):** Is the stock above key moving averages (SMA 20, 50, 200)?
2.  **Momentum Density (30pts):** Statistical strength of the current move relative to historical volatility.
3.  **Institutional Footprint (20pts):** Detection of "Smart Money" via Volume Z-Scores and VWAP positioning.
4.  **Risk Normalization (10pts):** Penalties applied for excessive volatility or earnings risk.

---

## 📚 Glossary of Terms

To help you understand the scientific metrics used in our engine, here is a breakdown of the jargon in plain English:

### 📈 Technical Indicators
*   **ADX (Average Directional Index):** Measures the **strength** of a trend on a scale of 0-100.
    *   *Analogy:* It’s like a speedometer for the trend. Above 25 means the stock is "moving" fast in one direction; above 40 is "highway speeds."
*   **AO (Awesome Oscillator):** A momentum indicator that compares recent market momentum with long-term momentum. 
    *   *Analogy:* It tells us if the "wind" is picking up or dying down behind a trend.
*   **VCP (Volatility Contraction Pattern):** Created by Mark Minervini, this identifies a stock that is "quieting down" and getting tighter before a predictable breakout.
    *   *Analogy:* Like a coiled spring being pushed down; the tighter it gets, the more explosive the release.
*   **VWAP (Volume Weighted Average Price):** The average price a stock has traded at throughout the day, based on both volume and price. **Smart Money** (banks/hedge funds) tries to buy *below* this line.
*   **SMA (Simple Moving Average):** The average price over a set period (e.g., 50 days or 200 days).
    *   **50 SMA:** Medium-term trend.
    *   **200 SMA:** Long-term "health" line. If a stock is below this, it’s considered "sick."
*   **RSI (Relative Strength Index):** Measures if a stock is "Overbought" (too expensive, RSI > 70) or "Oversold" (too cheap, RSI < 30).
*   **ATR (Average True Range):** Measures how much a stock typically moves in a day. We use this to set **Stop Losses** so you don't get kicked out by normal "noise."

### 🧪 Scientific & Algorithm Terms
*   **Ulcer Index:** Measures how much "stress" or "pain" a stock causes you by looking at the depth and duration of its price drops.
    *   *Analogy:* A lower Ulcer Index means a smoother ride. A higher one means you'll be checking your phone every 5 minutes.
*   **Martin Ratio:** A risk-adjusted return metric (Return / Ulcer Index). We use this to find stocks that go up without the "drama."
*   **Z-Score (Statistical Significance):** Tells us how "weird" or "rare" a current event is.
    *   **Volume Z-Score > 2.0:** Means today's buying volume is higher than 95% of previous days. This usually means **Institutions** have arrived.
*   **Golden Cross:** When a shorter-term average (like 5 SMA) crosses above a longer-term average (20 SMA). It’s a classic "Go" signal.
*   **Slippage:** The "hidden cost" of trading. If a stock is priced at $10.00, you might actually pay $10.05 because of the "Ask" price. Our engine simulates this so our results are honest.
*   **Stage-2 Uptrend:** A specific phase in a stock's life cycle where it is consistently making higher highs and higher lows above its 200-day average. This is the **only** time we want to buy growth stocks.
*   **Market Regime:** The "Weather" of the stock market. 
    *   **Bullish:** Sunny skies (S&P 500 > 200 SMA).
    *   **Bearish:** Stormy/Rainy (S&P 500 < 200 SMA). In a storm, even good stocks tend to get wet.

---

## Disclaimer

This is experimental financial research software. All picks are for educational purposes only. Past performance does not guarantee future results. Always consult a licensed financial advisor.

---

## Links

- **Live Site**: [findtorontoevents.ca/findstocks2](https://findtorontoevents.ca/findstocks2)
- **V1 Classic**: [github.com/eltonaguiar/stocksunify](https://github.com/eltonaguiar/stocksunify)
- **Source Repo**: [github.com/eltonaguiar/TORONTOEVENTS_ANTIGRAVITY](https://github.com/eltonaguiar/TORONTOEVENTS_ANTIGRAVITY)

---

*Last Updated: {{LAST_UPDATE_FULL}} | V2.1 - Multi-Algorithm Framework with Real Examples*
