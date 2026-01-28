
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BacktestResult {
    algorithm: string;
    threshold: number;
    totalTrades: number;
    winRate: number;
    avgReturn: number;
    sharpeRatio: number;
}

interface EfficiencyFrontierChartProps {
    data: BacktestResult[];
}

export default function EfficiencyFrontierChart({ data }: EfficiencyFrontierChartProps) {
    const [hoveredPoint, setHoveredPoint] = useState<BacktestResult | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const algorithms = useMemo(() => Array.from(new Set(data.map(d => d.algorithm))), [data]);

    // Scales
    const maxTrades = Math.max(...data.map(d => d.totalTrades)) * 1.1;
    const maxWinRate = 100;

    // Colors
    const colors: Record<string, string> = {
        "CAN SLIM": "#10b981", // Emerald
        "Alpha Predator": "#8b5cf6", // Violet
        "Composite Rating": "#f59e0b", // Amber
        "Technical Momentum": "#3b82f6", // Blue
    };

    return (
        <div
            className="w-full aspect-video relative bg-black/20 rounded-xl border border-white/5 p-4 overflow-visible"
            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        >
            {/* Grid Lines */}
            <div className="absolute inset-4 border-l border-b border-white/10">
                {[20, 40, 60, 80, 100].map(y => (
                    <div key={y} className="absolute w-full border-t border-white/5 text-[10px] text-neutral-600" style={{ bottom: `${y}%`, left: 0 }}>
                        <span className="absolute -left-6 -top-2">{y}%</span>
                    </div>
                ))}
            </div>

            {/* X-Axis Label */}
            <div className="absolute bottom-1 right-4 text-[10px] text-neutral-500 uppercase tracking-widest">
                Trade Volume (Signal Frequency)
            </div>
            {/* Y-Axis Label */}
            <div className="absolute top-4 left-1 text-[10px] text-neutral-500 uppercase tracking-widest rotate-[-90deg] origin-left">
                Win Rate (Quality)
            </div>

            {/* Plot Data */}
            <svg className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] overflow-visible">
                {algorithms.map(algo => {
                    const algoData = data.filter(d => d.algorithm === algo && d.totalTrades > 0).sort((a, b) => a.threshold - b.threshold);
                    if (algoData.length === 0) return null;

                    const points = algoData.map(d => {
                        const x = (d.totalTrades / maxTrades) * 100;
                        const y = 100 - (d.winRate / maxWinRate) * 100; // SVG Y is top-down
                        return `${x},${y}`;
                    }).join(" ");

                    return (
                        <g key={algo}>
                            {/* Line */}
                            <motion.polyline
                                points={points}
                                fill="none"
                                stroke={colors[algo] || "#fff"}
                                strokeWidth="2"
                                strokeOpacity="0.3"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                            />

                            {/* Points */}
                            {algoData.map((d, i) => {
                                const x = (d.totalTrades / maxTrades) * 100;
                                const y = 100 - (d.winRate / maxWinRate) * 100;
                                return (
                                    <motion.g
                                        key={i}
                                        onMouseEnter={() => setHoveredPoint(d)}
                                        onMouseLeave={() => setHoveredPoint(null)}
                                        whileHover={{ scale: 1.5 }}
                                    >
                                        <circle
                                            cx={`${x}%`}
                                            cy={`${y}%`}
                                            r={4}
                                            fill={colors[algo] || "#fff"}
                                            stroke="#000"
                                            strokeWidth="1"
                                            className="cursor-pointer"
                                        />
                                    </motion.g>
                                );
                            })}
                        </g>
                    );
                })}
            </svg>

            {/* Floating Tooltip */}
            <AnimatePresence>
                {hoveredPoint && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="fixed z-[100] pointer-events-none p-3 rounded-lg bg-[#0d0d10] border border-white/10 shadow-2xl backdrop-blur-md"
                        style={{ left: mousePos.x + 20, top: mousePos.y - 40 }}
                    >
                        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest border-b border-white/5 pb-1 mb-2">
                            {hoveredPoint.algorithm} - T{hoveredPoint.threshold}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div>
                                <span className="text-[10px] text-neutral-600 block">Win Rate</span>
                                <span className="text-sm font-bold text-white">{hoveredPoint.winRate.toFixed(1)}%</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-neutral-600 block">Trades</span>
                                <span className="text-sm font-bold text-white">{hoveredPoint.totalTrades}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-neutral-600 block">Avg Return</span>
                                <span className={`text-sm font-bold ${hoveredPoint.avgReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {hoveredPoint.avgReturn.toFixed(2)}%
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-neutral-600 block">Sharpe</span>
                                <span className="text-sm font-bold text-indigo-400">{hoveredPoint.sharpeRatio.toFixed(2)}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Legend */}
            <div className="absolute top-4 right-4 space-y-2">
                {algorithms.map(algo => (
                    <div key={algo} className="flex items-center gap-2 text-xs text-neutral-400">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[algo] || "#fff" }} />
                        {algo}
                    </div>
                ))}
            </div>
        </div>
    );
}
