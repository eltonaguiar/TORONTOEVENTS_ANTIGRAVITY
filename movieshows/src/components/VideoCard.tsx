"use client";

import React, { useState, useEffect } from "react";
import { Heart, Bookmark, Share2, Volume2, VolumeX } from "lucide-react";
import { Movie } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface VideoCardProps {
    movie: Movie;
    isActive: boolean;
    isMuted: boolean;
    toggleMute: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ movie, isActive, isMuted, toggleMute }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [showPoster, setShowPoster] = useState(true);

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

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden snap-center">

            {/* 1. Video Layer (Native Iframe) */}
            <div className="absolute inset-0 w-full h-full">
                {isActive && (
                    <iframe
                        src={`https://www.youtube.com/embed/${movie.videoUrl}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&playsinline=1&loop=1&playlist=${movie.videoUrl}&modestbranding=1&rel=0`}
                        className="w-full h-full object-cover"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
                    onClick={() => setIsLiked(!isLiked)}
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

                <button className="flex flex-col items-center gap-1 group">
                    <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/60">
                        <Share2 className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-semibold drop-shadow-md">Share</span>
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
                    <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded">
                        IMDb {movie.rating}
                    </div>
                    <div className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-2 py-0.5 rounded">
                        {movie.year}
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg leading-tight">
                    {movie.title}
                </h2>
                <p className="text-sm text-gray-200 line-clamp-2 drop-shadow-sm max-w-[90%]">
                    {movie.description}
                </p>
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

        </div>
    );
};
