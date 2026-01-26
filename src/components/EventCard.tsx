import Link from 'next/link';
import { Event } from '../lib/types';

import { useSettings } from '../context/SettingsContext';

interface EventCardProps {
    event: Event;
    onPreview?: () => void;
}

export default function EventCard({ event, onPreview }: EventCardProps) {
    const { settings } = useSettings();
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

    return (
        <div className="glass-panel p-4 rounded-xl transition-transform hover:-translate-y-1 hover:shadow-lg flex flex-col h-full relative group overflow-hidden">
            {/* Tooltip (Conditional) */}
            {settings.showTooltips && (
                <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 bg-[var(--surface-0)]/90 backdrop-blur-md p-6 translate-y-4 group-hover:translate-y-0">
                    <div className="flex flex-col h-full animate-fade-in">
                        <span className="text-[10px] font-black uppercase tracking-tighter text-[var(--pk-300)] mb-2">/ Intelligence Summary</span>
                        <p className="text-xs text-[var(--text-1)] leading-relaxed line-clamp-6 mb-4">
                            {event.description || 'No detailed intelligence available for this operation.'}
                        </p>
                        <div className="mt-auto border-t border-white/10 pt-4">
                            <div className="flex justify-between items-center text-[10px] text-[var(--text-3)] font-bold uppercase tracking-wider">
                                <span>Source: {event.source}</span>
                                <span>Score: 94%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Status Bar */}
            {event.status === 'CANCELLED' && (
                <div className="absolute top-0 left-0 right-0 bg-red-500/80 text-white text-xs font-bold text-center py-1">
                    CANCELLED
                </div>
            )}

            {/* Date Badge */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col items-center bg-white/5 rounded-lg p-2 min-w-[3.5rem] border border-white/10">
                    <span className="text-xs uppercase font-bold text-[var(--pk-200)]">
                        {month}
                    </span>
                    <span className="text-xl font-bold text-white">
                        {day}
                    </span>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--surface-3)] text-[var(--text-2)] border border-white/5">
                        {event.price}
                    </div>
                    {onPreview && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onPreview(); }}
                            className="p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-[var(--pk-500)]/20 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                            title="Quick Preview"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col gap-2">
                <h3 className="text-lg font-bold leading-tight text-[var(--text-1)] group-hover:text-[var(--pk-100)] transition-colors line-clamp-2">
                    {event.title}
                </h3>

                <div className="mt-auto pt-4 flex flex-col gap-1 text-sm text-[var(--text-2)]">
                    <div className="flex items-center gap-2">
                        <span className="opacity-70">🕒</span>
                        <span>{timeStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="opacity-70">📍</span>
                        <span className="truncate">{event.location}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
                {onPreview && (
                    <button
                        onClick={onPreview}
                        className="flex-1 text-center py-2 rounded-lg bg-[var(--pk-500)]/20 hover:bg-[var(--pk-500)]/30 text-[var(--pk-200)] font-semibold text-sm transition-colors border border-[var(--pk-500)]/30"
                    >
                        Preview
                    </button>
                )}
                <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${onPreview ? 'flex-1' : 'w-full'} block text-center py-2 rounded-lg bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-semibold text-sm transition-colors`}
                >
                    Tickets
                </a>
            </div>
        </div>
    );
}
