#!/usr/bin/env tsx
/**
 * Retroactive Pick Analyzer (backtest)
 *
 * Reads timestamped picks from data/daily-stocks.json and data/picks-archive/*.json,
 * fetches price history from Yahoo, and computes for each pick:
 * - return in predicted timeframe (%)
 * - return since prediction date (%)
 * - min/max price in the timeframe window
 * - hit: did we get the growth we expected? (STRONG BUY/BUY → positive return in window)
 *
 * Output: data/backtest-report.json (and public/data/backtest-report.json for the UI)
 *
 * Usage: npx tsx scripts/backtest-picks.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const TIMEFRAME_TO_DAYS: Record<string, number> = {
  '24h': 1,
  '3d': 3,
  '7d': 5,
  '2w': 10,
  '1m': 21,
  '3m': 63,
  '6m': 126,
  '1y': 252
};

interface Pick {
  symbol: string;
  name?: string;
  price: number;
  rating: string;
  timeframe: string;
  algorithm: string;
  score: number;
  pickedAt?: string;
}

interface BacktestRow {
  symbol: string;
  name: string;
  algorithm: string;
  timeframe: string;
  rating: string;
  score: number;
  pickedAt: string;
  priceAtPick: number;
  /** Return % over the predicted timeframe window */
  returnInTimeframePct: number | null;
  /** Return % from pick date to latest */
  returnSincePickPct: number | null;
  /** Min close in [pickedAt, pickedAt+timeframe] */
  minInWindow: number | null;
  /** Max close in [pickedAt, pickedAt+timeframe] */
  maxInWindow: number | null;
  /** Did we "guess" right? For BUY/STRONG BUY = positive return in window */
  hit: boolean | null;
  /** Latest price (as of fetch) */
  latestPrice: number | null;
  error?: string;
}

