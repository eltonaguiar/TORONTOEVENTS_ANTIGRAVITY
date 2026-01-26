import { Event } from '../types';
import * as crypto from 'crypto';

export function generateEventId(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
}

export function cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

export function isMultiDay(event: Event): boolean {
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
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return null;

        // CRITICAL FIX: Convert to Eastern Time (Toronto timezone)
        // The issue: Eventbrite gives us dates like "2026-01-26" which JavaScript
        // interprets as UTC midnight (2026-01-26T00:00:00.000Z)
        // In Eastern Time (UTC-5), this becomes Jan 25 at 7:00 PM!

        // Solution: If we have a date-only string (no time), treat it as noon Eastern
        const inputStr = typeof dateInput === 'string' ? dateInput : dateInput.toISOString();

        // 1. Check for exact date format: YYYY-MM-DD
        // 2. Check for UTC midnight: YYYY-MM-DD T00:00:00... Z
        if (inputStr.match(/^\d{4}-\d{2}-\d{2}$/) || inputStr.match(/^\d{4}-\d{2}-\d{2}T00:00:00/)) {
            const datePart = inputStr.substring(0, 10);
            return `${datePart}T12:00:00-05:00`;
        }

        return date.toISOString();
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
        'Comedy': ['comedy', 'standup', 'improv', 'laugh', 'funny']
    };

    for (const [category, keywords] of Object.entries(patterns)) {
        if (keywords.some(k => text.includes(k))) {
            cats.add(category);
        }
    }

    if (cats.size === 0) cats.add('General');
    return Array.from(cats);
}
