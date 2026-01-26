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
        if (!url) return '';
        if (url.startsWith('http')) return url;
        // If relative, assume source domain
        if (event.source === 'AllEvents.in' || url.includes('allevents.in')) {
            const path = url.startsWith('/') ? url : `/${url}`;
            return `https://allevents.in${path}`;
        }
        if (event.source === 'Eventbrite' || url.includes('eventbrite')) {
            const path = url.startsWith('/') ? url : `/${url}`;
            return `https://www.eventbrite.ca${path}`;
        }
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
        center: 'items-center justify-center bg-black/80 backdrop-blur-sm p-4',
        'bottom-right': 'items-end justify-end p-8 pointer-events-none',
        right: 'items-center justify-end p-4 bg-black/40 backdrop-blur-sm',
        left: 'items-center justify-start p-4 bg-black/40 backdrop-blur-sm'
    };

    const modalWidthClass = isChatbox ? 'w-[500px]' : (mode === 'split' ? 'max-w-[1200px] w-[90vw]' : 'max-w-4xl w-[95vw]');

    const content = (
        <div
            className={`
                ${isInline ? 'w-full h-full flex flex-col' : `glass-panel shadow-2xl transition-all duration-500 pointer-events-auto rounded-3xl overflow-hidden flex flex-col ${modalWidthClass}`}
                ${isChatbox && !isInline ? 'border-2 border-[var(--pk-500)]/30 animate-slide-up ring-4 ring-black/50 mb-4 mr-4' : ''}
                relative z-[101]
            `}
            style={{
                height: isInline ? '100%' : `${height}px`,
                backgroundColor: 'var(--surface-1)',
                color: settings.popupFontColor
            } as any}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header / Premium Controls */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-black/40 backdrop-blur-xl z-50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setMode('details')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'details' ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            Overview
                        </button>
                        {!isChatbox && (
                            <button
                                onClick={() => setMode('split')}
                                className={`hidden md:block px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'split' ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                Split
                            </button>
                        )}
                        <button
                            onClick={() => setMode('live')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'live' ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            Live Site
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                        <span className="text-[10px] uppercase font-black text-white/40">Height</span>
                        <input
                            type="range" min="300" max="1000" step="50" value={height}
                            onChange={(e) => updateSettings({ previewHeight: parseInt(e.target.value) })}
                            className="w-16 h-1 accent-[var(--pk-500)] cursor-pointer"
                        />
                    </div>

                    <button
                        onClick={() => toggleSavedEvent && toggleSavedEvent(event)}
                        className={`p-2 rounded-xl transition-all ${isSaved ? 'bg-red-500 text-white shadow-lg scale-110' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>

                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors text-white font-bold text-xl">
                        ×
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative flex bg-[#0a0a0b]">
                {/* DETAILS PANE (Requested Layout) */}
                {(mode === 'details' || mode === 'split') && (
                    <div className={`flex flex-col overflow-y-auto custom-scrollbar ${mode === 'split' ? 'w-1/3 border-r border-white/10 shrink-0' : 'w-full'}`}>
                        {event.image && (
                            <div className="w-full h-80 shrink-0 relative">
                                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-black/20" />
                                {isSoldOut && (
                                    <div className="absolute top-4 left-4 px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-2xl">
                                        Sold Out
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="p-8 space-y-8 max-w-4xl mx-auto w-full">
                            <div>
                                <h2 className="text-4xl font-black mb-6 leading-[1.1] tracking-tight" style={{ color: 'var(--pk-300)' }}>{event.title}</h2>
                                <div className="flex flex-wrap gap-2">
                                    {event.categories.map((cat) => (
                                        <span key={cat} className="px-4 py-1.5 rounded-full bg-[var(--pk-500)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--pk-500)]/20">
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Core Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">📅 Date & Time</span>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white">
                                            {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-[var(--pk-300)] text-sm font-bold">
                                            {new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">📍 Location</span>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white truncate">{event.location}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">💰 Price</span>
                                    <div className="flex flex-col underline decoration-[var(--pk-500)]/50">
                                        <span className="font-bold text-white">{event.price || 'Free'}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">📰 Source</span>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white">{event.source}</span>
                                    </div>
                                </div>
                            </div>

                            {/* About Section */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-white">Description</h3>
                                <div className="prose prose-sm prose-invert max-w-none opacity-80 leading-relaxed text-base">
                                    <p className="whitespace-pre-wrap">{event.description || "No further details provided by the host."}</p>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex flex-wrap gap-4 pt-8 border-t border-white/5 sticky bottom-0 bg-[#0a0a0b]/90 backdrop-blur-md pb-4">
                                <a
                                    href={absoluteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 min-w-[200px] bg-[var(--pk-500)] hover:bg-[var(--pk-600)] text-white text-center py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[var(--pk-500)]/30 transition-all hover:-translate-y-1"
                                >
                                    View Full Event Page →
                                </a>
                                <button
                                    onClick={onClose}
                                    className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-colors border border-white/10"
                                >
                                    Close
                                </button>
                            </div>

                            {/* Live Site Preview Area */}
                            <div className="mt-12 pt-8 border-t-2 border-white/10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-white">Event Page Preview</h3>
                                    <div className="text-[10px] uppercase font-black text-white/30">Interactive IFrame</div>
                                </div>

                                <iframe
                                    src={absoluteUrl}
                                    className="w-full bg-white rounded-3xl border-4 border-white/5 shadow-inner"
                                    style={{ height: `${Math.max(400, height - 200)}px`, transition: 'height 0.3s ease' }}
                                    title={`Preview: ${event.title}`}
                                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                                />

                                <p className="text-sm text-white/40 italic">
                                    If the preview doesn't load, <a href={absoluteUrl} target="_blank" className="text-[var(--pk-300)] underline hover:text-white transition-colors">click here to open the event page</a>.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* FULL LIVE SITE PANE (When not in Details mode) */}
                {mode === 'live' && (
                    <div className="flex flex-col bg-white w-full h-full">
                        <iframe
                            src={absoluteUrl}
                            className="w-full h-full border-none"
                            title={`Live: ${event.title}`}
                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        />
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
