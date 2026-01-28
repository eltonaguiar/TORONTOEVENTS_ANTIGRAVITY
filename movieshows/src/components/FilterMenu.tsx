"use client";

import React, { useRef } from 'react';
import { X, Sliders, Calendar, Film, Star, Download, Upload, Tv, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_MOVIES, type CategoryFilter } from '@/lib/mockData';

interface FilterMenuProps {
    isOpen: boolean;
    onClose: () => void;
    filters: {
        categories: CategoryFilter & { cineplexOnly?: boolean };
        minYear: string;
        maxYear: string;
        genres: string[];
        minRating: number;
        source: 'all' | 'Disney+' | 'Hulu' | 'Paramount Plus' | 'Netflix' | 'Amazon Prime' | 'In Theatres' | 'Max' | 'Apple TV+';
    };
    setFilters: React.Dispatch<React.SetStateAction<{
        categories: CategoryFilter & { cineplexOnly?: boolean };
        minYear: string;
        maxYear: string;
        genres: string[];
        minRating: number;
        source: 'all' | 'Disney+' | 'Hulu' | 'Paramount Plus' | 'Netflix' | 'Amazon Prime' | 'In Theatres' | 'Max' | 'Apple TV+';
    }>>;
    likedMovieIds: Set<string>;
    setLikedMovieIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const ALL_GENRES = ["Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Drama", "History", "Horror", "Sci-Fi"];
const ALL_SOURCES = ['all', 'Disney+', 'Hulu', 'Paramount Plus', 'Netflix', 'Amazon Prime', 'In Theatres', 'Max', 'Apple TV+'] as const;

export const FilterMenu: React.FC<FilterMenuProps> = ({ isOpen, onClose, filters, setFilters, likedMovieIds, setLikedMovieIds }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleGenreToggle = (genre: string) => {
        setFilters(prev => {
            const currentGenres = prev.genres;
            if (currentGenres.includes(genre)) {
                return { ...prev, genres: currentGenres.filter(g => g !== genre) };
            } else {
                return { ...prev, genres: [...currentGenres, genre] };
            }
        });
    };

    const handleExportLikes = () => {
        const likedMoviesList = Array.from(likedMovieIds).map(id => {
            const movie = MOCK_MOVIES.find(m => m.id === id);
            return movie ? `${movie.title} (${movie.year})` : `Unknown ID: ${id}`;
        }).join('\n');

        const blob = new Blob([likedMoviesList], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-liked-movies.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportLikes = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            // Simple parsing strategy: Assume format "Title (Year)"
            // We'll match against MOCK_MOVIES to find IDs.
            // Be tolerant of exact matches.
            const lines = text.split('\n').filter(line => line.trim() !== '');
            const newLikedIds = new Set<string>(likedMovieIds); // Start with existing likes, or make new empty set if we want to replace? Let's append.

            lines.forEach(line => {
                // Try to match line to a movie title
                // We'll strip year for safer matching if needed, but let's try includes first
                const movie = MOCK_MOVIES.find(m => line.includes(m.title));
                if (movie) {
                    newLikedIds.add(movie.id);
                }
            });

            setLikedMovieIds(newLikedIds);
            alert(`Imported ${lines.length} likes!`);
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Sliders className="w-6 h-6" /> Filters & Settings
                </h2>

                {/* 1. Media Type */}
                <div className="mb-6">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
                        Media Categories
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, categories: { movies: true, tv: true, nowPlaying: false } }))}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                (!filters.categories.nowPlaying && filters.categories.movies && filters.categories.tv)
                                    ? "bg-white text-black border-white shadow-md"
                                    : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                            )}
                        >
                            All Categories
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, categories: { ...prev.categories, movies: !prev.categories.movies } }))}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                filters.categories.movies
                                    ? "bg-white text-black border-white shadow-md"
                                    : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                            )}
                        >
                            Movies
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, categories: { ...prev.categories, tv: !prev.categories.tv } }))}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                filters.categories.tv
                                    ? "bg-white text-black border-white shadow-md"
                                    : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                            )}
                        >
                            TV Shows
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, categories: { ...prev.categories, nowPlaying: !prev.categories.nowPlaying } }))}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                filters.categories.nowPlaying
                                    ? "bg-amber-500 text-black border-amber-500 shadow-md"
                                    : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                            )}
                        >
                            Now Playing (Toronto)
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, categories: { ...prev.categories, cineplexOnly: !prev.categories.cineplexOnly } }))}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                filters.categories.cineplexOnly
                                    ? "bg-red-600 text-white border-red-600 shadow-md font-bold"
                                    : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                            )}
                        >
                            Cineplex Only
                        </button>
                    </div>
                </div>

                {/* 2. Source / Platform */}
                <div className="mb-6">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <Tv className="w-4 h-4" /> Source / Platform
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {ALL_SOURCES.map((source) => (
                            <button
                                key={source}
                                onClick={() => setFilters(prev => ({ ...prev, source }))}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize",
                                    filters.source === source
                                        ? "bg-white text-black border-white"
                                        : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                                )}
                            >
                                {source === 'all' ? 'All Sources' : source}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Year Range */}
                <div className="mb-6">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Year Release
                    </label>
                    <div className="flex gap-4">
                        <input
                            type="number"
                            placeholder="Min (e.g. 2026)"
                            value={filters.minYear}
                            onChange={(e) => setFilters(prev => ({ ...prev, minYear: e.target.value }))}
                            className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            placeholder="Max"
                            value={filters.maxYear}
                            onChange={(e) => setFilters(prev => ({ ...prev, maxYear: e.target.value }))}
                            className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* 3. Genres */}
                <div className="mb-6">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <Film className="w-4 h-4" /> Genres
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {ALL_GENRES.map(genre => (
                            <button
                                key={genre}
                                onClick={() => handleGenreToggle(genre)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                    filters.genres.includes(genre)
                                        ? "bg-white text-black border-white"
                                        : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                                )}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Rating */}
                <div className="mb-8">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <Star className="w-4 h-4" /> Min IMDb Rating: {filters.minRating}
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={filters.minRating}
                        onChange={(e) => setFilters(prev => ({ ...prev, minRating: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>

                {/* 5. My Likes (Export/Import) */}
                <div className="mb-8 border-t border-zinc-800 pt-6">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
                        My Likes ({likedMovieIds.size})
                    </label>
                    <div className="flex gap-4">
                        <button
                            onClick={handleExportLikes}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" /> Export
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Upload className="w-4 h-4" /> Import
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportLikes}
                            className="hidden"
                            accept=".txt"
                        />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2 text-center">Export your likes to Notepad and import them back later.</p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    Show Results
                </button>
            </div>
        </div>
    );
};
