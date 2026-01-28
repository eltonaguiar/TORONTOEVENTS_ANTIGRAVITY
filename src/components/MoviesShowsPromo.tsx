'use client';

import { useState } from 'react';

export default function MoviesShowsPromo() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="movieshows-promo">
      <div
        className={`promo-banner ${isExpanded ? 'expanded' : ''} ${isHovered ? 'hovered' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!isExpanded && (
          <div className={`flex items-center gap-3 transition-all duration-500 ${isHovered ? 'opacity-100' : 'opacity-60 grayscale'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg animate-pulse-slow">
              <span className="text-xl">🎬</span>
            </div>

            <div className={`transition-all duration-500 override-overflow ${isHovered ? 'max-w-[300px] opacity-100' : 'max-w-0 opacity-0 overflow-hidden'}`}>
              <div className="flex flex-col whitespace-nowrap">
                <span className="text-sm font-bold text-white">Movies & TV</span>
                <span className="text-[10px] text-[var(--text-2)]">Trailers, Now Playing Toronto</span>
              </div>
            </div>

            <a
              href="https://findtorontoevents.ca/MOVIESHOWS/"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all whitespace-nowrap"
            >
              Open App →
            </a>
          </div>
        )}

        {isExpanded && (
          <div className="w-full animate-fade-in text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                🎬 Find Movies & TV Shows
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-[var(--text-2)] mb-4 leading-relaxed max-w-2xl">
              TikTok-style discovery for movies, TV series, and what&apos;s <strong>now playing in Toronto</strong> theatres. Filter by source, year, genre; build a queue and search titles.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {['Movies & TV', 'Now Playing', 'Queue & Search', 'Free'].map((feat, i) => (
                <div key={i} className="px-3 py-2 bg-white/5 rounded-lg border border-white/5 text-[10px] font-bold text-[var(--text-3)] text-center flex items-center justify-center gap-2">
                  <span>{['🎬', '🎭', '📋', '🆓'][i]}</span> {feat}
                </div>
              ))}
            </div>

            <a
              href="https://findtorontoevents.ca/MOVIESHOWS/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg hover:brightness-110 transition-all"
            >
              Open Movies & TV →
            </a>
          </div>
        )}
      </div>

      <style jsx>{`
        .movieshows-promo {
          margin: 1rem 0;
          display: flex;
          justify-content: center;
        }

        .override-overflow {
          overflow: hidden;
        }

        .promo-banner {
          background: rgba(0,0,0,0.3);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 9999px;
          padding: 0.5rem 0.75rem;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .promo-banner.hovered {
          background: rgba(0,0,0,0.6);
          border-color: rgba(255,255,255,0.1);
          transform: translateY(-2px);
        }

        .promo-banner.expanded {
          border-radius: 24px;
          padding: 2rem;
          background: rgba(10, 10, 11, 0.95);
          border: 1px solid rgba(245, 158, 11, 0.3);
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          max-width: 800px;
          width: 100%;
        }
      `}</style>
    </div>
  );
}
