#!/usr/bin/env tsx
/**
 * Sync V2 Scientific Engine data to STOCKSUNIFY2 GitHub repository
 *
 * This script syncs the V2 daily ledger and analysis documents to:
 * https://github.com/eltonaguiar/stocksunify2
 *
 * The V2 engine uses enhanced algorithms based on our research paper:
 * - Regime-Aware Reversion (RAR)
 * - Volatility-Adjusted Momentum (VAM)
 * - Liquidity-Shielded Penny (LSP)
 * - Scientific CAN SLIM (SCS)
 * - Adversarial Trend (AT)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// STOCKSUNIFY2 clone path: default sibling of project root; override with env STOCKSUNIFY2_DIR
const STOCKSUNIFY2_DIR = process.env.STOCKSUNIFY2_DIR || path.join(process.cwd(), '..', 'STOCKSUNIFY2');
const STOCKSUNIFY2_REPO = 'https://github.com/eltonaguiar/stocksunify2.git';

interface SyncConfig {
  files: string[];
  directories: string[];
}

const SYNC_CONFIG: SyncConfig = {
  files: [
    // V2 Current data
    'public/data/v2/current.json',
    // Research documents
    'STOCK_RESEARCH_ANALYSIS.md',
    'STOCK_ALGORITHM_PROSCONS_AND_IMPROVEMENTS.md',
    'STOCK_ALGORITHMS.md',
    'STOCK_ALGORITHM_SUMMARY.md',
    'STOCK_ALGORITHM_DECISION_MATRIX.md',
  ],
  directories: [
    // V2 Engine scripts
    'scripts/v2',
    // V2 History ledgers
    'data/v2/history'
  ]
};

function ensureStocksunify2Repo() {
  const originalCwd = process.cwd();
  try {
    if (!fs.existsSync(STOCKSUNIFY2_DIR)) {
      console.log('📦 Cloning STOCKSUNIFY2 repository...');
      execSync(`git clone ${STOCKSUNIFY2_REPO} "${STOCKSUNIFY2_DIR}"`, { stdio: 'inherit' });
    } else {
      console.log('🔄 Updating STOCKSUNIFY2 repository...');
      process.chdir(STOCKSUNIFY2_DIR);
      try {
        execSync('git pull origin main', { stdio: 'inherit' });
      } catch (error) {
        console.warn('⚠️  Could not pull latest changes (repo might be empty or new)');
      }
    }
  } finally {
    process.chdir(originalCwd);
  }
}

function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;

  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    for (const file of files) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

function syncFiles() {
  console.log('📋 Syncing V2 Scientific Engine files to STOCKSUNIFY2...');

  // Create necessary directories in STOCKSUNIFY2
  const targetDirs = ['data/v2', 'data/v2/history', 'scripts/v2', 'scripts/v2/lib'];
  targetDirs.forEach(dir => {
    const targetPath = path.join(STOCKSUNIFY2_DIR, dir);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
  });

  // Copy V2 current data
  const v2CurrentSource = path.join(process.cwd(), 'public', 'data', 'v2', 'current.json');
  const v2CurrentTarget = path.join(STOCKSUNIFY2_DIR, 'data', 'v2', 'current.json');
  if (fs.existsSync(v2CurrentSource)) {
    fs.copyFileSync(v2CurrentSource, v2CurrentTarget);
    console.log('✅ Synced current.json to data/v2/');
  }

  // Copy V2 history ledgers
  const historySource = path.join(process.cwd(), 'data', 'v2', 'history');
  const historyTarget = path.join(STOCKSUNIFY2_DIR, 'data', 'v2', 'history');
  if (fs.existsSync(historySource)) {
    copyRecursive(historySource, historyTarget);
    console.log('✅ Synced history ledgers to data/v2/history/');
  }

  // Copy ledger index
  const indexSource = path.join(process.cwd(), 'data', 'v2', 'ledger-index.json');
  const indexTarget = path.join(STOCKSUNIFY2_DIR, 'data', 'v2', 'ledger-index.json');
  if (fs.existsSync(indexSource)) {
    fs.copyFileSync(indexSource, indexTarget);
    console.log('✅ Synced ledger-index.json');
  }

  // Copy research documents to root
  const researchDocs = [
    'STOCK_RESEARCH_ANALYSIS.md',
    'STOCK_ALGORITHM_PROSCONS_AND_IMPROVEMENTS.md',
    'STOCK_ALGORITHMS.md',
    'STOCK_ALGORITHM_SUMMARY.md',
    'STOCK_ALGORITHM_DECISION_MATRIX.md'
  ];

  for (const doc of researchDocs) {
    const source = path.join(process.cwd(), doc);
    const target = path.join(STOCKSUNIFY2_DIR, doc);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      console.log(`✅ Synced ${doc}`);
    }
  }

  // Copy V2 engine scripts
  const v2ScriptsSource = path.join(process.cwd(), 'scripts', 'v2');
  const v2ScriptsTarget = path.join(STOCKSUNIFY2_DIR, 'scripts', 'v2');
  if (fs.existsSync(v2ScriptsSource)) {
    copyRecursive(v2ScriptsSource, v2ScriptsTarget);
    console.log('✅ Synced V2 engine scripts');
  }

  // Copy enhanced data fetcher (dependency)
  const fetcherSource = path.join(process.cwd(), 'scripts', 'lib', 'stock-data-fetcher-enhanced.ts');
  const fetcherTarget = path.join(STOCKSUNIFY2_DIR, 'scripts', 'lib', 'stock-data-fetcher-enhanced.ts');
  if (fs.existsSync(fetcherSource)) {
    const libDir = path.dirname(fetcherTarget);
    if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });
    fs.copyFileSync(fetcherSource, fetcherTarget);
    console.log('✅ Synced stock-data-fetcher-enhanced.ts');
  }

  // Copy API keys config (template only - no actual keys)
  const apiKeysSource = path.join(process.cwd(), 'scripts', 'lib', 'stock-api-keys.ts');
  const apiKeysTarget = path.join(STOCKSUNIFY2_DIR, 'scripts', 'lib', 'stock-api-keys.ts');
  if (fs.existsSync(apiKeysSource)) {
    fs.copyFileSync(apiKeysSource, apiKeysTarget);
    console.log('✅ Synced stock-api-keys.ts');
  }

  // Create/update README.md for STOCKSUNIFY2
  const readmeContent = generateStocksunify2Readme();
  const readmeTarget = path.join(STOCKSUNIFY2_DIR, 'README.md');
  fs.writeFileSync(readmeTarget, readmeContent);
  console.log('✅ Created/updated README.md');
}

function generateStocksunify2Readme(): string {
  // Load current V2 data for stats
  let pickCount = 0;
  let lastUpdate = new Date().toISOString();
  let regimeStatus = 'Unknown';

  try {
    const currentPath = path.join(process.cwd(), 'public', 'data', 'v2', 'current.json');
    if (fs.existsSync(currentPath)) {
      const data = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
      pickCount = data.picks?.length || 0;
      lastUpdate = data.timestamp || lastUpdate;
      regimeStatus = data.regime?.status || 'Unknown';
    }
  } catch {}

  return `# STOCKSUNIFY2 - Scientific Stock Analysis Engine

[![Daily Audit](https://img.shields.io/badge/Audit-Daily%2021%3A00%20UTC-blue)](https://github.com/eltonaguiar/stocksunify2/actions)
[![Regime](https://img.shields.io/badge/Market%20Regime-${regimeStatus}-${regimeStatus === 'BULLISH' ? 'green' : 'red'})](./data/v2/current.json)
[![Picks](https://img.shields.io/badge/Active%20Picks-${pickCount}-purple)](./data/v2/current.json)

## Overview

STOCKSUNIFY2 is the **Scientific Validation Engine** for algorithmic stock analysis. Unlike traditional backtesting approaches, V2 enforces:

1. **Temporal Isolation** - Picks are timestamped and archived before market opens
2. **Regime Awareness** - Engine shuts down in bearish regimes (SPY < 200 SMA)
3. **Slippage Torture** - Returns are penalized 3-5x standard spread to find "bulletproof" liquidity
4. **Immutable Ledger** - Every pick is hashed and committed to Git history

## Live Data

| Resource | Link |
|----------|------|
| Current Picks | [data/v2/current.json](./data/v2/current.json) |
| Historical Ledgers | [data/v2/history/](./data/v2/history/) |
| Research Paper | [STOCK_RESEARCH_ANALYSIS.md](./STOCK_RESEARCH_ANALYSIS.md) |

## V2 Scientific Strategies

### 1. Regime-Aware Reversion (RAR)
Buy high-quality stocks in an uptrend that have a short-term RSI dip. Only active in bullish regimes.

### 2. Volatility-Adjusted Momentum (VAM)
Ranks stocks by Return / Ulcer Index (Martin Ratio). Prioritizes smooth uptrends over volatile gains.

### 3. Liquidity-Shielded Penny (LSP)
Penny stocks ($0.10-$5) that pass the "Slippage Torture Test" - returns must survive 3% slippage penalty.

### 4. Scientific CAN SLIM (SCS)
Traditional O'Neil methodology with Regime Guard and Slippage Penalty adjustments.

### 5. Adversarial Trend (AT)
Volatility-normalized trend following. Requires golden cross alignment and stable ATR.

## Architecture

\`\`\`
STOCKSUNIFY2/
├── data/
│   └── v2/
│       ├── current.json          # Live picks (updated daily)
│       ├── ledger-index.json     # 30-day index
│       └── history/              # Immutable archive
│           └── YYYY/MM/DD.json
├── scripts/
│   └── v2/
│       ├── generate-ledger.ts    # Daily audit generator
│       ├── verify-performance.ts # Weekly truth engine
│       └── lib/
│           ├── v2-engine.ts      # Core orchestration
│           └── strategies.ts     # 5 scientific strategies
└── README.md
\`\`\`

## Usage

### Generate Daily Ledger

\`\`\`bash
npx tsx scripts/v2/generate-ledger.ts
\`\`\`

### Verify Performance (Weekly)

\`\`\`bash
npx tsx scripts/v2/verify-performance.ts
\`\`\`

## Comparison: V1 vs V2

| Feature | STOCKSUNIFY (V1) | STOCKSUNIFY2 (V2) |
|---------|------------------|-------------------|
| Algorithms | CAN SLIM, Technical Momentum, Composite | RAR, VAM, LSP, SCS, AT |
| Regime Filter | None | SPY > 200 SMA required |
| Slippage Model | None | 3-5x standard spread penalty |
| Audit Trail | Basic timestamps | Immutable Git ledger |
| Bias Prevention | Manual | Temporal isolation enforced |

## Disclaimer

This is experimental financial research software. All picks are for educational purposes only. Past performance does not guarantee future results. Always consult a licensed financial advisor.

## Links

- **Live Site**: [findtorontoevents.ca/findstocks2](https://findtorontoevents.ca/findstocks2)
- **V1 Classic**: [github.com/eltonaguiar/stocksunify](https://github.com/eltonaguiar/stocksunify)
- **Source Repo**: [github.com/eltonaguiar/TORONTOEVENTS_ANTIGRAVITY](https://github.com/eltonaguiar/TORONTOEVENTS_ANTIGRAVITY)

---

*Last Updated: ${lastUpdate}*
`;
}

function commitAndPush() {
  console.log('💾 Committing changes to STOCKSUNIFY2...');
  const originalCwd = process.cwd();
  process.chdir(STOCKSUNIFY2_DIR);

  try {
    // Check if there are any changes
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (!status.trim()) {
      console.log('ℹ️  No changes to commit');
      process.chdir(originalCwd);
      return;
    }

    execSync('git add -A', { stdio: 'inherit' });
    const commitMessage = `V2 Scientific Audit: ${new Date().toISOString().split('T')[0]} - Auto-sync from TORONTOEVENTS_ANTIGRAVITY`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });
    console.log('✅ Pushed to STOCKSUNIFY2 repository');
  } catch (error: any) {
    console.warn('⚠️  Could not commit/push:', error.message);
    console.log('💡 You may need to manually commit and push to STOCKSUNIFY2');
  }

  process.chdir(originalCwd);
}

async function main() {
  console.log('🔬 Starting STOCKSUNIFY2 Scientific Engine sync...\n');

  try {
    ensureStocksunify2Repo();
    syncFiles();
    commitAndPush();

    console.log('\n✅ Sync complete!');
    console.log(`📁 STOCKSUNIFY2 directory: ${STOCKSUNIFY2_DIR}`);
    console.log(`🌐 Repository: ${STOCKSUNIFY2_REPO}`);
    console.log(`🌐 Live Site: https://findtorontoevents.ca/findstocks2`);
  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { syncFiles, ensureStocksunify2Repo };
