"use client";

// This component will display the detailed breakdown of a single verified stock pick.

import { useEffect } from "react";
import { motion } from "framer-motion";

export interface VerifiedPick {
  id: string; // Hash
  symbol: string;
  name: string;
  algorithm: string;
  score: number;
  rating: string;

  // Price Data
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  realizedReturn: number;

  // Timing
  date: string; // Picked At
  verifiedAt: string;
  timeframe: string; // e.g. "3d"

  // Metadata
  outcome: "WIN" | "LOSS" | "PENDING";
  risk: string; // High, Medium, Low

  // Explanations
  rationale: string; // Tech explanation
  simpleReason: string; // Plain English
  investorType: string; // e.g. "Day Trader"

  // Raw Data
  metrics: Record<string, any>;
}

interface Props {
  pick: VerifiedPick;
  onClose: () => void;
}

export default function VerifiedPickDetailModal({ pick, onClose }: Props) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  if (!pick) return null;

  const daysHeld = Math.round(
    (new Date(pick.verifiedAt).getTime() - new Date(pick.date).getTime()) /
    (1000 * 3600 * 24),
  );

  const rawEarningsDays = pick.metrics?.daysToEarnings;
  const hasUpcomingEarnings =
    typeof rawEarningsDays === "number" &&
    !Number.isNaN(rawEarningsDays) &&
    rawEarningsDays >= 0;
  const earningsDaysValue = hasUpcomingEarnings
    ? Math.max(0, Math.round(rawEarningsDays))
    : null;
  const earningsDateLabel =
    typeof pick.metrics?.earningsDate === "string"
      ? pick.metrics.earningsDate
      : undefined;
  const isHighRiskEarnings =
    earningsDaysValue !== null && earningsDaysValue < 7;
  const countdownLabel = (() => {
    if (earningsDaysValue === null) return "";
    if (earningsDaysValue === 0) return "Earnings: Today";
    if (earningsDaysValue === 1) return "Earnings: Tomorrow";
    return `Earnings: ${earningsDaysValue} days`;
  })();
  const countdownDisplay =
    countdownLabel &&
    (isHighRiskEarnings ? `${countdownLabel} ⚠️` : countdownLabel);
  const countdownPanelClass = isHighRiskEarnings
    ? "border-red-500/20 bg-red-500/10"
    : "border-indigo-500/20 bg-indigo-500/5";
  const countdownBadgeClass = isHighRiskEarnings
    ? "text-red-300"
    : "text-emerald-300";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ ease: "easeInOut", duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl p-6 md:p-8 rounded-[2rem] border border-white/10 bg-[#0d0d10] shadow-2xl my-8"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
                {pick.symbol}
              </h2>
              <p className="text-sm text-neutral-500 font-mono tracking-widest uppercase mt-1">
                {pick.name}
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-xl border ${pick.outcome === "WIN"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : pick.outcome === "LOSS"
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                }`}
            >
              <div className="text-xs font-bold uppercase tracking-widest text-center">
                Outcome
              </div>
              <div className="text-xl font-black text-center">
                {pick.outcome}
              </div>
            </div>
          </div>
          {earningsDaysValue !== null && countdownDisplay && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${countdownPanelClass}`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                <span>Earnings Event</span>
                <span className={`font-bold ${countdownBadgeClass}`}>
                  {isHighRiskEarnings ? "High Risk" : "On Schedule"}
                </span>
              </div>
              <div className="mt-2 text-lg font-bold text-white">
                {countdownDisplay}
              </div>
              {earningsDateLabel && (
                <div className="text-[11px] text-neutral-500">
                  Date: {earningsDateLabel}
                </div>
              )}
              <p className="mt-4 text-[11px] text-neutral-500 leading-relaxed border-t border-white/5 pt-3">
                {isHighRiskEarnings
                  ? "⚠️ Strategy Halt: Algorithms apply a -100 point safety penalty when earnings are within 5 days to prevent binary event gambling."
                  : "✅ Strategy Go: Earnings are outside the volatility window, allowing technical indicators to drive the valuation."}
              </p>
            </div>
          )}

          <div className="border-b border-white/10" />

          {/* New: "Simple Terms" Guide */}
          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-indigo-400">💡</span>
              Plain English Explanation
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">
                  Why We Picked It
                </div>
                <p className="text-neutral-300 text-sm leading-relaxed">
                  {pick.simpleReason}
                </p>
              </div>
              <div>
                <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">
                  Best For
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                  {pick.investorType}
                </div>
                <div className="mt-4 flex gap-4">
                  <div>
                    <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">
                      Hold Time
                    </div>
                    <div className="text-white font-bold">{pick.timeframe}</div>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">
                      Risk Level
                    </div>
                    <div
                      className={`font-bold ${pick.risk === "High"
                        ? "text-red-400"
                        : pick.risk === "Medium"
                          ? "text-amber-400"
                          : "text-emerald-400"
                        }`}
                    >
                      {pick.risk}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Performance */}
          <div className="space-y-8 pt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                  Result
                </div>
                <div
                  className={`text-2xl font-black ${pick.realizedReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {pick.realizedReturn >= 0 ? "+" : ""}
                  {pick.realizedReturn.toFixed(2)}%
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                  Buy Price
                </div>
                <div className="text-lg font-mono font-bold text-white">
                  ${(pick.entryPrice || 0).toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                  Sell Price
                </div>
                <div className="text-lg font-mono font-bold text-white">
                  ${(pick.exitPrice || 0).toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                  Stop Loss
                </div>
                <div className="text-lg font-mono font-bold text-red-400">
                  ${(pick.stopLoss || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-3 gap-4 text-center border-y border-white/5 py-4">
              <div>
                <div className="text-xs font-mono text-neutral-500 uppercase">
                  Identified
                </div>
                <div className="text-sm font-bold text-white">
                  {new Date(pick.date).toLocaleDateString()}
                </div>
                <div className="text-[10px] text-neutral-600">
                  {new Date(pick.date).toLocaleTimeString()}
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-neutral-500 uppercase">
                  Verified
                </div>
                <div className="text-sm font-bold text-white">
                  {new Date(pick.verifiedAt).toLocaleDateString()}
                </div>
                <div className="text-[10px] text-neutral-600">
                  {new Date(pick.verifiedAt).toLocaleTimeString()}
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-neutral-500 uppercase">
                  Held For
                </div>
                <div className="text-sm font-bold text-white">
                  {Math.max(0, daysHeld)} days
                </div>
              </div>
            </div>

            {/* Technical Detail */}
            <div>
              <h4 className="text-xs font-mono text-neutral-500 uppercase tracking-widest text-center mb-4">
                Algorithm Stats
              </h4>

              <div className="flex justify-between items-center text-center mb-4 px-8">
                <div className="flex-1">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">
                    Algorithm
                  </div>
                  <div className="text-sm font-bold text-indigo-400">
                    {pick.algorithm}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">
                    Score
                  </div>
                  <div className="text-sm font-bold text-white">
                    {pick.score}/100
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/20 border border-white/5 overflow-hidden">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs">
                  {Object.entries(pick.metrics).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center border-b border-white/5 pb-1 last:border-0"
                    >
                      <span className="text-neutral-500 capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}:
                      </span>
                      <span className="font-bold text-white text-right">
                        {typeof value === "number"
                          ? value.toFixed(2)
                          : typeof value === "object"
                            ? JSON.stringify(value).slice(0, 20) + "..."
                            : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
