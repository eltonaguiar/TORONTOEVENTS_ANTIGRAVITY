"use client";

import React, { useState, useEffect } from "react";
import { Heart, Bookmark, Share2, Volume2, VolumeX, ExternalLink, RefreshCw, AlertTriangle, Sparkles, X, ListPlus, ListCheck } from "lucide-react";
import { Movie, getSimilarMovies } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface VideoCardProps {
    movie: Movie;
    isActive: boolean;
    isMuted: boolean;
    toggleMute: () => void;
    isLiked: boolean;
    toggleLike: () => void;
    onReportBroken?: (id: string) => void;
    onAddToQueue?: (id: string) => void;
    isInQueue?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({ movie, isActive, isMuted, toggleMute, isLiked, toggleLike, onReportBroken, onAddToQueue, isInQueue }) => {
    const [isSaved, setIsSaved] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [showPoster, setShowPoster] = useState(true);
    const [isReporting, setIsReporting] = useState(false);
    const [showSimilar, setShowSimilar] = useState(false);
    /** Current trailer URL (primary or fallback). Switches to fallback when user clicks "Try backup trailer". */
    const [currentVideoId, setCurrentVideoId] = useState(movie.videoUrl);
    const [descIndex, setDescIndex] = useState(0);
    const hasFallback = Boolean(movie.videoUrlFallback && movie.videoUrlFallback !== movie.videoUrl);
    const hasMultipleDescs = Boolean(movie.descriptions && movie.descriptions.length > 1);

    // Reset to primary when movie changes
    useEffect(() => {
        setCurrentVideoId(movie.videoUrl);
        setDescIndex(0);
    }, [movie.id, movie.videoUrl]);

    // Fade out poster shortly after iframe reports 'load' to cover the black flash
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (iframeLoaded && isActive) {
            // Give the YouTube player a moment to buffer/start after the iframe DOM loads
            timer = setTimeout(() => {
                setShowPoster(false);
            }, 1000);
        } else if (!isActive) {
            setShowPoster(true); // Reset poster when scrolling away
            setIframeLoaded(false);
        }
        return () => clearTimeout(timer);
    }, [iframeLoaded, isActive]);

    // Safety fallback: If iframe onload doesn't fire within 2.5s, force show it anyway.
    // This handles adblockers/extensions that might suppress the onload event.
    useEffect(() => {
        let safetyTimer: NodeJS.Timeout;
        if (isActive && !iframeLoaded) {
            safetyTimer = setTimeout(() => {
                setIframeLoaded(true);
            }, 2500);
        }
        return () => clearTimeout(safetyTimer);
    }, [isActive, iframeLoaded]);

    const handleToggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleMute();
    };

    const handleOpenExternal = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(`https://www.youtube.com/watch?v=${currentVideoId}`, '_blank');
    };

    const handleTryBackupTrailer = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (movie.videoUrlFallback) {
            setCurrentVideoId(movie.videoUrlFallback);
            setIframeLoaded(false);
            setShowPoster(true);
        }
    };

    const handleNextDescription = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (movie.descriptions) {
            setDescIndex((prev) => (prev + 1) % movie.descriptions!.length);
        }
    };

    const currentDescription = movie.descriptions ? movie.descriptions[descIndex] : movie.description;

    const handleBroken = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isReporting) return;
        if (!confirm("Report this video as unavailable? It will be hidden from your feed and parked for repair.")) return;

        setIsReporting(true);
        try {
            // In a static export, we handle this locally via state/localStorage in the parent
            onReportBroken?.(movie.id);
        } catch (err) {
            console.error(err);
        } finally {
            setIsReporting(false);
        }
    };

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden snap-center">

            {/* 1. Video Layer (Native Iframe) — uses currentVideoId (primary or fallback) */}
            <div className="absolute inset-0 w-full h-full">
                {isActive && (
                    <iframe
                        key={currentVideoId}
                        src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&playsinline=1&loop=1&playlist=${currentVideoId}&modestbranding=1&rel=0`}
                        className="w-full h-full object-cover"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="eager"
                        onLoad={() => setIframeLoaded(true)}
                        style={{ opacity: showPoster ? 0 : 1, transition: 'opacity 1s ease-in-out' }}
                    />
                )}
            </div>

            {/* 2. Poster / Loading Layer */}
            <div
                className={cn(
                    "absolute inset-0 z-10 bg-black transition-opacity duration-1000 pointer-events-none",
                    showPoster ? "opacity-100" : "opacity-0"
                )}
            >
                <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover opacity-60 blur-sm"
                />

                {isActive && !iframeLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/50"></div>
                    </div>
                )}
            </div>

            {/* 3. Aesthetic Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-20" />

            {/* 4. Right User Actions */}
            <div className="absolute right-4 bottom-20 flex flex-col items-center gap-4 z-30">
                <button
                    onClick={toggleLike}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className={cn("p-3 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/60", isLiked && "text-red-500")}>
                        <Heart className={cn("w-8 h-8", isLiked && "fill-current")} />
                    </div>
                    <span className="text-xs font-semibold drop-shadow-md">Like</span>
                </button>

                <button
                    onClick={() => setIsSaved(!isSaved)}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className={cn("p-3 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/60", isSaved && "text-yellow-400")}>
                        <Bookmark className={cn("w-8 h-8", isSaved && "fill-current")} />
                    </div>
                    <span className="text-xs font-semibold drop-shadow-md">Save</span>
                </button>

                <button
                    onClick={handleOpenExternal}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/60">
                        <ExternalLink className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-semibold drop-shadow-md">Open</span>
                </button>

                {hasMultipleDescs && (
                    <button
                        onClick={handleNextDescription}
                        className="flex flex-col items-center gap-1 group"
                        title="Click to see alternative description"
                    >
                        <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/60 text-cyan-400">
                            <RefreshCw className="w-8 h-8" />
                        </div>
                        <span className="text-xs font-semibold drop-shadow-md whitespace-nowrap">Alt Desc</span>
                    </button>
                )}

                {hasFallback && (
                    <button
                        onClick={handleTryBackupTrailer}
                        className="flex flex-col items-center gap-1 group"
                        title="Try backup trailer if this one doesn’t play"
                    >
                        <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/60">
                            <RefreshCw className="w-8 h-8" />
                        </div>
                        <span className="text-xs font-semibold drop-shadow-md">Backup</span>
                    </button>
                )}

                <button className="flex flex-col items-center gap-1 group">
                    <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/60">
                        <Share2 className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-semibold drop-shadow-md">Share</span>
                </button>

                <button
                    onClick={() => onAddToQueue?.(movie.id)}
                    className={cn("flex flex-col items-center gap-1 group", isInQueue ? "text-green-400" : "text-white")}
                >
                    <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/60 group-active:scale-95">
                        {isInQueue ? <ListCheck className="w-8 h-8" /> : <ListPlus className="w-8 h-8" />}
                    </div>
                    <span className="text-xs font-semibold drop-shadow-md">{isInQueue ? "In Queue" : "Next Up"}</span>
                </button>

                <button
                    onClick={() => setShowSimilar(!showSimilar)}
                    className="flex flex-col items-center gap-1 group text-cyan-400"
                >
                    <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/60 group-active:scale-95">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-semibold drop-shadow-md">Similar</span>
                </button>

                <button
                    onClick={handleBroken}
                    disabled={isReporting}
                    className="flex flex-col items-center gap-1 group text-orange-400"
                >
                    <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/60 group-active:scale-95">
                        <AlertTriangle className={cn("w-8 h-8", isReporting && "animate-pulse")} />
                    </div>
                    <span className="text-xs font-semibold drop-shadow-md">Broken</span>
                </button>

                <div className="flex flex-col gap-3 mt-2 bg-black/20 p-2 rounded-2xl backdrop-blur-sm">
                    <button className="text-2xl hover:scale-125 transition-transform" title="Hype">🔥</button>
                    <button className="text-2xl hover:scale-125 transition-transform" title="Thought-provoking">🧠</button>
                    <button className="text-2xl hover:scale-125 transition-transform" title="Boring">😴</button>
                    <button className="text-2xl hover:scale-125 transition-transform" title="Emotional">😢</button>
                </div>
            </div>

            {/* 5. Bottom Info Section */}
            <div className="absolute bottom-4 left-4 right-16 z-30 flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center gap-2">
                    <div className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1">
                        IMDb {movie.rating}
                    </div>
                    {movie.rottenTomatoesRating && (
                        <div className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1">
                            <span className="text-[12px]">🍅</span> {movie.rottenTomatoesRating}
                        </div>
                    )}
                    <div className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : movie.year}
                    </div>
                    <div className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        {movie.type === 'movie' ? 'Movie' : 'TV Show'}
                    </div>
                    <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        {movie.source}
                    </div>
                    {movie.nowPlayingTheatres && movie.nowPlayingTheatres.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                            {movie.nowPlayingTheatres.map((t) => (
                                <span key={t} className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                    {t} (Toronto)
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Countdown / Release Status Badge */}
                {movie.releaseDate && (
                    <div className="flex items-center">
                        {(() => {
                            const releaseDate = new Date(movie.releaseDate);
                            const today = new Date("2026-01-28");
                            const diffTime = releaseDate.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            if (diffDays <= 0) {
                                return (
                                    <div className="bg-green-500/90 text-white text-[10px] font-black px-2 py-1 rounded-sm uppercase flex items-center gap-1 shadow-lg ring-1 ring-white/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        Streaming Now
                                    </div>
                                );
                            } else if (diffDays === 1) {
                                return (
                                    <div className="bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-sm uppercase shadow-lg ring-1 ring-white/20">
                                        Releases Tomorrow
                                    </div>
                                );
                            } else if (diffDays <= 45) {
                                return (
                                    <div className="bg-zinc-100 text-black text-[10px] font-black px-2 py-1 rounded-sm uppercase shadow-lg ring-1 ring-black/10">
                                        {diffDays} Days to go
                                    </div>
                                );
                            } else {
                                const months = Math.floor(diffDays / 30);
                                return (
                                    <div className="bg-zinc-800 text-zinc-300 text-[10px] font-black px-2 py-1 rounded-sm border border-zinc-700 uppercase shadow-lg">
                                        In {months} {months === 1 ? 'Month' : 'Months'}
                                    </div>
                                );
                            }
                        })()}
                    </div>
                )}
                <h2 className="text-2xl font-bold text-white drop-shadow-lg leading-tight">
                    {movie.title}
                </h2>
                <div className="relative group/desc pointer-events-auto max-w-[90%]">
                    <p className="text-sm text-gray-200 line-clamp-3 drop-shadow-sm transition-all duration-300">
                        {currentDescription}
                    </p>
                    {hasMultipleDescs && (
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-cyan-400 font-bold px-1.5 py-0.5 bg-cyan-400/10 rounded border border-cyan-400/20">
                                Source {descIndex + 1}/{movie.descriptions?.length}
                            </span>
                            <button
                                onClick={handleNextDescription}
                                className="text-[10px] text-white/70 hover:text-cyan-400 font-bold flex items-center gap-1 transition-colors group/link"
                            >
                                <RefreshCw className="w-3 h-3 group-hover/link:rotate-180 transition-transform duration-500" />
                                <span>Next Description</span>
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {movie.genres.map(g => (
                        <span key={g} className="text-xs bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full text-gray-100 border border-white/10">
                            {g}
                        </span>
                    ))}
                </div>
            </div>

            {/* 6. Mute Toggle */}
            <button
                onClick={handleToggleMute}
                className="absolute top-20 right-4 z-40 p-2 bg-black/20 backdrop-blur-sm rounded-full text-white/80 hover:text-white"
            >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>

            {/* 7. Similar Shows Overlay */}
            {showSimilar && (
                <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-xl p-6 flex flex-col pt-20 animate-in fade-in zoom-in duration-300">
                    <button
                        onClick={() => setShowSimilar(false)}
                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-400" /> More Like This
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {getSimilarMovies(movie).map((sim) => (
                            <div
                                key={sim.id}
                                className="flex gap-4 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                                onClick={() => {
                                    // In a snap-scroll feed, we can't easily navigate to another card by index here without parent control
                                    // For now, we'll just open the YouTube link in a new tab
                                    window.open(`https://www.youtube.com/watch?v=${sim.videoUrl}`, '_blank');
                                }}
                            >
                                <div className="w-20 h-28 flex-shrink-0 relative overflow-hidden rounded-lg">
                                    <img
                                        src={sim.posterUrl}
                                        alt={sim.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                        <ExternalLink className="w-6 h-6 text-white/50 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                                    </div>
                                </div>
                                <div className="flex-1 py-1">
                                    <h4 className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">{sim.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded font-bold">IMDb {sim.rating}</span>
                                        <span className="text-[10px] text-zinc-400">{sim.year}</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 line-clamp-2 mt-2 leading-relaxed">
                                        {sim.description}
                                    </p>
                                    <div className="flex gap-1 mt-2">
                                        {sim.genres.slice(0, 2).map(g => (
                                            <span key={g} className="text-[9px] bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded-full border border-white/5">{g}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowSimilar(false)}
                        className="mt-6 w-full py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors"
                    >
                        Back to Video
                    </button>
                </div>
            )}

        </div>
    );
};