async function fetchHistory(symbol: string, fromDate: string): Promise<{ date: string; close: number }[] | null> {
  try {
    // Yahoo chart: range 2y to cover most backtest windows
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2y`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const history = timestamps
      .map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        close: closes[i] ?? 0
      }))
      .filter((h: { date: string; close: number }) => h.close > 0)
      .filter((h: { date: string }) => h.date >= fromDate.slice(0, 10))
      .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));
    return history;
  } catch {
    return null;
  }
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a.slice(0, 10)).getTime();
  const d2 = new Date(b.slice(0, 10)).getTime();
  return Math.round((d2 - d1) / (24 * 60 * 60 * 1000));
}

function computeRow(pick: Pick, history: { date: string; close: number }[] | null): BacktestRow {
  const pickedAt = pick.pickedAt || '';
  const priceAtPick = pick.price;
  const name = pick.name || pick.symbol;

  const base: BacktestRow = {
    symbol: pick.symbol,
    name,
    algorithm: pick.algorithm,
    timeframe: pick.timeframe,
    rating: pick.rating,
    score: pick.score,
    pickedAt,
    priceAtPick,
    returnInTimeframePct: null,
    returnSincePickPct: null,
    minInWindow: null,
    maxInWindow: null,
    hit: null,
    latestPrice: null
  };

  if (!history || history.length === 0) {
    base.error = 'No history';
    return base;
  }

  const pickDate = pickedAt.slice(0, 10);
  const windowDays = TIMEFRAME_TO_DAYS[pick.timeframe] ?? 21;
  const inWindow = history.filter((h) => daysBetween(pickDate, h.date) >= 0 && daysBetween(pickDate, h.date) <= windowDays);
  const firstInWindow = inWindow[0];
  const lastInWindow = inWindow[inWindow.length - 1];
  const latest = history[history.length - 1];

  if (firstInWindow && lastInWindow) {
    const startPrice = firstInWindow.close;
    const endWindowPrice = lastInWindow.close;
    base.returnInTimeframePct = startPrice ? ((endWindowPrice - startPrice) / startPrice) * 100 : null;
    base.minInWindow = Math.min(...inWindow.map((h) => h.close));
    base.maxInWindow = Math.max(...inWindow.map((h) => h.close));
    const expectedPositive = pick.rating === 'STRONG BUY' || pick.rating === 'BUY';
    base.hit = base.returnInTimeframePct !== null && (expectedPositive ? base.returnInTimeframePct > 0 : base.returnInTimeframePct >= -5);
  }

  if (latest && firstInWindow) {
    base.latestPrice = latest.close;
    const startPrice = firstInWindow.close;
    base.returnSincePickPct = startPrice ? ((latest.close - startPrice) / startPrice) * 100 : null;
  }

  return base;
}

async function main() {
  const dataDir = path.join(process.cwd(), 'data');
  const picks: Pick[] = [];

  // Load daily-stocks.json
  const dailyPath = path.join(dataDir, 'daily-stocks.json');
  if (fs.existsSync(dailyPath)) {
    const raw = JSON.parse(fs.readFileSync(dailyPath, 'utf-8'));
    const list = Array.isArray(raw.stocks) ? raw.stocks : [];
    for (const s of list) {
      if (s.symbol && (s.pickedAt || raw.lastUpdated)) {
        picks.push({
          symbol: String(s.symbol).toUpperCase(),
          name: s.name,
          price: Number(s.price) || 0,
          rating: s.rating || 'HOLD',
          timeframe: s.timeframe || '1m',
          algorithm: s.algorithm || '',
          score: Number(s.score) || 0,
          pickedAt: s.pickedAt || raw.lastUpdated
        });
      }
    }
  }

  // Load picks-archive
  const archiveDir = path.join(dataDir, 'picks-archive');
  if (fs.existsSync(archiveDir)) {
    const files = fs.readdirSync(archiveDir).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(archiveDir, f), 'utf-8'));
      const list = Array.isArray(raw.stocks) ? raw.stocks : [];
      const t = raw.lastUpdated || raw.pickedAt || f.replace('.json', '');
      for (const s of list) {
        if (s.symbol) {
          picks.push({
            symbol: String(s.symbol).toUpperCase(),
            name: s.name,
            price: Number(s.price) || 0,
            rating: s.rating || 'HOLD',
            timeframe: s.timeframe || '1m',
            algorithm: s.algorithm || '',
            score: Number(s.score) || 0,
            pickedAt: s.pickedAt || t
          });
        }
      }
    }
  }

  // Dedupe by symbol+algorithm+timeframe+pickedAt, keep one per
  const seen = new Set<string>();
  const unique: Pick[] = [];
  for (const p of picks) {
    const key = `${p.symbol}|${p.algorithm}|${p.timeframe}|${p.pickedAt}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  console.log(`\n📊 Backtesting ${unique.length} unique picks (from daily-stocks + picks-archive)...\n`);

  const report: BacktestRow[] = [];
  const symbols = [...new Set(unique.map((p) => p.symbol))];
  let i = 0;
  for (const symbol of symbols) {
    const symbolPicks = unique.filter((p) => p.symbol === symbol);
    const fromDate = symbolPicks.reduce((a, p) => (p.pickedAt && p.pickedAt < a ? p.pickedAt : a), '2099-01-01').slice(0, 10);
    const history = await fetchHistory(symbol, fromDate);
    for (const pick of symbolPicks) {
      report.push(computeRow(pick, history));
    }
    i++;
    if (i % 5 === 0) console.log(`  Fetched ${i}/${symbols.length} symbols...`);
    await new Promise((r) => setTimeout(r, 200));
  }

  const hitCount = report.filter((r) => r.hit === true).length;
  const withReturn = report.filter((r) => r.returnInTimeframePct != null).length;
  const avgReturnInTf = withReturn
    ? report.filter((r) => r.returnInTimeframePct != null).reduce((a, r) => a + (r.returnInTimeframePct ?? 0), 0) / withReturn
    : null;

  const MIN_SAMPLE_FOR_RANKING = 2;
  const byAlgo = new Map<string, { hits: number; total: number; returns: number[] }>();
  for (const r of report) {
    const algo = r.algorithm || 'Unknown';
    if (!byAlgo.has(algo)) byAlgo.set(algo, { hits: 0, total: 0, returns: [] });
    const entry = byAlgo.get(algo)!;
    if (r.returnInTimeframePct != null) {
      entry.total += 1;
      entry.returns.push(r.returnInTimeframePct);
      if (r.hit === true) entry.hits += 1;
    }
  }
  const algorithmRanking = Array.from(byAlgo.entries())
    .filter(([, v]) => v.total >= MIN_SAMPLE_FOR_RANKING)
    .map(([algo, v]) => ({
      algorithm: algo,
      hitRatePct: (v.hits / v.total) * 100,
      avgReturnPct: v.returns.reduce((a, b) => a + b, 0) / v.returns.length,
      count: v.total,
      lowSample: v.total < 5
    }))
    .sort((a, b) => b.hitRatePct - a.hitRatePct);

  const output = {
    generatedAt: new Date().toISOString(),
    totalPicks: report.length,
    withValidReturn: withReturn,
    hitCount,
    hitRatePct: withReturn ? (hitCount / withReturn) * 100 : null,
    avgReturnInTimeframePct: avgReturnInTf,
    algorithmRanking,
    minSampleForRanking: MIN_SAMPLE_FOR_RANKING,
    rows: report
  };

  const outPath = path.join(dataDir, 'backtest-report.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Backtest report written to ${outPath}`);
  console.log(`   Hit rate: ${output.hitRatePct != null ? output.hitRatePct.toFixed(1) : 'n/a'}% (${hitCount}/${withReturn})`);
  console.log(`   Avg return in timeframe: ${avgReturnInTf != null ? avgReturnInTf.toFixed(2) : 'n/a'}%`);
  if (algorithmRanking.length > 0) {
    console.log(`   Algorithm ranking (by hit rate):`);
    algorithmRanking.forEach((a, i) => console.log(`     ${i + 1}. ${a.algorithm}: ${a.hitRatePct.toFixed(1)}% hit, ${a.avgReturnPct >= 0 ? '+' : ''}${a.avgReturnPct.toFixed(2)}% avg (n=${a.count}${a.lowSample ? ', low sample' : ''})`));
  }

  const publicDir = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'backtest-report.json'), JSON.stringify(output, null, 2));
  console.log(`   Also saved to public/data/backtest-report.json for the UI.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
