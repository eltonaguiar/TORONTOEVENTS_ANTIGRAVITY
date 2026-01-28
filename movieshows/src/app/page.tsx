"use client";
import React, { useRef, useState, useEffect } from "react";
import { VideoCard } from "@/components/VideoCard";
import { FilterMenu } from "@/components/FilterMenu";
import { MOCK_MOVIES, type CategoryFilter, type Movie } from "@/lib/mockData";
import {
  Settings,
  LayoutList,
  Search,
  PlayCircle,
  X as CloseIcon,
  ListMusic,
  ListPlus,
  ListCheck,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";

const QUEUE_STORAGE_KEY = "movieshows-playing-queue";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [queue, setQueue] = useState<(typeof MOCK_MOVIES)[0][]>([]);
  const [isBrowsingQueue, setIsBrowsingQueue] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isQueueHydrated, setIsQueueHydrated] = useState(false);

  // Likes State
  const [likedMovieIds, setLikedMovieIds] = useState<Set<string>>(new Set());

  // Filter State
  const [filters, setFilters] = useState<{
    categories: CategoryFilter & { cineplexOnly?: boolean };
    minYear: string;
    maxYear: string;
    genres: string[];
    minRating: number;
    source: 'all' | 'Disney+' | 'Hulu' | 'Paramount Plus' | 'Netflix' | 'Amazon Prime' | 'In Theatres' | 'Max' | 'Apple TV+';
  }>({
    categories: { movies: true, tv: true, nowPlaying: false, cineplexOnly: false },
    minYear: '',
    maxYear: '',
    genres: [],
    minRating: 0,
    source: 'all'
  });

  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  // Load broken IDs from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('brokenVideoIds');
    if (saved) {
      try {
        setBrokenIds(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to parse broken IDs', e);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsQueueHydrated(true);
      return;
    }

    try {
      const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (saved) {
        const ids = JSON.parse(saved) as string[];
        const savedMovies = ids
          .map((id) => MOCK_MOVIES.find((m) => m.id === id))
          .filter(Boolean) as Movie[];
        setQueue(savedMovies);
      }
    } catch (e) {
      console.error("Failed to hydrate queue", e);
    } finally {
      setIsQueueHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isQueueHydrated) return;
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue.map((m) => m.id)));
  }, [queue, isQueueHydrated]);

  const handleReportBroken = (id: string) => {
    setBrokenIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('brokenVideoIds', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const toggleLike = (id: string) => {
    setLikedMovieIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleAddToQueue = (id: string) => {
    setQueue(prev => {
      if (prev.find(m => m.id === id)) {
        return prev.filter(m => m.id !== id);
      }
      const movie = MOCK_MOVIES.find(m => m.id === id);
      return movie ? [...prev, movie] : prev;
    });
  };

  const moveQueueItem = (id: string, direction: "up" | "down") => {
    setQueue(prev => {
      const index = prev.findIndex(m => m.id === id);
      if (index === -1) return prev;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const clearQueue = () => setQueue([]);

  const scrollToItem = (id: string) => {
    const index = filteredMovies.findIndex(m => m.id === id);
    if (index !== -1) {
      const el = cardRefs.current[index];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (containerRef.current) {
        containerRef.current.scrollTo({
          top: index * window.innerHeight,
          behavior: 'smooth'
        });
      }
      setIsSearching(false);
      setIsBrowsingQueue(false);
    }
  };

  const jumpToNextInQueue = () => {
    if (queue.length === 0) return;
    scrollToItem(queue[0].id);
    setIsBrowsingQueue(false);
  };

  // Helper: item passes shared filters (source, year, genre, rating)
  const passesSharedFilters = (m: (typeof MOCK_MOVIES)[0]) => {
    if (brokenIds.has(m.id)) return false; // Exclude reported broken videos
    if (filters.source !== 'all' && m.source !== filters.source) return false;
    if (filters.minYear && parseInt(m.year) < parseInt(filters.minYear)) return false;
    if (filters.maxYear && parseInt(m.year) > parseInt(filters.maxYear)) return false;
    if (filters.genres.length > 0 && !filters.genres.some(g => m.genres.includes(g))) return false;
    if (filters.minRating > 0 && parseFloat(m.rating) < filters.minRating) return false;
    // Cineplex Only logic
    if (filters.categories.cineplexOnly && !m.nowPlayingTheatres?.includes('Cineplex')) return false;
    return true;
  };

  const { movies: catMovies, tv: catTv, nowPlaying: catNowPlaying, cineplexOnly } = filters.categories;

  // Counts: movies, TV, now playing (Toronto — movies with nowPlayingTheatres)
  const movieCount = MOCK_MOVIES.filter(m => m.type === 'movie' && passesSharedFilters(m)).length;
  const tvCount = MOCK_MOVIES.filter(m => m.type === 'tv' && passesSharedFilters(m)).length;
  const nowPlayingCount = MOCK_MOVIES.filter(m =>
    m.type === 'movie' && (m.nowPlayingTheatres?.length ?? 0) > 0 && passesSharedFilters(m)
  ).length;
  const totalCount = MOCK_MOVIES.filter(passesSharedFilters).length;

  // Filter Logic: include if any selected category matches. If none selected, show all.
  const filteredMovies = MOCK_MOVIES.filter(movie => {
    if (!passesSharedFilters(movie)) return false;

    const isMovie = movie.type === 'movie';
    const isTv = movie.type === 'tv';
    const isNowPlaying = isMovie && (movie.nowPlayingTheatres?.length ?? 0) > 0;

    const anyCategorySelected = catMovies || catTv || catNowPlaying;
    if (!anyCategorySelected) return true;

    return (catMovies && isMovie) || (catTv && isTv) || (catNowPlaying && isNowPlaying);
  });

  // Keep activeIndex in sync with the most visible card (prevents title/video mismatch)
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const ratios = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (Number.isNaN(index)) continue;
          if (entry.isIntersecting) {
            ratios.set(index, entry.intersectionRatio);
          } else {
            ratios.delete(index);
          }
        }

        let bestIndex = activeIndex;
        let bestRatio = 0;
        ratios.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIndex = index;
          }
        });
        if (bestRatio > 0 && bestIndex !== activeIndex) {
          setActiveIndex(bestIndex);
        }
      },
      { root, threshold: [0.35, 0.5, 0.65, 0.8] }
    );

    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [filteredMovies, activeIndex]);

  // When filters change, reset to the top to avoid stale indexes
  useEffect(() => {
    setActiveIndex(0);
    containerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [filteredMovies.length]);

  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <main className="relative w-full h-full bg-black">

      {/* Top Controls Container (pl-16 leaves room for Quick Nav hamburger) */}
      <div className="fixed top-4 left-0 right-0 z-50 flex items-center pl-16 pr-4 pointer-events-none">
        {/* Browsing Controls */}
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors border border-white/10"
            title="Filters"
          >
            <Settings className="w-6 h-6" />
          </button>

          <button
            onClick={() => setIsSearching(true)}
            className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors border border-white/10"
            title="Search & Browse"
          >
            <Search className="w-6 h-6" />
          </button>

          <button
            onClick={() => setIsBrowsingQueue(true)}
            className={`p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors border border-white/10 relative ${queue.length > 0 ? 'text-green-400' : ''}`}
            title="My Queue"
          >
            <ListMusic className="w-6 h-6" />
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>
        </div>

        {/* Category Selector (Centered) — combinable: Movies, TV, Now Playing Toronto */}
        <div className="flex-1 flex justify-center pointer-events-auto mx-4">
          <div className="flex flex-wrap justify-center gap-1 bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
            <button
              onClick={() => setFilters(prev => ({
                ...prev,
                categories: { movies: true, tv: true, nowPlaying: false }
              }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!catNowPlaying && catMovies && catTv ? 'bg-white text-black shadow-lg' : 'text-white/70 hover:text-white'}`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilters(prev => ({
                ...prev,
                categories: { ...prev.categories, movies: !prev.categories.movies }
              }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filters.categories.movies ? 'bg-white text-black shadow-lg' : 'text-white/70 hover:text-white'}`}
            >
              Movies ({movieCount})
            </button>
            <button
              onClick={() => setFilters(prev => ({
                ...prev,
                categories: { ...prev.categories, tv: !prev.categories.tv }
              }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filters.categories.tv ? 'bg-white text-black shadow-lg' : 'text-white/70 hover:text-white'}`}
            >
              TV ({tvCount})
            </button>
            <button
              onClick={() => setFilters(prev => ({
                ...prev,
                categories: { ...prev.categories, nowPlaying: !prev.categories.nowPlaying }
              }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filters.categories.nowPlaying ? 'bg-amber-500 text-black shadow-lg' : 'text-white/70 hover:text-white'}`}
              title="Now playing at Cineplex & Imagine Cinemas (Toronto)"
            >
              Now Playing ({nowPlayingCount})
            </button>
          </div>
        </div>

        {/* Spacer to balance the layout if needed, or right-side controls */}
        <div className="w-10"></div>
      </div>

      {/* Filter Menu Modal */}
      <FilterMenu
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        likedMovieIds={likedMovieIds}
        setLikedMovieIds={setLikedMovieIds}
      />

      {/* Snap Scroll Container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      >
        {filteredMovies.length > 0 ? (
          filteredMovies.map((movie, index) => (
            <div
              key={movie.id}
              className="h-full w-full snap-center"
              ref={(el) => { cardRefs.current[index] = el; }}
              data-index={index}
            >
              <VideoCard
                movie={movie}
                isActive={index === activeIndex}
                isMuted={isMuted}
                toggleMute={toggleMute}
                isLiked={likedMovieIds.has(movie.id)}
                toggleLike={() => toggleLike(movie.id)}
                onReportBroken={handleReportBroken}
                onAddToQueue={handleAddToQueue}
                isInQueue={queue.some(q => q.id === movie.id)}
              />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white space-y-4">
            <p className="text-xl">No content found with these filters.</p>
            <div className="text-sm text-gray-400">
              Try adjusting the year filter or selecting a different category.
            </div>
            <button
              onClick={() => setFilters({
                categories: { movies: true, tv: true, nowPlaying: false },
                minYear: '',
                maxYear: '',
                genres: [],
                minRating: 0,
                source: 'all'
              })}
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
      {/* Search & Browse Overlay */}
      {isSearching && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col pt-16 px-4 pointer-events-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search titles, actors, genres..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 text-white rounded-full py-3 pl-11 pr-4 border border-white/10 focus:outline-none focus:border-cyan-500 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsSearching(false);
                }}
              />
            </div>
            <button
              onClick={() => setIsSearching(false)}
              className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pb-10 custom-scrollbar">
            {filteredMovies
              .filter(m =>
                m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.genres.some(g => g.toLowerCase().includes(searchTerm.toLowerCase()))
              )
              .map(movie => (
                <div
                  key={movie.id}
                  className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 cursor-pointer group"
                  onClick={() => scrollToItem(movie.id)}
                >
                  <img src={movie.posterUrl} className="w-12 h-16 rounded object-cover" alt={movie.title} />
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-sm group-hover:text-cyan-400 transition-colors">{movie.title}</h4>
                    <p className="text-xs text-zinc-400">{movie.year} • {movie.genres.slice(0, 2).join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddToQueue(movie.id); }}
                      className={`p-2 rounded-full transition-colors ${queue.some(q => q.id === movie.id) ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      title={queue.some(q => q.id === movie.id) ? "In Queue" : "Add to Queue"}
                    >
                      {queue.some(q => q.id === movie.id) ? <ListCheck className="w-5 h-5" /> : <ListPlus className="w-5 h-5" />}
                    </button>
                    <div className="p-2 bg-cyan-500/20 text-cyan-500 rounded-full">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Queue Overlay */}
      {isBrowsingQueue && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl animate-in slide-in-from-right duration-300 flex flex-col pt-16 px-4 pointer-events-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ListMusic className="w-6 h-6 text-green-400" /> Playing Next ({queue.length})
          </h2>
          <button
            onClick={() => setIsBrowsingQueue(false)}
            className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={jumpToNextInQueue}
            disabled={!queue.length}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-green-500 text-black font-semibold disabled:bg-green-500/30 disabled:text-black/40 transition-colors hover:enabled:bg-green-600"
          >
            <PlayCircle className="w-5 h-5" />
            Jump to Next
          </button>
          <button
            onClick={clearQueue}
            disabled={!queue.length}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-red-500 text-white font-semibold disabled:bg-red-500/30 disabled:text-white/60 transition-colors hover:enabled:bg-red-600"
          >
            <Trash2 className="w-5 h-5" />
            Clear Queue
          </button>
        </div>

        {queue.length > 0 ? (
          <div className="flex-1 overflow-y-auto space-y-4 pb-10 custom-scrollbar">
              <p className="text-xs text-zinc-500 italic mb-4">Tap a movie to jump to it. The list below is your custom sequence.</p>
              {queue.map((movie, idx) => (
                <div
                  key={movie.id}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 cursor-pointer relative group"
                  onClick={() => scrollToItem(movie.id)}
                >
                  <span className="text-2xl font-black text-white/10 absolute -left-2 italic select-none">{idx + 1}</span>
                  <img src={movie.posterUrl} className="w-16 h-24 rounded-lg object-cover shadow-2xl transition-transform group-hover:scale-105" alt={movie.title} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold group-hover:text-green-400 transition-colors truncate">{movie.title}</h4>
                    <p className="text-sm text-zinc-400 truncate">{movie.source} • {movie.year}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold tracking-wider">UP NEXT</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveQueueItem(movie.id, "up"); }}
                      disabled={idx === 0}
                      className="p-2 rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveQueueItem(movie.id, "down"); }}
                      disabled={idx === queue.length - 1}
                      className="p-2 rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddToQueue(movie.id); }}
                    className="p-3 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-all scale-90 group-hover:scale-100"
                    title="Remove from queue"
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-6">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                <LayoutList className="w-12 h-12 text-zinc-600" />
              </div>
              <div className="space-y-2">
                <p className="text-white font-bold text-lg">Your queue is empty</p>
                <p className="text-zinc-400 text-sm max-w-[250px] mx-auto">Use the "Next Up" button on any video to curate your own viewing experience.</p>
              </div>
              <button
                onClick={() => { setIsBrowsingQueue(false); setIsSearching(true); }}
                className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors shadow-xl"
              >
                Browse All Shows
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
