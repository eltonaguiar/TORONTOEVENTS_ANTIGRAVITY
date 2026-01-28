import React from "react";
import { X } from "lucide-react";

interface FilterState {
    type: 'all' | 'movie' | 'tv';
    minYear: string;
    maxYear: string;
    genres: string[];
    minRating: number;
}

interface FilterMenuProps {
    isOpen: boolean;
    onClose: () => void;
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

const AVAILABLE_GENRES = [
    "Action", "Adventure", "Animation", "Biography", "Comedy",
    "Crime", "Drama", "History", "Horror", "Sci-Fi"
];

export const FilterMenu: React.FC<FilterMenuProps> = ({ isOpen, onClose, filters, setFilters }) => {
    if (!isOpen) return null;

    const handleGenreToggle = (genre: string) => {
        setFilters(prev => {
            if (prev.genres.includes(genre)) {
                return { ...prev, genres: prev.genres.filter(g => g !== genre) };
            } else {
                return { ...prev, genres: [...prev.genres, genre] };
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-800 relative">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Filters</h2>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-6">

                    {/* Media Type */}
                    <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
                            Media Type
                        </label>
                        <div className="flex bg-zinc-800 rounded-lg p-1">
                            {(['all', 'movie', 'tv'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilters({ ...filters, type })}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${filters.type === type
                                            ? "bg-white text-black shadow-lg"
                                            : "text-zinc-400 hover:text-white"
                                        }`}
                                >
                                    {type === 'all' ? 'All' : type === 'movie' ? 'Movies' : 'TV Shows'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Year Range */}
                    <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
                            Year Release
                        </label>
                        <div className="flex gap-4">
                            <input
                                type="number"
                                value={filters.minYear}
                                onChange={(e) => setFilters({ ...filters, minYear: e.target.value })}
                                placeholder="Min"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
                            />
                            <input
                                type="number"
                                value={filters.maxYear}
                                onChange={(e) => setFilters({ ...filters, maxYear: e.target.value })}
                                placeholder="Max"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
                            />
                        </div>
                    </div>

                    {/* Genres */}
                    <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
                            Genres
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_GENRES.map(genre => (
                                <button
                                    key={genre}
                                    onClick={() => handleGenreToggle(genre)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filters.genres.includes(genre)
                                            ? "bg-white text-black border-white"
                                            : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                                        }`}
                                >
                                    {genre}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Minimum Rating */}
                    <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
                            Min IMDb Rating: {filters.minRating}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.1"
                            value={filters.minRating}
                            onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                    </div>

                    {/* Apply Button */}
                    <button
                        onClick={onClose}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors mt-4"
                    >
                        Show Results
                    </button>

                </div>
            </div>
        </div>
    );
};
