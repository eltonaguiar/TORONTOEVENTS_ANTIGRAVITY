'use client';

import { useState, useEffect, useRef } from 'react';
import { Event } from '../lib/types';
import EventPreview from './EventPreview';

interface InlinePreviewWithIndicatorProps {
    event: Event;
    onClose: () => void;
    onSwitchToPopup: () => void;
}

export default function InlinePreviewWithIndicator({ event, onClose, onSwitchToPopup }: InlinePreviewWithIndicatorProps) {
    const previewRef = useRef<HTMLDivElement>(null);
    const [isOffScreen, setIsOffScreen] = useState(false);
    const [previewPosition, setPreviewPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        const checkVisibility = () => {
            if (!previewRef.current) return;

            const rect = previewRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // Check if preview is off-screen (above or below viewport)
            const isAboveViewport = rect.bottom < 0;
            const isBelowViewport = rect.top > viewportHeight;
            const isOffScreenVertically = isAboveViewport || isBelowViewport;

            // Check if preview is partially or fully off-screen horizontally
            const isOffScreenHorizontally = rect.right < 0 || rect.left > viewportWidth;

            setIsOffScreen(isOffScreenVertically || isOffScreenHorizontally);

            if (isOffScreenVertically || isOffScreenHorizontally) {
                // Calculate position for arrow indicator
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // Determine arrow position based on where preview is
                let arrowX = centerX;
                let arrowY = centerY;

                if (isAboveViewport) {
                    arrowY = 100; // Top of viewport
                } else if (isBelowViewport) {
                    arrowY = viewportHeight - 100; // Bottom of viewport
                }

                if (rect.right < 0) {
                    arrowX = 50; // Left edge
                } else if (rect.left > viewportWidth) {
                    arrowX = viewportWidth - 50; // Right edge
                }

                setPreviewPosition({ top: arrowY, left: arrowX });
            } else {
                setPreviewPosition(null);
            }
        };

        // Check on mount and scroll
        checkVisibility();
        window.addEventListener('scroll', checkVisibility, true);
        window.addEventListener('resize', checkVisibility);

        return () => {
            window.removeEventListener('scroll', checkVisibility, true);
            window.removeEventListener('resize', checkVisibility);
        };
    }, [event]);

    const scrollToPreview = () => {
        if (previewRef.current) {
            previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <>
            {/* Off-screen indicator with red arrow */}
            {isOffScreen && previewPosition && (
                <div
                    className="fixed z-[200] pointer-events-none"
                    style={{
                        top: `${previewPosition.top}px`,
                        left: `${previewPosition.left}px`,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                        {/* Red Arrow pointing to preview */}
                        <div className="relative">
                            <svg
                                width="80"
                                height="80"
                                viewBox="0 0 80 80"
                                className="drop-shadow-2xl"
                            >
                                <defs>
                                    <filter id="glow">
                                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <path
                                    d="M40 10 L40 50 L20 30 M40 50 L60 30"
                                    stroke="#ef4444"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                    filter="url(#glow)"
                                    className="animate-bounce"
                                />
                            </svg>
                        </div>

                        {/* Recommendation message */}
                        <div className="bg-red-600/90 backdrop-blur-sm border-2 border-red-400 rounded-2xl p-4 shadow-2xl max-w-xs text-center">
                            <p className="text-white font-black text-sm uppercase tracking-tight mb-2">
                                ⚠️ Preview Off-Screen
                            </p>
                            <p className="text-white/90 text-xs mb-3">
                                The embedded preview is not visible. Switch to Tactical Overlay mode for better visibility.
                            </p>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={onSwitchToPopup}
                                    className="px-4 py-2 bg-white text-red-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all shadow-lg pointer-events-auto"
                                >
                                    Switch to Tactical Overlay
                                </button>
                                <button
                                    onClick={scrollToPreview}
                                    className="px-4 py-2 bg-red-500/50 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-500/70 transition-all pointer-events-auto border border-red-400/50"
                                >
                                    Scroll to Preview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Inline Preview */}
            <div ref={previewRef} className="mb-12 animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--pk-500)]">/ Inline Tactical Preview</span>
                    <button onClick={onClose} className="text-xs font-bold text-[var(--text-3)] hover:text-white transition-colors">Close Preview ✕</button>
                </div>
                <div className="glass-panel overflow-hidden rounded-2xl border-2 border-[var(--pk-500)]/30 h-[80vh]">
                    <EventPreview event={event} onClose={onClose} isInline />
                </div>
            </div>
        </>
    );
}
