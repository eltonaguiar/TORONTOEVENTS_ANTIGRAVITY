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

        // Handle various dot characters used as delimiters (•, ·, etc)
        inputStr = inputStr.replace(/[•·⋅\u2022\u22c5\u00b7]/g, '|').split('|')[0].trim();

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
        'Music': ['concert', 'live music', 'band', 'dj', 'musical', 'karaoke', 'jazz', 'rock', 'hip hop', 'symphony', 'rap'],
        'Food & Drink': ['food', 'drink', 'tasting', 'wine', 'beer', 'culinary', 'dinner', 'cooking', 'restaurant', 'brunch', 'cafe'],
        'Arts': ['art', 'exhibition', 'gallery', 'painting', 'museum', 'theatre', 'theater', 'drama', 'film', 'movie', 'screening', 'creative'],
        'Tech': ['tech', 'software', 'coding', 'ai', 'blockchain', 'startup', 'web', 'developer', 'digital'],
        'Business': ['networking', 'business', 'workshop', 'seminar', 'conference', 'entrepreneur', 'marketing', 'professional'],
        'Sports & Fitness': ['gym', 'fitness', 'yoga', 'sports', 'game', 'tournament', 'match', 'running', 'workout'],
        'Nightlife': ['party', 'club', 'nightlife', 'bar', 'celebration', 'dance', 'rave'],
        'Community': ['community', 'volunteer', 'local', 'meeting', 'neighborhood', 'town hall'],
        'Family': ['family', 'kids', 'children', 'toddler', 'school', 'parent'],
        'Comedy': ['comedy', 'standup', 'improv', 'laugh', 'funny'],
        'Dating': ['dating', 'singles', 'matchmaking', 'speed dating', 'mixer', 'blind date', 'romance'],
        'Thursday': ['thursday', 'getthursday']
    };

    const recurringKeywords = ['multiple dates', 'recurring', 'select more dates', 'check availability', 'series'];
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
