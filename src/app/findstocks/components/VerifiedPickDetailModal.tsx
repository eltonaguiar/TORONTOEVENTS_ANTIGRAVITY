"use client";

// This component will display the detailed breakdown of a single verified stock pick.

import { useEffect, useMemo } from "react";
import { motion } from 'framer-motion';

// Copied from PerformanceDashboard.tsx for now
export interface VerifiedPick {
  symbol: string;
  name: string;
  algorithm: string;
  score: number;
  rating: string;
  exitPrice: number;
  realizedReturn: number;
  verifiedAt: string;
  metrics: Record<string, any>;
  // The audit this pick belongs to
  auditDate?: string;
}

interface Props {
  pick: VerifiedPick;
  onClose: () => void;
}

export default function VerifiedPickDetailModal({ pick, onClose }: Props) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!pick) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ ease: "easeInOut", duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl p-8 md:p-12 rounded-[2rem] border border-white/10 bg-[#0d0d10] shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
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
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-5xl font-black tracking-tighter text-white">
              {pick.symbol}
            </h2>
            <p className="text-sm text-neutral-500 font-mono tracking-widest uppercase">
              {pick.name}
            </p>
          </div>
          <div className="border-b border-white/10" />

          <div className="space-y-8 pt-6">
            {/* Core Performance */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
                  Return
                </div>
                <div
                  className={`text-3xl font-black ${pick.realizedReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {pick.realizedReturn >= 0 ? "+" : ""}
                  {pick.realizedReturn.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
                  Entry Price
                </div>
                <div className="text-xl font-mono font-bold text-white">
                  ${(pick.metrics.price || 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
                  Exit Price
                </div>
                <div className="text-xl font-mono font-bold text-white">
                  ${(pick.exitPrice || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Dates & Algo */}
            <div className="grid grid-cols-3 gap-4 text-center border-y border-white/5 py-4">
              <div>
                <div className="text-xs font-mono text-neutral-500 uppercase">
                  Date Picked
                </div>
                <div className="text-sm font-bold text-white">
                  {pick.auditDate || "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-neutral-500 uppercase">
                  Date Verified
                </div>
                <div className="text-sm font-bold text-white">
                  {new Date(pick.verifiedAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-neutral-500 uppercase">
                  Time Held
                </div>
                <div className="text-sm font-bold text-white">
                  {Math.round(
                    (new Date(pick.verifiedAt).getTime() -
                      new Date(pick.auditDate || 0).getTime()) /
                      (1000 * 3600 * 24),
                  )}{" "}
                  days
                </div>
              </div>
            </div>

            {/* Rationale */}
            <div>
              <h4 className="text-xs font-mono text-neutral-500 uppercase tracking-widest text-center mb-4">
                Selection Rationale
              </h4>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <div className="flex justify-between items-center text-center mb-4">
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
                      Rating
                    </div>
                    <div
                      className={`text-sm font-bold ${pick.rating === "STRONG BUY" ? "text-emerald-400" : "text-blue-400"}`}
                    >
                      {pick.rating}
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
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-4 border-t border-white/5 font-mono text-xs">
                  {Object.entries(pick.metrics).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center"
                    >
                      <span className="text-neutral-500 capitalize">
                        {key.replace(/_/g, " ")}:
                      </span>
                      <span className="font-bold text-white">
                        {typeof value === "number"
                          ? value.toFixed(2)
                          : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
