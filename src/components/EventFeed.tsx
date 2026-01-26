'use client';

import { useState, useMemo } from 'react';
import { Event } from '../lib/types';
import { isMultiDay } from '../lib/scraper/utils';
import EventCard from './EventCard';
import EventPreview from './EventPreview';

interface EventFeedProps {
    events: Event[];
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'this-week' | 'this-month';

export default function EventFeed({ events }: EventFeedProps) {
    const [showHidden, setShowHidden] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);

    // Extract unique categories
    const allCategories = useMemo(() => {
        const catSet = new Set<string>();
        events.forEach(e => e.categories.forEach(cat => catSet.add(cat)));
        return Array.from(catSet).sort();
    }, [events]);

    // Date filter helpers - using UTC to avoid timezone issues
    const getTorontoDateParts = (date: Date) => {
        if (isNaN(date.getTime())) return 'invalid-date';
        try {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Toronto',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            const parts = formatter.formatToParts(date);
            const d: { [key: string]: string } = {};
            parts.forEach(p => d[p.type] = p.value);
            return `${d.year}-${d.month}-${d.day}`;
        } catch (e) {
            return 'invalid-date';
        }
    };

    const isToday = (date: string) => {
        const eventDate = new Date(date);
        const today = new Date();
        return getTorontoDateParts(eventDate) === getTorontoDateParts(today);
    };

    const isTomorrow = (date: string) => {
        const eventDate = new Date(date);
        const tomorrow = new Date();
        // Add 24 hours to handle tomorrow
        const tomorrowDate = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
        return getTorontoDateParts(eventDate) === getTorontoDateParts(tomorrowDate);
    };

    const isThisWeek = (date: string) => {
        const eventDate = new Date(date);
        const today = new Date();

        // Start of today in Toronto
        const todayStr = getTorontoDateParts(today);
        const [y, m, d] = todayStr.split('-').map(Number);
        const startOfToday = new Date(y, m - 1, d);

        const weekFromNow = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

        return eventDate >= startOfToday && eventDate <= weekFromNow;
    };

    const isThisMonth = (date: string) => {
        const eventDate = new Date(date);
        const today = new Date();

        const eventParts = getTorontoDateParts(eventDate).split('-');
        const todayParts = getTorontoDateParts(today).split('-');

        return eventParts[0] === todayParts[0] && eventParts[1] === todayParts[1];
    };

    // Filter Logic
    const validEvents = useMemo(() => {
        return events
            .filter(e => {
                const isHidden = e.status === 'CANCELLED' || e.status === 'MOVED';
                if (isHidden) return false;

                if (selectedCategory && !e.categories.includes(selectedCategory)) {
                    return false;
                }

                if (dateFilter === 'today' && !isToday(e.date)) return false;
                if (dateFilter === 'tomorrow' && !isTomorrow(e.date)) return false;
                if (dateFilter === 'this-week' && !isThisWeek(e.date)) return false;
                if (dateFilter === 'this-month' && !isThisMonth(e.date)) return false;

                return true;
            })
            .sort((a, b) => {
                const timeA = new Date(a.date).getTime();
                const timeB = new Date(b.date).getTime();
                if (isNaN(timeA)) return 1;
                if (isNaN(timeB)) return -1;
                return timeA - timeB;
            });
    }, [events, selectedCategory, dateFilter]);

    const hiddenEvents = events.filter(e => {
        const isHidden = e.status === 'CANCELLED' || e.status === 'MOVED';
        return isHidden;
    });

    // Smart time filtering: 
    // - If "Today" filter is active, show all of today's events (even past ones)
    // - Otherwise, only show future events
    const now = new Date();
    const singleDayEvents = validEvents.filter(e => {
        if (!isMultiDay(e)) {
            const eventDate = new Date(e.date);
            // For today filter, show all today events
            if (dateFilter === 'today') {
                return true; // Show all today events
            }
            // For other filters, only show future events
            return eventDate >= now;
        }
        return false;
    });
    const multiDayEvents = validEvents.filter(e => {
        if (isMultiDay(e)) {
            return e.endDate ? new Date(e.endDate) >= now : true;
        }
        return false;
    });

    return (
        <div className="container max-w-7xl mx-auto px-4">
            <div className="mb-4 flex flex-wrap gap-2 justify-center">
                <button onClick={() => setDateFilter('all')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'all' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>All Dates</button>
                <button onClick={() => setDateFilter('today')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'today' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>🔥 Today</button>
                <button onClick={() => setDateFilter('tomorrow')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'tomorrow' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>Tomorrow</button>
                <button onClick={() => setDateFilter('this-week')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'this-week' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>This Week</button>
                <button onClick={() => setDateFilter('this-month')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'this-month' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>This Month</button>
            </div>

            {allCategories.length > 1 && (
                <div className="mb-8 flex flex-wrap gap-2 justify-center">
                    <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${selectedCategory === null ? 'bg-[var(--pk-500)] text-white' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>All Categories</button>
                    {allCategories.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${selectedCategory === cat ? 'bg-[var(--pk-500)] text-white' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>{cat}</button>
                    ))}
                </div>
            )}

            <section className="mb-16">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <span className="text-[var(--pk-500)]">★</span>
                        Upcoming Events
                    </h2>
                    <div className="text-sm text-[var(--text-3)] flex items-center gap-4">
                        <span>{singleDayEvents.length} events found</span>
                        {hiddenEvents.length > 0 && (
                            <button onClick={() => setShowHidden(!showHidden)} className="px-3 py-1 rounded-full border border-white/10 hover:bg-white/5 text-xs transition-colors">{showHidden ? 'Hide' : 'Show'} TBD / Cancelled ({hiddenEvents.length})</button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {singleDayEvents.map(event => (
                        <EventCard key={event.id} event={event} onPreview={() => setPreviewEvent(event)} />
                    ))}
                </div>

                {singleDayEvents.length === 0 && (
                    <div className="text-center py-20 glass-panel rounded-xl">
                        <p className="text-[var(--text-2)]">No confirmed upcoming events found.</p>
                    </div>
                )}
            </section>

            {multiDayEvents.length > 0 && (
                <section className="mb-16">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px flex-1 bg-white/10" />
                        <h2 className="text-xl font-bold text-[var(--text-2)] uppercase tracking-widest">Multi-Day / Festivals</h2>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {multiDayEvents.map(event => (
                            <EventCard key={event.id} event={event} onPreview={() => setPreviewEvent(event)} />
                        ))}
                    </div>
                </section>
            )}

            {showHidden && hiddenEvents.length > 0 && (
                <section className="opacity-70 grayscale-[0.5] hover:grayscale-0 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px flex-1 bg-white/10" />
                        <h2 className="text-xl font-bold text-[var(--text-2)] uppercase tracking-widest">Review Needed (TBD / Cancelled)</h2>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {hiddenEvents.map(event => (
                            <EventCard key={event.id} event={event} onPreview={() => setPreviewEvent(event)} />
                        ))}
                    </div>
                </section>
            )}

            {previewEvent && (
                <EventPreview event={previewEvent} onClose={() => setPreviewEvent(null)} />
            )}
        </div>
    );
}

