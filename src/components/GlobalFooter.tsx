'use client';

export default function GlobalFooter() {
    return (
        <footer className="mt-20 py-20 border-t border-white/5 text-center bg-black/20 backdrop-blur-sm">
            <div className="max-w-xl mx-auto space-y-8 px-6">
                {/* Contact Section */}
                <div className="space-y-4">
                    <h3 className="text-xl font-black uppercase tracking-widest text-white/80">Support Node</h3>
                    <p className="text-xs text-[var(--text-3)] font-medium leading-relaxed">
                        Encountered a glitch in the event stream or have a venue to suggest?
                        Our uplink is open for manual transmissions.
                    </p>
                    <div className="flex flex-col items-center gap-3">
                        <div className="group relative px-6 py-4 bg-white/5 border border-white/10 rounded-2xl transition-all hover:bg-white/10 hover:border-[var(--pk-500)]/30 shadow-2xl">
                            <span className="text-[10px] font-black uppercase text-[var(--pk-400)] block mb-1">Secure Uplink</span>
                            <div className="flex items-center gap-2 font-mono text-sm text-white select-all">
                                <span>support</span>
                                <span className="text-[var(--pk-500)]">@</span>
                                <span>findtorontoevents.ca</span>
                            </div>
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-tighter text-white/20">
                            Automated responses active • Response time: 24-48h
                        </p>
                    </div>
                </div>

                {/* Network Links */}
                <div className="pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <a href="/" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)] hover:text-white transition-colors">Event discovery</a>
                    <a href="/findstocks" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)] hover:text-white transition-colors">Stock analysis</a>
                    <a href="/2xko" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)] hover:text-white transition-colors">2XKO data</a>
                </div>

                <div className="pt-8 opacity-30 text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--text-3)]">
                    Built for Toronto • Antigravity Systems v0.5.0
                </div>
            </div>
        </footer>
    );
}
