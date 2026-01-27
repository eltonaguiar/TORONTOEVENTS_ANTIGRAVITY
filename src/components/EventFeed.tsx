'use client';

import { useState, useMemo, useEffect } from 'react';
import { Event } from '../lib/types';
import { isMultiDay, inferSoldOutStatus } from '../lib/scraper/utils';
import EventCard from './EventCard';
import EventPreview from './EventPreview';
import InlinePreviewWithIndicator from './InlinePreviewWithIndicator';
import { useSettings } from '../context/SettingsContext';
import { geocodePostalCode, geocodeAddress, getBrowserLocation } from '../lib/geolocation';

interface EventFeedProps {
    events: Event[];
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'this-week' | 'this-month' | 'nearby';

export default function EventFeed({ events: initialEvents }: EventFeedProps) {
    const [liveEvents, setLiveEvents] = useState<Event[]>(initialEvents);
    const [showHidden, setShowHidden] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [selectedHost, setSelectedHost] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [now, setNow] = useState<Date | null>(null);

    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [previewAnchor, setPreviewAnchor] = useState<DOMRect | null>(null);
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

    const handlePreview = (event: Event, anchor?: DOMRect) => {
        setPreviewEvent(event);
        setPreviewAnchor(anchor || null);
    };

    // Runtime Sync: Pull latest database from GitHub (redundant - page.tsx already uses useEventsFromGitHub)
    // This is kept for backward compatibility but events should come from props
    useEffect(() => {
        // Events are already loaded via useEventsFromGitHub in page.tsx
        // This effect is mainly for setting the current time
        setNow(new Date());
        
        // Update liveEvents if initialEvents prop changes
        if (initialEvents && initialEvents.length > 0) {
            setLiveEvents(initialEvents);
        }
    }, [initialEvents]);

    const [showMultiDay, setShowMultiDay] = useState(false);
    const [maxPrice, setMaxPrice] = useState<number>(120);
    const [showExpensive, setShowExpensive] = useState(false);
    const [showStarted, setShowStarted] = useState(false);

    // Haversine formula for distance
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // New Features
    const { settings, updateSettings, importEvents, setIsSettingsOpen } = useSettings();

    // Geocoding Effect - Handle location based on locationSource setting
    useEffect(() => {
        if (!settings.enableLocationFilter) {
            setUserCoords(null);
            updateSettings({ userLatitude: null, userLongitude: null });
            return;
        }

        const geocodeLocation = async () => {
            try {
                let coords: { lat: number; lng: number } | null = null;

                if (settings.locationSource === 'postal-code') {
                    if (settings.userPostalCode && settings.userPostalCode.length >= 6) {
                        console.log(`📍 [Geocoding] Geocoding postal code: ${settings.userPostalCode}`);
                        coords = await geocodePostalCode(settings.userPostalCode);
                        if (coords) {
                            console.log(`✅ [Geocoding] Postal code geocoded: ${coords.lat}, ${coords.lng}`);
                        } else {
                            console.warn(`⚠️ [Geocoding] Failed to geocode postal code: ${settings.userPostalCode}`);
                        }
                    }
                } else if (settings.locationSource === 'address') {
                    if (settings.userAddress && settings.userAddress.trim().length > 0) {
                        console.log(`📍 [Geocoding] Geocoding address: ${settings.userAddress}`);
                        coords = await geocodeAddress(settings.userAddress);
                        if (coords) {
                            console.log(`✅ [Geocoding] Address geocoded: ${coords.lat}, ${coords.lng}`);
                        } else {
                            console.warn(`⚠️ [Geocoding] Failed to geocode address: ${settings.userAddress}`);
                        }
                    }
                } else if (settings.locationSource === 'browser') {
                    console.log(`📍 [Geocoding] Requesting browser location...`);
                    try {
                        coords = await getBrowserLocation();
                        if (coords) {
                            console.log(`✅ [Geocoding] Browser location obtained: ${coords.lat}, ${coords.lng}`);
                        }
                    } catch (err) {
                        console.warn(`⚠️ [Geocoding] Browser geolocation failed:`, err);
                    }
                }

                if (coords) {
                    setUserCoords(coords);
                    updateSettings({ 
                        userLatitude: coords.lat, 
                        userLongitude: coords.lng 
                    });
                } else {
                    setUserCoords(null);
                    updateSettings({ userLatitude: null, userLongitude: null });
                }
            } catch (error) {
                console.error('❌ [Geocoding] Error:', error);
                setUserCoords(null);
                updateSettings({ userLatitude: null, userLongitude: null });
            }
        };

        geocodeLocation();
    }, [settings.enableLocationFilter, settings.locationSource, settings.userPostalCode, settings.userAddress, updateSettings]);

    // Geocoding Effect logic remains...
    // Removed local viewMode state
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Event | 'priceAmount', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'asc' });

    const handleExport = () => {
        const eventsToExport = settings.savedEvents.length > 0 ? settings.savedEvents : validEvents;
        const headers = ['Title', 'Date', 'Location', 'Host', 'Price', 'URL', 'Categories'];
        const rows = eventsToExport.map((e: Event) => [
            `"${e.title.replace(/"/g, '""')}"`,
            `"${e.date}"`,
            `"${(e.location || '').replace(/"/g, '""')}"`,
            `"${(e.host || '').replace(/"/g, '""')}"`,
            `"${(e.price || '').replace(/"/g, '""')}"`,
            `"${e.url}"`,
            `"${(e.categories || []).join(', ')}"`
        ]);

        const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `toronto-events-export-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        // ... (import logic)
    };

    const sourceEvents = settings.viewMode === 'saved' ? settings.savedEvents : liveEvents;

    const allCategories = useMemo(() => {
        const catSet = new Set<string>();
        sourceEvents.forEach(e => e.categories.forEach((cat: string) => {
            if (cat !== 'Multi-Day') catSet.add(cat);
        }));
        return Array.from(catSet).sort();
    }, [sourceEvents]);

    const allSources = useMemo(() => {
        const sourceSet = new Set<string>();
        sourceEvents.forEach(e => { if (e.source) sourceSet.add(e.source); });
        return Array.from(sourceSet).sort();
    }, [sourceEvents]);

    const allHosts = useMemo(() => {
        const hostSet = new Set<string>();
        sourceEvents.forEach(e => { if (e.host) hostSet.add(e.host); });
        return Array.from(hostSet).sort();
    }, [sourceEvents]);

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
        const tomorrowDate = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
        return getTorontoDateParts(eventDate) === getTorontoDateParts(tomorrowDate);
    };

    const isThisWeek = (date: string) => {
        const eventDate = new Date(date);
        const today = new Date();
        const todayStr = getTorontoDateParts(today);
        const [y, m, d] = todayStr.split('-').map(Number);
        const startOfToday = new Date(y, m - 1, d);
        
        // Get the start of the week (Sunday) and end of the week (Saturday)
        const dayOfWeek = startOfToday.getDay(); // 0 = Sunday, 6 = Saturday
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - dayOfWeek); // Go back to Sunday
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday (6 days after Sunday)
        endOfWeek.setHours(23, 59, 59, 999); // End of Saturday
        
        return eventDate >= startOfWeek && eventDate <= endOfWeek;
    };

    const isThisMonth = (date: string) => {
        const eventDate = new Date(date);
        const today = new Date();
        const eventParts = getTorontoDateParts(eventDate).split('-');
        const todayParts = getTorontoDateParts(today).split('-');
        return eventParts[0] === todayParts[0] && eventParts[1] === todayParts[1];
    };

    const validEvents = useMemo(() => {
        return sourceEvents
            .filter((e: Event) => {
                if (searchQuery) {
                    const fullText = `${e.title} ${e.description} ${e.host} ${e.source} ${e.tags?.join(' ') || ''}`.toLowerCase();

                    // Split by comma for OR logic
                    const orGroups = searchQuery.split(',').map(s => s.trim()).filter(Boolean);

                    const matchesSearch = orGroups.some(group => {
                        // Split group by '+' for AND logic, but respect quotes
                        // Basic regex to split by + while ignoring + inside quotes
                        const andTerms = group.match(/(".*?"|[^+\s]+)+(?:\s*\+\s*(".*?"|[^+\s]+))*/g);

                        // Refined: split by '+' 
                        const terms = group.split('+').map(t => t.trim()).filter(Boolean);

                        return terms.every(term => {
                            if (term.startsWith('"') && term.endsWith('"')) {
                                const exact = term.slice(1, -1).toLowerCase();
                                return fullText.includes(exact);
                            }
                            return fullText.includes(term.toLowerCase());
                        });
                    });

                    if (!matchesSearch) return false;
                }

                const isHidden = e.status === 'CANCELLED' || e.status === 'MOVED';
                if (settings.viewMode !== 'saved' && isHidden) return false;

                if (selectedCategory && !e.categories.includes(selectedCategory)) return false;
                if (selectedSource && e.source !== selectedSource) return false;
                if (selectedHost && e.host !== selectedHost) return false;

                // Filter expensive events
                if (!showExpensive) {
                    // Check priceAmount if available
                    if (e.priceAmount !== undefined && e.priceAmount > maxPrice) {
                        return false;
                    }
                    
                    // Fallback: Check description for high prices if priceAmount is missing
                    // This prevents expensive events from slipping through when price extraction fails
                    if (e.priceAmount === undefined && e.description) {
                        const descText = e.description.toLowerCase();
                        // Look for prices over maxPrice mentioned in description
                        const highPricePatterns = [
                            /(?:CA\$|CAD|C\$|\$)\s*(\d{3,}(?:\.\d{2})?)/g,
                            /(?:regular|normal|full|standard)\s+price[^.]*?(?:CA\$|CAD|C\$|\$)?\s*(\d{3,}(?:\.\d{2})?)/gi,
                            /(?:price|cost|fee)\s+(?:is|of|for)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d{3,}(?:\.\d{2})?)/gi,
                            // Match patterns like "Regular price for this service is $449"
                            /(?:regular|normal|full|standard)\s+price\s+(?:for|is|of)?\s*(?:this|the)?\s*(?:service|event|ticket)?\s*(?:is)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d{3,}(?:\.\d{2})?)/gi
                        ];
                        
                        for (const pattern of highPricePatterns) {
                            const matches = [...descText.matchAll(pattern)];
                            for (const match of matches) {
                                const price = parseFloat(match[1]);
                                if (!isNaN(price) && price > maxPrice) {
                                    console.log(`Filtering expensive event (price in description): "${e.title}" ($${price})`);
                                    return false; // Hide expensive event
                                }
                            }
                        }
                    }
                    
                    // Additional safety: If price is "See tickets" and description is very short,
                    // be more cautious - these might be expensive events with missing data
                    if ((e.price === 'See tickets' || !e.priceAmount) && 
                        (!e.description || e.description.length < 100)) {
                        // Don't filter, but this will be flagged visually with warning icon
                    }
                }

                const { isSoldOut: inferredSoldOut, genderSoldOut: inferredGenderOut } = inferSoldOutStatus(e.title + ' ' + (e.description || ''));
                const isExplicitlySoldOut = e.isSoldOut === true || inferredSoldOut;
                if (settings.hideSoldOut && isExplicitlySoldOut) return false;

                if (settings.hideGenderSoldOut && settings.gender !== 'unspecified') {
                    const gender = settings.gender;
                    const isGenderSoldOut = e.genderSoldOut === 'both' || e.genderSoldOut === gender || inferredGenderOut === 'both' || inferredGenderOut === gender;
                    if (isGenderSoldOut) return false;
                }

                // Keyword Exclusion Filter (User specified)
                const blockedKeywords = settings.excludedKeywords || [];
                const fullText = (e.title + ' ' + (e.description || '')).toLowerCase();
                if (blockedKeywords.some(keyword => fullText.includes(keyword.toLowerCase()))) {
                    return false;
                }

                // Started/Ongoing Logic
                // If the user has a specific date filter (like TODAY), they likely want to see ALL events for that day,
                // even if they already started OR finished.
                // This prevents "Empty Page" syndrome late in the day.
                const isTargetedDate = dateFilter === 'today' || dateFilter === 'tomorrow';

                if (!isTargetedDate) { // Only apply hide logic if we are browsing the general feed
                    if (settings.viewMode !== 'saved' && !showStarted && now) {
                        const eventStartDate = new Date(e.date);
                        const eventEndDate = e.endDate
                            ? new Date(e.endDate)
                            : new Date(eventStartDate.getTime() + 3 * 60 * 60 * 1000);

                        if (!isMultiDay(e)) {
                            // Standard Feed: Hide things that are over
                            if (eventEndDate < now) return false;
                            // Standard Feed: Hide things that started (unless toggle is On)
                            if (eventStartDate < now) return false;
                        } else {
                            // Multi-Day in Feed: Hide if totally over
                            if (eventEndDate < now) return false;
                        }
                    }
                }
                // If isTargetedDate (Today/Tomorrow), we SHOW everything (Started, Finished, etc) so the user sees the full schedule.

                // Date Filtering
                const eventStartDate = new Date(e.date); // Need local var for date filter block
                const eEndDate = e.endDate ? new Date(e.endDate) : eventStartDate;

                if (dateFilter !== 'all' && now) {
                    const todayStr = getTorontoDateParts(now);
                    const [y, m, d] = todayStr.split('-').map(Number);
                    const todayStart = new Date(y, m - 1, d);

                    // ... (rest of date logic)
                    if (dateFilter === 'today') {
                        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
                        if (isMultiDay(e)) {
                            if (eEndDate < todayStart || eventStartDate > todayEnd) return false;
                        } else {
                            if (!isToday(e.date)) return false;
                        }
                    }
                    if (dateFilter === 'tomorrow') {
                        const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
                        const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000 - 1);
                        if (isMultiDay(e)) {
                            if (eEndDate < tomorrowStart || eventStartDate > tomorrowEnd) return false;
                        } else {
                            if (!isTomorrow(e.date)) return false;
                        }
                    }
                    if (dateFilter === 'this-week') {
                        // Calculate calendar week (Sunday to Saturday)
                        const dayOfWeek = todayStart.getDay(); // 0 = Sunday, 6 = Saturday
                        const startOfWeek = new Date(todayStart);
                        startOfWeek.setDate(todayStart.getDate() - dayOfWeek); // Go back to Sunday
                        
                        const endOfWeek = new Date(startOfWeek);
                        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
                        endOfWeek.setHours(23, 59, 59, 999); // End of Saturday
                        
                        if (isMultiDay(e)) {
                            // For multi-day events, include if they overlap with this week
                            if (eEndDate < startOfWeek || eventStartDate > endOfWeek) return false;
                        } else {
                            if (!isThisWeek(e.date)) return false;
                        }
                    }
                    if (dateFilter === 'this-month') {
                        if (isMultiDay(e)) {
                            const eventStartParts = getTorontoDateParts(eventStartDate).split('-');
                            const nowParts = getTorontoDateParts(now).split('-');
                            if (eventStartParts[0] !== nowParts[0] || eventStartParts[1] !== nowParts[1]) return false;
                        } else {
                            if (!isThisMonth(e.date)) return false;
                        }
                    }
                    if (dateFilter === ('nearby' as any)) {
                        // For Nearby we filter by distance from user location
                        if (!e.latitude || !e.longitude) return false;
                        if (!userCoords) return false;
                        
                        const distance = calculateDistance(
                            userCoords.lat,
                            userCoords.lng,
                            e.latitude,
                            e.longitude
                        );
                        
                        // Only show events within maxDistanceKm
                        if (distance > settings.maxDistanceKm) return false;
                    }
                }

                return true;
            })
            .sort((a: Event, b: Event) => {
                const { key, direction } = sortConfig;
                let valA: any = a[key as keyof Event];
                let valB: any = b[key as keyof Event];

                if (key === 'date') {
                    valA = new Date(valA as string).getTime();
                    valB = new Date(valB as string).getTime();
                }

                if (direction === 'asc') {
                    return valA > valB ? 1 : -1;
                } else {
                    return valA < valB ? 1 : -1;
                }
            });
    }, [sourceEvents, settings.viewMode, searchQuery, selectedCategory, selectedSource, selectedHost, dateFilter, maxPrice, showExpensive, showStarted, settings.hideSoldOut, settings.gender, settings.hideGenderSoldOut, settings.excludedKeywords, settings.maxDistanceKm, now, userCoords, sortConfig]);

    const activeFilters = useMemo(() => {
        const filters = [];
        if (dateFilter !== 'all') filters.push({ id: 'date', label: dateFilter.replace('-', ' '), onRemove: () => setDateFilter('all') });
        if (selectedCategory) filters.push({ id: 'category', label: selectedCategory, onRemove: () => setSelectedCategory(null) });
        if (selectedSource) filters.push({ id: 'source', label: `Source: ${selectedSource}`, onRemove: () => setSelectedSource(null) });
        if (selectedHost) filters.push({ id: 'host', label: `Host: ${selectedHost}`, onRemove: () => setSelectedHost(null) });
        if (maxPrice < 500) filters.push({ id: 'price', label: `Under $${maxPrice}`, onRemove: () => setMaxPrice(500) });
        if (settings.hideSoldOut) filters.push({ id: 'soldout', label: 'Hiding Sold Out', onRemove: () => updateSettings({ hideSoldOut: false }) });
        if (settings.hideGenderSoldOut && settings.gender !== 'unspecified') filters.push({ id: 'gender-filter', label: `Hiding ${settings.gender === 'male' ? 'Men\'s' : 'Women\'s'} Sold Out`, onRemove: () => updateSettings({ hideGenderSoldOut: false }) });
        return filters;
    }, [dateFilter, selectedCategory, selectedSource, selectedHost, maxPrice, settings.hideSoldOut, settings.hideGenderSoldOut, settings.gender, updateSettings]);

    const hiddenEvents = liveEvents.filter((e: Event) => {
        const isHidden = e.status === 'CANCELLED' || e.status === 'MOVED';
        return isHidden;
    });

    const singleDayEvents = validEvents.filter((e: Event) => !isMultiDay(e));
    const multiDayEvents = validEvents.filter((e: Event) => {
        if (isMultiDay(e)) {
            // Only show multi-day/festivals that haven't ended yet
            return now && e.endDate ? new Date(e.endDate) >= now : true;
        }
        return false;
    });

    // Combine events logic:
    // If we have a specific date filter (Today, Tomorrow, Weekend), users usually want to see EVERYTHING happening then.
    // The "Separate Multi-Day" view is mostly useful for the "All/Global" feed to prevent clutter.
    // So:
    // 1. If DateFilter != 'all', merge everything into one list (sorted by time).
    // 2. If DateFilter == 'all', keep the split (Single Day vs Multi Day section).

    const displayEvents = useMemo(() => {
        // Hydration safety: If 'now' is not set (SSR), return empty or full list?
        // Returning full list might cause flash. Returning empty is safer.
        // Actually, if we just rely on 'validEvents' handling 'now', it's fine.

        if (dateFilter !== 'all') {
            // MERGED VIEW Logic for Specific Dates (Today, Tomorrow, etc)
            // Goal: Show EVERYTHING happening on that day.

            // 1. Force inclusion of Started events if filtering by specific date (Today)
            // The user wants to see "Today's events". Even if it started at 10 AM and it's 2 PM, 
            // it's still "Today's event". The 'Started' toggle usually hides things for the generic 'Upcoming' feed
            // where you only care about future things. But for 'Today', you want to see the whole menu.

            // We can't re-filter 'sourceEvents' easily here without duplicate logic. 
            // But we can check if we should relax the 'validEvents' logic.
            // Actually, I modified 'validEvents' to handle dateFilter logic inside it, BUT
            // 'validEvents' has a "Started" check that runs BEFORE date check.

            // Let's refactor 'validEvents' to be more permissive if dateFilter is active.
            // (See validEvents change below).

            return validEvents;
        } else {
            // Standard Split View for Global Feed
            // Here we respect the "Multi-Day" separation
            return validEvents.filter(e => !isMultiDay(e));
        }
    }, [validEvents, dateFilter]);

    const separateMultiDayList = useMemo(() => {
        if (dateFilter !== 'all') return []; // We merged them
        return validEvents.filter((e: Event) => isMultiDay(e));
    }, [validEvents, dateFilter]);

    return (
        <div id="event-feed-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
            {/* Control Panel */}
            <div className="mb-6 flex flex-col gap-6 glass-panel p-6 rounded-2xl border border-white/5">

                {/* Control Hub: View Switcher + Search + Config */}
                <div className="flex flex-col xl:flex-row items-center gap-6 flex-1 w-full">
                    {/* View Switcher & Layout Switcher */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center p-1 bg-black/40 rounded-2xl border border-white/5 shadow-inner shrink-0">
                            {[
                                { id: 'feed', label: 'Global Feed', icon: '🌐' },
                                { id: 'saved', label: 'My Events', icon: '♥' }
                            ].map(btn => (
                                <button
                                    key={btn.id}
                                    onClick={() => updateSettings({ viewMode: btn.id as any })}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${settings.viewMode === btn.id ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-[var(--text-3)] hover:text-white'}`}
                                >
                                    <span>{btn.icon}</span>
                                    <span>{btn.label}</span>
                                    {settings.viewMode !== 'saved' && (<span className="bg-black/20 px-1.5 py-0.5 rounded text-[9px]">{settings.savedEvents?.length || 0}</span>)}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center p-1 bg-black/40 rounded-2xl border border-white/5 shadow-inner shrink-0">
                            {[
                                { id: 'feed', icon: '🎴' },
                                { id: 'table', icon: '📊' }
                            ].map(layout => (
                                <button
                                    key={layout.id}
                                    onClick={() => updateSettings({ viewLayout: layout.id as any })}
                                    className={`p-2.5 rounded-xl transition-all ${settings.viewLayout === layout.id ? 'bg-[var(--pk-500)] text-white shadow-lg' : 'text-[var(--text-3)] hover:text-white'}`}
                                    title={layout.id === 'feed' ? 'Grid View' : 'Table View'}
                                >
                                    <span>{layout.icon}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Bar & Quick Dating Action */}
                    <div className="flex-1 w-full flex items-center gap-4">
                        <div className="flex-1 relative group">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                <span className="text-xl opacity-30 group-focus-within:opacity-100 transition-opacity">🔍</span>
                            </div>
                            <input
                                type="text"
                                placeholder="Search Toronto events, venues, or organizers..."
                                className="w-full bg-black/60 border border-white/10 rounded-[1.5rem] pl-14 pr-32 py-4 text-sm font-bold focus:outline-none focus:border-[var(--pk-500)] transition-all shadow-inner placeholder:opacity-30"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center gap-2">
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="px-3 py-1.5 hover:bg-white/10 rounded-xl transition-colors text-[9px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="p-3 bg-white/5 hover:bg-[var(--pk-500)] hover:text-white rounded-xl transition-all border border-white/10 group/gear"
                                    title="Open System Architecture"
                                >
                                    <span className="group-hover/gear:rotate-90 transition-transform duration-700 block">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </span>
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setSearchQuery('dating, singles')}
                            className="px-6 py-4 rounded-[1.5rem] bg-pink-500 hover:bg-pink-600 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 shrink-0 animate-pulse"
                            title="Quick Search: Dating & Singles"
                        >
                            <span>💘</span>
                            <span className="hidden sm:inline">Dating</span>
                        </button>
                    </div>

                    {/* Saved View Actions (Export/Import) */}
                    {settings.viewMode === 'saved' && (
                        <div className="flex items-center gap-3 animate-slide-up shrink-0">
                            <button
                                onClick={handleExport}
                                className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-[var(--pk-500)] hover:text-white text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center gap-2"
                                title="Download local backup"
                            >
                                <span>↓ Export</span>
                            </button>
                            <label className="px-4 py-2 rounded-xl bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-xs font-bold uppercase tracking-wider border border-white/5 transition-colors cursor-pointer flex items-center gap-2 text-white">
                                <span>↑ Import</span>
                                <input type="file" onChange={handleImport} accept=".txt,.json" className="hidden" />
                            </label>
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-3 bg-white/5 hover:bg-[var(--pk-500)] text-white/40 hover:text-white rounded-xl transition-all border border-white/10 group/savedgear"
                                title="System Preferences"
                            >
                                <span className="group-hover/savedgear:rotate-90 transition-transform block text-lg leading-none">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Primary Filters (Date & Price) */}
            <div className={`flex flex-col gap-6 transition-all duration-300 ${settings.viewMode === 'saved' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <div className="flex flex-wrap gap-4 items-center justify-center">
                    <div className="flex flex-wrap gap-2 justify-center">
                        <button title="Show all upcoming events" onClick={() => setDateFilter('all')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'all' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>All Dates</button>
                        <button title="Show events happening today" onClick={() => setDateFilter('today')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'today' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>🔥 Today</button>
                        <button title="Show events happening tomorrow" onClick={() => setDateFilter('tomorrow')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'tomorrow' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>Tomorrow</button>
                        <button title="Show events for the current week (Sun-Sat)" onClick={() => setDateFilter('this-week')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'this-week' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>This Week</button>
                        <button title="Show events for the current calendar month" onClick={() => setDateFilter('this-month')} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === 'this-month' ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}>This Month</button>

                        <button
                            title="Show events near your postal code"
                            onClick={() => {
                                if (!settings.userPostalCode) {
                                    alert('Please set your postal code in settings (Gear icon) first!');
                                } else {
                                    setDateFilter('nearby' as any);
                                }
                            }}
                            className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${dateFilter === ('nearby' as any) ? 'bg-gradient-to-r from-[var(--pk-600)] to-[var(--pk-500)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'}`}
                        >
                            📍 Nearby Me
                        </button>
                    </div>

                    <div className="h-8 w-px bg-white/10 hidden md:block" />

                    {/* Quick Toggle for Sold Out */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => updateSettings({ hideSoldOut: !settings.hideSoldOut })}
                            className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${settings.hideSoldOut ? 'bg-red-500/20 text-red-200 border border-red-500/50' : 'bg-white/5 text-[var(--text-3)] border border-white/10 hover:bg-white/10'}`}
                            title="Toggle hiding of sold out events (System Default is Hidden)"
                        >
                            <span>{settings.hideSoldOut ? '🚫 Sold Out Hidden' : '👁 Show Sold Out'}</span>
                            {settings.hideSoldOut && <span className="text-[8px] opacity-40 bg-white/10 px-1.5 py-0.5 rounded">Default</span>}
                        </button>
                    </div>

                    <div className="h-8 w-px bg-white/10 hidden md:block" />

                    <div
                        className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10"
                        title="Sets the threshold for what is considered an 'Expensive' event. Events above this price are hidden when 'Expensive Hidden' is active."
                    >
                        <span className="text-xs font-bold text-[var(--text-3)] uppercase whitespace-nowrap">Price Limit: ${maxPrice === 500 ? 'Any' : maxPrice}</span>
                        <input
                            type="range"
                            min="0"
                            max="500"
                            step="10"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                            className="w-24 md:w-32 accent-[var(--pk-500)]"
                        />
                    </div>

                    {/* Source & Host Selectors */}
                    <div className="flex flex-wrap gap-2 justify-center">
                        <select
                            onChange={(e) => setSelectedSource(e.target.value || null)}
                            value={selectedSource || ''}
                            className="bg-white/5 text-[var(--text-2)] border border-white/10 rounded-full px-4 py-2 text-sm font-semibold outline-none hover:bg-white/10 cursor-pointer"
                            title="Filter by event provider"
                        >
                            <option value="">All Providers</option>
                            {allSources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <select
                            onChange={(e) => setSelectedHost(e.target.value || null)}
                            value={selectedHost || ''}
                            className="bg-white/5 text-[var(--text-2)] border border-white/10 rounded-full px-4 py-2 text-sm font-semibold outline-none hover:bg-white/10 cursor-pointer max-w-[150px]"
                            title="Filter by specific host/organizer"
                        >
                            <option value="">All Hosts</option>
                            {allHosts.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                </div>

                {/* Hidden / Exclusion Filters Dashboard */}
                <div className="flex flex-wrap gap-3 justify-center mt-4">
                    {/* Multi-Day Toggle - Only show in 'All Dates' mode or if we designate a specific toggle for it */}
                    {dateFilter === 'all' && (
                        <button
                            onClick={() => setShowMultiDay(!showMultiDay)}
                            className={`group flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${!showMultiDay ? 'bg-white/5 border border-white/10 text-[var(--text-3)]' : 'bg-[var(--surface-2)] text-white border border-[var(--pk-500)]'}`}
                            title="Toggle Multi-Day Events (Festivals, Recurring Series)"
                        >
                            <span>{showMultiDay ? '👁 Multi-Day On' : '❌ Multi-Day Off'}</span>
                            {!showMultiDay && (
                                <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] group-hover:bg-white/20 transition-colors">
                                    {/* Estimate count of multi-day from sourceEvents */}
                                    {sourceEvents.filter(e => isMultiDay(e)).length} Hidden
                                </span>
                            )}
                        </button>
                    )}

                    {/* Expensive Toggle */}
                    <button
                        onClick={() => setShowExpensive(!showExpensive)}
                        className={`group flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${!showExpensive ? 'bg-white/5 border border-white/10 text-[var(--text-3)]' : 'bg-[var(--surface-2)] text-white border border-[var(--pk-500)]'}`}
                        title={`Toggle Expensive Events (Over $${maxPrice})`}
                    >
                        <span>{showExpensive ? '👁 Expensive On' : '❌ Expensive Hidden'}</span>
                        {!showExpensive && (
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] group-hover:bg-white/20 transition-colors">
                                {liveEvents.filter((e: Event) => e.priceAmount !== undefined && e.priceAmount > maxPrice).length} Hidden
                            </span>
                        )}
                    </button>

                    {/* Started/Ongoing Toggle */}
                    <button
                        onClick={() => setShowStarted(!showStarted)}
                        className={`group flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${!showStarted ? 'bg-white/5 border border-white/10 text-[var(--text-3)]' : 'bg-[var(--surface-2)] text-white border border-[var(--pk-500)]'}`}
                        title="Toggle Events that have already started"
                    >
                        <span>{showStarted ? '👁 Ongoing On' : '❌ Ongoing Hidden'}</span>
                        {!showStarted && (
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] group-hover:bg-white/20 transition-colors">
                                {liveEvents.filter((e: Event) => now && new Date(e.date) < now && !isMultiDay(e)).length} Hidden
                            </span>
                        )}
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 justify-center mt-4 border-t border-white/5 pt-4">
                    <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all ${selectedCategory === null ? 'bg-[var(--pk-500)] text-white' : 'bg-white/5 text-[var(--text-3)] hover:bg-white/10'}`}>All Categories</button>
                    {allCategories.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-[var(--pk-500)] text-white border-transparent' : 'bg-white/5 text-[var(--text-3)] border border-white/5 hover:border-white/10'}`}>{cat}</button>
                    ))}
                </div>
            </div>

            {/* Breadcrumb Trail */}
            {activeFilters.length > 0 && (
                <div className="mb-8 flex flex-wrap items-center gap-3 animate-fade-in relative z-10">
                    <span className="text-[10px] font-black uppercase text-[var(--text-3)] tracking-tighter">Current Filter Stream:</span>
                    {activeFilters.map(filter => (
                        <button
                            key={filter.id}
                            onClick={filter.onRemove}
                            className="group flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--pk-500)]/10 border border-[var(--pk-500)]/20 text-[var(--pk-200)] text-[10px] font-bold uppercase transition-all hover:bg-[var(--pk-500)]/20 shadow-sm"
                        >
                            {filter.label}
                            <span className="opacity-50 group-hover:opacity-100 transition-opacity">✕</span>
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            setDateFilter('all');
                            setSelectedCategory(null);
                            setSelectedSource(null);
                            setSelectedHost(null);
                            setMaxPrice(500);
                        }}
                        className="text-[10px] font-black uppercase text-[var(--pk-500)] hover:underline ml-2"
                    >
                        Reset All Systems
                    </button>
                </div>
            )}

            {/* Main Content */}
            {settings.detailViewMode === 'inline' && previewEvent && (
                <InlinePreviewWithIndicator
                    event={previewEvent}
                    onClose={() => setPreviewEvent(null)}
                    onSwitchToPopup={() => updateSettings({ detailViewMode: 'popup' })}
                />
            )
            }

            {/* Event Counter & Section Header */}
            <section className="mb-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-1.5 bg-[var(--pk-500)] rounded-full shadow-[0_0_15px_rgba(var(--pk-500-rgb),0.5)]" />
                            <h2 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
                                <span className="text-[var(--pk-300)] opacity-50 font-mono text-2xl">/</span>
                                {settings.viewMode === 'saved' ? 'My Collection' : (dateFilter !== 'all' ? `${dateFilter.replace('-', ' ')} events` : 'Global Pulse')}
                            </h2>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-3)] ml-5">
                            Real-time node discovery: Toronto, ON
                        </p>
                    </div>

                    <div className="flex items-center gap-8 bg-black/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--pk-500)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex flex-col">
                            <span className="text-[4rem] font-black leading-none tracking-tighter text-white tabular-nums glow-text">
                                {displayEvents.length === liveEvents.length ? displayEvents.length : `${displayEvents.length}/${liveEvents.length}`}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--pk-300)] mt-[-0.5rem] ml-1">
                                Events {settings.viewMode === 'saved' ? 'Saved' : 'Detected'}
                            </span>
                        </div>
                        <div className="h-12 w-px bg-white/10" />
                        <div className="flex flex-col justify-center">
                            <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-tight">System Status</span>
                            <span className="text-[9px] font-black uppercase text-green-400 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                Optimal Engine
                            </span>
                            {settings.viewMode !== 'saved' && hiddenEvents.length > 0 && (
                                <button
                                    onClick={() => setShowHidden(!showHidden)}
                                    className="mt-2 text-[9px] font-black uppercase tracking-widest text-[var(--pk-300)] hover:text-white transition-colors border-b border-white/20 pb-0.5 w-fit"
                                >
                                    {showHidden ? 'Hide' : 'Reveal'} {hiddenEvents.length} filtered notes
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {settings.viewLayout === 'feed' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {displayEvents.map(event => {
                            const endDate = event.endDate ? new Date(event.endDate) : new Date(new Date(event.date).getTime() + 3 * 60 * 60 * 1000);
                            const isEnded = now && endDate < now;

                            return (
                                <div key={event.id} className={`relative group h-[400px] ${isEnded ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                    {/* Visual Indicator for Past Events in Saved View OR Today View */}
                                    {((settings.viewMode === 'saved' && now && new Date(event.date) < now) || (isEnded && dateFilter === 'today')) && (
                                        <div className="absolute -top-3 -right-3 z-30 bg-gray-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg border border-white/20">
                                            PAST
                                        </div>
                                    )}
                                    <EventCard event={event} onPreview={(rect) => handlePreview(event, rect)} />
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    /* Table View */
                    <div className="glass-panel overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                    {[
                                        { label: 'Event Title', key: 'title' },
                                        { label: 'Date & Time', key: 'date' },
                                        { label: 'Location', key: 'location' },
                                        { label: 'Host', key: 'host' },
                                        { label: 'Price', key: 'priceAmount' },
                                        { label: 'Source', key: 'source' },
                                    ].map(col => (
                                        <th
                                            key={col.key}
                                            onClick={() => setSortConfig({
                                                key: col.key as any,
                                                direction: sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                            })}
                                            className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-3)] cursor-pointer hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                {col.label}
                                                {sortConfig.key === col.key && (
                                                    <span className="text-[var(--pk-500)]">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayEvents.map(event => (
                                    <tr key={event.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col max-w-xs md:max-w-md">
                                                <span className="font-bold text-sm text-white group-hover:text-[var(--pk-300)] transition-colors line-clamp-1">{event.title}</span>
                                                <span className="text-[10px] opacity-40 uppercase font-black tracking-tighter truncate">{event.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-[var(--text-2)] whitespace-nowrap">
                                                {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-[var(--text-3)] line-clamp-1">{event.location}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-[var(--pk-300)] whitespace-nowrap">{event.host}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${event.price === 'Free' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white'}`}>
                                                {event.price}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-[var(--text-3)]">{event.source}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handlePreview(event)}
                                                className="p-2 bg-[var(--pk-500)] text-white rounded-lg shadow-lg hover:bg-[var(--pk-600)] transition-all transform hover:scale-110"
                                            >
                                                👁
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {displayEvents.length === 0 && (
                    <div className="text-center py-20 glass-panel rounded-xl">
                        <p className="text-[var(--text-2)]">
                            {settings.viewMode === 'saved'
                                ? "You haven't saved any events yet. Click the heart icon on events to build your collection."
                                : "No confirmed upcoming events found matching your current filters."}
                        </p>
                    </div>
                )}
            </section>

            {/* Separate Multi-Day Section ONLY if dateFilter is ALL */}
            {
                dateFilter === 'all' && showMultiDay && separateMultiDayList.length > 0 && (
                    <section className="mb-16">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-px flex-1 bg-white/10" />
                            <h2 className="text-xl font-bold text-[var(--text-2)] uppercase tracking-widest">Multi-Day / Festivals</h2>
                            <div className="h-px flex-1 bg-white/10" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {separateMultiDayList.map(event => (
                                <EventCard key={event.id} event={event} onPreview={(rect) => handlePreview(event, rect)} />
                            ))}
                        </div>
                    </section>
                )
            }

            {
                showHidden && hiddenEvents.length > 0 && (
                    <section className="opacity-70 grayscale-[0.5] hover:grayscale-0 transition-all duration-500">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-px flex-1 bg-white/10" />
                            <h2 className="text-xl font-bold text-[var(--text-2)] uppercase tracking-widest">Review Needed (TBD / Cancelled)</h2>
                            <div className="h-px flex-1 bg-white/10" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {hiddenEvents.map(event => (
                                <EventCard key={event.id} event={event} onPreview={(rect) => handlePreview(event, rect)} />
                            ))}
                        </div>
                    </section>
                )
            }

            {
                previewEvent && settings.detailViewMode === 'popup' && (
                    <EventPreview
                        event={previewEvent}
                        onClose={() => { setPreviewEvent(null); setPreviewAnchor(null); }}
                        anchor={previewAnchor || undefined}
                    />
                )
            }
        </div >
    );
}
