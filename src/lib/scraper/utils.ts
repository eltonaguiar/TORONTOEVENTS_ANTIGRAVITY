import { Event } from '../types';
import * as crypto from 'crypto';

export function generateEventId(url: string): string {
    try {
        const u = new URL(url);
        // Remove query params and trailing slashes for consistent hashing
        const normalized = (u.origin + u.pathname).replace(/\/$/, '').toLowerCase();
        return crypto.createHash('md5').update(normalized).digest('hex');
    } catch {
        return crypto.createHash('md5').update(url.toLowerCase().trim()).digest('hex');
    }
}

export function cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

export function isMultiDay(event: Event): boolean {
    if (event.categories.includes('Multi-Day')) return true;
    if (!event.endDate) return false;
    const start = new Date(event.date);
    const end = new Date(event.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 1;
}

export function normalizeDate(dateInput: string | Date | undefined): string | null {
    if (!dateInput) return null;

    try {
        let inputStr = typeof dateInput === 'string' ? dateInput.trim() : dateInput.toISOString();

        // Robust cleanup for scraping artifacts (newlines, excessive spaces)
        inputStr = inputStr.replace(/\s+/g, ' ').trim();

        // Handle various dot characters used as delimiters (•, ·, etc)
        inputStr = inputStr.replace(/[•·⋅\u2022\u22c5\u00b7]/g, '|').split('|')[0].trim();

        if (inputStr.includes(' - ')) {
            inputStr = inputStr.replace(' - ', ' ');
        }

        let date = new Date(inputStr);

        // Handle year-less dates (e.g., "Aug 21")
        if ((isNaN(date.getTime()) || date.getFullYear() === 2001) && inputStr.match(/[a-z]{3},\s+\d+\s+[a-z]{3}/i)) {
            const currentYear = new Date().getFullYear();
            date = new Date(`${inputStr} ${currentYear}`);
            if (!isNaN(date.getTime())) {
                const now = new Date();
                if (date.getTime() < now.getTime() - (1000 * 60 * 60 * 24 * 30 * 6)) {
                    date = new Date(`${inputStr} ${currentYear + 1}`);
                }
            }
        }

        // Toronto timezone for display
        const hasZone = /GMT|UTC|[-+]\d{2}:?\d{2}|EST|EDT/i.test(inputStr);
        const hasTime = /[:\d]+ ?(am|pm)/i.test(inputStr) || inputStr.includes(':');

        if (isNaN(date.getTime())) return null;

        // CRITICAL FIX: If no zone provided and it has a time, assume Toronto
        // This is critical when running on UTC machines (GitHub Actions)
        if (!hasZone && hasTime) {
            const torontoOffset = getTorontoOffset(date);
            // Re-parse with the offset appended
            const cleaned = inputStr.replace(/ at\s*$/i, '');
            const adjustedDate = new Date(`${cleaned} ${torontoOffset}`);
            if (!isNaN(adjustedDate.getTime())) {
                date = adjustedDate;
            }
        }

        // format output safely in Toronto time
        const options: Intl.DateTimeFormatOptions = {
            timeZone: 'America/Toronto',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        };

        const formatter = new Intl.DateTimeFormat('sv-SE', options);
        const parts = formatter.formatToParts(date);
        const map: { [key: string]: string } = {};
        parts.forEach(p => map[p.type] = p.value);

        const torontoIso = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
        const finalOffset = getTorontoOffset(date);

        return `${torontoIso}${finalOffset}`;
    } catch {
        return null;
    }
}

function getTorontoOffset(date: Date): string {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Toronto',
            timeZoneName: 'shortOffset'
        }).formatToParts(date);
        const tz = parts.find(p => p.type === 'timeZoneName')?.value; // "GMT-5" or "GMT-4"

        if (!tz || tz === 'GMT') return '-05:00';

        let offset = tz.replace('GMT', '');
        if (!offset.includes(':')) {
            const sign = offset.startsWith('+') || offset.startsWith('-') ? '' : '+';
            const val = offset.replace(/[+-]/, '');
            offset = `${sign}${val.padStart(2, '0')}:00`;
        }
        return offset;
    } catch {
        return '-05:00';
    }
}

