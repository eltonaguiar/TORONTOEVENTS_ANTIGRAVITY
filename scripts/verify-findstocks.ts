#!/usr/bin/env tsx
/**
 * Independent verification for Find Stocks (findstocks) page:
 * - Validates daily-stocks.json shape (stocks array, pick fields)
 * - Validates backtest-report.json shape (rows, algorithmRanking when present)
 * Exit 0 on pass, 1 on fail. Used for regression and deployment checks.
 *
 * Usage: npx tsx scripts/verify-findstocks.ts
 *        npm run findstocks:verify
 */

import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const publicDataDir = path.join(root, 'public', 'data');

function findJson(...paths: string[]): string | null {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function readJson<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

interface StockPickLike {
  symbol?: string;
  algorithm?: string;
  timeframe?: string;
  score?: number;
  rating?: string;
}

function validateStocks(data: unknown): { ok: boolean; message: string } {
  if (!data || typeof data !== 'object' || !('stocks' in data)) {
    return { ok: false, message: 'daily-stocks must have a "stocks" property' };
  }
  const stocks = (data as { stocks?: unknown }).stocks;
  if (!Array.isArray(stocks)) {
    return { ok: false, message: 'daily-stocks.stocks must be an array' };
  }
  for (let i = 0; i < Math.min(stocks.length, 5); i++) {
    const s = stocks[i] as StockPickLike;
    if (!s || typeof s !== 'object') {
      return { ok: false, message: `daily-stocks.stocks[${i}] must be an object` };
    }
    if (typeof (s.symbol ?? '') !== 'string') {
      return { ok: false, message: `daily-stocks.stocks[${i}].symbol must be string` };
    }
    if (typeof (s.algorithm ?? '') !== 'string') {
      return { ok: false, message: `daily-stocks.stocks[${i}].algorithm must be string` };
    }
    if (typeof (s.timeframe ?? '') !== 'string') {
      return { ok: false, message: `daily-stocks.stocks[${i}].timeframe must be string` };
    }
  }
  return { ok: true, message: `stocks: ${stocks.length} picks` };
}

function validateBacktest(data: unknown): { ok: boolean; message: string } {
  if (!data || typeof data !== 'object' || !('rows' in data)) {
    return { ok: false, message: 'backtest-report must have a "rows" property' };
  }
  const rows = (data as { rows?: unknown; algorithmRanking?: unknown }).rows;
  if (!Array.isArray(rows)) {
    return { ok: false, message: 'backtest-report.rows must be an array' };
  }
  const arr = data as { algorithmRanking?: unknown[] };
  if (arr.algorithmRanking != null && !Array.isArray(arr.algorithmRanking)) {
    return { ok: false, message: 'backtest-report.algorithmRanking must be an array when present' };
  }
  return { ok: true, message: `backtest: ${rows.length} rows` };
}

function main(): number {
  const dailyPath = findJson(
    path.join(dataDir, 'daily-stocks.json'),
    path.join(publicDataDir, 'daily-stocks.json')
  );
  const backtestPath = findJson(
    path.join(dataDir, 'backtest-report.json'),
    path.join(publicDataDir, 'backtest-report.json')
  );

  let failed = false;

  if (dailyPath) {
    const data = readJson<unknown>(dailyPath);
    const res = validateStocks(data);
    if (res.ok) {
      console.log('[findstocks]', res.message, `(${dailyPath})`);
    } else {
      console.error('[findstocks] daily-stocks:', res.message, `(${dailyPath})`);
      failed = true;
    }
  } else {
    console.warn('[findstocks] No daily-stocks.json found under data/ or public/data/ — optional for static build');
  }

  if (backtestPath) {
    const data = readJson<unknown>(backtestPath);
    const res = validateBacktest(data);
    if (res.ok) {
      console.log('[findstocks]', res.message, `(${backtestPath})`);
    } else {
      console.error('[findstocks] backtest-report:', res.message, `(${backtestPath})`);
      failed = true;
    }
  } else {
    console.warn('[findstocks] No backtest-report.json found — optional; run npm run stocks:backtest to generate');
  }

  if (failed) {
    process.exit(1);
  }
  console.log('[findstocks] Verification passed.');
  return 0;
}

main();
