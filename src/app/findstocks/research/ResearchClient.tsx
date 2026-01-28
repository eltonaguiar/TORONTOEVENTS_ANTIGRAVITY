"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ResearchClient() {
    return (
        <div className="min-h-screen bg-[#06070a] text-white selection:bg-indigo-500/30 scroll-smooth">
            {/* Aurora Background Effect */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full animate-pulse delay-700" />
                <div className="absolute -bottom-[10%] left-[10%] w-[60%] h-[60%] bg-emerald-600/5 blur-[120px] rounded-full animate-pulse delay-1000" />
            </div>

            <nav className="fixed top-0 left-0 right-0 z-50 p-6 backdrop-blur-xl border-b border-white/5 bg-black/40">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link href="/findstocks" className="group flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="transition-transform group-hover:-translate-x-1" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z" />
                        </svg>
                        Terminal
                    </Link>
                    <div className="flex items-center gap-8">
                        <div className="hidden lg:flex items-center gap-6 text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500">
                            <Link href="#architecture" className="hover:text-indigo-400 transition-colors">Architecture</Link>
                            <Link href="#interrogation" className="hover:text-indigo-400 transition-colors">Integrity</Link>
                            <Link href="#protocol" className="hover:text-indigo-400 transition-colors">Protocol</Link>
                            <Link href="#manifesto" className="hover:text-indigo-400 transition-colors">Manifesto</Link>
                            <Link href="#system-audit" className="hover:text-indigo-400 transition-colors">Audits</Link>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">System Validated</span>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 max-w-6xl mx-auto px-6 pt-40 pb-32">
                <header className="mb-40 text-center md:text-left">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono tracking-[0.3em] mb-10 uppercase">
                            Scientific Validation Framework v2.0
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-neutral-600 mb-10 leading-[0.9] tracking-tighter">
                            The Fine-Tooth <br className="hidden md:block" />
                            <span className="text-indigo-500">Comb</span> Methodology
                        </h1>
                        <p className="text-xl md:text-2xl text-neutral-400 max-w-3xl leading-relaxed font-serif italic border-l-4 border-indigo-500/30 pl-8 mb-16">
                            "Overfitting is the baseline assumption, not the exception. Methodological rigor matters far more than raw computational power."
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
                            {[
                                { label: "Confidence", val: "95% PSR" },
                                { label: "Stability", val: "0.2 PSI" },
                                { label: "Bias Control", val: "DSR-Adj" },
                                { label: "Regime", val: "Multi-Path" }
                            ].map((item, i) => (
                                <div key={i} className="glass-panel p-6 rounded-2xl border border-white/5 bg-white/2">
                                    <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">{item.label}</div>
                                    <div className="text-xl font-bold font-mono tracking-tighter text-indigo-300">{item.val}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </header>

                {/* Introduction Section */}
                <section className="mb-48 grid lg:grid-cols-[1fr_400px] gap-20 items-start">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="space-y-8"
                    >
                        <h2 className="text-4xl font-bold tracking-tight">The Central Challenge</h2>
                        <div className="prose prose-invert prose-lg text-neutral-400 leading-relaxed font-light">
                            <p>
                                Backtests routinely produce returns that evaporate in live trading. Scientific research (2024–2025) confirms that most "Alpha" is merely an artifact of hindsight and data misuse.
                            </p>
                            <p>
                                A study examining point-in-time macroeconomic data found that strategies using revised historical figures showed <span className="text-white font-medium">15–25% higher Sharpe ratios</span> than when using actual data available at the time—a pure artifact of hindsight.
                            </p>
                            <p>
                                To distinguish genuine edges from statistical mirages, we deploy a <strong>Nine-Layer Validation Architecture</strong>.
                            </p>
                        </div>
                    </motion.div>
                    <div className="hidden lg:block">
                        <div className="glass-panel p-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-indigo-500/10 to-transparent">
                            <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-300 mb-6">Culprits of Failure</h4>
                            <ul className="space-y-6">
                                {[
                                    { t: "Information Leakage", d: "Future data influencing past decisions." },
                                    { t: "Selection Bias", d: "1 winner out of 10,000 trials found by luck." },
                                    { t: "Execution Failure", d: "Slippage and costs collapsing theoretical returns." }
                                ].map((item, i) => (
                                    <li key={i} className="group">
                                        <div className="text-sm font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{item.t}</div>
                                        <div className="text-xs text-neutral-500 leading-relaxed">{item.d}</div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Part I: The Architecture */}
                <section id="architecture" className="mb-64">
                    <div className="text-center mb-24">
                        <h2 className="text-5xl font-bold mb-6">The 9-Layer Architecture</h2>
                        <p className="text-neutral-500 font-mono text-sm tracking-widest">A CLINICAL TRIAL FOR ALGORITHMS</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                num: "01",
                                title: "Problem Specs",
                                desc: "Locking universe rules, rebalance cadence, and execution assumptions before touching data.",
                                icon: "M8 0a.5.5 0 0 1 .5.5v15a.5.5 0 0 1-1 0V.5A.5.5 0 0 1 8 0z"
                            },
                            {
                                num: "02",
                                title: "Integrity Audit",
                                desc: "Point-in-time data alignment. Eliminating Survivorship bias, lookahead, and restatement distortions.",
                                icon: "M10 0l-1 1-1-1-1 1-1-1-1 1-1-1-1 1v12l1-1 1 1 1-1 1 1 1-1 1 1 1-1 1 1V1l-1-1-1 1-1-1-1 1-1-1-1 1-1-1z"
                            },
                            {
                                num: "03",
                                title: "Temporal Controls",
                                desc: "Triple-split data: Dev (60%), Val (20%), and Holdout (10%) with mandatory Purging and Embargo.",
                                icon: "M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"
                            },
                            {
                                num: "04",
                                title: "CPCV Multi-Path",
                                desc: "Combinatorial Purged CV testing across 200+ historical path simulations to ensure regime robustness.",
                                icon: "M12 4.354a4 4 0 1 1 0 5.292M15 21H3v-1a6 6 0 0 1 12 0v1zm0 0h6v-1a6 6 0 0 0-9-5.197"
                            },
                            {
                                num: "05",
                                title: "Statistical Denial",
                                desc: "Deflated Sharpe & White's Reality Check to correct for multiple comparison biases and 'lucky' winners.",
                                icon: "M0 13a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V6a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 0 6v7z"
                            },
                            {
                                num: "06",
                                title: "Adversarial Stress",
                                desc: "Parameter Perturbation (+/- 20%) and Regime Shifting. If the Sharpe collapses, the strategy is overfit.",
                                icon: "M5.5 2A3.5 3.5 0 0 0 2 5.5v5A3.5 3.5 0 0 0 5.5 14h5a3.5 3.5 0 0 0 3.5-3.5V8a.5.5 0 0 1 1 0v2.5a4.5 4.5 0 0 1-4.5 4.5h-5A4.5 4.5 0 0 1 1 10.5v-5A4.5 4.5 0 0 1 5.5 1H8a.5.5 0 0 1 0 1H5.5z"
                            },
                            {
                                num: "07",
                                title: "Factor Attribution",
                                desc: "Regressing against Fama-French 5 factors to verify 'Alpha' isn't just a hidden factor tilt (Value/Momentum).",
                                icon: "M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456l-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.121l6.707-6.707z"
                            },
                            {
                                num: "08",
                                title: "Tail Risk Analysis",
                                desc: "Conditional Value at Risk (CVaR) and Time-Under-Water. Measuring the psychological cost of recovery.",
                                icon: "M13 2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-11zm-4 4a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-7zm-4 3a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-4z"
                            },
                            {
                                num: "09",
                                title: "Paper Gauntlet",
                                desc: "Real-time forward testing on fresh live data for 3-6 months. Fills must match backtest expectation.",
                                icon: "M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"
                            },
                        ].map((layer, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                className="glass-panel p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="text-3xl font-black text-indigo-500/20 group-hover:text-indigo-500/60 transition-colors font-mono">{layer.num}</div>
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                            <path d={layer.icon} />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold mb-3 text-white group-hover:text-indigo-400 transition-colors">{layer.title}</h3>
                                <p className="text-sm text-neutral-500 leading-relaxed font-light">{layer.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Section: The Plain English Translation */}
                <section id="translation" className="mb-64">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">The Plain English Translation</h2>
                        <p className="text-neutral-500 font-mono text-sm tracking-widest uppercase italic">Breaking down the math for non-quants</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-indigo-500/[0.03] transition-colors">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs italic">01</span>
                                Purging & Embargoing
                            </h3>
                            <p className="text-xs font-mono text-indigo-400/60 uppercase mb-3">The "Anti-Cheating" Guard</p>
                            <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                                In the stock market, data is connected over time. If your algorithm "studies" what happened on Monday to predict Tuesday, but some information from Tuesday was already leaked into the Monday data, it's basically looking at a cheat sheet.
                            </p>
                            <div className="text-xs bg-white/5 p-4 rounded-xl border border-white/10 text-neutral-300 italic">
                                <strong>In short:</strong> This is like making sure a student doesn't have the answer key hidden in their desk while they take a test.
                            </div>
                        </div>

                        <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-purple-500/[0.03] transition-colors">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs italic">02</span>
                                CPCV Analysis
                            </h3>
                            <p className="text-xs font-mono text-purple-400/60 uppercase mb-3">The "Multiple Test" Strategy</p>
                            <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                                Most people test their algorithm on one long stretch of history. But history only happened once. CPCV takes that history and chops it into many different pieces, mixing and matching them to create thousands of "alternate" versions of the past.
                            </p>
                            <div className="text-xs bg-white/5 p-4 rounded-xl border border-white/10 text-neutral-300 italic">
                                <strong>In short:</strong> Instead of giving a student one big final exam, you give them 100 different versions of the test with the questions scrambled.
                            </div>
                        </div>

                        <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-emerald-500/[0.03] transition-colors">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs italic">03</span>
                                PSR & DSR
                            </h3>
                            <p className="text-xs font-mono text-emerald-400/60 uppercase mb-3">The "Luck Detector"</p>
                            <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                                A Sharpe Ratio measures profit vs risk. PSR/DSR are tools used to see if that score is real or a fluke. If you flip a coin and get "Heads" 10 times, you look like a genius. But if you tried 1,000 times and only showed the 10 "Heads," you just got lucky.
                            </p>
                            <div className="text-xs bg-white/5 p-4 rounded-xl border border-white/10 text-neutral-300 italic">
                                <strong>In short:</strong> DSR is the tool that asks: "How many times did you fail before you showed me this winning result?".
                            </div>
                        </div>

                        <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-red-500/[0.03] transition-colors">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 text-xs italic">04</span>
                                Overfitting (PBO)
                            </h3>
                            <p className="text-xs font-mono text-red-400/60 uppercase mb-3">The "Memorization" Trap</p>
                            <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                                Overfitting happens when an algorithm is so smart that it memorizes the exact "noise" of the past instead of learning the actual "signal" of how stocks move.
                            </p>
                            <div className="text-xs bg-white/5 p-4 rounded-xl border border-white/10 text-neutral-300 italic">
                                <strong>In short:</strong> A student who memorizes that Question 5 is "C" but doesn't know *why*. If the questions change, they fail.
                            </div>
                        </div>

                        <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-amber-500/[0.03] transition-colors">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs italic">05</span>
                                HMM Models
                            </h3>
                            <p className="text-xs font-mono text-amber-400/60 uppercase mb-3">The "Weather" Sensor</p>
                            <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                                The stock market has different "moods" or regimes—sometimes it's calm and goes up (Sunny/Bull), sometimes it's chaotic and crashes (Storm/Bear).
                            </p>
                            <div className="text-xs bg-white/5 p-4 rounded-xl border border-white/10 text-neutral-300 italic">
                                <strong>In short:</strong> If it's "Sunny," the algorithm wears sunglasses and buys. If a "Storm" is coming, it grabs an umbrella and stays careful.
                            </div>
                        </div>

                        <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-blue-500/[0.03] transition-colors">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs italic">06</span>
                                GANs & Synthetic
                            </h3>
                            <p className="text-xs font-mono text-blue-400/60 uppercase mb-3">The "Flight Simulator"</p>
                            <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                                Since we only have one version of history, scientists use "GANs" to create fake but 100% realistic stock market data that has never actually happened.
                            </p>
                            <div className="text-xs bg-white/5 p-4 rounded-xl border border-white/10 text-neutral-300 italic">
                                <strong>In short:</strong> Throwing disasters like hurricanes and engine failures at a pilot in a simulator before they fly an actual plane with your money.
                            </div>
                        </div>

                        <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-neutral-500/[0.03] transition-colors md:col-span-2">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-xs italic">07</span>
                                Implementation Shortfall
                            </h3>
                            <p className="text-xs font-mono text-neutral-400/60 uppercase mb-3">The "Store Price" Reality</p>
                            <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                                This is the difference between the price you *see* on your computer and the price you *actually* pay when you buy. Imagine a TV online for $500. But when you get to the store, there's a line, the price went up $10, and you pay for parking. Total: $530.
                            </p>
                            <div className="text-xs bg-white/5 p-4 rounded-xl border border-white/10 text-neutral-300 italic">
                                <strong>In short:</strong> Most beginner algorithms go broke because they didn't realize how expensive it is to actually "do" the shopping.
                            </div>
                        </div>
                    </div>
                </section>

                {/* Part II: The Validation Gates */}

                <section id="gates" className="mb-64">
                    <div className="glass-panel p-12 md:p-20 rounded-[48px] border border-white/10 bg-gradient-to-br from-indigo-500/5 via-transparent to-emerald-500/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M11 2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM5 8.325V15a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5V10h1v5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5V8.325a.5.5 0 0 0-.11-.305l-1.92-2.56A1.5 1.5 0 0 1 7.29 4.31l-.213.283a1.5 1.5 0 0 1-1.277.675H5a.5.5 0 0 0-.5.5v2.247a.5.5 0 0 0 .11.305l.39.519z" />
                            </svg>
                        </div>

                        <div className="max-w-3xl">
                            <h2 className="text-4xl font-bold mb-8">The 8 Logic Gates</h2>
                            <p className="text-neutral-400 text-lg mb-12 font-light">
                                A strategy must pass these objective hurdles before a single real dollar is deployed. Fail any of the first four, and the strategy is rejected immediately.
                            </p>

                            <div className="space-y-4">
                                {[
                                    { g: "Data Integrity", r: "Point-in-time constituent data with verified timestamps.", t: "Reject if any lookahead/survivorship bias found." },
                                    { g: "OOS Degradation", r: "OOS Sharpe / IS Sharpe ratio > 0.5.", t: "Reject if return collapses in validation window." },
                                    { g: "Multiple Testing", r: "DSR > 1.0 or White's Reality Check p < 0.05.", t: "Reject if winner is statistically a fluke." },
                                    { g: "Cost Stress", r: "Recalculate with 3x slippage and 1-day lag.", t: "Reject if net return < 2% annually." },
                                    { g: "Regime Robustness", r: "Max/Min Sharpe ratio across regimes < 3x.", t: "Caution flag: Strategy is regime-dependent." },
                                    { g: "Parameter Stability", r: "+/- 20% perturbation change < 20% Sharpe.", t: "Caution flag: Strategy is overfit to a peak." },
                                    { g: "Factor Separation", r: "Residual Alpha > 0 after Fama-French Regression.", t: "Warning: Strategy is a proxy for known factors." },
                                    { g: "Forward Gauntlet", r: "Realized Sharpe > 50% of backtested expectations.", t: "Final Gate: Real-world execution verify." }
                                ].map((gate, i) => (
                                    <div key={i} className="flex gap-6 p-6 rounded-2xl border border-white/5 bg-black/20 group hover:border-indigo-500/30 transition-all">
                                        <div className="w-8 h-8 rounded-full border border-neutral-700 flex items-center justify-center text-xs font-mono text-neutral-500 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500 transition-all">{i + 1}</div>
                                        <div>
                                            <h4 className="font-bold text-white mb-1">{gate.g}</h4>
                                            <p className="text-xs text-neutral-400 mb-2">{gate.r}</p>
                                            <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">{gate.t}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: Interrogating the Math */}
                <section id="interrogation" className="mb-64">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Interrogating the Math</h2>
                        <p className="text-neutral-500 font-mono text-sm tracking-widest uppercase italic">Beyond the Backtest: Finding the law, not the coincidence</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-gradient-to-b from-indigo-500/5 to-transparent">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M5.5 2h5v12h-5V2zM0 14h16v1H0v-1zM2 0h1v14H2V0zm11 0h1v14h-1V0zM4 0h1v14H4V0zm7 0h1v14h-1V0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-4">The Monte Carlo Permutation</h3>
                            <p className="text-sm text-neutral-400 leading-relaxed">
                                Even if you beat the S&P 500, how do we know it wasn't a fluke? We <strong>shuffle the timestamps</strong> of your returns. If your algorithm still shows profit on scrambled data, it’s finding noise, not a signal.
                            </p>
                        </div>

                        <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-gradient-to-b from-purple-500/5 to-transparent">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.5 15a.5.5 0 0 1-.5-.5V3.707L8.354 6.354a.5.5 0 1 1-.708-.708l3.5-3.5a.5.5 0 0 1 .708 0l3.5 3.5a.5.5 0 0 1-.708.708L12 3.707V14.5a.5.5 0 0 1-.5.5zm-7-14a.5.5 0 0 1 .5.5v10.793l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 0 1 .708-.708L4 11.293V1.5a.5.5 0 0 1 .5-.5z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-4">Sensitivity (The Wobble Test)</h3>
                            <p className="text-sm text-neutral-400 leading-relaxed">
                                A scientific model should be stable. If changing your "Buy" threshold from <strong>0.80 to 0.79</strong> causes the strategy to collapse, you haven't found a law of nature; you've found a historical coincidence.
                            </p>
                        </div>

                        <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-gradient-to-b from-emerald-500/5 to-transparent">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M12.433 10.07C14.133 10.585 16 11.15 16 12c0 .85-1.867 1.415-3.567 1.93-.44.133-.896.268-1.36.406a3.839 3.839 0 0 1-1.073-1.273 40.06 40.06 0 0 0 1.258-.383c1.353-.41 2.752-.834 2.752-1.68 0-.846-1.399-1.27-2.752-1.68a39.913 39.913 0 0 0-1.258-.383 3.839 3.839 0 0 1 1.073-1.273c.464.138.92.273 1.36.406zM8 10c-1.353 0-2.5 1.147-2.5 2.5S6.647 15 8 15s2.5-1.147 2.5-2.5S9.353 10 8 10zm0 1c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5.672-1.5 1.5-1.5z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-4">Degrees of Freedom vs. Sample</h3>
                            <p className="text-sm text-neutral-400 leading-relaxed">
                                The more "rules" (indicators) your model has, the more years of data you need to prove it isn't just "connecting the dots" of random noise. Scientific models prefer simplicity.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Part III: The Compute Reality */}
                <section id="statistics" className="mb-64">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">The Supercomputer Myth</h2>
                        <p className="text-neutral-500 font-mono text-sm tracking-widest uppercase italic">Why a regular person can successfully compete</p>
                    </div>

                    <div className="grid lg:grid-cols-[1fr_500px] gap-20 items-center">
                        <div className="prose prose-invert text-neutral-400 space-y-6 leading-relaxed font-light">
                            <p>
                                A "random person" can win because they are playing a different game. You aren't trying to outrun a Ferrari (HFT); you're trying to find a shortcut they are too big to fit through.
                            </p>
                            <p>
                                The bottleneck is not compute—it is <strong>methodology</strong>. A standard gaming laptop can run walk-forward validation and CPCV pathing in hours to days.
                            </p>
                            <div className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/20 italic text-sm">
                                "Retail researcher's advantage is focus. You only need one well-defined strategy with a post-cost 100bp edge."
                            </div>
                        </div>

                        <div className="glass-panel overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c14]">
                            <table className="w-full text-left text-xs font-light">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr className="text-neutral-500 uppercase tracking-widest">
                                        <th className="p-4">Feature</th>
                                        <th className="p-4">Hedge Fund</th>
                                        <th className="p-4">The Scientific Retailer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {[
                                        { f: "Speed 🏎️", h: "High-Frequency (ms)", r: "Daily/Weekly (Slow)" },
                                        { f: "Data 📊", h: "Satellite, Credit logs", r: "Point-in-Time Prices" },
                                        { f: "Compute 🧠", h: "Massive Neural Nets", r: "Robust Statistical Models" },
                                        { f: "Edge 💡", h: "Arbitrage/Liquidity", r: "Behavioral/Fundamental" }
                                    ].map((row, i) => (
                                        <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4 text-white font-bold">{row.f}</td>
                                            <td className="p-4 text-neutral-400">{row.h}</td>
                                            <td className="p-4 text-indigo-400 font-medium">{row.r}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* Section: Guidance/Where do we start */}
                <section id="guidance" className="mb-64">
                    <div className="glass-panel p-12 md:p-20 rounded-[48px] border border-white/10 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 text-center">
                        <h2 className="text-4xl font-bold mb-8">Where do we start?</h2>
                        <p className="text-neutral-400 text-lg mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                            To build a true "fine-tooth comb," you must define the nature of the patient. Before writing a single line of code, ask yourself:
                        </p>

                        <div className="grid md:grid-cols-3 gap-8 text-left">
                            <div className="space-y-4">
                                <div className="text-indigo-400 font-mono text-xs uppercase tracking-widest">01 Prediction Goal</div>
                                <p className="text-white text-sm font-bold">Predicting the exact price tomorrow, or ranking a list for the next month?</p>
                            </div>
                            <div className="space-y-4">
                                <div className="text-purple-400 font-mono text-xs uppercase tracking-widest">02 Strategy Type</div>
                                <p className="text-white text-sm font-bold">Is it Technicals (Price/Vol), Fundamentals (Earnings), or Alternative (Sentiment)?</p>
                            </div>
                            <div className="space-y-4">
                                <div className="text-emerald-400 font-mono text-xs uppercase tracking-widest">03 Asset Universe</div>
                                <p className="text-white text-sm font-bold">S&P 500 (Big & Liquid) or High Volatility Penny Stocks/Crypto?</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: Strategy-Specific Stress Tests */}
                <section id="specialized-tests" className="mb-64">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Specialized Scientific Filters</h2>
                        <p className="text-neutral-500 font-mono text-sm tracking-widest uppercase italic">Different algorithms face different "enemies"</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                        <div className="glass-panel p-10 rounded-[40px] border border-white/5 bg-gradient-to-br from-blue-500/10 to-transparent">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M8 12.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0 1c3.038 0 5.5-2.462 5.5-5.5S11.038 2.5 8 2.5 2.5 4.962 2.5 8s2.462 5.5 5.5 5.5z" />
                                        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold">The "Penny Stock" Test</h3>
                                    <p className="text-xs font-mono text-blue-400/60 uppercase tracking-widest">Liquidity Interrogation</p>
                                </div>
                            </div>
                            <div className="space-y-6 text-neutral-400 font-light">
                                <p>Penny stocks look amazing in backtests because computers assume infinite liquidity. In reality, your own order might push the price up 5% before you're even finished buying.</p>
                                <ul className="space-y-4">
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">Slippage Torture:</span>
                                        <span>Multiply expected slippage (e.g., 1%) by 3. If profits vanish, it's a "Liquidity Mirage."</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">Volume Cap:</span>
                                        <span>Never assume you can trade &gt;1-5% of daily volume. Overstepping this breaks the market entry.</span>

                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="glass-panel p-10 rounded-[40px] border border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M8.416.223a.5.5 0 0 0-.832 0l-3 4.5A.5.5 0 0 0 5 5.5h.098L3.076 8.735A.5.5 0 0 0 3.5 9.5h.191l-1.616 3.232a.5.5 0 0 0 .447.723h11.002a.5.5 0 0 0 .447-.723l-1.616-3.232h.191a.5.5 0 0 0 .424-.765L10.902 5.5H11a.5.5 0 0 0 .416-.777l-3-4.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold">The "Growth" Audit</h3>
                                    <p className="text-xs font-mono text-emerald-400/60 uppercase tracking-widest">Regime Durability</p>
                                </div>
                            </div>
                            <div className="space-y-6 text-neutral-400 font-light">
                                <p>Growth stocks thrive when rates are low. To see if an algorithm is "smart" vs "just lucky in a bull run," we use <strong>Walk-Forward Efficiency (WFE)</strong>.</p>
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 font-mono text-xs">
                                    1. Train: 2 years (e.g. 2018-20) <br />
                                    2. Test: 6 months (e.g. 2021) <br />
                                    3. Shift & Repeat
                                </div>
                                <p className="italic">Goal: Ratio of performance on "unseen" data compared to training. Must survive rate hikes and volatility shifts.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: The "Bet-Your-Life" Protocol */}
                <section id="protocol" className="mb-64">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">The "Bet-Your-Life" Protocol</h2>
                        <p className="text-neutral-500 font-mono text-sm tracking-widest uppercase italic">Treating code like a high-stakes scientific experiment</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Protocol Card 1 */}
                        <div className="glass-panel p-10 rounded-[3rem] border border-white/5 bg-white/[0.02]">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <span className="text-indigo-500 font-mono">01.</span> Pre-Registration
                            </h3>
                            <div className="space-y-4 text-sm text-neutral-400 leading-relaxed">
                                <p>Before writing a single test, lock your strategy definition. Define exact lookback windows, allowed feature types, and primary metrics (CAGR, Sharpe, Max Drawdown).</p>
                                <p className="font-mono text-[10px] text-indigo-400 bg-indigo-400/5 p-3 rounded-xl">
                                    "Your maximum number of model variants must be declared upfront to compute the Deflated Sharpe Ratio (DSR)."
                                </p>
                            </div>
                        </div>

                        {/* Protocol Card 2 */}
                        <div className="glass-panel p-10 rounded-[3rem] border border-white/5 bg-white/[0.02]">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <span className="text-indigo-500 font-mono">02.</span> Leakage & Jitter Checks
                            </h3>
                            <div className="space-y-4 text-sm text-neutral-400 leading-relaxed">
                                <p>Enforce <code>feature_timestamp &lt;= decision_timestamp</code>. If using lagged data, simulate "dirty data" by jittering prices and dropping 5-10% of observations.</p>
                                <p className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl text-red-200/60 font-mono text-[10px]">
                                    If your equity curve collapses under tiny perturbations, you've found a mirage, not a signal.
                                </p>
                            </div>
                        </div>

                        {/* Protocol Card 3 */}
                        <div className="glass-panel p-10 rounded-[3rem] border border-white/5 bg-white/[0.02]">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <span className="text-indigo-500 font-mono">03.</span> CPCV Methodology
                            </h3>
                            <div className="space-y-4 text-sm text-neutral-400 leading-relaxed">
                                <p>Reject single backtests. Use <strong>Combinatorial Purged Cross-Validation (CPCV)</strong>. Divide history into K blocks to test performance across many independent "mini-histories."</p>
                                <p className="italic text-xs">Purge overlapping labels and embargo adjacent windows to eliminate silent leakage.</p>
                            </div>
                        </div>

                        {/* Protocol Card 4 */}
                        <div className="glass-panel p-10 rounded-[3rem] border border-white/5 bg-white/[0.02]">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <span className="text-indigo-500 font-mono">04.</span> Multiple-Testing Control
                            </h3>
                            <div className="space-y-4 text-sm text-neutral-400 leading-relaxed">
                                <p>Mandatory selection-bias corrections. A "winner" is only valid if it passes <strong>White's Reality Check</strong> (p-value &lt; 0.05) and has a <strong>Probabilistic Sharpe Ratio (PSR)</strong> hurdle.</p>
                                <div className="flex gap-2">
                                    <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono">PSR &gt; 95%</span>
                                    <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono">DSR Hurdle: 0.8</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 glass-panel p-10 rounded-[3rem] border border-white/5 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
                        <div className="grid md:grid-cols-3 gap-8 text-center items-center">
                            <div>
                                <div className="text-3xl font-black text-white mb-2">Simplicity</div>
                                <p className="text-xs text-neutral-500 uppercase tracking-widest font-mono">Low VC Dimension</p>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-white mb-2">Baselines</div>
                                <p className="text-xs text-neutral-500 uppercase tracking-widest font-mono">Fight Strong Enemies</p>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-white mb-2">Attribution</div>
                                <p className="text-xs text-neutral-500 uppercase tracking-widest font-mono">Factor Neutralization</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: Universal Survival Metrics (Restored) */}
                <section id="survival-metrics" className="mb-64">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Universal Survival Metrics</h2>
                        <p className="text-neutral-500 font-mono text-sm tracking-widest uppercase italic">Comparing sprinters to marathon runners</p>
                    </div>

                    <div className="glass-panel overflow-hidden rounded-[2rem] border border-white/10 bg-[#06070a]">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr className="text-neutral-500 text-[10px] uppercase font-mono tracking-[0.2em]">
                                    <th className="p-8">Metric</th>
                                    <th className="p-8">Scientific Significance</th>
                                    <th className="p-8">"Life-on-the-Line" Bar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {[
                                    { m: "Ulcer Index 📉", s: "Measures depth and duration of drawdowns.", b: "Lower is better. High = high mental stress." },
                                    { m: "Expected Shortfall (CVaR) ⚠️", s: "Looks at the worst-case 5% of daily outcomes.", b: "Average loss on your absolute worst days." },
                                    { m: "Sortino Ratio 📈", s: "Punishes only downside volatility (actual losses).", b: "> 2.0 is the goal for serious algorithms." }
                                ].map((row, i) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-8 text-white font-bold">{row.m}</td>
                                        <td className="p-8 text-neutral-400 text-sm font-light">{row.s}</td>
                                        <td className="p-8 text-indigo-400 font-mono text-sm">{row.b}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Section: The Validation Manifesto */}
                <section id="manifesto" className="mb-64">
                    <div className="grid lg:grid-cols-2 gap-20">
                        <div>
                            <h2 className="text-4xl font-bold mb-8">Credible vs. Mirage</h2>
                            <div className="prose prose-invert text-neutral-400 space-y-6 leading-relaxed">
                                <p>A strategy is only "Credible" if it survives a <strong>5x slippage stress test</strong> and maintains a <strong>DSR &gt; 0.5</strong> on out-of-sample data. If it reduce to a simple factor tilt (luck of the market), it is not an edge.</p>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 font-mono text-xs">
                                    <div className="text-indigo-400 mb-2 font-bold uppercase tracking-widest">The Mandatory Bar:</div>
                                    • Reality Check p-value &lt; 0.05 <br />
                                    • Post-Cost Sharpe Rate &gt; 1.5 <br />
                                    • Stability across parameter jitter
                                </div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-4xl font-bold mb-8">Is this feasible?</h2>
                            <div className="prose prose-invert text-neutral-400 space-y-6 leading-relaxed">
                                <p>Supercomputers matter for tick-by-tick microstructure and satellite data processing. For <strong>daily/weekly stock selection</strong>, the constraint is not FLOPs—it is methodology and data cleanliness.</p>
                                <p>A disciplined retail researcher with regular hardware can defeat a sloppy institutional desk by focusing on specific niches with high-integrity validation.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="system-audit" className="mb-64">
                    <div className="glass-panel p-1 border-white/10 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20 rounded-[3rem]">
                        <div className="bg-[#06070a] rounded-[2.8rem] p-12 md:p-20 overflow-hidden relative">
                            {/* Meta Banner - Transparency Note */}
                            <div className="inline-flex items-center gap-4 px-6 py-2 rounded-full bg-white/5 border border-white/10 mb-12 cursor-help group/meta">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-5 h-5 rounded-full bg-indigo-600/40 border border-white/10 flex items-center justify-center text-[8px] font-bold">
                                            {i === 1 ? 'A' : i === 2 ? 'G' : 'S'}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest leading-none">
                                    Deep Research System Audit <span className="text-indigo-400 ml-2 group-hover/meta:text-emerald-400 transition-colors">Completed · 11 sources · 30 searches</span>
                                </div>
                            </div>

                            <div className="grid lg:grid-cols-[1fr_350px] gap-20">
                                <div>
                                    <h2 className="text-5xl font-black mb-10 tracking-tighter leading-[0.9]">
                                        System Analysis: <br />
                                        <span className="text-indigo-500">FindStocks & Unify</span>
                                    </h2>

                                    <div className="space-y-16">
                                        {/* Findings */}
                                        <div className="grid md:grid-cols-2 gap-12">
                                            <div className="space-y-6">
                                                <div className="text-emerald-400 font-bold uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Validated Strengths
                                                </div>
                                                <ul className="space-y-3 text-sm text-neutral-400 font-light">
                                                    <li>• Clear algorithm taxonomy (CAN SLIM, Tech, ML)</li>
                                                    <li>• Structured machine-readable JSON integration</li>
                                                    <li>• Accurate risk-timeframe conceptualization</li>
                                                </ul>
                                            </div>
                                            <div className="space-y-6">
                                                <div className="text-red-400 font-bold uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 opacity-50" /> Scientific Gaps
                                                </div>
                                                <ul className="space-y-3 text-sm text-neutral-400 font-light">
                                                    <li>• <strong className="text-white font-medium">Falsifiability:</strong> Missing append-only ledger</li>
                                                    <li>• Backtesting framework is not yet automated</li>
                                                    <li>• Potential "Data Freshness" synchronization gaps</li>
                                                </ul>
                                            </div>
                                        </div>

                                        {/* The 5-Phase Upgrade */}
                                        <div className="pt-10 border-t border-white/5">
                                            <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-neutral-500 mb-10">The Credibility Roadmap</h3>
                                            <div className="grid gap-6">
                                                {[
                                                    { t: "Falsifiable History", d: "Implement append-only JSON ledgers for every daily pick to prevent hindsight bias." },
                                                    { t: "Realized Performance Ops", d: "Automatic return evaluation against benchmarks after each horizon (24h/1m)." },
                                                    { t: "The Ranker Edge", d: "Using Information Coefficient (IC) scores instead of binary buy/sell outcomes." },
                                                    { t: "Temporal Isolation", d: "Strict Walk-Forward purging to eliminate silent data leakage." },
                                                    { t: "Liquidity Torture", d: "Applying 'Slippage Multipliers' (2x-5x) to prevent liquidity mirages." }
                                                ].map((phase, i) => (
                                                    <div key={i} className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-white/[0.02] transition-colors">
                                                        <span className="font-mono text-xs text-indigo-500/40 mt-1">0{i + 1}</span>
                                                        <div>
                                                            <div className="text-white font-bold group-hover:text-indigo-400 transition-colors">{phase.t}</div>
                                                            <div className="text-xs text-neutral-500 leading-relaxed max-w-lg">{phase.d}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar Verdict */}
                                <div className="space-y-8 h-full">
                                    <div className="glass-panel p-10 h-full rounded-[40px] border border-white/10 bg-white/[0.02] flex flex-col justify-between">
                                        <div className="space-y-12">
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Institutional Verdict</h4>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-neutral-500">Is it "fake"?</span>
                                                        <span className="text-red-400 font-bold">NO</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-neutral-500">Validated?</span>
                                                        <span className="text-red-400 font-bold">NOT YET</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-neutral-500">Close?</span>
                                                        <span className="text-emerald-400 font-bold uppercase tracking-wider">Absolutely</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-8 border-t border-white/5">
                                                <h4 className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Why this matters</h4>
                                                <p className="text-xs text-neutral-400 leading-relaxed font-serif italic">
                                                    "Transitioning from predictions to a verifiable forecasting system builds trust where others evoke suspicion. The missing pieces are process, not intelligence."
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-12 p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                                            <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest leading-relaxed">
                                                Research Metadata: 30 SEARCHES PERFORMED ACROSS 11 INSTITUTIONAL SOURCES. ANALYSIS DELIVERED VIA ADAPTIVE AG-FRAMEWORK.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final Conclusion */}


                <section className="text-center py-40 border-t border-white/5">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-5xl font-black mb-10 tracking-tighter">Your Methodology is Your Moat.</h2>
                        <div className="max-w-2xl mx-auto space-y-8 text-xl text-neutral-400 font-serif leading-relaxed italic">
                            <p>
                                "Supercomputers let you search faster. But they also let you overfit faster."
                            </p>
                            <p>
                                A single researcher who follows the Nine-Layer Validation Methodology rigorously will defeat an undisciplined shop with massive computing power.
                            </p>
                        </div>

                        <div className="mt-20 flex flex-wrap justify-center gap-6">
                            <Link href="/findstocks" className="px-12 py-5 bg-white text-black font-black rounded-full hover:bg-neutral-300 transition-all hover:scale-105 group relative overflow-hidden">
                                <span className="relative z-10">Deploy Analysis Terminal</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </Link>
                        </div>
                    </motion.div>
                </section>

            </main>

            <footer className="relative z-10 p-24 border-t border-white/5 bg-black/40">
                <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
                    <div className="col-span-2">
                        <div className="text-2xl font-black mb-6 tracking-tighter">AG-WHITE-PAPER <span className="text-indigo-500">2026.04</span></div>
                        <p className="text-xs text-neutral-600 font-mono leading-relaxed uppercase tracking-[0.2em] max-w-sm">
                            Establishing institutional-grade reliability through statistical governance and adversarial testing of divergent market paths.
                        </p>
                    </div>
                    <div className="md:text-right col-span-2">
                        <div className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mb-4">Verification Sources</div>
                        <div className="flex flex-wrap justify-end gap-x-4 gap-y-2 text-[9px] font-mono text-neutral-700 uppercase">
                            <span>Lux Algo 2025</span>
                            <span>Bailey & Lopez 2014</span>
                            <span>Proprietary AG-Scan</span>
                            <span>FactSet 2024</span>
                            <span>White reality check v2</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
