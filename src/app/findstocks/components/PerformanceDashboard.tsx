'use client';

import { useState, useEffect, useMemo } from 'react';

interface VerifiedPick {
    symbol: string;
    name: string;
    algorithm: string;
    score: number;
    rating: string;
    exitPrice: number;
    realizedReturn: number;
    verifiedAt: string;
    metrics: Record<string, any>;
}

interface PerformanceAudit {
    date: string;
    totalPicks: number;
    avgReturn: number;
    picks: VerifiedPick[];
}

interface PerformanceSummary {
    totalAudits: number;
    totalPicks: number;
    overallAvgReturn: number;
    winRate: number;
    bestPick: VerifiedPick | null;
    worstPick: VerifiedPick | null;
    byAlgorithm: {
        algorithm: string;
        count: number;
        avgReturn: number;
        winRate: number;
    }[];
}

export default function PerformanceDashboard() {
    const [audits, setAudits] = useState<PerformanceAudit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPerformanceData = async () => {
            try {
                // Try multiple sources
                const sources = [
                    '/data/v2/performance-report.json',
                    'https://raw.githubusercontent.com/eltonaguiar/STOCKSUNIFY2/main/data/v2/performance-report.json'
                ];

                for (const url of sources) {
                    try {
                        const res = await fetch(url);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.audits && Array.isArray(data.audits)) {
                                setAudits(data.audits);
                                setLoading(false);
                                return;
                            }
                        }
                    } catch {
                        continue;
                    }
                }

                // No data found yet
                setError('Performance data not yet available. Verification runs weekly on picks older than 7 days.');
            } catch (err) {
                setError('Failed to load performance data');
            } finally {
                setLoading(false);
            }
        };

        fetchPerformanceData();
    }, []);

    const summary = useMemo((): PerformanceSummary | null => {
        if (audits.length === 0) return null;

        const allPicks = audits.flatMap(a => a.picks);
        const winners = allPicks.filter(p => p.realizedReturn > 0);

        // Group by algorithm
        const byAlgo = new Map<string, VerifiedPick[]>();
        for (const pick of allPicks) {
            const algo = pick.algorithm || 'Unknown';
            if (!byAlgo.has(algo)) byAlgo.set(algo, []);
            byAlgo.get(algo)!.push(pick);
        }

        const algoStats = Array.from(byAlgo.entries()).map(([algorithm, picks]) => ({
            algorithm,
            count: picks.length,
            avgReturn: picks.reduce((a, p) => a + p.realizedReturn, 0) / picks.length,
            winRate: (picks.filter(p => p.realizedReturn > 0).length / picks.length) * 100
        })).sort((a, b) => b.avgReturn - a.avgReturn);

        const sortedByReturn = [...allPicks].sort((a, b) => b.realizedReturn - a.realizedReturn);

        return {
            totalAudits: audits.length,
            totalPicks: allPicks.length,
            overallAvgReturn: allPicks.reduce((a, p) => a + p.realizedReturn, 0) / allPicks.length,
            winRate: (winners.length / allPicks.length) * 100,
            bestPick: sortedByReturn[0] || null,
            worstPick: sortedByReturn[sortedByReturn.length - 1] || null,
            byAlgorithm: algoStats
        };
    }, [audits]);

    if (loading) {
        return (
            <div className="glass-panel p-8 rounded-[2rem] border border-white/5 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
                <div className="h-4 bg-white/5 rounded w-2/3" />
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="glass-panel p-8 rounded-[2rem] border border-white/5 bg-gradient-to-br from-amber-500/5 to-transparent">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <span className="text-amber-400 text-lg">⏳</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Performance Verification Pending</h3>
                        <p className="text-xs text-neutral-500">Truth Engine activates after 7-day hold period</p>
                    </div>
                </div>
                <p className="text-sm text-neutral-400">
                    {error || 'The V2 Scientific Engine verifies picks after their recommended holding period. Check back after the first batch of picks mature.'}
                </p>
                <div className="mt-6 p-4 rounded-xl bg-black/20 border border-white/5">
                    <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-2">Verification Schedule</div>
                    <ul className="text-xs text-neutral-400 space-y-1">
                        <li>7-day picks: Verified after 1 week</li>
                        <li>1-month picks: Verified after 30 days</li>
                        <li>1-year picks: Quarterly progress checks</li>
                    </ul>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-6 rounded-2xl border border-white/5">
                    <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">Total Verified</div>
                    <div className="text-3xl font-black text-white">{summary.totalPicks}</div>
                    <div className="text-xs text-neutral-500">{summary.totalAudits} audits</div>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-white/5">
                    <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">Avg Return</div>
                    <div className={`text-3xl font-black ${summary.overallAvgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {summary.overallAvgReturn >= 0 ? '+' : ''}{summary.overallAvgReturn.toFixed(2)}%
                    </div>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-white/5">
                    <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">Win Rate</div>
                    <div className={`text-3xl font-black ${summary.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {summary.winRate.toFixed(1)}%
                    </div>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-white/5">
                    <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">Best Pick</div>
                    {summary.bestPick && (
                        <>
                            <div className="text-xl font-black text-emerald-400">{summary.bestPick.symbol}</div>
                            <div className="text-xs text-emerald-400/70">+{summary.bestPick.realizedReturn.toFixed(2)}%</div>
                        </>
                    )}
                </div>
            </div>

            {/* Algorithm Performance */}
            <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm">V2</span>
                    Algorithm Performance Breakdown
                </h3>
                <div className="space-y-4">
                    {summary.byAlgorithm.map((algo, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-black/20 border border-white/5">
                            <div className="flex-1">
                                <div className="text-sm font-bold text-white">{algo.algorithm}</div>
                                <div className="text-xs text-neutral-500">{algo.count} picks verified</div>
                            </div>
                            <div className="text-right">
                                <div className={`text-lg font-bold ${algo.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {algo.avgReturn >= 0 ? '+' : ''}{algo.avgReturn.toFixed(2)}%
                                </div>
                                <div className="text-xs text-neutral-500">{algo.winRate.toFixed(0)}% win rate</div>
                            </div>
                            {/* Progress bar */}
                            <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${algo.winRate >= 60 ? 'bg-emerald-500' : algo.winRate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(100, algo.winRate)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Audits */}
            <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
                <h3 className="text-lg font-bold text-white mb-6">Recent Verification Audits</h3>
                <div className="space-y-3">
                    {audits.slice(0, 5).map((audit, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                            <div>
                                <div className="text-sm font-bold text-white">{audit.date}</div>
                                <div className="text-xs text-neutral-500">{audit.totalPicks} picks verified</div>
                            </div>
                            <div className={`text-lg font-bold ${audit.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {audit.avgReturn >= 0 ? '+' : ''}{audit.avgReturn.toFixed(2)}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
