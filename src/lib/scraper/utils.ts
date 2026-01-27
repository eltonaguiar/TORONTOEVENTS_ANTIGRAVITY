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

export function cleanDescription(text: string | null | undefined): string {
    if (!text) return '';
    return text
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
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

        // CRITICAL FIX: Detect and fix malformed timezone offsets BEFORE parsing
        const malformedPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})0{3,4}([+-]?\d{1,2}):(\d{2})$/;
        const match = inputStr.match(malformedPattern);
        if (match) {
            const [, base, offsetHours, offsetMins] = match;
            const sign = offsetHours.startsWith('-') ? '-' : (offsetHours.startsWith('+') ? '+' : '-');
            const hours = Math.abs(parseInt(offsetHours.replace(/[+-]/, '')));
            const mins = parseInt(offsetMins);
            const fixedOffset = `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
            inputStr = `${base}${fixedOffset}`;
        }

        // Check for TBD/unknown dates first
        if (isTBDDate(inputStr)) {
            return null;
        }

        // Clean the input
        inputStr = inputStr.replace(/\s+/g, ' ').trim();
        inputStr = inputStr.replace(/[•·⋅\u2022\u22c5\u00b7]/g, '|').split('|')[0].trim();
        if (inputStr.includes(' - ')) {
            inputStr = inputStr.replace(' - ', ' ');
        }
        inputStr = inputStr.replace(/\s*at\s*$/i, '').trim();

        // Normalize day-month text format ("27 Jan 2026" → "Jan 27, 2026")
        const dayMonthMatch = inputStr.match(/\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/i);
        if (dayMonthMatch) {
            const day = dayMonthMatch[1];
            const month = dayMonthMatch[2];
            const year = dayMonthMatch[3];
            inputStr = inputStr.replace(dayMonthMatch[0], `${month} ${day}, ${year}`);
        }

        // Extract date from range (e.g., "Jan 27 - Jan 29" → "Jan 27")
        if (inputStr.includes(' - ') || inputStr.includes('–')) {
            inputStr = inputStr.split(/[-–]/)[0].trim();
        }

        // Handle relative dates
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (/^tomorrow/i.test(inputStr)) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const timeMatch = inputStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const period = timeMatch[3]?.toLowerCase();
                if (period === 'pm' && hours !== 12) hours += 12;
                if (period === 'am' && hours === 12) hours = 0;
                tomorrow.setHours(hours, minutes, 0, 0);
            } else {
                tomorrow.setHours(19, 0, 0, 0);
            }
            return formatTorontoDate(tomorrow);
        }
        
        if (/^today/i.test(inputStr)) {
            const todayDate = new Date(today);
            const timeMatch = inputStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const period = timeMatch[3]?.toLowerCase();
                if (period === 'pm' && hours !== 12) hours += 12;
                if (period === 'am' && hours === 12) hours = 0;
                todayDate.setHours(hours, minutes, 0, 0);
            } else {
                todayDate.setHours(19, 0, 0, 0);
            }
            return formatTorontoDate(todayDate);
        }

        // Try native Date first
        let date = new Date(inputStr);
        
        // If native parsing fails or produces invalid year, try date-fns
        if (isNaN(date.getTime()) || date.getFullYear() < 2020 || date.getFullYear() > 2030) {
            // Import date-fns parse and isValid
            const { parse, isValid } = require('date-fns');
            
            const dateFnsFormats = [
                // ISO-like formats
                "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd'T'HH:mm", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd HH:mm", "yyyy-MM-dd",
                // US formats
                "MM/dd/yyyy HH:mm", "MM/dd/yyyy", "M/d/yyyy HH:mm", "M/d/yyyy",
                // Day-first formats (common outside US)
                "dd/MM/yyyy HH:mm", "d/MM/yyyy HH:mm", "dd/MM/yyyy", "d/MM/yyyy",
                // Text formats
                "MMMM dd, yyyy HH:mm", "MMMM dd, yyyy", "MMM dd, yyyy HH:mm", "MMM dd, yyyy", "MMM dd HH:mm", "MMM dd",
                // Day-first text formats
                "d MMM yyyy", "dd MMM yyyy", "d MMMM yyyy", "dd MMMM yyyy",
                // Weekday with commas + time
                "EEE, MMM d, yyyy 'at' h:mm a", "EEEE, MMM d, yyyy 'at' h:mm a", "EEE, MMM d, yyyy h:mm a", "EEEE, MMM d, yyyy h:mm a",
                "EEE, MMMM d, yyyy 'at' h:mm a", "EEEE, MMMM d, yyyy 'at' h:mm a",
                // With timezone
                "yyyy-MM-dd'T'HH:mm:ssXXX", "yyyy-MM-dd'T'HH:mmXXX",
                // Common event formats
                "EEEE, MMMM dd, yyyy 'at' HH:mm", "MMMM dd, yyyy 'at' HH:mm a", "MMM dd, yyyy 'at' HH:mm a",
                // Bullet-separated formats
                "MMM d '|' h:mm a", "MMMM d '|' h:mm a",
            ];

            for (const fmt of dateFnsFormats) {
                try {
                    const parsed = parse(inputStr, fmt, new Date());
                    if (isValid(parsed) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) {
                        date = parsed;
                        break;
                    }
                } catch {}
            }
        }

        // Try format variations
        if (isNaN(date.getTime()) || date.getFullYear() < 2020 || date.getFullYear() > 2030) {
            const formatVariations = [
                inputStr.replace(/T/, ' ').replace(/Z$/, ''),
                inputStr.replace(/T/, ' ').replace(/Z$/, '') + ' EST',
                inputStr.replace(/T/, ' ').replace(/Z$/, '') + ' EDT',
                inputStr.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1'),
                inputStr.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$1-$2'),
                inputStr + ' EST',
                inputStr + ' EDT',
            ];

            for (const format of formatVariations) {
                const testDate = new Date(format);
                if (!isNaN(testDate.getTime()) && testDate.getFullYear() > 2000 && testDate.getFullYear() < 2100) {
                    date = testDate;
                    break;
                }
            }
        }

        if (isNaN(date.getTime())) return null;
        
        // CRITICAL: Reject dates that are clearly invalid
        if (date.getFullYear() < 2020 || date.getFullYear() > 2030) {
            return null;
        }

        // Format output safely in Toronto time
        return formatTorontoDate(date);
    } catch {
        return null;
    }
}

/**
 * Format a Date object as Toronto timezone ISO string
 */
function formatTorontoDate(date: Date): string {
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
    const formatter = new Intl.DateTimeFormat('sv-SE', options);
    const parts = formatter.formatToParts(date);
    const map: { [key: string]: string } = {};
    parts.forEach(p => map[p.type] = p.value);
    const torontoIso = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
    const finalOffset = getTorontoOffset(date);
    return `${torontoIso}${finalOffset}`;
}

/**
 * Check if a date string indicates "To Be Determined" or unknown date
 */
export function isTBDDate(dateStr: string): boolean {
    if (!dateStr) return true;
    const lower = dateStr.toLowerCase().trim();
    const tbdPatterns = [
        'tbd', 't.b.d', 'to be determined', 'to be announced', 'tba', 'date tbd',
        'coming soon', 'date coming soon', 'check back', 'date pending',
        'date to be announced', 'announcement coming', 'stay tuned'
    ];
    return tbdPatterns.some(pattern => lower.includes(pattern));
}

function getTorontoOffset(date: Date): string {
    try {
        // Get the timezone offset for Toronto at this specific date
        // Toronto uses EST (-05:00) or EDT (-04:00) depending on DST
        const torontoDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
        const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
        
        // Calculate offset in minutes
        const offsetMinutes = (torontoDate.getTime() - utcDate.getTime()) / (1000 * 60);
        
        // Convert to hours and format as +/-HH:MM
        const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
        const offsetMins = Math.abs(offsetMinutes) % 60;
        const sign = offsetMinutes >= 0 ? '+' : '-';
        
        return `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    } catch {
        // Fallback: EST is -05:00, EDT is -04:00
        // Use a simple check - if between March and November, likely EDT
        const month = date.getMonth();
        if (month >= 2 && month <= 10) {
            return '-04:00'; // EDT (Daylight Saving)
        }
        return '-05:00'; // EST (Standard)
    }
}

