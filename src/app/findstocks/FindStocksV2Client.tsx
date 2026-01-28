"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import PerformanceDashboard from "./components/PerformanceDashboard";
import SectorRotationWidget from "./components/SectorRotationWidget";
import EfficiencyFrontierChart from "./components/EfficiencyFrontierChart";
import StressAuditGrid from "./components/StressAuditGrid";

interface V2Pick {
  symbol: string;
  name: string;
  score: number;
  rating: string;
  algorithm: string;
  timeframe: string;
  risk: string;
  metrics: Record<string, any>;
  v2_hash: string;
}

interface AuditData {
  timestamp: string;
  date: string;
  regime: {
    symbol: string;
    price: number;
    sma200: number;
    status: string;
  };
  picks: V2Pick[];
}

export default function FindStocksV2Client() {
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backtestData, setBacktestData] = useState<any[]>([]);
  const [engineConfig, setEngineConfig] = useState<any>(null);
  const [stressData, setStressData] = useState<any[]>([]);

  useEffect(() => {
    // Fetch Backtest Data for Tuning Lab
    fetch("/data/scientific-tuning.json")
      .then(res => res.json())
      .then(data => setBacktestData(data.results || []))
      .catch(() => { });

    // Fetch Engine Config
    fetch("/data/engine-config.json")
      .then(res => res.json())
      .then(data => setEngineConfig(data))
      .catch(() => { });

    // Fetch Stress Data
    fetch("/data/adversarial-audit.json")
      .then(res => res.json())
      .then(data => setStressData(data.results || []))
      .catch(() => { });
  }, []);

  useEffect(() => {
    const fetchLatestAudit = async () => {
      try {
        // In production, we'd fetch from STOCKSUNIFY2 repo or local path
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");

        const sources = [
          `/data/v2/current.json`,
          `/data/v2/history/${y}/${m}/${d}.json`,
          `https://raw.githubusercontent.com/eltonaguiar/STOCKSUNIFY2/main/data/v2/history/${y}/${m}/${d}.json`,

          // Fallback to yesterday if today's isn't ready
          `https://raw.githubusercontent.com/eltonaguiar/STOCKSUNIFY2/main/data/v2/history/${y}/${m}/${String(now.getDate() - 1).padStart(2, "0")}.json`,
        ];

        for (const url of sources) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              setAudit(data);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error(`Failed to fetch from ${url}`, e);
          }
        }

        setError(
          "Latest scientific ledger not found. Use the manual audit links below.",
        );
      } catch (err) {
        setError("Failed to load scientific infrastructure.");
      } finally {
        setLoading(false);
      }
    };

    fetchLatestAudit();
  }, []);

  const sortedPicks = useMemo(() => {
    return audit?.picks.sort((a, b) => b.score - a.score) || [];
  }, [audit]);

  return (
    <div className="min-h-screen bg-[#06070a] text-white selection:bg-indigo-500/30">
      {/* Header / Global Context */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/findstocks"
              className="text-neutral-500 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest leading-none mb-1">
                STOCKSUNIFY2 // ENGINE
              </div>
              <h1 className="text-lg font-black tracking-tighter uppercase whitespace-nowrap">
                Scientific Audit Terminal
              </h1>
            </div>
          </div>

          {audit && (
            <div className="hidden md:flex items-center gap-8">
              <div className="text-right">
                <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
                  Market Regime
                </div>
                <div
                  className={`text-xs font-bold ${audit.regime.status === "BULLISH" ? "text-emerald-400" : "text-red-400"}`}
                >
                  {audit.regime.symbol}: {audit.regime.status} (
                  {Math.round(audit.regime.price)} {">"}{" "}
                  {Math.round(audit.regime.sma200)})
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-right font-mono">
                <div className="text-[9px] text-neutral-500 uppercase tracking-widest">
                  Audit Date
                </div>
                <div className="text-xs font-bold text-white">{audit.date}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero / Disclaimer */}
        <div className="mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />{" "}
            Falsifiable Output Alpha
          </div>
          <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-tight max-w-4xl">
            A Terminal for <br />
            <span className="text-indigo-500">Institutional Rigor.</span>
          </h2>
          <p className="text-xl text-neutral-400 font-serif italic max-w-2xl leading-relaxed">
            "If you cannot prove it in an append-only ledger, it did not happen.
            V2 eliminates hindsight bias by archiving every recommendation at
            the micro-second of generation."
          </p>
        </div>

        {loading ? (
          <div className="py-40 text-center animate-pulse">
            <div className="text-3xl font-black text-neutral-800 tracking-widest mb-4 uppercase italic">
              Loading Validated Picks...
            </div>
            <div className="text-xs font-mono text-neutral-600">
              Syncing with STOCKSUNIFY2 GitHub Genesis...
            </div>
          </div>
        ) : error ? (
          <div className="py-20 flex flex-col items-center">
            <div className="p-12 rounded-[3rem] bg-red-500/5 border border-red-500/10 text-center max-w-xl">
              <h3 className="text-xl font-bold text-red-400 mb-4">
                Sync Gap Detected
              </h3>
              <p className="text-neutral-500 mb-8">{error}</p>
              <div className="flex flex-col gap-4">
                <a
                  href="https://github.com/eltonaguiar/STOCKSUNIFY2/tree/main/data/v2/history"
                  target="_blank"
                  className="px-8 py-3 bg-white text-black text-sm font-black rounded-full hover:scale-105 transition-all"
                >
                  View Raw Immutable Ledgers
                </a>
                <Link
                  href="/findstocks"
                  className="text-neutral-500 hover:text-white text-xs font-mono underline underline-offset-4"
                >
                  Return to V1 Terminal
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-32">
            {/* Picks Grid */}
            <section>
              <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-6">
                <h3 className="text-xs font-mono uppercase tracking-[0.4em] text-neutral-500">
                  Audited Strategic Output
                </h3>
                <div className="text-[10px] font-mono text-neutral-600 uppercase">
                  Sorted by Scientific Confidence Score
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedPicks.map((pick, i) => (
                  <div
                    key={i}
                    className="glass-panel group p-1 rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-white/5 to-transparent hover:border-indigo-500/50 transition-all duration-500"
                  >
                    <div className="p-8 space-y-8">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-3xl font-black tracking-tighter group-hover:text-indigo-400 transition-colors">
                            {pick.symbol}
                          </h4>
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                            {pick.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-white">
                            {pick.score}
                          </div>
                          <div className="text-[8px] font-mono text-neutral-600 uppercase">
                            Score / 100
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${pick.rating === "STRONG BUY"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-indigo-500/10 text-indigo-400"
                              }`}
                          >
                            {pick.rating}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-500 uppercase">
                            {pick.algorithm}
                          </span>
                        </div>

                        {/* Strategic Metrics (V2 Specific) */}
                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                          {Object.entries(pick.metrics)
                            .slice(0, 4)
                            .map(([k, v]) => (
                              <div key={k}>
                                <div className="text-[8px] font-mono text-neutral-600 uppercase tracking-tighter">
                                  {k}
                                </div>
                                <div className="text-xs font-bold text-neutral-300">
                                  {typeof v === "number"
                                    ? v.toFixed(2)
                                    : String(v)}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono pt-4 text-neutral-500">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded bg-neutral-800 flex items-center justify-center text-[6px]">
                            #
                          </span>
                          {pick.v2_hash.slice(0, 12)}...
                        </div>
                        <a
                          href={`https://finance.yahoo.com/quote/${pick.symbol}`}
                          target="_blank"
                          className="hover:text-white underline underline-offset-4"
                        >
                          Yahoo →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Macro Sector Rotation */}
            <section>
              <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-6">
                <h3 className="text-xs font-mono uppercase tracking-[0.4em] text-neutral-500">
                  Macro-Economic Context
                </h3>
                <div className="text-[10px] font-mono text-neutral-600 uppercase">
                  Sector Rotation Matrix
                </div>
              </div>
              <SectorRotationWidget />
            </section>

            {/* Scientific Tuning Lab (New) */}
            <section>
              <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-6">
                <h3 className="text-xs font-mono uppercase tracking-[0.4em] text-neutral-500">
                  Scientific Tuning Lab
                </h3>
                <div className="text-[10px] font-mono text-neutral-600 uppercase">
                  Threshold Evolution & Efficiency Frontier
                </div>
              </div>
              <div className="grid lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                  <EfficiencyFrontierChart data={backtestData} />
                </div>
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                    <h4 className="text-sm font-bold text-white mb-2">The Efficiency Frontier</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Visualization of the trade-off between <strong>Quality (Win Rate)</strong> and <strong>Quantity (Trade Frequency)</strong>.
                      Optimal thresholds are selected where the curve begins to "plateau" or drop off sharply.
                    </p>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="text-sm font-bold text-white mb-2">Walk-Forward Guard</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      If an algorithm falls below its historical frontier, the Walk-Forward Engine automatically tightens thresholds to preserve capital.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Adversarial Stress Audit (New) */}
            <section>
              <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-6">
                <h3 className="text-xs font-mono uppercase tracking-[0.4em] text-neutral-500">
                  Adversarial Stress Audit
                </h3>
                <div className="text-[10px] font-mono text-neutral-600 uppercase">
                  Black Swan Resilience
                </div>
              </div>
              <div className="grid lg:grid-cols-3 gap-12">
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                    <h4 className="text-sm font-bold text-white mb-2">The "Falling Knife" Test</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      We force algorithms to trade during historic market flushes (&gt; 3% drop in 5 days).
                      This measures how many "False Positives" occur during extreme panic.
                    </p>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h1 className="text-2xl font-black text-white mb-1">{stressData.length}</h1>
                    <p className="text-[10px] text-neutral-500 uppercase font-mono tracking-widest">
                      Stress Events Captured
                    </p>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <StressAuditGrid data={stressData} />
                </div>
              </div>
            </section>

            {/* V2 Scientific Strategies Section */}
            <section>
              <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-6">
                <h3 className="text-xs font-mono uppercase tracking-[0.4em] text-neutral-500">
                  V2 Scientific Strategies
                </h3>
                <div className="text-[10px] font-mono text-neutral-600 uppercase">
                  Research-Backed Methodologies
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    abbr: "RAR",
                    name: "Regime-Aware Reversion",
                    desc: "Buy quality stocks in an uptrend with RSI dips, but only when market regime is BULLISH (SPY > 200 SMA).",
                    timeframe: "7 days",
                    color: "emerald",
                    metrics: ["RSI < 40", "Stage 2 Uptrend", "Bullish Regime"],
                  },
                  {
                    abbr: "VAM",
                    name: "Volatility-Adjusted Momentum",
                    desc: "Ranks stocks by Martin Ratio (Return / Ulcer Index) to find momentum with controlled drawdowns.",
                    timeframe: "1 month",
                    color: "blue",
                    metrics: ["Martin Ratio", "Ulcer Index", "Return/Risk"],
                  },
                  {
                    abbr: "LSP",
                    name: "Liquidity-Shielded Penny",
                    desc: "Penny stocks that pass a slippage torture test. Only picks with sufficient liquidity to prevent execution collapse.",
                    timeframe: "24 hours",
                    color: "amber",
                    metrics: ["3x Slippage Test", "Volume Cap", "Low Float"],
                  },
                  {
                    abbr: "SCS",
                    name: "Scientific CAN SLIM",
                    desc: "Traditional O'Neil methodology enhanced with regime guards and slippage penalties.",
                    timeframe: "1 year",
                    color: "purple",
                    metrics: ["RS Rating", "Stage 2", "Regime Filter"],
                  },
                  {
                    abbr: "AT",
                    name: "Adversarial Trend",
                    desc: "Volatility-normalized trend following. Finds consistent moves that survive parameter perturbation.",
                    timeframe: "1 month",
                    color: "rose",
                    metrics: ["ATR Normalized", "Trend Strength", "Stability"],
                  },
                  {
                    abbr: "IF",
                    name: "Institutional Footprint",
                    desc: "Detects institutional accumulation via Volume Z-Score > 2.0 combined with trend confirmation and breakout detection.",
                    timeframe: "7 days",
                    color: "indigo",
                    metrics: ["Vol Z-Score > 2", "Breakout", "Trend Confirm"],
                  },
                ].map((strategy, i) => (
                  <div
                    key={i}
                    className={`glass-panel p-8 rounded-[2rem] border border-white/5 bg-gradient-to-br from-${strategy.color}-500/10 to-transparent hover:border-${strategy.color}-500/30 transition-all`}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div
                        className={`px-3 py-1 rounded-lg bg-${strategy.color}-500/20 text-${strategy.color}-400 text-xs font-black tracking-wider`}
                      >
                        {strategy.abbr}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-500">
                        {strategy.timeframe}
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-white mb-3">
                      {strategy.name}
                    </h4>
                    <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                      {strategy.desc}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {strategy.metrics.map((m, j) => (
                        <span
                          key={j}
                          className="text-[9px] font-mono text-neutral-400 bg-white/5 px-2 py-1 rounded"
                        >
                          {m}
                        </span>
                      ))}
                      {engineConfig?.thresholds?.[strategy.name] && (
                        <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded font-bold border border-indigo-500/20">
                          Min Score: {engineConfig.thresholds[strategy.name]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Research Paper Embed Highlights */}
            <section className="bg-white/5 rounded-[4rem] p-12 md:p-20 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10 grid lg:grid-cols-2 gap-20">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-[0.4em] text-indigo-400 mb-10">
                    Verification Manifesto
                  </h3>
                  <h4 className="text-4xl font-black mb-8 tracking-tighter">
                    Why standard backtests are often "Mirages".
                  </h4>
                  <div className="space-y-6 text-neutral-400 text-lg font-serif">
                    <p>
                      "Analysis flagged{" "}
                      <strong className="text-white">Survivorship Bias</strong>{" "}
                      and{" "}
                      <strong className="text-white">Look-ahead Bias</strong> as
                      the primary killers of retail alpha."
                    </p>
                    <p>
                      The V2 architecture enforces{" "}
                      <strong className="text-white">Temporal Isolation</strong>
                      —ensuring the algorithm cannot 'peek' into future earnings
                      or price action during the decision phase.
                    </p>
                  </div>
                  <div className="mt-12">
                    <Link
                      href="/findstocks/research"
                      className="px-10 py-4 bg-indigo-500 text-white font-black rounded-full hover:bg-indigo-400 transition-all inline-block"
                    >
                      Read Full Research Paper
                    </Link>
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                      V2 Integrity Protocol
                    </h5>
                    <ul className="space-y-6">
                      {[
                        {
                          t: "Append-Only Auditing",
                          d: "Every pick is hashed and committed to Git history. Deletion or modification of history is detectable.",
                        },
                        {
                          t: "Slippage Torture",
                          d: "Performance is penalized by 3x - 5x the standard spread to find 'Bulletproof' liquidity.",
                        },
                        {
                          t: "Regime Filtering",
                          d: "The engine shuts down during bearish regimes (SPY < 200 SMA) to preserve capital.",
                        },
                      ].map((item, i) => (
                        <li key={i} className="flex gap-4">
                          <span className="text-indigo-400 font-mono text-xs">
                            0{i + 1}
                          </span>
                          <div>
                            <div className="font-bold text-white uppercase text-xs tracking-wider">
                              {item.t}
                            </div>
                            <div className="text-sm text-neutral-500 leading-relaxed font-light">
                              {item.d}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Performance Dashboard */}
            <section>
              <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-6">
                <h3 className="text-xs font-mono uppercase tracking-[0.4em] text-neutral-500">
                  Performance Verification
                </h3>
                <div className="text-[10px] font-mono text-neutral-600 uppercase">
                  Truth Engine Results
                </div>
              </div>
              <PerformanceDashboard />
            </section>

            {/* Truth Engine Summary */}
            <section className="text-center py-20 px-6 rounded-[3rem] border border-white/5 bg-gradient-to-b from-transparent to-indigo-500/5">
              <div className="max-w-3xl mx-auto">
                <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-neutral-600 mb-8">
                  The Truth Engine
                </h3>
                <p className="text-2xl font-black mb-12 tracking-tight">
                  Automatic Performance Verification runs every Sunday at 11:00
                  PM UTC.
                </p>
                <div className="flex flex-wrap justify-center gap-6">
                  <a
                    href="https://github.com/eltonaguiar/STOCKSUNIFY2"
                    target="_blank"
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    <span className="font-mono text-[10px]">
                      GitHub Repository
                    </span>
                    <span className="text-indigo-500">↗</span>
                  </a>
                  <a
                    href="https://github.com/eltonaguiar/STOCKSUNIFY2/blob/main/README.md"
                    target="_blank"
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    <span className="font-mono text-[10px]">
                      Architecture Whitepaper
                    </span>
                    <span className="text-indigo-500">↗</span>
                  </a>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="p-12 border-t border-white/5 text-center mt-40">
        <div className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest">
          STOCKSUNIFY2 // EXPERIMENTAL FINANCIAL LINGUISTICS // VER: 2.0.0-ALPHA
        </div>
      </footer>
    </div>
  );
}
