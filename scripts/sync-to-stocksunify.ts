#!/usr/bin/env tsx
/**
 * Sync FindStocks data to STOCKSUNIFY GitHub repository
 * 
 * This script syncs daily stock picks and analysis documents to:
 * https://github.com/eltonaguiar/STOCKSUNIFY
 * 
 * Note: STOCKSUNIFY GitHub Pages is configured to serve from main branch / root
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// STOCKSUNIFY clone path: default sibling of project root; override with env STOCKSUNIFY_DIR
const STOCKSUNIFY_DIR = process.env.STOCKSUNIFY_DIR || path.join(process.cwd(), '..', 'STOCKSUNIFY');
const STOCKSUNIFY_REPO = 'https://github.com/eltonaguiar/STOCKSUNIFY.git';

interface SyncConfig {
  files: string[];
  directories: string[];
}

const SYNC_CONFIG: SyncConfig = {
  files: [
    'data/daily-stocks.json',
    'STOCK_REPOSITORY_ANALYSIS.md',
    'STOCK_ALGORITHM_SUMMARY.md',
    'STOCK_GOOGLEGEMINI_ANALYSIS.md',
    'STOCK_COMETBROWSERAI_ANALYSIS.md',
    'STOCK_CHATGPT_ANALYSIS.md',
    'STOCK_ALGORITHM_DECISION_MATRIX.md'
  ],
  directories: [
    'scripts/generate-daily-stocks.ts'
  ]
};

function ensureStocksunifyRepo() {
  const originalCwd = process.cwd();
  try {
    if (!fs.existsSync(STOCKSUNIFY_DIR)) {
      console.log('📦 Cloning STOCKSUNIFY repository...');
      execSync(`git clone ${STOCKSUNIFY_REPO} "${STOCKSUNIFY_DIR}"`, { stdio: 'inherit' });
    } else {
      console.log('🔄 Updating STOCKSUNIFY repository...');
      process.chdir(STOCKSUNIFY_DIR);
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

function syncFiles() {
  console.log('📋 Syncing files to STOCKSUNIFY (root directory for GitHub Pages)...');

  // Create necessary directories in STOCKSUNIFY root
  const targetDirs = ['data', 'scripts'];
  targetDirs.forEach(dir => {
    const targetPath = path.join(STOCKSUNIFY_DIR, dir);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
  });

  // Copy daily stocks data to root/data/ (accessible via /data/daily-stocks.json)
  const dailyStocksSource = path.join(process.cwd(), 'data', 'daily-stocks.json');
  const dailyStocksTarget = path.join(STOCKSUNIFY_DIR, 'data', 'daily-stocks.json');
  if (fs.existsSync(dailyStocksSource)) {
    fs.copyFileSync(dailyStocksSource, dailyStocksTarget);
    console.log('✅ Synced daily-stocks.json to data/');
  }

  // Copy analysis documents to root (accessible directly)
  SYNC_CONFIG.files.forEach(file => {
    if (file.endsWith('.md')) {
      const source = path.join(process.cwd(), file);
      const target = path.join(STOCKSUNIFY_DIR, path.basename(file));
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
        console.log(`✅ Synced ${path.basename(file)} to root`);
      }
    }
  });

  // Copy scripts to scripts/ folder
  const scriptSource = path.join(process.cwd(), 'scripts', 'generate-daily-stocks.ts');
  const scriptTarget = path.join(STOCKSUNIFY_DIR, 'scripts', 'generate-daily-stocks.ts');
  if (fs.existsSync(scriptSource)) {
    fs.copyFileSync(scriptSource, scriptTarget);
    console.log('✅ Synced generate-daily-stocks.ts to scripts/');
  }

  // Create/update README.md for STOCKSUNIFY (serves as GitHub Pages landing page)
  // Use the enhanced README generator (load from project scripts/ so it works from any cwd)
  try {
    const generatorPath = path.join(process.cwd(), 'scripts', 'generate-stocksunify-readme');
    const { generateReadme } = require(generatorPath);
    const readmeContent = generateReadme();
    const readmeTarget = path.join(STOCKSUNIFY_DIR, 'README.md');
    fs.writeFileSync(readmeTarget, readmeContent);
    console.log('✅ Created/updated README.md with daily picks (GitHub Pages landing page)');
  } catch (error) {
    // Fallback to basic README if enhanced generator fails
    console.warn('⚠️  Enhanced README generator failed, using basic version');
    const readmeContent = generateStocksunifyReadme();
    const readmeTarget = path.join(STOCKSUNIFY_DIR, 'README.md');
    fs.writeFileSync(readmeTarget, readmeContent);
    console.log('✅ Created/updated README.md (basic version)');
  }
}

function generateStocksunifyReadme(): string {
  return `# STOCKSUNIFY 📈

**Unified Stock Analysis & Daily Picks**

This repository consolidates stock analysis data, algorithms, and daily picks from multiple AI-validated sources.

## 🌐 Live Site

**GitHub Pages:** [View Live Site](https://eltonaguiar.github.io/STOCKSUNIFY/)

## 📊 Daily Stock Picks

**Latest Data:** [data/daily-stocks.json](./data/daily-stocks.json)

Daily stock picks are generated using multiple algorithms:
- **CAN SLIM Growth Screener** (Long-term, 3-12 months)
- **Technical Momentum** (Short-term, 24h-1 week)
- **ML Ensemble** (Portfolio Management)

## 📚 Analysis Documents

All links point to this repo ([STOCKSUNIFY](https://github.com/eltonaguiar/STOCKSUNIFY)):

### Comprehensive Analysis
- [Stock Repository Analysis](https://github.com/eltonaguiar/STOCKSUNIFY/blob/main/STOCK_REPOSITORY_ANALYSIS.md) - Analysis of 11 stock repositories
- [Algorithm Summary](https://github.com/eltonaguiar/STOCKSUNIFY/blob/main/STOCK_ALGORITHM_SUMMARY.md) - Quick reference guide
- [Decision Matrix](https://github.com/eltonaguiar/STOCKSUNIFY/blob/main/STOCK_ALGORITHM_DECISION_MATRIX.md) - Visual algorithm selector

### AI Assessments
- [Google Gemini Analysis](https://github.com/eltonaguiar/STOCKSUNIFY/blob/main/STOCK_GOOGLEGEMINI_ANALYSIS.md) - Gemini's assessment
- [Comet Browser AI Analysis](https://github.com/eltonaguiar/STOCKSUNIFY/blob/main/STOCK_COMETBROWSERAI_ANALYSIS.md) - Comet Browser AI breakdown
- [ChatGPT Analysis](https://github.com/eltonaguiar/STOCKSUNIFY/blob/main/STOCK_CHATGPT_ANALYSIS.md) - ChatGPT code inspection

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

## 📈 Algorithms Integrated

### 1. Long-Term Growth (3-12 months)
**CAN SLIM Growth Screener** - 60-70% accuracy
- RS Rating ≥ 90
- Stage-2 Uptrend
- Revenue Growth ≥ 25% (SEC EDGAR data)
- Institutional Accumulation

### 2. Short-Term Momentum (24h - 1 week)
**Technical + Volume Analysis**
- Volume Surge Detection
- RSI Extremes
- Breakout Patterns
- Bollinger Band Squeeze
- ⚠️ High Risk - Penny Stocks

### 3. ML Portfolio Management
**ML Ensemble + Risk Management**
- XGBoost/Gradient Boosting
- Sentiment Analysis (NLP)
- Portfolio Optimization
- VaR, Sharpe Ratio metrics

## 🔗 Source Repositories

This data is synced from:
- [TORONTOEVENTS_ANTIGRAVITY](https://github.com/eltonaguiar/TORONTOEVENTS_ANTIGRAVITY) - Main repository
- [mikestocks](https://github.com/eltonaguiar/mikestocks) - CAN SLIM Growth Screener
- [Stock Spike Replicator](https://github.com/eltonaguiar/eltonsstocks-apr24_2025) - ML + Risk Management
- [Penny Stock Screener](https://github.com/eltonaguiar/SCREENER_PENNYSTOCK_SKYROCKET_24HOURS_CURSOR) - Technical Momentum

## ⚠️ Disclaimer

Stock predictions are for informational purposes only and do not constitute financial advice. Always conduct your own research and consult with a licensed financial advisor before making investment decisions.

## 📅 Last Updated

This repository is automatically synced daily. Check the \`lastUpdated\` field in \`data/daily-stocks.json\` for the latest update timestamp.

---

*Powered by 11+ AI-validated stock analysis algorithms*
`;
}

function commitAndPush() {
  console.log('💾 Committing changes to STOCKSUNIFY...');
  process.chdir(STOCKSUNIFY_DIR);

  try {
    // Check if there are any changes
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (!status.trim()) {
      console.log('ℹ️  No changes to commit');
      return;
    }

    execSync('git add -A', { stdio: 'inherit' });
    const commitMessage = `Auto-sync: Update daily stock picks and analysis docs - ${new Date().toISOString().split('T')[0]}`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });
    console.log('✅ Pushed to STOCKSUNIFY repository');
  } catch (error: any) {
    console.warn('⚠️  Could not commit/push:', error.message);
    console.log('💡 You may need to manually commit and push to STOCKSUNIFY');
    console.log('💡 Or check if the repository is properly initialized');
  }

  process.chdir(process.cwd());
}

async function main() {
  console.log('🚀 Starting STOCKSUNIFY sync...\n');
  console.log('📌 Note: STOCKSUNIFY GitHub Pages serves from main branch / root\n');

  try {
    ensureStocksunifyRepo();
    syncFiles();
    commitAndPush();

    console.log('\n✅ Sync complete!');
    console.log(`📁 STOCKSUNIFY directory: ${STOCKSUNIFY_DIR}`);
    console.log(`🌐 Repository: ${STOCKSUNIFY_REPO}`);
    console.log(`🌐 GitHub Pages: https://eltonaguiar.github.io/STOCKSUNIFY/`);
  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { syncFiles, ensureStocksunifyRepo };
