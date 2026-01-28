import fs from 'fs';
import path from 'path';
import FindStocksClient from './FindStocksClient';
import type { StockPick } from './FindStocksClient';

function loadInitialStocks(): StockPick[] {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'daily-stocks.json');
    const publicPath = path.join(process.cwd(), 'public', 'data', 'daily-stocks.json');
    const jsonPath = fs.existsSync(dataPath) ? dataPath : publicPath;
    if (!fs.existsSync(jsonPath)) return [];
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw) as { stocks?: unknown[] };
    if (!data.stocks || !Array.isArray(data.stocks)) return [];
    return data.stocks as StockPick[];
  } catch {
    return [];
  }
}

export default function FindStocksPage() {
  const initialStocks = loadInitialStocks();
  return <FindStocksClient initialStocks={initialStocks} />;
}
