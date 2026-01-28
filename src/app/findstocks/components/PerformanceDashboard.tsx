"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import VerifiedPickDetailModal, {
  VerifiedPick,
} from "./VerifiedPickDetailModal";
import VerifiedPickList from "./VerifiedPickList";

// Interface matching data/pick-performance.json
interface PerformanceData {
  lastVerified: string;
  totalPicks: number;
  verified: number;
  pending: number;
  wins: number;
  losses: number;
  winRate: number;
  avgReturn: number;
  byAlgorithm: Record<
    string,
    {
      picks: number;
      verified: number;
      wins: number;
      losses: number;
      winRate: number;
      avgReturn: number;
    }
  >;
  allPicks: PickData[];
}

interface PickData {
  symbol: string;
  name: string;
  price: number;
  rating: string;
  timeframe: string;
  algorithm: string;
  score: number;
  risk: string;
  stopLoss: number;
  indicators: any;
  slippageSimulated: boolean;
  simulatedEntryPrice: number;
  pickedAt: string;
  pickHash: string;
  verifiedAt?: string;
  currentPrice?: number;
  returnPercent?: number;
  status: "WIN" | "LOSS" | "PENDING";
  daysHeld?: number;
}

export default function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPick, setSelectedPick] = useState<VerifiedPick | null>(null);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        const res = await fetch("/data/pick-performance.json");
        if (!res.ok) throw new Error("Failed to load performance data");
        const json: PerformanceData = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        setError("Failed to load performance data");
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, []);

  // Helper to generate "Simple Terms" context
  const getPlainEnglishContext = (p: PickData) => {
    let simpleReason = "Selected based on technical strength.";
    let investorType = "General";

    // 1. Simplify Algorithm Reason
    switch (p.algorithm) {
      case "Alpha Predator":
        simpleReason = "This stock showed a rare combination of strong trend and momentum. It's moving fast, and we want to catch the wave early.";
        break;
      case "Technical Momentum":
        simpleReason = "This stock is 'breaking out', meaning it's pushing past a previous limit with high trading volume. Traders often buy here expecting a quick jump.";
        break;
      case "Value Sleeper":
        simpleReason = "A solid company that has been beaten down but is showing signs of waking up. A safer bet for those who like buying low.";
        break;
      case "CAN SLIM":
      case "Scientific CAN SLIM":
      case "SCS":
        simpleReason = "Follows a 'Growth Trend' strategy (inspired by CAN SLIM) that targets companies with strong upward movement and market leadership.";
        break;
      case "Liquidity-Shielded Penny":
      case "LSP":
      case "Penny Sniper":
        simpleReason = "A high-risk, high-reward penny stock that is seeing a sudden spike in interest. Only for those willing to lose the whole bet.";
        break;
      case "Regime-Aware Reversion":
      case "RAR":
        simpleReason = "This stock dropped too fast, too quickly. We are betting it will 'snap back' to its normal price soon.";
        break;
      case "Volatility-Adjusted Momentum":
      case "VAM":
        simpleReason = "A smooth, steady climber. It doesn't move fast, but it moves consistently up. Good for less stress.";
        break;
    }

    // 2. Determine Investor Type based on Timeframe & Algo
    if (p.timeframe === "24h") {
      investorType = "Day Trader (Very Active)";
    } else if (p.timeframe === "3d" || p.timeframe === "7d") {
      investorType = "Swing Trader (Check once a day)";
    } else if (p.timeframe === "1m" || p.timeframe === "3m") {
      investorType = "Position Trader (Check weekly)";
    } else {
      investorType = "Long Term Investor";
    }

    // Override for Penny
    if (p.risk === "Extreme" || p.algorithm.includes("Penny")) {
      investorType = "Speculator / Gambler";
    }

    return { simpleReason, investorType };
  };

  // Map raw data to VerifiedPick interface expected by children
  const picksFormatted: VerifiedPick[] = useMemo(() => {
    if (!data) return [];
    return data.allPicks.map((p) => {
      const { simpleReason, investorType } = getPlainEnglishContext(p);

      return {
        id: p.pickHash,
        symbol: p.symbol,
        name: p.name,
        algorithm: p.algorithm,
        score: p.score,
        rating: p.rating,

        // Price & Performance
        entryPrice: p.simulatedEntryPrice,
        exitPrice: p.currentPrice || p.simulatedEntryPrice,
        stopLoss: p.stopLoss,
        realizedReturn: p.returnPercent || 0,

        // Timing
        date: p.pickedAt,
        verifiedAt: p.verifiedAt || new Date().toISOString(), // Fallback if pending
        timeframe: p.timeframe,

        // Metadata
        outcome: p.status === "PENDING" ? "PENDING" : p.status as "WIN" | "LOSS",
        risk: p.risk,

        // Explanations
        rationale: `Algorithm: ${p.algorithm} | Score: ${p.score}/100`,
        simpleReason,
        investorType,

        metrics: p.indicators
      };
    });
  }, [data]);

  const verifiedPicks = useMemo(
    () => picksFormatted.filter((p) => p.outcome !== "PENDING"),
    [picksFormatted]
  );

  const pendingPicks = useMemo(
    () => picksFormatted.filter((p) => p.outcome === "PENDING"),
    [picksFormatted]
  );

  if (loading) {
    return (
      <div className="glass-panel p-8 rounded-[2rem] border border-white/5 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
        <div className="h-4 bg-white/5 rounded w-2/3" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel p-8 rounded-[2rem] border border-white/5 bg-red-500/10">
        <h3 className="text-red-400 font-bold">System Offline</h3>
        <p className="text-sm text-neutral-400">
          Performance data is currently unavailable.
        </p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {selectedPick && (
          <VerifiedPickDetailModal
            pick={selectedPick}
            onClose={() => setSelectedPick(null)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {/* Status Banner */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h3 className="font-bold text-white">Truth Engine Active</h3>
              <div className="text-xs text-neutral-400">
                Last Verified: {new Date(data.lastVerified).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white">{data.allPicks.length}</div>
            <div className="text-xs text-neutral-500 uppercase tracking-widest">Total Monitored</div>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">
              Pending
            </div>
            <div className="text-3xl font-black text-amber-400">
              {data.pending}
            </div>
            <div className="text-xs text-neutral-500">Awaiting maturity</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">
              Verified
            </div>
            <div className="text-3xl font-black text-white">
              {data.verified}
            </div>
            <div className="text-xs text-neutral-500">Completed audits</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">
              Avg Return
            </div>
            <div
              className={`text-3xl font-black ${data.avgReturn >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
            >
              {data.avgReturn >= 0 ? "+" : ""}
              {data.avgReturn.toFixed(2)}%
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">
              Win Rate
            </div>
            <div
              className={`text-3xl font-black ${data.winRate >= 50 ? "text-emerald-400" : "text-amber-400"
                }`}
            >
              {data.winRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Algorithm Performance */}
        <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm">
              V2
            </span>
            Algorithm Performance
          </h3>
          <div className="space-y-4">
            {Object.entries(data.byAlgorithm).map(([algoName, stats]) => {
              // Helper to display honest naming
              const displayName = algoName === "CAN SLIM" ? "Growth Trend (Scientific)" : algoName;

              return (
                <div
                  key={algoName}
                  className="flex items-center gap-4 p-4 rounded-xl bg-black/20 border border-white/5"
                >
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{displayName}</div>
                    <div className="text-xs text-neutral-500">
                      {stats.picks} picks ({stats.verified} verified)
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${stats.avgReturn >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                    >
                      {stats.avgReturn >= 0 ? "+" : ""}
                      {stats.avgReturn.toFixed(2)}%
                    </div>
                    <div className="text-xs text-neutral-500">
                      {stats.winRate.toFixed(0)}% win rate
                    </div>
                  </div>
                  <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stats.winRate >= 60
                        ? "bg-emerald-500"
                        : stats.winRate >= 40
                          ? "bg-amber-500"
                          : "bg-red-500"
                        }`}
                      style={{ width: `${Math.min(100, stats.winRate)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lists */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Pending (Live)</h3>
          <VerifiedPickList paged={true} picks={pendingPicks} onPickClick={setSelectedPick} />
        </div>

        {verifiedPicks.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Verified History</h3>
            <VerifiedPickList picks={verifiedPicks} onPickClick={setSelectedPick} />
          </div>
        )}
      </div>
    </>
  );
}
