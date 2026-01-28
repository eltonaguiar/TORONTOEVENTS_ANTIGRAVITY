'use client';

import { useState, useEffect, useMemo } from 'react';

export interface StockPick {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  rating: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL';
  timeframe: '24h' | '3d' | '7d' | '2w' | '1m' | '3m' | '6m' | '1y';
  algorithm: string;
  score: number;
  risk: 'Low' | 'Medium' | 'High' | 'Very High';
  stopLoss?: number;
  indicators?: {
    rsi?: number;
    rsiZScore?: number;
    volumeSurge?: number;
    volumeZScore?: number;
    breakout?: boolean;
    revenueGrowth?: number;
    rsRating?: number;
    stage2Uptrend?: boolean;
    bollingerSqueeze?: boolean;
    atr?: number;
  };
  /** ISO timestamp when this pick was generated (for retroactive analysis) */
  pickedAt?: string;
  lastUpdated?: string;
}

/** Backtest report row from scripts/backtest-picks.ts */
export interface BacktestRow {
  symbol: string;
  name: string;
  algorithm: string;
  timeframe: string;
  rating: string;
  score: number;
  pickedAt: string;
  priceAtPick: number;
  returnInTimeframePct: number | null;
  returnSincePickPct: number | null;
  minInWindow: number | null;
  maxInWindow: number | null;
  hit: boolean | null;
  latestPrice: number | null;
  error?: string;
}

/** Algorithm effectiveness rank item (from backtest report or computed) */
export type AlgoRankItem = { algorithm: string; hitRatePct: number; avgReturnPct: number; count: number; lowSample?: boolean };

interface FindStocksClientProps {
  initialStocks?: StockPick[];
}

const TIMEFRAME_ORDER: string[] = ['24h', '3d', '7d', '2w', '1m', '3m', '6m', '1y'];

/** Map internal algorithm names to display names used in the Algorithms section and dropdown */
const ALGORITHM_DISPLAY_NAMES: Record<string, string> = {
  'CAN SLIM': 'CAN SLIM Growth',
  'Technical Momentum': 'Technical Momentum',
  'Composite Rating': 'Composite Rating',
  'ML Ensemble': 'ML Ensemble',
  'Statistical Arbitrage': 'Statistical Arbitrage',
};
function algorithmDisplayName(raw: string): string {
  return ALGORITHM_DISPLAY_NAMES[raw] ?? raw;
}

/** Unique algorithm+timeframe column key; display label for tables */
function algoColumnKey(p: StockPick): string {
  return `${p.algorithm}::${p.timeframe}`;
}
function algoColumnLabel(key: string): string {
  const [algo, tf] = key.split('::');
  return tf ? `${algorithmDisplayName(algo)} (${tf})` : algorithmDisplayName(algo);
}

/** Recommended tweaks per algorithm (from backtest/research); used in prominent section */
const ALGORITHM_TWEAKS: Record<string, string> = {
  'CAN SLIM': 'adding earnings (C/A) and a market-direction filter (M) so buys only run when the market is in an uptrend',
  'Technical Momentum': 'adding an ATR/volatility filter to cut false breakouts and using volume thresholds from standard deviations',
  'Composite Rating': 'upgrading regime detection (e.g. HMM) and estimating factor weights from rolling performance instead of fixed 40/20/20/20',
  'ML Ensemble': 'tightening feature set, walk-forward validation, and input scaling so models stay robust',
  'Statistical Arbitrage': 'using volume/liquidity in pair selection and reducing exposure in high-vol regimes'
};

