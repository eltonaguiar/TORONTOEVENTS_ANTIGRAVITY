'use client';
import { useState } from 'react';
import { Event } from '../lib/types';
import { useSettings } from '../context/SettingsContext';
import { inferSoldOutStatus } from '../lib/scraper/utils';

interface EventPreviewProps {
    event: Event;
    onClose: () => void;
    isInline?: boolean;
}

type PreviewMode = 'details' | 'live' | 'split';
type Placement = 'center' | 'right' | 'left';

export default function EventPreview({ event, onClose, isInline }: EventPreviewProps) {
    const { settings, updateSettings, toggleSavedEvent } = useSettings();
    const [mode, setMode] = useState<PreviewMode>('details');

    // Use settings or local overrides
    const height = settings.previewHeight || 600;
    const position = settings.previewPosition || 'center';
    const isChatbox = settings.isChatboxMode;

    const isSaved = settings.savedEvents?.some((e) => e.id === event.id) ?? false;

    // Fixed absolute URL for iframe - preventing GitHub relative link 404s
    const getAbsoluteUrl = (url: string) => {
        if (url.startsWith('http')) return url;
        if (event.source === 'AllEvents.in') return `https://allevents.in${url.startsWith('/') ? '' : '/'}${url}`;
        return url;
    };

    const absoluteUrl = getAbsoluteUrl(event.url);

    const bodyText = (event.title + ' ' + (event.description || ''));
    const { isSoldOut: inferredSoldOut, genderSoldOut: inferredGenderOut } = inferSoldOutStatus(bodyText);
    const isSoldOut = event.isSoldOut || inferredSoldOut;

    let genderSoldOutText = '';
    if (settings.gender !== 'unspecified') {
        const gender = settings.gender;
        const currentGenderOut = event.genderSoldOut === 'both' || event.genderSoldOut === gender || inferredGenderOut === 'both' || inferredGenderOut === gender;

        if (currentGenderOut) {
            genderSoldOutText = `${gender.toUpperCase()} TICKETS SOLD OUT`;
        }
    }

    const placementClasses = {
        center: 'items-center justify-center bg-black/80 backdrop-blur-sm',
        'bottom-right': 'items-end justify-end p-8 pointer-events-none',
        right: 'items-center justify-end p-4 bg-black/40 backdrop-blur-sm',
        left: 'items-center justify-start p-4 bg-black/40 backdrop-blur-sm'
    };

    const modalWidthClass = isChatbox ? 'w-[450px]' : (mode === 'split' ? 'max-w-[1200px] w-[90vw]' : 'max-w-4xl w-[90vw]');

    const content = (
        <div
            className={`
                ${isInline ? 'w-full h-full flex flex-col' : `glass-panel shadow-2xl transition-all duration-500 pointer-events-auto rounded-3xl overflow-hidden flex flex-col ${modalWidthClass}`}
                ${isChatbox && !isInline ? 'border-2 border-[var(--pk-500)]/30 animate-slide-up ring-4 ring-black/50' : ''}
            `}
            style={{
                height: isInline ? '100%' : `${height}px`,
                '--pk-500': 'var(--pk-500)',
                color: settings.popupFontColor
            } as any}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header / Premium Controls */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setMode('details')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${mode === 'details' ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            Overview
                        </button>
                        {!isChatbox && (
                            <button
                                onClick={() => setMode('split')}
                                className={`hidden md:block px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${mode === 'split' ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                Split
                            </button>
                        )}
                        <button
                            onClick={() => setMode('live')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${mode === 'live' ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            Link Out
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Quick Height Adjuster */}
                    <div className="hidden sm:flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                        <span className="text-[10px] uppercase font-black text-white/40">Height</span>
                        <input
                            type="range" min="400" max="1000" step="50" value={height}
                            onChange={(e) => updateSettings({ previewHeight: parseInt(e.target.value) })}
                            className="w-16 h-1 accent-[var(--pk-500)] cursor-pointer"
                        />
                    </div>

                    <button
                        onClick={() => toggleSavedEvent && toggleSavedEvent(event)}
                        className={`p-2 rounded-xl transition-all ${isSaved ? 'bg-red-500 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>

                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors text-white/60">
                        ✕
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative flex bg-[#0a0a0b]">
                {/* DETAILS PANE (Cloning the page feel) */}
                {(mode === 'details' || mode === 'split') && (
                    <div className={`flex flex-col overflow-y-auto custom-scrollbar ${mode === 'split' ? 'w-1/3 border-r border-white/10' : 'w-full'}`}>
                        {event.image && (
                            <div className="w-full h-72 shrink-0 relative">
                                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-black/40" />
                                {isSoldOut && (
                                    <div className="absolute top-4 left-4 px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-2xl">
                                        Sold Out
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="p-8 space-y-8">
                            <div>
                                <h2 className="text-3xl font-black mb-4 leading-[1.1]" style={{ color: settings.popupFontColor }}>{event.title}</h2>
                                <div className="flex flex-wrap gap-2">
                                    {event.categories.map((cat) => (
                                        <span key={cat} className="px-3 py-1 rounded-full bg-[var(--pk-500)]/10 text-[var(--pk-300)] text-[10px] font-black uppercase tracking-tighter border border-[var(--pk-500)]/20">
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Core Info Blocks */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                                    <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">When</span>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white">
                                            {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </span>
                                        <span className="text-[var(--pk-300)] text-sm font-bold">
                                            {new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                                    <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">Where</span>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white truncate">{event.location}</span>
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" className="text-[var(--pk-300)] text-xs font-bold hover:underline">Open in Maps ↗</a>
                                    </div>
                                </div>
                            </div>

                            {/* Ticket Card */}
                            <div className="p-6 rounded-3xl bg-[var(--pk-500)] text-white shadow-xl shadow-[var(--pk-500)]/20 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-black opacity-60">Admission</span>
                                    <span className="text-2xl font-black">{event.price || 'Free'}</span>
                                </div>
                                <a
                                    href={absoluteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 bg-white text-[var(--pk-600)] font-black uppercase text-xs rounded-2xl shadow-lg hover:scale-105 transition-transform"
                                >
                                    Get Tickets ↗
                                </a>
                            </div>

                            {/* Description */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] uppercase font-black text-white/30 tracking-widest">About this event</h3>
                                <div className="prose prose-sm prose-invert max-w-none opacity-80 leading-relaxed text-sm">
                                    <p className="whitespace-pre-wrap">{event.description || "No further details provided by the host."}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* EMBED PANE (Right or Full) */}
                {(mode === 'live' || mode === 'split') && (
                    <div className={`flex flex-col bg-white h-full ${mode === 'split' ? 'w-2/3' : 'w-full'}`}>
                        <iframe
                            src={absoluteUrl}
                            className="w-full flex-1 border-none bg-white"
                            title={`Preview: ${event.title}`}
                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        />
                        {/* Fallback Banner for blocked iframes */}
                        <div className="p-3 bg-red-500/10 border-t border-red-500/20 flex items-center justify-between text-[10px] font-bold">
                            <span className="text-red-400">⚠️ If the official site is blocked above, please use "Get Tickets" button.</span>
                            <a href={absoluteUrl} target="_blank" className="text-red-400 underline">Open Link Independently ↗</a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (isInline) return content;

    return (
        <div
            className={`fixed inset-0 z-[100] flex transition-all duration-500 ${placementClasses[position as keyof typeof placementClasses]}`}
            onClick={onClose}
        >
            {content}
        </div>
    );
}
