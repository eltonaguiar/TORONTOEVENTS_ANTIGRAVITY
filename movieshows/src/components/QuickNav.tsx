"use client";

import React, { useState, useEffect } from "react";

const BASE = "https://findtorontoevents.ca";

export default function QuickNav() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-[200] p-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl hover:bg-amber-500/30 text-white transition-all group"
        title="Quick Navigation"
        aria-label="Open Quick Nav"
      >
        <div className="flex flex-col gap-1.5 w-6 items-center justify-center">
          <span className="w-full h-0.5 bg-white rounded-full group-hover:w-4 transition-all" />
          <span className="w-full h-0.5 bg-white rounded-full group-hover:w-6 transition-all" />
          <span className="w-full h-0.5 bg-white rounded-full group-hover:w-4 transition-all" />
        </div>
      </button>

      <div
        className={`fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      >
        <div
          className={`fixed top-0 left-0 h-full w-[300px] max-w-[90vw] bg-zinc-900/95 backdrop-blur-xl border-r border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transform transition-transform duration-300 flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-amber-900/50 to-transparent">
            <h2 className="text-xl font-black uppercase tracking-tighter text-white">
              <span className="text-amber-400">Quick</span> Nav
            </h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="space-y-1 pt-2">
              <p className="px-4 py-2 text-[10px] font-black uppercase text-amber-400/80 tracking-widest">
                NETWORK
              </p>

              <a
                href={`${BASE}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 hover:bg-pink-500/20 text-pink-200 hover:text-white transition-all border border-transparent hover:border-pink-500/30"
              >
                <span className="text-lg">🎉</span> Toronto Events
              </a>

              <a
                href={`${BASE}/WINDOWSFIXER/`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 hover:bg-blue-500/20 text-blue-200 hover:text-white transition-all border border-transparent hover:border-blue-500/30"
              >
                <span className="text-lg">🛠️</span> Windows Fixer
              </a>

              <a
                href={`${BASE}/2xko`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 hover:bg-purple-500/20 text-purple-200 hover:text-white transition-all border border-transparent hover:border-purple-500/30"
              >
                <span className="text-lg">🎮</span> 2XKO Frame Data
              </a>

              <a
                href={`${BASE}/MENTALHEALTHRESOURCES/`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 hover:bg-green-500/20 text-green-200 hover:text-white transition-all border border-transparent hover:border-green-500/30"
              >
                <span className="text-lg">🌟</span> Mental Health Resources
              </a>

              <a
                href={`${BASE}/findstocks`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 hover:bg-yellow-500/20 text-yellow-200 hover:text-white transition-all border border-transparent hover:border-yellow-500/30"
              >
                <span className="text-lg">📈</span> Find Stocks
              </a>

              <div className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 bg-amber-500/20 text-amber-200 border border-amber-500/30">
                <span className="text-lg">🎬</span> Movies & TV
                <span className="text-[10px] font-bold text-amber-400/80 ml-auto">You are here</span>
              </div>

              <a
                href={`${BASE}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 hover:bg-white/5 text-zinc-300 hover:text-white transition-all"
              >
                <span className="text-lg">⚙️</span> System Settings
              </a>

              <a
                href="mailto:support@findtorontoevents.ca"
                className="w-full text-center px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/60 hover:text-amber-400 transition-all border border-dashed border-white/5 hover:border-amber-500/30 mt-4 block"
              >
                — 📧 Contact Support —
              </a>
            </div>

            <div className="space-y-1 pt-4 mt-4 border-t border-white/5">
              <p className="px-4 py-2 text-[10px] font-black uppercase text-amber-400/60 tracking-widest">
                Support
              </p>
              <div className="px-4 py-4 m-2 bg-white/5 rounded-xl border border-white/5 space-y-2">
                <p className="text-[9px] font-bold text-zinc-400 uppercase leading-tight">
                  Manual Uplink:
                </p>
                <div className="text-[11px] font-mono text-white select-all break-all">
                  support<span className="text-amber-400">@</span>findtorontoevents.ca
                </div>
                <p className="text-[8px] text-zinc-500 italic">Response: 24-48h</p>
              </div>
            </div>
          </nav>

          <div className="p-4 border-t border-white/5 bg-black/20">
            <p className="text-[10px] text-zinc-500 text-center">Antigravity Systems v0.5.0</p>
          </div>
        </div>
      </div>
    </>
  );
}
