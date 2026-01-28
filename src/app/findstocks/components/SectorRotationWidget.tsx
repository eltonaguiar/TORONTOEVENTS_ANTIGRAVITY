"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface SectorData {
    symbol: string;
    name: string;
    price: number;
    change1m: number;
    rsRatio: number;
    rsMomentum: number;
    quadrant: "Leading" | "Weakening" | "Lagging" | "Improving";
    score: number;
}

interface SectorReport {
    scanDate: string;
    benchmark: {
        symbol: string;
        price: number;
        change1m: string;
    };
    sectors: SectorData[];
}

export default function SectorRotationWidget() {
    const [data, setData] = useState<SectorReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/data/sector-rotation.json")
            .then((res) => {
                if (res.ok) return res.json();
                throw new Error("Failed");
            })
            .then((json) => {
                setData(json);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading || !data) return null; // Hide if no data

    // Group by Quadrant
    const grouped = {
        Leading: data.sectors.filter((s) => s.quadrant === "Leading"),
        Weakening: data.sectors.filter((s) => s.quadrant === "Weakening"),
        Improving: data.sectors.filter((s) => s.quadrant === "Improving"),
        Lagging: data.sectors.filter((s) => s.quadrant === "Lagging"),
    };

    const quadrantColors = {
        Leading: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        Weakening: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        Improving: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        Lagging: "text-red-400 bg-red-500/10 border-red-500/20",
    };

    const quadrantDesc = {
        Leading: "Outperforming & Gaining Momentum (Buy Leaders)",
        Weakening: "Outperforming but Losing Momentum (Take Profits)",
        Improving: "Underperforming but Gaining Momentum (Watch List)",
        Lagging: "Underperforming & Losing Momentum (Avoid)",
    };

    return (
        <div className="glass-panel p-8 rounded-[2rem] border border-white/5 bg-black/40">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        Macro Sector Rotation
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Analyzing 11 major sectors relative to SPY ({data.benchmark.change1m}{" "}
                        MoM).
                    </p>
                </div>
                <div className="text-[10px] font-mono text-neutral-500 uppercase">
                    Updated: {new Date(data.scanDate).toLocaleDateString()}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Render Quadrants */}
                {(["Leading", "Improving", "Weakening", "Lagging"] as const).map(
                    (q) => (
                        <div
                            key={q}
                            className={`p-6 rounded-2xl border ${quadrantColors[q].split(" ")[2]} ${quadrantColors[q].split(" ")[1]}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h4
                                    className={`text-sm font-black uppercase tracking-wider ${quadrantColors[q].split(" ")[0]}`}
                                >
                                    {q}
                                </h4>
                                {q === "Leading" && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-bold">ACCUMULATE</span>
                                )}
                            </div>
                            <p className="text-[10px] text-neutral-400 mb-4 font-mono uppercase tracking-tight opacity-70">
                                {quadrantDesc[q]}
                            </p>

                            <div className="space-y-3">
                                {grouped[q].length > 0 ? (
                                    grouped[q].map((s) => (
                                        <div
                                            key={s.symbol}
                                            className="flex justify-between items-center group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`font-bold text-white text-sm group-hover:underline`}>{s.symbol}</span>
                                                <span className="text-[10px] text-neutral-500 hidden sm:inline-block truncate max-w-[120px]">{s.name}</span>
                                            </div>
                                            <div className={`font-mono text-xs ${s.rsMomentum > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {s.change1m > 0 ? '+' : ''}{s.change1m}%
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-neutral-600 italic py-2">
                                        No sectors currently in this phase.
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