export default function FindStocksClient({ initialStocks = [] }: FindStocksClientProps) {
  const [stocks, setStocks] = useState<StockPick[]>(initialStocks);
  const [loading, setLoading] = useState(initialStocks.length === 0);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('all');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [listMode, setListMode] = useState<'picks' | 'by-symbol' | 'cross-algorithm'>('picks');
  const [sourceAlgoKey, setSourceAlgoKey] = useState<string>('');
  const [exportOpen, setExportOpen] = useState(false);
  const [rescoreSymbol, setRescoreSymbol] = useState('');
  const [rescoreAlgorithm, setRescoreAlgorithm] = useState('Technical Momentum');
  const [rescoreTimeframe, setRescoreTimeframe] = useState<'24h' | '3d' | '7d'>('7d');
  const [rescoreLoading, setRescoreLoading] = useState(false);
  const [rescoreResult, setRescoreResult] = useState<StockPick | { error: string } | null>(null);
  const [backtestReport, setBacktestReport] = useState<{
    generatedAt?: string;
    totalPicks: number;
    withValidReturn: number;
    hitCount: number;
    hitRatePct: number | null;
    avgReturnInTimeframePct: number | null;
    algorithmRanking?: AlgoRankItem[];
    minSampleForRanking?: number;
    rows: BacktestRow[];
  } | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(true);

  /** All algorithm+timeframe column keys in data (stable order) */
  const algoColumnKeys = useMemo(() => {
    const keys = [...new Set(stocks.map(p => algoColumnKey(p)).filter(Boolean))];
    return keys.sort((a, b) => {
      const [aAlgo, aTf] = a.split('::');
      const [bAlgo, bTf] = b.split('::');
      if (aAlgo !== bAlgo) return (aAlgo || '').localeCompare(bAlgo || '');
      return TIMEFRAME_ORDER.indexOf(aTf) - TIMEFRAME_ORDER.indexOf(bTf) || (aTf || '').localeCompare(bTf || '');
    });
  }, [stocks]);

  const algorithmOptions = useMemo(() => {
    const algos = [...new Set(stocks.map(s => s.algorithm).filter(Boolean))].sort();
    return ['all', ...algos];
  }, [stocks]);

  const timeframeOptions = useMemo(() => {
    const tfs = [...new Set(stocks.map(s => s.timeframe).filter(Boolean))] as string[];
    const ordered = TIMEFRAME_ORDER.filter(t => tfs.includes(t));
    const rest = tfs.filter(t => !TIMEFRAME_ORDER.includes(t)).sort();
    return ['all', ...ordered, ...rest];
  }, [stocks]);

  useEffect(() => {
    const loadStocks = async () => {
      try {
        // STOCKSUNIFY first (synced from this repo); then same-origin paths
        const sources = [
          'https://eltonaguiar.github.io/STOCKSUNIFY/data/daily-stocks.json',
          'https://findtorontoevents.ca/data/daily-stocks.json',
          '/data/daily-stocks.json'
        ];

        let data: { stocks?: StockPick[] } | null = null;
        for (const source of sources) {
          try {
            const response = await fetch(source, {
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache' }
            });
            if (response.ok) {
              const json = await response.json();
              if (json.stocks && Array.isArray(json.stocks) && json.stocks.length > 0) {
                data = json;
                break;
              }
            }
          } catch {
            continue;
          }
        }

        if (data?.stocks) {
          setStocks(data.stocks);
        }
      } catch {
        // Keep existing initialStocks if fetch fails
      } finally {
        setLoading(false);
      }
    };

    loadStocks();
  }, []);

  useEffect(() => {
    const loadBacktest = async () => {
      const sources = [
        '/data/backtest-report.json',
        'https://eltonaguiar.github.io/STOCKSUNIFY/data/backtest-report.json',
        'https://findtorontoevents.ca/data/backtest-report.json'
      ];
      for (const src of sources) {
        try {
          const res = await fetch(src, { cache: 'no-store' });
          if (!res.ok) continue;
          const json = await res.json();
          if (json?.rows && Array.isArray(json.rows)) {
            setBacktestReport({
              generatedAt: json.generatedAt,
              totalPicks: json.totalPicks ?? json.rows.length,
              withValidReturn: json.withValidReturn ?? json.rows.filter((r: BacktestRow) => r.returnInTimeframePct != null).length,
              hitCount: json.hitCount ?? json.rows.filter((r: BacktestRow) => r.hit === true).length,
              hitRatePct: json.hitRatePct ?? null,
              avgReturnInTimeframePct: json.avgReturnInTimeframePct ?? null,
              algorithmRanking: json.algorithmRanking ?? undefined,
              minSampleForRanking: json.minSampleForRanking ?? undefined,
              rows: json.rows
            });
            break;
          }
        } catch {
          continue;
        }
      }
      setBacktestLoading(false);
    };
    loadBacktest();
  }, []);

  const filteredStocks = useMemo(() => {
    return stocks.filter(stock => {
      if (selectedTimeframe !== 'all' && String(stock.timeframe).trim() !== selectedTimeframe) return false;
      if (selectedAlgorithm !== 'all' && String(stock.algorithm).trim() !== selectedAlgorithm) return false;
      return true;
    });
  }, [stocks, selectedTimeframe, selectedAlgorithm]);

  /** Per-symbol: first pick (name, price, change) and map algoKey -> pick */
  const symbolToPicks = useMemo(() => {
    const bySymbol = new Map<string, { first: StockPick; byAlgo: Map<string, StockPick> }>();
    for (const p of stocks) {
      const key = p.symbol.trim().toUpperCase();
      if (!bySymbol.has(key)) {
        bySymbol.set(key, { first: p, byAlgo: new Map() });
      }
      const entry = bySymbol.get(key)!;
      entry.byAlgo.set(algoColumnKey(p), p);
    }
    return bySymbol;
  }, [stocks]);

  /** Multi-algorithm view: one row per symbol, columns = algo keys */
  const bySymbolRows = useMemo(() => {
    return Array.from(symbolToPicks.entries())
      .map(([symbol, { first, byAlgo }]) => ({
        symbol,
        name: first.name,
        price: first.price,
        change: first.change,
        changePercent: first.changePercent,
        byAlgo,
      }))
      .sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
  }, [symbolToPicks]);

  /** Cross-algorithm: source-algo options = algoColumnKeys; when selected, rows = symbols that have that algo */
  const sourceAlgoOptions = useMemo(() => ['', ...algoColumnKeys], [algoColumnKeys]);
  const crossAlgoRows = useMemo(() => {
    if (!sourceAlgoKey) return [];
    return bySymbolRows.filter(row => row.byAlgo.has(sourceAlgoKey));
  }, [bySymbolRows, sourceAlgoKey]);

  /** Algorithm effectiveness ranking: use report.algorithmRanking when present, else compute from rows */
  const algorithmRanking = useMemo((): AlgoRankItem[] => {
    if (backtestReport?.algorithmRanking?.length) return backtestReport.algorithmRanking;
    if (!backtestReport?.rows?.length) return [];
    const byAlgo = new Map<string, { hits: number; total: number; returns: number[] }>();
    for (const r of backtestReport.rows) {
      const algo = r.algorithm || 'Unknown';
      if (!byAlgo.has(algo)) byAlgo.set(algo, { hits: 0, total: 0, returns: [] });
      const entry = byAlgo.get(algo)!;
      if (r.returnInTimeframePct != null) {
        entry.total += 1;
        entry.returns.push(r.returnInTimeframePct);
        if (r.hit === true) entry.hits += 1;
      }
    }
    return Array.from(byAlgo.entries())
      .filter(([, v]) => v.total >= 1)
      .map(([algo, v]) => ({
        algorithm: algo,
        hitRatePct: (v.hits / v.total) * 100,
        avgReturnPct: v.returns.reduce((a, b) => a + b, 0) / v.returns.length,
        count: v.total,
        lowSample: v.total < 5
      }))
      .sort((a, b) => b.hitRatePct - a.hitRatePct);
  }, [backtestReport]);

  const runRescore = async () => {
    const sym = rescoreSymbol.trim().toUpperCase();
    if (!sym) {
      setRescoreResult({ error: 'Enter a symbol' });
      return;
    }
    setRescoreLoading(true);
    setRescoreResult(null);
    try {
      const params = new URLSearchParams({
        symbol: sym,
        algorithm: rescoreAlgorithm,
        ...(rescoreAlgorithm === 'Technical Momentum' ? { timeframe: rescoreTimeframe } : {}),
      });
      const res = await fetch(`/api/stocks/score?${params}`);
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        const msg = res.status === 404
          ? 'Re-score requires a server (not available in static export). Use By symbol and Cross-algorithm above.'
          : (data && typeof data.error === 'string' ? data.error : `Request failed (${res.status})`);
        setRescoreResult({ error: msg });
        return;
      }
      setRescoreResult(data as StockPick);
    } catch (e) {
      setRescoreResult({ error: (e as Error).message || 'Request failed' });
    } finally {
      setRescoreLoading(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'STRONG BUY': return 'text-green-400 bg-green-400/20';
      case 'BUY': return 'text-blue-400 bg-blue-400/20';
      case 'HOLD': return 'text-yellow-400 bg-yellow-400/20';
      case 'SELL': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-400';
      case 'Medium': return 'text-yellow-400';
      case 'High': return 'text-orange-400';
      case 'Very High': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const timeframeLabel = (v: string) => {
    const labels: Record<string, string> = { '24h': '24 Hours', '3d': '3 Days', '7d': '7 Days', '2w': '2 Weeks', '1m': '1 Month', '3m': '3 Months', '6m': '6 Months', '1y': '1 Year' };
    return labels[v] ?? v;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportCSV = () => {
    const headers = ['Symbol', 'Name', 'Price', 'Change', 'Change%', 'Rating', 'Timeframe', 'Algorithm', 'Score', 'Risk'];
    const rows = filteredStocks.map(s => [s.symbol, `"${(s.name || '').replace(/"/g, '""')}"`, s.price, s.change, s.changePercent, s.rating, s.timeframe, s.algorithm, s.score, s.risk].join(','));
    const csv = [headers.join(','), ...rows].join('\r\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `stocks-${new Date().toISOString().slice(0, 10)}.csv`);
    setExportOpen(false);
  };

  const exportTXT = () => {
    const lines = filteredStocks.map(s => `${s.symbol}\t${s.name}\t${s.price}\t${s.change}\t${s.changePercent}\t${s.rating}\t${s.timeframe}\t${s.algorithm}\t${s.score}\t${s.risk}`);
    const txt = ['Symbol\tName\tPrice\tChange\tChange%\tRating\tTimeframe\tAlgorithm\tScore\tRisk', ...lines].join('\n');
    downloadBlob(new Blob([txt], { type: 'text/plain;charset=utf-8' }), `stocks-${new Date().toISOString().slice(0, 10)}.txt`);
    setExportOpen(false);
  };

  const exportHTML = () => {
    const rows = filteredStocks.map(s => `<tr><td>${s.symbol}</td><td>${(s.name || '').replace(/</g, '&lt;')}</td><td>${s.price.toFixed(2)}</td><td>${s.rating}</td><td>${s.timeframe}</td><td>${s.algorithm}</td><td>${s.score}</td><td>${s.risk}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Stock Picks</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px 10px;text-align:left}th{background:#1a1a1a;color:#fff}</style></head><body><h1>Stock Picks</h1><p>Exported ${new Date().toISOString()}</p><table><thead><tr><th>Symbol</th><th>Name</th><th>Price</th><th>Rating</th><th>Timeframe</th><th>Algorithm</th><th>Score</th><th>Risk</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `stocks-${new Date().toISOString().slice(0, 10)}.html`);
    setExportOpen(false);
  };

  const exportPDF = () => {
    const rows = filteredStocks.map(s => `<tr><td>${s.symbol}</td><td>${(s.name || '').replace(/</g, '&lt;').slice(0, 40)}</td><td>${s.price.toFixed(2)}</td><td>${s.rating}</td><td>${s.timeframe}</td><td>${s.algorithm}</td><td>${s.score}</td><td>${s.risk}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Stock Picks</title><style>table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #333;padding:4px 6px}th{background:#1a1a1a;color:#fff}@media print{body{font-family:sans-serif}}</style></head><body><h2>Stock Picks</h2><p>Exported ${new Date().toISOString()} &bull; ${filteredStocks.length} picks</p><table><thead><tr><th>Symbol</th><th>Name</th><th>Price</th><th>Rating</th><th>TF</th><th>Algorithm</th><th>Score</th><th>Risk</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
    setExportOpen(false);
  };

  const exportXLSX = async () => {
    try {
      const XLSX = (await import('xlsx')).default;
      const cols = ['Symbol', 'Name', 'Price', 'Change', 'Change%', 'Rating', 'Timeframe', 'Algorithm', 'Score', 'Risk'];
      const rows = filteredStocks.map(s => [s.symbol, s.name, s.price, s.change, s.changePercent, s.rating, s.timeframe, s.algorithm, s.score, s.risk]);
      const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Picks');
      XLSX.writeFile(wb, `stocks-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (_) {
      alert('XLSX export needs the xlsx package. Install it with: npm install xlsx');
    }
    setExportOpen(false);
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <header className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--pk-900)] to-[var(--surface-0)] opacity-50 -z-10" />
        <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight glow-text">
          Find Stocks 📈
        </h1>
        <p className="text-lg text-[var(--text-2)] max-w-2xl mx-auto">
          Daily stock picks powered by multiple AI-validated algorithms
        </p>
        <p className="text-sm text-[var(--text-3)] mt-2">
          Updated daily • Powered by 11+ stock analysis repositories
        </p>
        <p className="text-sm mt-3">
          <a href="https://github.com/eltonaguiar/stocksunify" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:text-[var(--pk-300)] hover:underline font-semibold">
            📦 Main GitHub repo for stocks → github.com/eltonaguiar/stocksunify
          </a>
        </p>
      </header>

      {/* Based on historical performance — recommended tweaks (very prominent) */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="rounded-2xl border-2 border-[var(--pk-500)] bg-[var(--pk-900)]/40 p-6 md:p-8 shadow-lg shadow-[var(--pk-500)]/20">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white flex items-center gap-2">
            <span aria-hidden>📊</span> Based on historical performance of our picks so far…
          </h2>
          <p className="text-[var(--text-2)] mb-6">
            We rank algorithm effectiveness from our backtest and suggest tweaks so each strategy can improve.
          </p>

          {algorithmRanking.length > 0 ? (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-2 text-[var(--pk-200)]">Algorithm effectiveness ranking (by hit rate)</h3>
                <p className="text-xs text-[var(--text-3)] mb-2">
                  Based on {backtestReport?.withValidReturn ?? 0} picks with valid returns. Rankings use at least {backtestReport?.minSampleForRanking ?? 2} picks per algorithm; &quot;low sample&quot; when &lt; 5 picks — interpret with caution.
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {algorithmRanking.map((a) => (
                    <li key={a.algorithm} className="flex flex-wrap items-baseline gap-2">
                      <strong>{algorithmDisplayName(a.algorithm)}</strong>
                      <span className="text-[var(--text-3)]">— {a.hitRatePct.toFixed(1)}% hit rate</span>
                      <span className={`font-medium ${a.avgReturnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ({a.avgReturnPct >= 0 ? '+' : ''}{a.avgReturnPct.toFixed(2)}% avg return in TF)
                      </span>
                      <span className="text-[var(--text-3)] text-xs">({a.count} picks{a.lowSample ? ', low sample' : ''})</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-[var(--pk-200)]">Recommended tweaks</h3>
                {[...algorithmRanking.map(a => a.algorithm), ...Object.keys(ALGORITHM_TWEAKS).filter(k => !algorithmRanking.some(a => a.algorithm === k))].map((algo) => {
                  const tweak = ALGORITHM_TWEAKS[algo];
                  if (!tweak) return null;
                  return (
                    <p key={algo} className="text-sm bg-black/20 rounded-lg px-4 py-3 border-l-4 border-[var(--pk-500)]">
                      <strong className="text-white">It looks like our algorithm {algorithmDisplayName(algo)} can be improved by</strong>{' '}
                      {tweak}.
                    </p>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--text-3)] mt-2">
                Full research &amp; details: <a href="https://github.com/eltonaguiar/stocksunify/blob/main/STOCK_ALGORITHM_PROSCONS_AND_IMPROVEMENTS.md" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">STOCK_ALGORITHM_PROSCONS_AND_IMPROVEMENTS.md</a>
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-[var(--text-2)]">
                Run <code className="bg-black/30 px-2 py-1 rounded text-sm">npm run stocks:backtest</code> and load the backtest report to see which algorithm performed best and the data-driven ranking. Until then, based on research and our design:
              </p>
              <h3 className="text-lg font-bold text-[var(--pk-200)]">Recommended tweaks (from research)</h3>
              <ul className="space-y-2 text-sm">
                {Object.entries(ALGORITHM_TWEAKS).map(([algo, tweak]) => (
                  <li key={algo} className="bg-black/20 rounded-lg px-4 py-2 border-l-4 border-[var(--pk-500)]">
                    <strong className="text-white">{algorithmDisplayName(algo)}</strong> can be improved by {tweak}.
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[var(--text-3)]">
                Full details: <a href="https://github.com/eltonaguiar/stocksunify/blob/main/STOCK_ALGORITHM_PROSCONS_AND_IMPROVEMENTS.md" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">STOCK_ALGORITHM_PROSCONS_AND_IMPROVEMENTS.md</a>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Algorithms — names match the "All Algorithms" dropdown */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="glass-panel p-8 rounded-2xl border border-white/10 mb-8">
          <h2 className="text-3xl font-bold mb-2">Algorithms</h2>
          <p className="text-sm text-[var(--text-3)] mb-6">
            Each name below matches the <strong>All Algorithms</strong> dropdown. Full methodology, scoring, and implementation notes are in{' '}
            <a href="https://github.com/eltonaguiar/stocksunify/blob/main/STOCK_ALGORITHMS.md" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">STOCK_ALGORITHMS.md</a> (and in this repo’s root when using TORONTOEVENTS_ANTIGRAVITY).
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-white/10 rounded-xl p-6 bg-white/5">
              <h3 className="text-lg font-bold mb-2 text-green-400">CAN SLIM Growth</h3>
              <p className="text-xs text-[var(--text-2)] mb-3">
                Long-term growth screener (O&apos;Neil). RS Rating, Stage-2 Uptrend, price vs 52W high, RSI.
              </p>
              <ul className="text-xs text-[var(--text-3)] space-y-1">
                <li>• RS Rating ≥ 90</li>
                <li>• Stage-2 Uptrend (Minervini)</li>
                <li>• Price vs 52-week high</li>
              </ul>
              <p className="text-xs text-yellow-400 mt-2">Best for: 3–12 month holds</p>
            </div>
            <div className="border border-white/10 rounded-xl p-6 bg-white/5">
              <h3 className="text-lg font-bold mb-2 text-blue-400">Technical Momentum</h3>
              <p className="text-xs text-[var(--text-2)] mb-3">
                Short-term momentum by timeframe (24h, 3d, 7d). Volume surge, RSI, breakouts, Bollinger squeeze.
              </p>
              <ul className="text-xs text-[var(--text-3)] space-y-1">
                <li>• Volume surge vs 10-day avg</li>
                <li>• RSI extremes / momentum</li>
                <li>• 20-day breakout, Bollinger squeeze</li>
              </ul>
              <p className="text-xs text-yellow-400 mt-2">Best for: 24h–1 week</p>
            </div>
            <div className="border border-white/10 rounded-xl p-6 bg-white/5">
              <h3 className="text-lg font-bold mb-2 text-purple-400">ML Ensemble</h3>
              <p className="text-xs text-[var(--text-2)] mb-3">
                ML models (XGBoost, Gradient Boosting, etc.) for next-day or short-horizon returns; technical features.
              </p>
              <ul className="text-xs text-[var(--text-3)] space-y-1">
                <li>• Tree-based + linear models</li>
                <li>• Technical/microstructure features</li>
                <li>• MSE / R² / MAE evaluation</li>
              </ul>
              <p className="text-xs text-yellow-400 mt-2">Best for: liquid large/mid caps, short horizon</p>
            </div>
            <div className="border border-white/10 rounded-xl p-6 bg-white/5">
              <h3 className="text-lg font-bold mb-2 text-amber-400">Composite Rating</h3>
              <p className="text-xs text-[var(--text-2)] mb-3">
                Multi-factor score: technicals, volume, fundamentals, regime. Overall attractiveness for swing/watchlist.
              </p>
              <ul className="text-xs text-[var(--text-3)] space-y-1">
                <li>• Price vs SMAs, RSI</li>
                <li>• Volume, PE, market cap</li>
                <li>• Regime (normal/low-vol/high-vol)</li>
              </ul>
              <p className="text-xs text-yellow-400 mt-2">Best for: 1–3 month swing</p>
            </div>
            <div className="border border-white/10 rounded-xl p-6 bg-white/5">
              <h3 className="text-lg font-bold mb-2 text-cyan-400">Statistical Arbitrage</h3>
              <p className="text-xs text-[var(--text-2)] mb-3">
                Pairs mean reversion: correlated pairs, z-score spread, Sharpe/return. Market-neutral, relative value.
              </p>
              <ul className="text-xs text-[var(--text-3)] space-y-1">
                <li>• Correlated pairs</li>
                <li>• Z-score entry/exit</li>
                <li>• Sharpe, total return</li>
              </ul>
              <p className="text-xs text-yellow-400 mt-2">Best for: sector pairs, mean reversion</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters + list mode + view toggle + export */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 border-r border-white/20 pr-4">
            <span className="text-xs text-[var(--text-3)] font-semibold">List:</span>
            <button
              type="button"
              onClick={() => setListMode('picks')}
              className={`px-2 py-1.5 rounded text-xs font-medium transition ${listMode === 'picks' ? 'bg-[var(--pk-500)]/30 text-[var(--pk-300)]' : 'bg-white/5 text-[var(--text-3)] hover:bg-white/10'}`}
            >
              Picks
            </button>
            <button
              type="button"
              onClick={() => setListMode('by-symbol')}
              className={`px-2 py-1.5 rounded text-xs font-medium transition ${listMode === 'by-symbol' ? 'bg-[var(--pk-500)]/30 text-[var(--pk-300)]' : 'bg-white/5 text-[var(--text-3)] hover:bg-white/10'}`}
            >
              By symbol (multi-algorithm)
            </button>
            <button
              type="button"
              onClick={() => setListMode('cross-algorithm')}
              className={`px-2 py-1.5 rounded text-xs font-medium transition ${listMode === 'cross-algorithm' ? 'bg-[var(--pk-500)]/30 text-[var(--pk-300)]' : 'bg-white/5 text-[var(--text-3)] hover:bg-white/10'}`}
            >
              Cross-algorithm
            </button>
          </div>
          {listMode === 'cross-algorithm' && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold">Source algorithm:</label>
              <select
                value={sourceAlgoKey}
                onChange={(e) => setSourceAlgoKey(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--pk-500)]"
                style={{ color: 'white', minWidth: '200px' }}
              >
                <option value="" style={{ background: '#1a1a1a', color: 'white' }}>Select algorithm</option>
                {algoColumnKeys.map(k => (
                  <option key={k} value={k} style={{ background: '#1a1a1a', color: 'white' }}>{algoColumnLabel(k)}</option>
                ))}
              </select>
            </div>
          )}
          <label className="text-sm font-semibold">Timeframe:</label>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--pk-500)]"
            style={{ color: 'white' }}
          >
            <option value="all" style={{ background: '#1a1a1a', color: 'white' }}>All Timeframes</option>
            {timeframeOptions.filter(t => t !== 'all').map(t => (
              <option key={t} value={t} style={{ background: '#1a1a1a', color: 'white' }}>{timeframeLabel(t)}</option>
            ))}
          </select>
          <label className="text-sm font-semibold ml-4">Algorithm:</label>
          <select
            value={selectedAlgorithm}
            onChange={(e) => setSelectedAlgorithm(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--pk-500)]"
            style={{ color: 'white' }}
          >
            <option value="all" style={{ background: '#1a1a1a', color: 'white' }}>All Algorithms</option>
            {algorithmOptions.filter(a => a !== 'all').map(a => (
              <option key={a} value={a} style={{ background: '#1a1a1a', color: 'white' }}>{algorithmDisplayName(a)}</option>
            ))}
          </select>
          <div className="ml-4 flex items-center gap-2 border-l border-white/20 pl-4">
            <span className="text-xs text-[var(--text-3)]">View:</span>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Card view"
              className={`p-2 rounded-lg transition ${viewMode === 'cards' ? 'bg-[var(--pk-500)]/30 text-[var(--pk-300)]' : 'bg-white/5 text-[var(--text-3)] hover:bg-white/10'}`}
              aria-label="Card view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm6-9A1.5 1.5 0 0 1 8.5 1h3A1.5 1.5 0 0 1 13 2.5v3A1.5 1.5 0 0 1 11.5 7h-3A1.5 1.5 0 0 1 7 5.5v-3zm0 9a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 7 13.5v-3z" /></svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table view"
              className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-[var(--pk-500)]/30 text-[var(--pk-300)]' : 'bg-white/5 text-[var(--text-3)] hover:bg-white/10'}`}
              aria-label="Table view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z" /></svg>
            </button>
          </div>
          <div className="ml-4 relative">
            <button
              type="button"
              onClick={() => setExportOpen(!exportOpen)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 flex items-center gap-2"
              aria-haspopup="true"
              aria-expanded={exportOpen}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" /><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" /></svg>
              Export
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setExportOpen(false)} />
                <div className="absolute left-0 top-full mt-1 py-1 bg-[var(--surface-0)] border border-white/10 rounded-lg shadow-xl z-20 min-w-[180px]">
                  <button type="button" onClick={exportCSV} className="w-full text-left px-4 py-2 text-sm hover:bg-white/10">CSV</button>
                  <button type="button" onClick={exportXLSX} className="w-full text-left px-4 py-2 text-sm hover:bg-white/10">XLSX</button>
                  <button type="button" onClick={exportTXT} className="w-full text-left px-4 py-2 text-sm hover:bg-white/10">TXT</button>
                  <button type="button" onClick={exportHTML} className="w-full text-left px-4 py-2 text-sm hover:bg-white/10">HTML</button>
                  <button type="button" onClick={exportPDF} className="w-full text-left px-4 py-2 text-sm hover:bg-white/10">PDF</button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Re-score with another algorithm (works when app is run with a server; static builds show dataset-only message) */}
      <section className="max-w-7xl mx-auto px-4 py-4">
        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <h3 className="text-sm font-bold mb-3 text-[var(--text-2)]">Re-score with another algorithm</h3>
          <p className="text-xs text-[var(--text-3)] mb-3">
            Run any symbol through a chosen algorithm to see its live rating. When this site is built as a static export, re-score is unavailable—use <strong>By symbol</strong> and <strong>Cross-algorithm</strong> above to see ratings from the daily dataset.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1">Symbol</label>
              <input
                type="text"
                value={rescoreSymbol}
                onChange={(e) => setRescoreSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. AAPL"
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white w-24 focus:outline-none focus:ring-2 focus:ring-[var(--pk-500)]"
                maxLength={8}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1">Algorithm</label>
              <select
                value={rescoreAlgorithm}
                onChange={(e) => setRescoreAlgorithm(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--pk-500)]"
                style={{ color: 'white', minWidth: '180px' }}
              >
                <option value="CAN SLIM" style={{ background: '#1a1a1a', color: 'white' }}>CAN SLIM</option>
                <option value="Technical Momentum" style={{ background: '#1a1a1a', color: 'white' }}>Technical Momentum</option>
                <option value="Composite Rating" style={{ background: '#1a1a1a', color: 'white' }}>Composite Rating</option>
              </select>
            </div>
            {rescoreAlgorithm === 'Technical Momentum' && (
              <div>
                <label className="block text-xs text-[var(--text-3)] mb-1">Timeframe</label>
                <select
                  value={rescoreTimeframe}
                  onChange={(e) => setRescoreTimeframe(e.target.value as '24h' | '3d' | '7d')}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--pk-500)]"
                  style={{ color: 'white' }}
                >
                  <option value="24h" style={{ background: '#1a1a1a', color: 'white' }}>24h</option>
                  <option value="3d" style={{ background: '#1a1a1a', color: 'white' }}>3d</option>
                  <option value="7d" style={{ background: '#1a1a1a', color: 'white' }}>7d</option>
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={runRescore}
              disabled={rescoreLoading}
              className="px-4 py-2 bg-[var(--pk-500)] hover:bg-[var(--pk-400)] disabled:opacity-50 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[var(--pk-400)]"
            >
              {rescoreLoading ? 'Running…' : 'Run'}
            </button>
          </div>
          {rescoreResult && (
            <div className="mt-4 p-3 rounded-lg border border-white/10 bg-white/5">
              {'error' in rescoreResult ? (
                <p className="text-sm text-red-400">{rescoreResult.error}</p>
              ) : (
                <div className="flex flex-wrap gap-4 items-center text-sm">
                  <span className="font-bold">{rescoreResult.symbol}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getRatingColor(rescoreResult.rating)}`}>
                    {rescoreResult.rating} {rescoreResult.score}/100
                  </span>
                  <span className="text-[var(--text-3)]">{rescoreResult.algorithm} {rescoreResult.timeframe && `(${rescoreResult.timeframe})`}</span>
                  <span className="text-[var(--text-3)]">${rescoreResult.price.toFixed(2)}</span>
                  <span className={getRiskColor(rescoreResult.risk)}>{rescoreResult.risk} risk</span>
                  <a href={`https://finance.yahoo.com/quote/${rescoreResult.symbol}`} target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">Yahoo →</a>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Stock Picks List */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--pk-500)]"></div>
            <p className="mt-4 text-[var(--text-2)]">Loading daily stock picks...</p>
          </div>
        ) : listMode === 'by-symbol' ? (
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <p className="px-4 py-2 text-sm text-[var(--text-3)] border-b border-white/10">
              One row per symbol; each column is that algorithm&apos;s rating/score for that stock.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/5 text-[var(--text-2)] border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 font-semibold sticky left-0 bg-white/5 z-10">Symbol</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Change</th>
                    {algoColumnKeys.map(k => (
                      <th key={k} className="px-4 py-3 font-semibold whitespace-nowrap">{algoColumnLabel(k)}</th>
                    ))}
                    <th className="px-4 py-3 font-semibold">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bySymbolRows.map(row => (
                    <tr key={row.symbol} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-bold sticky left-0 bg-[var(--surface-0)] z-10">{row.symbol}</td>
                      <td className="px-4 py-3 text-[var(--text-2)] max-w-[180px] truncate" title={row.name}>{row.name}</td>
                      <td className="px-4 py-3">${row.price.toFixed(2)}</td>
                      <td className={`px-4 py-3 font-medium ${row.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {row.change >= 0 ? '+' : ''}{row.change.toFixed(2)} ({row.changePercent >= 0 ? '+' : ''}{row.changePercent.toFixed(2)}%)
                      </td>
                      {algoColumnKeys.map(k => {
                        const p = row.byAlgo.get(k);
                        if (!p) return <td key={k} className="px-4 py-3 text-[var(--text-3)]">—</td>;
                        return (
                          <td key={k} className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getRatingColor(p.rating)}`} title={`Score: ${p.score}`}>
                              {p.rating} {p.score}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3"><a href={`https://finance.yahoo.com/quote/${row.symbol}`} target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">Yahoo</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : listMode === 'cross-algorithm' ? (
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            {!sourceAlgoKey ? (
              <div className="p-8 text-center text-[var(--text-2)]">
                Select a <strong>Source algorithm</strong> above to see stocks found by that algorithm and how they rate under every other algorithm.
              </div>
            ) : (
              <>
                <p className="px-4 py-2 text-sm text-[var(--text-3)] border-b border-white/10">
                  Stocks found by <strong>{algoColumnLabel(sourceAlgoKey)}</strong>, with ratings from all algorithms in the dataset.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 text-[var(--text-2)] border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3 font-semibold sticky left-0 bg-white/5 z-10">Symbol</th>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Price</th>
                        <th className="px-4 py-3 font-semibold">Change</th>
                        {algoColumnKeys.map(k => (
                          <th key={k} className={`px-4 py-3 font-semibold whitespace-nowrap ${k === sourceAlgoKey ? 'bg-[var(--pk-500)]/20' : ''}`}>
                            {algoColumnLabel(k)}{k === sourceAlgoKey ? ' (source)' : ''}
                          </th>
                        ))}
                        <th className="px-4 py-3 font-semibold">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {crossAlgoRows.map(row => (
                        <tr key={row.symbol} className="hover:bg-white/5">
                          <td className="px-4 py-3 font-bold sticky left-0 bg-[var(--surface-0)] z-10">{row.symbol}</td>
                          <td className="px-4 py-3 text-[var(--text-2)] max-w-[180px] truncate" title={row.name}>{row.name}</td>
                          <td className="px-4 py-3">${row.price.toFixed(2)}</td>
                          <td className={`px-4 py-3 font-medium ${row.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {row.change >= 0 ? '+' : ''}{row.change.toFixed(2)} ({row.changePercent >= 0 ? '+' : ''}{row.changePercent.toFixed(2)}%)
                          </td>
                          {algoColumnKeys.map(k => {
                            const p = row.byAlgo.get(k);
                            if (!p) return <td key={k} className="px-4 py-3 text-[var(--text-3)]">—</td>;
                            return (
                              <td key={k} className={`px-4 py-3 ${k === sourceAlgoKey ? 'bg-[var(--pk-500)]/10' : ''}`}>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getRatingColor(p.rating)}`} title={`Score: ${p.score}`}>
                                  {p.rating} {p.score}
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3"><a href={`https://finance.yahoo.com/quote/${row.symbol}`} target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">Yahoo</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-white/10 text-center">
            <h3 className="text-2xl font-bold mb-4 text-white">No Stock Picks Available</h3>
            <p className="text-white/80 mb-6">
              Daily stock picks will appear here once the automation script runs.
            </p>
            <p className="text-sm text-white/60">
              Check back later or run the stock generation script to populate this list.
            </p>
            <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300">
                💡 <strong>Tip:</strong> Run <code className="bg-black/30 px-2 py-1 rounded">npm run stocks:generate</code> to generate new picks
              </p>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/5 text-[var(--text-2)] border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Symbol</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Change</th>
                    <th className="px-4 py-3 font-semibold">Rating</th>
                    <th className="px-4 py-3 font-semibold">Timeframe</th>
                    <th className="px-4 py-3 font-semibold">Picked at</th>
                    <th className="px-4 py-3 font-semibold">Algorithm</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Risk</th>
                    <th className="px-4 py-3 font-semibold">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStocks.map((stock, index) => (
                    <tr key={`${stock.symbol}-${stock.timeframe}-${stock.algorithm}-${index}`} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-bold">{stock.symbol}</td>
                      <td className="px-4 py-3 text-[var(--text-2)] max-w-[200px] truncate" title={stock.name}>{stock.name}</td>
                      <td className="px-4 py-3">${stock.price.toFixed(2)}</td>
                      <td className={`px-4 py-3 font-medium ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${getRatingColor(stock.rating)}`}>{stock.rating}</span></td>
                      <td className="px-4 py-3">{stock.timeframe}</td>
                      <td className="px-4 py-3 text-[var(--text-3)] text-xs" title={stock.pickedAt ?? ''}>{stock.pickedAt ? new Date(stock.pickedAt).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3">{algorithmDisplayName(stock.algorithm)}</td>
                      <td className="px-4 py-3">{stock.score}/100</td>
                      <td className={`px-4 py-3 font-medium ${getRiskColor(stock.risk)}`}>{stock.risk}</td>
                      <td className="px-4 py-3"><a href={`https://finance.yahoo.com/quote/${stock.symbol}`} target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">Yahoo</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredStocks.map((stock, index) => (
              <div
                key={`${stock.symbol}-${stock.timeframe}-${stock.algorithm}-${index}`}
                className="glass-panel p-6 rounded-xl border border-white/10 hover:border-[var(--pk-500)]/50 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-2xl font-bold">{stock.symbol}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRatingColor(stock.rating)}`}>
                        {stock.rating}
                      </span>
                      <span className={`text-sm font-semibold ${getRiskColor(stock.risk)}`}>
                        {stock.risk} Risk
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-2)] mb-2">{stock.name}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {stock.pickedAt && (
                        <span className="text-[var(--text-3)]" title={stock.pickedAt}>
                          Picked: <strong>{new Date(stock.pickedAt).toLocaleString()}</strong>
                        </span>
                      )}
                      <span className="text-[var(--text-3)]">
                        Algorithm: <strong>{algorithmDisplayName(stock.algorithm)}</strong>
                      </span>
                      <span className="text-[var(--text-3)]">
                        Timeframe: <strong>{stock.timeframe}</strong>
                      </span>
                      <span className="text-[var(--text-3)]">
                        Score: <strong>{stock.score}/100</strong>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold mb-1">${stock.price.toFixed(2)}</div>
                    <div className={`text-sm font-semibold ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                    </div>
                    <a
                      href={`https://finance.yahoo.com/quote/${stock.symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--pk-400)] hover:text-[var(--pk-300)] mt-2 inline-block"
                    >
                      View on Yahoo Finance →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Retroactive Pick Performance */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="glass-panel p-8 rounded-2xl border border-white/10">
          <h2 className="text-2xl font-bold mb-2">Retroactive Pick Performance</h2>
          <p className="text-sm text-[var(--text-3)] mb-4">
            Picks are timestamped with <strong>pickedAt</strong> when generated. This section shows whether our &quot;guess&quot; was right over the predicted timeframe: did the price hit growth we expected? What was the range during the timeline? Performance since prediction date and during the prediction timeframe. <strong>Algorithm effectiveness ranking</strong> from this data is shown at the top in <q>Based on historical performance of our picks so far…</q> with recommended tweaks per algorithm.
          </p>
          {backtestLoading ? (
            <div className="flex items-center gap-2 text-[var(--text-2)]">
              <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--pk-500)] border-t-transparent" />
              Loading backtest report…
            </div>
          ) : !backtestReport || backtestReport.rows.length === 0 ? (
            <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center text-[var(--text-2)]">
              <p className="mb-2">No backtest report yet.</p>
              <p className="text-sm text-[var(--text-3)] mb-3">
                Run <code className="bg-black/30 px-2 py-1 rounded text-xs">npx tsx scripts/backtest-picks.ts</code> to generate it. Ensure picks have <code className="bg-black/30 px-2 py-1 rounded text-xs">pickedAt</code> (they do when generated via <code className="bg-black/30 px-2 py-1 rounded text-xs">npm run stocks:generate</code>). Picks are archived daily under <code className="bg-black/30 px-2 py-1 rounded text-xs">data/picks-archive/YYYY-MM-DD.json</code> for historical analysis.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs text-[var(--text-3)]">Hit rate</div>
                  <div className="text-xl font-bold">{backtestReport.hitRatePct != null ? `${backtestReport.hitRatePct.toFixed(1)}%` : '—'}</div>
                  <div className="text-xs text-[var(--text-3)]">{backtestReport.hitCount}/{backtestReport.withValidReturn} picks</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs text-[var(--text-3)]">Avg return (in TF)</div>
                  <div className={`text-xl font-bold ${(backtestReport.avgReturnInTimeframePct ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {backtestReport.avgReturnInTimeframePct != null ? `${backtestReport.avgReturnInTimeframePct.toFixed(2)}%` : '—'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs text-[var(--text-3)]">Total picks</div>
                  <div className="text-xl font-bold">{backtestReport.totalPicks}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs text-[var(--text-3)]">Report generated</div>
                  <div className="text-sm font-medium truncate" title={backtestReport.generatedAt ?? ''}>
                    {backtestReport.generatedAt ? new Date(backtestReport.generatedAt).toLocaleString() : '—'}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 text-[var(--text-2)] border-b border-white/10">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Symbol</th>
                      <th className="px-3 py-2 font-semibold">Picked at</th>
                      <th className="px-3 py-2 font-semibold">TF</th>
                      <th className="px-3 py-2 font-semibold">Algorithm</th>
                      <th className="px-3 py-2 font-semibold">Rating</th>
                      <th className="px-3 py-2 font-semibold">Price @ pick</th>
                      <th className="px-3 py-2 font-semibold">Return in TF %</th>
                      <th className="px-3 py-2 font-semibold">Return since pick %</th>
                      <th className="px-3 py-2 font-semibold">Range (min–max)</th>
                      <th className="px-3 py-2 font-semibold">Hit?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {backtestReport.rows.slice(0, 50).map((r, idx) => (
                      <tr key={`${r.symbol}-${r.pickedAt}-${r.timeframe}-${r.algorithm}-${idx}`} className="hover:bg-white/5">
                        <td className="px-3 py-2 font-medium">{r.symbol}</td>
                        <td className="px-3 py-2 text-[var(--text-3)]">{r.pickedAt ? new Date(r.pickedAt).toLocaleDateString() : '—'}</td>
                        <td className="px-3 py-2">{r.timeframe}</td>
                        <td className="px-3 py-2 text-[var(--text-3)]">{algorithmDisplayName(r.algorithm)}</td>
                        <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getRatingColor(r.rating)}`}>{r.rating}</span></td>
                        <td className="px-3 py-2">${r.priceAtPick.toFixed(2)}</td>
                        <td className={`px-3 py-2 font-medium ${(r.returnInTimeframePct ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {r.returnInTimeframePct != null ? `${r.returnInTimeframePct.toFixed(2)}%` : (r.error ?? '—')}
                        </td>
                        <td className={`px-3 py-2 font-medium ${(r.returnSincePickPct ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {r.returnSincePickPct != null ? `${r.returnSincePickPct.toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-3)]">
                          {r.minInWindow != null && r.maxInWindow != null ? `$${r.minInWindow.toFixed(2)}–$${r.maxInWindow.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {r.hit === true && <span className="text-green-400 font-medium">Yes</span>}
                          {r.hit === false && <span className="text-red-400 font-medium">No</span>}
                          {r.hit == null && <span className="text-[var(--text-3)]">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {backtestReport.rows.length > 50 && (
                <p className="mt-2 text-xs text-[var(--text-3)]">Showing first 50 of {backtestReport.rows.length} rows.</p>
              )}
            </>
          )}
        </div>
      </section>

      {/* Documentation Links */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="glass-panel p-8 rounded-2xl border border-white/10">
          <h2 className="text-2xl font-bold mb-4">Learn More</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Analysis Documents</h3>
              <ul className="text-sm text-[var(--text-2)] space-y-1">
                <li>• <a href="https://github.com/eltonaguiar/stocksunify/blob/main/STOCK_ALGORITHMS.md" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline font-semibold">STOCK_ALGORITHMS.md</a> — full reference for every algorithm (names match the dropdown)</li>
                <li>• <a href="https://github.com/eltonaguiar/stocksunify/blob/main/STOCK_ALGORITHM_PROSCONS_AND_IMPROVEMENTS.md" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline font-semibold">STOCK_ALGORITHM_PROSCONS_AND_IMPROVEMENTS.md</a> — pros/cons, effectiveness research, and improvement ideas per algorithm</li>
                <li>• <a href="https://github.com/eltonaguiar/stocksunify/blob/main/STOCK_REPOSITORY_ANALYSIS.md" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">Stock Repository Analysis</a></li>
                <li>• <a href="https://github.com/eltonaguiar/stocksunify/blob/main/STOCK_ALGORITHM_SUMMARY.md" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">Algorithm Summary</a></li>
                <li>• <a href="https://github.com/eltonaguiar/stocksunify/blob/main/STOCK_GOOGLEGEMINI_ANALYSIS.md" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">Google Gemini Analysis</a></li>
                <li>• <a href="https://github.com/eltonaguiar/stocksunify/blob/main/STOCK_COMETBROWSERAI_ANALYSIS.md" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">Comet Browser AI Analysis</a></li>
                <li>• <a href="https://github.com/eltonaguiar/stocksunify/blob/main/STOCK_CHATGPT_ANALYSIS.md" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">ChatGPT Analysis</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Source Repositories</h3>
              <ul className="text-sm text-[var(--text-2)] space-y-1">
                <li>• <a href="https://github.com/eltonaguiar/stocksunify" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">STOCKSUNIFY (Unified Stock Data)</a> — <a href="https://eltonaguiar.github.io/STOCKSUNIFY/" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-300)] hover:underline text-xs">View on GitHub Pages</a></li>
                <li>• <a href="https://github.com/eltonaguiar/mikestocks" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">mikestocks (CAN SLIM)</a></li>
                <li>• <a href="https://github.com/eltonaguiar/eltonsstocks-apr24_2025" target="_blank" rel="noopener noreferrer" className="text-[var(--pk-400)] hover:underline">Stock Spike Replicator</a></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-[var(--text-3)] border-t border-white/5">
        <p className="mb-2">
          <strong>⚠️ Disclaimer:</strong> Stock predictions are for informational purposes only and do not constitute financial advice.
        </p>
        <p>
          Always conduct your own research and consult with a licensed financial advisor before making investment decisions.
        </p>
      </footer>
    </main>
  );
}
