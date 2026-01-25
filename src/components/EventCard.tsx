import Link from 'next/link';
import { Event } from '../lib/types';

interface EventCardProps {
    event: Event;
}

export default function EventCard({ event }: EventCardProps) {
    const dateObj = new Date(event.date);
    const dateStr = dateObj.toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        weekday: 'short'
    });
    const timeStr = dateObj.toLocaleTimeString('en-CA', {
        hour: 'numeric',
        minute: '2-digit'
    });

    return (
        <div className="glass-panel p-4 rounded-xl transition-transform hover:-translate-y-1 hover:shadow-lg flex flex-col h-full relative group overflow-hidden">
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
                        {dateObj.toLocaleDateString('en-CA', { month: 'short' })}
                    </span>
                    <span className="text-xl font-bold text-white">
                        {dateObj.getDate()}
                    </span>
                </div>
                <div className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--surface-3)] text-[var(--text-2)] border border-white/5">
                    {event.price}
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

            {/* Action */}
            <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block w-full text-center py-2 rounded-lg bg-[var(--pk-500)] hover:bg-[var(--pk-700)] text-white font-semibold text-sm transition-colors"
            >
                View Details
            </a>
        </div>
    );
}
