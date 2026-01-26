'use client';

export default function ConfigButton() {
    return (
        <button
            onClick={() => (document.querySelector('[title="Configuration Settings"]') as any)?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
        >
            ⚙️ System Config
        </button>
    );
}