export function categorizeEvent(title: string, description: string): string[] {
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
        'Dating': ['dating', 'singles', 'matchmaking', 'speed dating', 'mixer', 'blind date', 'romance', 'swoon', 'relationship', 'mingle', 'single in the city', 'flare events', 'cheeky', 'matrimonial', 'for single men', 'for single women'],
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

export function consolidateEvents(events: Event[]): Event[] {
    // Group events by normalized title and date
    const groups = new Map<string, Event[]>();

    for (const event of events) {
        // Create a key based on normalized title and date (within same day)
        const normalizedTitle = event.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const eventDate = new Date(event.date);
        const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
        const key = `${normalizedTitle}-${dateKey}`;

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(event);
    }

    // For each group, keep the best version
    const consolidated: Event[] = [];
    for (const group of groups.values()) {
        if (group.length === 1) {
            consolidated.push(group[0]);
        } else {
            // Pick the event with the most complete information
            const best = group.reduce((prev, curr) => {
                let prevScore = 0;
                let currScore = 0;

                if (prev.description && prev.description.length > 50) prevScore += 2;
                if (curr.description && curr.description.length > 50) currScore += 2;

                if (prev.image) prevScore += 1;
                if (curr.image) currScore += 1;

                if (prev.latitude && prev.longitude) prevScore += 1;
                if (curr.latitude && curr.longitude) currScore += 1;

                if (prev.priceAmount !== undefined) prevScore += 1;
                if (curr.priceAmount !== undefined) currScore += 1;

                return currScore > prevScore ? curr : prev;
            });

            consolidated.push(best);
        }
    }

    return consolidated;
}

