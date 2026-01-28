
"use client";

import { motion } from "framer-motion";

interface StressEvent {
    date: string;
    symbol: string;
    dropAtSignal: number;
    maxDrawdownAfter: number;
    tenDayResult: number;
    signals: {
        canslim: number;
        predator: number;
    };
}

interface StressAuditGridProps {
    data: StressEvent[];
}

export default function StressAuditGrid({ data }: StressAuditGridProps) {
    // Sort by most recent
    const latestEvents = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    if (data.length === 0) return (
        <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/5 text-neutral-500 font-mono text-xs uppercase tracking-widest">
            No stress events captured in lookback window
        </div>
    );

    return (
        <div className="grid md:grid-cols-2 gap-4">
            {latestEvents.map((event, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col gap-4"
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-white">{event.symbol}</span>
                            <span className="text-[10px] font-mono text-neutral-500">{event.date}</span>
                        </div>
                        <div className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase">
                            {event.dropAtSignal.toFixed(1)}% Flush
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                            <span className="text-[9px] text-neutral-600 block uppercase">Max DD</span>
                            <span className="text-xs font-bold text-red-400">{event.maxDrawdownAfter.toFixed(1)}%</span>
                        </div>
                        <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                            <span className="text-[9px] text-neutral-600 block uppercase">Recovery</span>
                            <span className={`text-xs font-bold ${event.tenDayResult >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                                {event.tenDayResult >= 0 ? "+" : ""}{event.tenDayResult.toFixed(1)}%
                            </span>
                        </div>
                        <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                            <span className="text-[9px] text-neutral-600 block uppercase">Signal Strength</span>
                            <div className="flex gap-1 items-center mt-1">
                                <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500"
                                        style={{ width: `${Math.max(event.signals.canslim, event.signals.predator)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 text-[9px] font-mono text-neutral-500 uppercase">
                        <div>Canslim: <span className="text-white">{event.signals.canslim}</span></div>
                        <div>Predator: <span className="text-white">{event.signals.predator}</span></div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
