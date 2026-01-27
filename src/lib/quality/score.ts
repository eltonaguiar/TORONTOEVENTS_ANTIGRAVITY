import { Event } from '../types';

export interface QualityProfile {
    score: number;
    hasImage: boolean;
    hasPrice: boolean;
    hasDescription: boolean;
    isPast: boolean;
}

export function gradeEvent(event: Event): QualityProfile {
    let score = 50; // Base score

    // Completeness checks
    if (event.image) score += 15;
    if (event.description && event.description.length > 20) score += 15;
    if (event.price && event.price !== 'TBD') score += 10;
    if (event.location && event.location !== 'Toronto, ON') score += 5;
    if (event.endDate) score += 5;

    // Date validity - Use Toronto timezone to avoid off-by-one errors
    const eventDate = new Date(event.date);
    const now = new Date();

    // Validate date is not invalid
    if (isNaN(eventDate.getTime())) {
        console.log(`Rejecting event with invalid date: "${event.title}" - date: "${event.date}"`);
        score = 0;
        return {
            score: 0,
            hasImage: !!event.image,
            hasPrice: event.price !== 'TBD',
            hasDescription: event.description.length > 20,
            isPast: true
        };
    }

    const getTorontoParts = (d: Date) => {
        // Additional validation
        if (isNaN(d.getTime())) {
            return '0000-00-00';
        }
        try {
            const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' });
            const parts = fmt.formatToParts(d);
            const map: { [key: string]: string } = {};
            parts.forEach(p => map[p.type] = p.value);
            return `${map.year}-${map.month}-${map.day}`;
        } catch (e) {
            console.error(`Error formatting date: ${d}, error: ${e}`);
            return '0000-00-00';
        }
    };

    const eventDayStr = getTorontoParts(eventDate);
    const todayStr = getTorontoParts(now);

    const isPast = eventDayStr < todayStr;

    if (isPast) {
        console.log(`Rejecting past event: "${event.title}" - Event Toronto Day: ${eventDayStr}, Today Toronto Day: ${todayStr}`);
        score = 0;
    }

    // Future date sanity check (reject events more than 1 year out)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);
    if (eventDate > oneYearFromNow) {
        score -= 30;
    }

    // SOLD OUT check
    if (event.title.toLowerCase().includes('sold out')) {
        console.log(`Rejecting SOLD OUT event: "${event.title}"`);
        score = 0;
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        hasImage: !!event.image,
        hasPrice: event.price !== 'TBD',
        hasDescription: event.description.length > 20,
        isPast
    };
}

import { isTorontoEvent } from './filters';

export function shouldIncludeEvent(event: Event): boolean {
    const quality = gradeEvent(event);

    // CRITICAL FIX: Don't reject past events - let frontend handle date filtering
    // Frontend has better date handling and user controls for showing past events
    // if (quality.isPast) return false;

    // CRITICAL FIX: Relax geofence - be more permissive
    // Only reject if we're CERTAIN it's not Toronto (explicit exclusions)
    // Don't reject if we're unsure - let it through and let frontend filter if needed
    const loc = (event.location || '').toLowerCase();
    const EXCLUDED_LOCATIONS = [
        'new york', 'ny', 'manhattan', 'brooklyn',
        'washington', 'dc',
        'chicago', 'il',
        'buffalo'
    ];
    
    // Only reject if explicitly in excluded list
    if (EXCLUDED_LOCATIONS.some(ex => loc.includes(ex.toLowerCase()))) {
        console.log(`Rejecting non-Toronto event: "${event.title}" @ "${event.location}"`);
        return false;
    }
    
    // If location is empty or very short, don't reject - might be online/virtual
    if (!event.location || event.location.length < 3) {
        // Don't reject - might be valid online event
        // return true; // Let it through
    }
    
    // CRITICAL FIX: Relax price filter - only reject if VERY expensive (> $200)
    // The frontend has user-controlled price filters, so be more permissive here
    if (event.priceAmount !== undefined && event.priceAmount > 200) {
        console.log(`Rejecting very expensive event: "${event.title}" ($${event.priceAmount})`);
        return false;
    }
    
    // Don't check description for prices - too aggressive and error-prone
    // Let frontend handle price filtering with user controls

    // Reject "garbage" topics (sales seminars, etc.) - keep this as it's spam filtering
    const spamKeywords = [
        'sales seminar', 'home buying', 'estate investing',
        'wealth mastery', 'financial freedom', 'webinar',
        'timeshare', 'mlm', 'investment strategy',
        'career fair', 'job fair', 'recruitment',
        'intro to trading', 'forex'
    ];
    const text = (event.title + ' ' + (event.description || '')).toLowerCase();
    if (spamKeywords.some(k => text.includes(k))) {
        console.log(`Rejecting spam/low-value event: "${event.title}"`);
        return false;
    }

    // CRITICAL FIX: Relax quality score requirement - be very permissive
    // Only reject if quality is extremely poor (< 10)
    // Most events should pass through and let frontend/user filters handle it
    if (quality.score < 10) {
        console.log(`Rejecting very low quality event: "${event.title}" (score: ${quality.score})`);
        return false;
    }

    // Be permissive - include events unless we're CERTAIN they're bad
    return true;
}
