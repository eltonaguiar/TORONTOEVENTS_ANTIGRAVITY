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
    const now = useMemo(() => new Date(), []); // Stable reference for a single render
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [showMultiDay, setShowMultiDay] = useState(false);
    const [maxPrice, setMaxPrice] = useState<number>(120);
    const [showExpensive, setShowExpensive] = useState(false);
    const [showStarted, setShowStarted] = useState(false);

    // Extract unique categories (excluding Multi-Day as it's now a primary filter)
    const allCategories = useMemo(() => {
        const catSet = new Set<string>();
        events.forEach(e => e.categories.forEach(cat => {
            if (cat !== 'Multi-Day') catSet.add(cat);
        }));
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

                // Price filtering
                if (!showExpensive && e.priceAmount !== undefined && e.priceAmount > maxPrice) {
                    return false;
                }

                // Started/Ongoing filtering
                const eventStartDate = new Date(e.date);
                if (!showStarted && eventStartDate < now && !isMultiDay(e)) {
                    return false;
                }

                // Date filtering
                const eventEndDate = e.endDate ? new Date(e.endDate) : eventStartDate;

                if (dateFilter !== 'all') {
                    const todayStr = getTorontoDateParts(now);
                    const [y, m, d] = todayStr.split('-').map(Number);
                    const todayStart = new Date(y, m - 1, d);
                    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

                    if (dateFilter === 'today') {
                        // Multi-day: show if overlaps today. Single-day: show if starts today.
                        if (isMultiDay(e)) {
                            if (eventEndDate < todayStart || eventStartDate > todayEnd) return false;
                        } else {
                            if (!isToday(e.date)) return false;
                        }
                    }

                    if (dateFilter === 'tomorrow') {
                        const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
                        const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000 - 1);
                        if (isMultiDay(e)) {
                            if (eventEndDate < tomorrowStart || eventStartDate > tomorrowEnd) return false;
                        } else {
                            if (!isTomorrow(e.date)) return false;
                        }
                    }

                    if (dateFilter === 'this-week') {
                        const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                        if (isMultiDay(e)) {
                            if (eventEndDate < todayStart || eventStartDate > weekEnd) return false;
                        } else {
                            if (!isThisWeek(e.date)) return false;
                        }
                    }

                    if (dateFilter === 'this-month') {
                        if (isMultiDay(e)) {
                            // Check month overlap
                            const eventStartParts = getTorontoDateParts(eventStartDate).split('-');
                            const eventEndParts = getTorontoDateParts(eventEndDate).split('-');
                            const nowParts = todayStr.split('-');
                            const currentMonth = `${nowParts[0]}-${nowParts[1]}`;

                            const startMonth = `${eventStartParts[0]}-${eventStartParts[1]}`;
                            const endMonth = `${eventEndParts[0]}-${eventEndParts[1]}`;

                            if (currentMonth < startMonth || currentMonth > endMonth) return false;
                        } else {
                            if (!isThisMonth(e.date)) return false;
                        }
                    }
                }

                return true;
            })
            .sort((a, b) => {
                const timeA = new Date(a.date).getTime();
                const timeB = new Date(b.date).getTime();
                if (isNaN(timeA)) return 1;
                if (isNaN(timeB)) return -1;
                return timeA - timeB;
            });
    }, [events, selectedCategory, dateFilter, maxPrice, showExpensive, showStarted]);

    const hiddenEvents = events.filter(e => {
        const isHidden = e.status === 'CANCELLED' || e.status === 'MOVED';
        return isHidden;
    });

    const singleDayEvents = validEvents.filter(e => !isMultiDay(e));
    const multiDayEvents = validEvents.filter(e => {
        if (isMultiDay(e)) {
            // Only show multi-day/festivals that haven't ended yet
            return e.endDate ? new Date(e.endDate) >= now : true;
        }
        return false;
    });

    return (
        <div className="container max-w-7xl mx-auto px-4">
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-center glass-panel p-6 rounded-2xl border border-white/5">
                <div className="flex flex-wrap gap-2 justify-center">
                    <button onClick={() => setDateFilter('all')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'all' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>All Dates</button>
                    <button onClick={() => setDateFilter('today')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'today' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>🔥 Today</button>
                    <button onClick={() => setDateFilter('tomorrow')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'tomorrow' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>Tomorrow</button>
                    <button onClick={() => setDateFilter('this-week')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'this-week' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>This Week</button>
                    <button onClick={() => setDateFilter('this-month')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'this-month' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>This Month</button>
                </div>

                <div className="h-8 w-px bg-white/10 hidden md:block" />

                <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    <span className="text-xs font-bold text-[var(--text-3)] uppercase">Price Limit: ${maxPrice === 500 ? 'Any' : maxPrice}</span>
                    <input
                        type="range"
                        min="0"
                        max="500"
                        step="10"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                        className="w-32 accent-[var(--pk-500)]"
                    />
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                    <button
                        onClick={() => setShowMultiDay(!showMultiDay)}
                        className={`px-4 py-2 rounded-full font-semibold text-sm transition-all flex items-center gap-2 ${showMultiDay ? 'bg-[var(--pk-500)] text-white' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}
                    >
                        Multi-Day {showMultiDay ? 'On' : 'Off'}
                    </button>
                    <button
                        onClick={() => setShowExpensive(!showExpensive)}
                        className={`px-4 py-2 rounded-full font-semibold text-sm transition-all flex items-center gap-2 ${showExpensive ? 'bg-orange-500 text-white' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}
                    >
                        Expensive {showExpensive ? 'Shown' : 'Hidden'}
                    </button>
                    <button
                        onClick={() => setShowStarted(!showStarted)}
                        className={`px-4 py-2 rounded-full font-semibold text-sm transition-all flex items-center gap-2 ${showStarted ? 'bg-blue-500 text-white' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}
                    >
                        Ongoing {showStarted ? 'Shown' : 'Hidden'}
                    </button>
                </div>
            </div>

            {allCategories.length > 1 && (
                <div className="mb-12 flex flex-wrap gap-2 justify-center">
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

            {showMultiDay && multiDayEvents.length > 0 && (
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

