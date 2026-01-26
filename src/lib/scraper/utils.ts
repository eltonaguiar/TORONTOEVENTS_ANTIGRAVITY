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

        // Remove trailing " -" or similar that might appear before time if we are just parsing the date part, 
        // though usually we want the whole thing. The " - " in "Mon, 20 Apr, 2026 - 07:00 PM" is actually fine for some parsers 
        // but let's be safe.
        // If it matches "Date - Time", replace " - " with " " to help Date parser if it fails.
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
                // If the date parsed is significantly in the past, it's likely for next year
                if (date.getTime() < now.getTime() - (1000 * 60 * 60 * 24 * 30 * 6)) {
                    date = new Date(`${inputStr} ${currentYear + 1}`);
                }
            }
        }

        if (isNaN(date.getTime())) return null;

        // CRITICAL FIX: Ensure output is always in Toronto timezone format
        // This handles DST automatically if we use the right library or methods
        // Since we are likely in a Node environment without heavy libs, we'll use Intl to get current offset for that date
        const options: Intl.DateTimeFormatOptions = {
            timeZone: 'America/Toronto',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };

        const formatter = new Intl.DateTimeFormat('sv-SE', options); // sv-SE gives YYYY-MM-DD HH:mm:ss
        const parts = formatter.formatToParts(date);
        const map: { [key: string]: string } = {};
        parts.forEach(p => map[p.type] = p.value);

        // Calculate offset manually to construct a valid ISO-like string with offset
        const torontoStr = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
        const torontoDate = new Date(torontoStr);
        const offsetMinutes = (date.getTime() - torontoDate.getTime()) / 60000;
        const absOffset = Math.abs(Math.round(offsetMinutes));
        const hours = Math.floor(absOffset / 60).toString().padStart(2, '0');
        const mins = (absOffset % 60).toString().padStart(2, '0');
        const sign = offsetMinutes > 0 ? '-' : '+'; // If UTC is ahead, offset is negative

        return `${torontoStr}${sign}${hours}:${mins}`;
    } catch {
        return null;
    }
}
export function categorizeEvent(title: string, description: string, existingCategories: string[] = []): string[] {
    const cats = new Set<string>(existingCategories.filter(c => c !== 'General'));
    const text = (title + ' ' + description).toLowerCase();

    const patterns: { [key: string]: string[] } = {
        'Music': ['concert', 'live music', 'band', 'dj', 'musical', 'karaoke', 'jazz', 'rock', 'hip hop', 'symphony', 'rap', 'techno', 'house music'],
        'Food & Drink': ['food', 'drink', 'tasting', 'wine', 'beer', 'culinary', 'dinner', 'cooking', 'restaurant', 'brunch', 'cafe', 'bar crawl'],
        'Arts': ['art', 'exhibition', 'gallery', 'painting', 'museum', 'theatre', 'theater', 'drama', 'film', 'movie', 'screening', 'creative', 'sculpture'],
        'Tech': ['tech', 'software', 'coding', 'ai', 'blockchain', 'startup', 'web', 'developer', 'digital', 'saas', 'programming'],
        'Business': ['networking', 'business', 'workshop', 'seminar', 'conference', 'entrepreneur', 'marketing', 'professional', 'real estate'],
        'Sports & Fitness': ['gym', 'fitness', 'yoga', 'sports', 'game', 'tournament', 'match', 'running', 'workout', 'hiking', 'soccer', 'basketball'],
        'Nightlife': ['party', 'club', 'nightlife', 'bar', 'celebration', 'dance', 'rave', 'lounge'],
        'Community': ['community', 'volunteer', 'local', 'meeting', 'neighborhood', 'town hall', 'social', 'charity'],
        'Family': ['family', 'kids', 'children', 'toddler', 'school', 'parent', 'youth'],
        'Comedy': ['comedy', 'standup', 'improv', 'laugh', 'funny', 'sitcom'],
        'Dating': ['dating', 'singles', 'matchmaking', 'speed dating', 'mixer', 'blind date', 'romance', 'swoon', 'relationship', 'mingle'],
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

    // Remove clean text of common non-linguistic characters for analysis
    const clean = text.replace(/[0-9\s\.,!?@#$%^&*()_\-+=<>{}\[\]\/\\|~`"':;]/g, '');
    if (clean.length === 0) return true;

    // Count Latin characters
    // \u0041-\u005A is A-Z
    // \u0061-\u007A is a-z
    // \u00C0-\u00FF includes basic Latin accents (common in English/French/Spanish context)
    const latinCount = (clean.match(/[\u0041-\u005A\u0061-\u007A\u00C0-\u00FF]/g) || []).length;

    const ratio = latinCount / clean.length;

    // If less than 70% of the linguistic characters are Latin, it's likely not English/French/Western
    // (This effectively filters Cyrillic, CJK, Arabic, etc.)
    return ratio > 0.7;
}

export function consolidateEvents(events: Event[]): Event[] {
    const map = new Map<string, Event[]>();

    // Group by Title + Location (normalized)
    for (const event of events) {
        const key = `${event.title.toLowerCase().trim()}|${event.location?.toLowerCase().trim() || ''}`;
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key)!.push(event);
    }

    const result: Event[] = [];

    for (const group of map.values()) {
        if (group.length === 1) {
            result.push(group[0]);
            continue;
        }

        // Sort by date
        group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const master = group[0];
        const last = group[group.length - 1];

        // Update Master with range
        master.endDate = last.endDate || last.date;

        // Add 'Multi-Day' tag
        if (!master.categories.includes('Multi-Day')) {
            master.categories.push('Multi-Day');
        }

        // Merge categories/tags from all variants
        const allTags = new Set<string>();
        if (master.tags) master.tags.forEach(t => allTags.add(t));

        group.forEach(g => {
            if (g.tags) g.tags.forEach(t => allTags.add(t));
            // Also check categories if tags missing?
            g.categories.forEach(c => {
                if (c !== 'Multi-Day') allTags.add(c);
            });
        });

        // Update tags
        master.tags = Array.from(allTags);

        result.push(master);
    }

    return result;
}
