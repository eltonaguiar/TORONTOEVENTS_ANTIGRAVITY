"use client";
import React, { useRef, useState, useEffect } from "react";
import { VideoCard } from "@/components/VideoCard";
import { FilterMenu } from "@/components/FilterMenu";
import { MOCK_MOVIES } from "@/lib/mockData";
import { Settings } from "lucide-react";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter State
  const [filters, setFilters] = useState<{
    type: 'all' | 'movie' | 'tv';
    minYear: string;
    maxYear: string;
    genres: string[];
    minRating: number;
  }>({
    type: 'all',
    minYear: '',
    maxYear: '',
    genres: [],
    minRating: 0
  });

  // Filter Logic
  const filteredMovies = MOCK_MOVIES.filter(movie => {
    // Type Filter
    if (filters.type !== 'all' && movie.type !== filters.type) return false;

    // Year Filter
    if (filters.minYear && parseInt(movie.year) < parseInt(filters.minYear)) return false;
    if (filters.maxYear && parseInt(movie.year) > parseInt(filters.maxYear)) return false;

    // Genre Filter
    if (filters.genres.length > 0) {
      const hasGenre = filters.genres.some(g => movie.genres.includes(g));
      if (!hasGenre) return false;
    }

    // Rating Filter
    if (parseFloat(movie.rating) < filters.minRating) return false;

    return true;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const index = Math.round(container.scrollTop / container.clientHeight);
      if (index !== activeIndex) {
        setActiveIndex(index);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeIndex]);

  return (
    <main
      ref={containerRef}
      className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black scroll-smooth relative"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {/* Header / Filter Button */}
      <div className="fixed top-4 left-4 z-40">
        <button
          onClick={() => setIsFilterOpen(true)}
          className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Filter Menu Modal */}
      <FilterMenu
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
      />

      {/* Empty State */}
      {filteredMovies.length === 0 && (
        <div className="h-screen w-full flex items-center justify-center text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">No results found</h2>
            <p className="text-zinc-400">Try adjusting your filters</p>
            <button
              onClick={() => setFilters({ type: 'all', minYear: '', maxYear: '', genres: [], minRating: 0 })}
              className="mt-4 text-blue-400 hover:text-blue-300 underline"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {filteredMovies.map((movie, index) => (
        <div key={movie.id} className="h-screen w-full snap-start snap-always">
          <VideoCard
            movie={movie}
            isActive={index === activeIndex}
            isMuted={isMuted}
            toggleMute={() => setIsMuted(prev => !prev)}
          />
        </div>
      ))}
    </main>
  );
}
