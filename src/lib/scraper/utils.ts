import { Event } from '../types';
import * as crypto from 'crypto';

export function generateEventId(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
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

        // Try to find a date pattern like "21 Aug" or "Aug 21"
        const dateMatch = inputStr.match(/(\d{1,2})\s+([a-z]{3,9})|([a-z]{3,9})\s+(\d{1,2})/i);

        let date = new Date(inputStr);

        // If invalid OR if it picked a weird default year like 2001 (Node default for no year)
        // and it seems to have day/month, try adding current year
        if ((isNaN(date.getTime()) || date.getFullYear() === 2001) && inputStr.match(/[a-z]{3},\s+\d+\s+[a-z]{3}/i)) {
            const currentYear = new Date().getFullYear();
            date = new Date(`${inputStr} ${currentYear}`);

            // If it's in the past by more than 6 months, it's likely for next year
            if (!isNaN(date.getTime())) {
                const now = new Date();
                if (date.getTime() < now.getTime() - (1000 * 60 * 60 * 24 * 30 * 6)) {
                    date = new Date(`${inputStr} ${currentYear + 1}`);
                }
            }
        }

        if (isNaN(date.getTime())) return null;

        // CRITICAL FIX: Convert to Eastern Time (Toronto timezone)
        const finalInputStr = date.toISOString();

        // 1. Check for exact date format: YYYY-MM-DD
        // 2. Check for UTC midnight: YYYY-MM-DD T00:00:00... Z
        if (typeof dateInput === 'string' && (dateInput.match(/^\d{4}-\d{2}-\d{2}$/) || dateInput.match(/^\d{4}-\d{2}-\d{2}T00:00:00/))) {
            const datePart = dateInput.substring(0, 10);
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
