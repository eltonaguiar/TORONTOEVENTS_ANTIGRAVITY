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

    const getTorontoParts = (d: Date) => {
        const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = fmt.formatToParts(d);
        const map: { [key: string]: string } = {};
        parts.forEach(p => map[p.type] = p.value);
        return `${map.year}-${map.month}-${map.day}`;
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

    // Reject past events
    if (quality.isPast) return false;

    // Reject non-Toronto events
    if (!isTorontoEvent(event)) {
        console.log(`Rejecting non-Toronto event: "${event.title}" @ "${event.location}"`);
        return false;
    }

    // Reject expensive events (> $150)
    if (event.priceAmount !== undefined && event.priceAmount > 150) {
        console.log(`Rejecting expensive event: "${event.title}" ($${event.priceAmount})`);
        return false;
    }

    // Reject "garbage" topics (sales seminars, etc.)
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

    // Require minimum quality score
    if (quality.score < 40) return false;

    return true;
}
