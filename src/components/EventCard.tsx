import { Event } from '../lib/types';
import { inferSoldOutStatus } from '../lib/scraper/utils';
import { useSettings } from '../context/SettingsContext';
import { useState } from 'react';

interface EventCardProps {
    event: Event;
    onPreview?: (rect: DOMRect) => void;
}

export default function EventCard({ event, onPreview }: EventCardProps) {
    const { settings, toggleSavedEvent } = useSettings();
    const [isHovered, setIsHovered] = useState(false);

    // Check if saved. Ensure savedEvents exists to avoid crashes if context is stale.
    const isSaved = settings.savedEvents?.some((e: Event) => e.id === event.id) ?? false;

    const dateObj = new Date(event.date);

    // Use Toronto timezone for display
    const month = dateObj.toLocaleDateString('en-US', { month: 'short', timeZone: 'America/Toronto' });
    const day = dateObj.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'America/Toronto' });

    const dateStr = `${month} ${day}`;
    const timeStr = dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Toronto'
    });

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

    // Host Avatar Helpers
    const hostName = event.host || event.source;
    const hostInitials = hostName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    // Interaction Handlers
    const handleMouseEnter = () => settings.showTooltips && setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    return (
        // Placeholder container to hold grid space
        <div
            className="relative h-[320px] w-full"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* 
               The Floating Card 
               - Normally fills the container.
               - On hover, it breaks out (z-index, height auto) to show more content.
            */}
            <div
                className={`
                    absolute inset-x-0 top-0 transition-all duration-300 ease-out origin-top
                    rounded-xl shadow-lg border border-white/10 overflow-hidden
                    flex flex-col cursor-pointer
                    ${isHovered ? 'z-50 min-h-[110%] h-auto bg-[var(--surface-1)] scale-105 shadow-2xl ring-1 ring-white/20' : 'h-full glass-panel hover:-translate-y-1'}
                `}
                style={{
                    backdropFilter: isHovered ? 'none' : 'blur(12px)',
                }}
                onClick={(e) => onPreview && onPreview(e.currentTarget.getBoundingClientRect())}
            >
            {/* Save Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (toggleSavedEvent) toggleSavedEvent(event);
                }}
                className={`absolute top-3 right-3 z-40 p-2 rounded-full transition-all ${isSaved ? 'bg-red-500 text-white shadow-lg scale-110' : 'bg-black/20 text-white/50 hover:bg-black/40 hover:text-white hover:scale-110'}`}
                title={isSaved ? "Remove from My Events" : "Save to My Events"}
            >
                <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            </button>

            {/* STATUS BADGES */}
            {isSoldOut && !genderSoldOutText && (
                <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-[10px] font-black uppercase text-center py-1 z-30 shadow-lg tracking-widest">
                    Sold Out
                </div>
            )}
            {genderSoldOutText && (
                <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-[10px] font-black uppercase text-center py-1 z-30 shadow-lg tracking-widest">
                    {genderSoldOutText}
                </div>
            )}
            {event.status === 'CANCELLED' && (
                <div className="absolute top-0 left-0 right-0 bg-red-500/80 text-white text-xs font-bold text-center py-1 z-30">
                    CANCELLED
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <div className="p-4 flex-1 flex flex-col relative z-20">

                {/* Header: Date & Price */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col items-center bg-white/5 rounded-lg p-2 min-w-[3.5rem] border border-white/10 group-hover:bg-white/10 transition-colors">
                        <span className="text-xs uppercase font-bold text-[var(--pk-200)]">{month}</span>
                        <span className="text-xl font-bold text-white">{day}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--surface-3)] text-[var(--text-2)] border border-white/5">
                            {event.price}
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h3
                    className={`text-base font-bold leading-snug transition-all duration-300 ${isHovered ? 'line-clamp-none mb-2' : 'line-clamp-2'}`}
                    style={{ color: settings.eventFontColor }}
                >
                    {event.title}
                </h3>

                {/* Meta Info (Time/Loc) - Fade out on hover to make room for description? No, keep it. */}
                {!isHovered && (
                    <div className="mt-auto pt-4 flex flex-col gap-1 text-sm text-[var(--text-2)] animate-fade-in">
                        <div className="flex items-center gap-2">
                            <span className="opacity-70">🕒</span>
                            <span>{timeStr}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="opacity-70">📍</span>
                            <span className="truncate">{event.location}</span>
                        </div>
                    </div>
                )}

                {/* HOVER: Expanded Description & Host Info */}
                {isHovered && (
                    <div className="mt-2 animate-slide-up space-y-4">
                        {/* Host Info */}
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--pk-500)] to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-inner overflow-hidden shrink-0">
                                {event.image ? (
                                    <div className="w-full h-full bg-cover bg-center opacity-90" style={{ backgroundImage: `url(${event.image})` }} />
                                ) : (
                                    <span>{hostInitials}</span>
                                )}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-[10px] uppercase text-[var(--text-3)] font-black tracking-wider">Host</span>
                                <span className="text-xs font-bold truncate text-[var(--text-1)]">{hostName}</span>
                            </div>
                        </div>


                        {/* Categories & Tags */}
                        <div className="flex flex-wrap gap-1">
                            {event.categories.map(cat => (
                                <span key={cat} className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-[var(--pk-900)] text-[var(--pk-200)] bg-opacity-50 border border-[var(--pk-200)]/20">
                                    {cat}
                                </span>
                            ))}
                            {event.tags?.slice(0, 3).filter(t => !event.categories.includes(t) && t !== 'Multi-Day').map(tag => (
                                <span key={tag} className="text-[10px] px-2 py-1 rounded bg-white/10 text-white/70">
                                    {tag}
                                </span>
                            ))}
                            {event.categories.includes('Multi-Day') && (
                                <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-blue-900/50 text-blue-200 border border-blue-200/20">
                                    Multi-Day
                                </span>
                            )}
                        </div>

                        {/* Description Snippet */}
                        <div className="relative">
                            <div
                                className="pl-3 border-l-2 text-xs leading-relaxed text-[var(--text-2)] opacity-90 custom-scrollbar"
                                style={{
                                    borderColor: settings.tooltipColor,
                                    maxHeight: '150px',
                                    overflowY: 'auto'
                                }}
                            >
                                {event.description || "No description available."}
                            </div>
                        </div>

                        {/* Full Meta Info for Expanded View */}
                        <div className="flex gap-4 text-xs text-[var(--text-2)] pt-2 border-t border-white/5">
                            <div className="flex items-center gap-1">
                                <span className="opacity-70">🕒</span>
                                <span>{timeStr}</span>
                            </div>
                            <div className="flex items-center gap-1 overflow-hidden">
                                <span className="opacity-70">📍</span>
                                <span className="truncate">{event.location}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 pt-0 mt-auto grid grid-cols-2 gap-2 relative z-20">
                <button
                    onClick={(e) => { e.stopPropagation(); if (onPreview) onPreview(e.currentTarget.getBoundingClientRect()); }}
                    className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 shadow-sm"
                >
                    Quick View
                </button>
                <a
                    href={event.url.startsWith('http') ? event.url : (event.source === 'AllEvents.in' || event.url.includes('allevents.in') ? `https://allevents.in${event.url.startsWith('/') ? '' : '/'}${event.url}` : (event.source === 'Eventbrite' ? `https://www.eventbrite.ca${event.url.startsWith('/') ? '' : '/'}${event.url}` : event.url))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block text-center py-2.5 rounded-xl bg-[var(--pk-500)] hover:bg-[var(--pk-600)] text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-[var(--pk-500)]/20"
                >
                    Tickets ↗
                </a>
            </div>
        </div>
        </div>
    );
}