export function inferCategory(title: string, description: string): string[] {
    const text = (title + ' ' + (description || '')).toLowerCase();
    const cats = new Set<string>();

    const patterns = {
        'Arts': ['art', 'gallery', 'museum', 'exhibition', 'painting', 'drawing', 'sculpture', 'photography', 'theatre', 'theater', 'dance', 'opera', 'ballet'],
        'Music': ['music', 'concert', 'live band', 'show', 'gig', 'orchestra', 'symphony', 'dj', 'performance', 'musical', 'cassette'],
        'Nightlife': ['party', 'club', 'bar', 'drinks', 'social', 'mixer', 'dating', 'singles', 'dance party', 'dj', 'crawl', 'cassette'],
        'Food & Drink': ['food', 'drink', 'tasting', 'dinner', 'lunch', 'brunch', 'festival', 'market', 'wine', 'beer', 'culinary', 'matty matheson'],
        'Sports': ['sports', 'game', 'match', 'tournament', 'fitness', 'yoga', 'running', 'basketball', 'hockey', 'baseball', 'soccer', 'football', 'marathon'],
        'Tech': ['tech', 'technology', 'web', 'ai', 'artificial intelligence', 'coding', 'software', 'programming', 'startup', 'innovation', 'workshop'],
        'Business': ['business', 'networking', 'seminar', 'conference', 'professional', 'startup', 'entrepreneur', 'workshop'],
        'Community': ['community', 'volunteer', 'local', 'meeting', 'neighborhood', 'town hall', 'social', 'charity'],
        'Family': ['family', 'kids', 'children', 'toddler', 'school', 'parent', 'youth'],
        'Comedy': ['comedy', 'standup', 'improv', 'laugh', 'funny', 'sitcom'],
        'Dating': ['dating', 'singles', 'matchmaking', 'speed dating', 'mixer', 'blind date', 'romance', 'swoon', 'relationship', 'mingle', 'single in the city', 'flare events', 'cheeky'],
        'Thursday': ['thursday', 'getthursday']
    };

    const recurringKeywords = ['multiple dates', 'recurring', 'select more dates', 'check availability', 'series', 'every week', 'bi-weekly'];
    if (recurringKeywords.some(k => text.includes(k))) {
        cats.add('Multi-Day');
    }

    for (const [category, keywords] of Object.entries(patterns)) {
        if (keywords.some(k => text.includes(k))) {
            cats.add(category);
        }
    }

    if (cats.size === 0) cats.add('General');
    return Array.from(cats);
}

export function inferSoldOutStatus(text: string): { isSoldOut: boolean, genderSoldOut: 'male' | 'female' | 'both' | 'none' } {
    const uc = text.toUpperCase();
    const isSoldOut = uc.includes('SOLD OUT') && !uc.includes('NOT SOLD OUT');

    let genderSoldOut: 'male' | 'female' | 'both' | 'none' = 'none';
    const malePatterns = ['MALE TICKETS SOLD OUT', 'MALE SOLD OUT', 'MEN TICKETS SOLD OUT', 'GENTLEMEN SOLD OUT', 'MEN\'S SOLD OUT'];
    const femalePatterns = ['FEMALE TICKETS SOLD OUT', 'FEMALE SOLD OUT', 'WOMEN TICKETS SOLD OUT', 'LADIES SOLD OUT', 'WOMEN\'S SOLD OUT'];

    const maleOut = malePatterns.some(p => uc.includes(p));
    const femaleOut = femalePatterns.some(p => uc.includes(p));

    if (maleOut && femaleOut) genderSoldOut = 'both';
    else if (maleOut) genderSoldOut = 'male';
    else if (femaleOut) genderSoldOut = 'female';

    return { isSoldOut, genderSoldOut };
}

export function isEnglish(text: string): boolean {
    if (!text) return true;
    // Check if contains primarily Latin characters
    const latinChars = text.match(/[a-zA-Z]/g) || [];
    const totalChars = text.replace(/\s/g, '').length;
    if (totalChars === 0) return true;
    return (latinChars.length / totalChars) > 0.5;
}
