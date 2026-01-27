/**
 * Date parsing and validation utilities
 * Handles multiple date formats, timezones, and provides safe fallbacks
 * Uses date-fns for flexible parsing when native Date() fails
 */

import { logParsingError } from './errorLogger';
import { parse, isValid, parseISO, format } from 'date-fns';

export interface DateParseResult {
    date: Date | null;
    isValid: boolean;
    error?: string;
    rawInput?: string;
}

/**
 * Safely parse a date string with multiple format support
 */
export function safeParseDate(
    dateInput: string | Date | undefined | null,
    eventId?: string,
    eventTitle?: string
): DateParseResult {
    if (!dateInput) {
        const result = { date: null, isValid: false, error: 'Date input is empty or null' };
        logParsingError('date', 'date', null, result.error, eventId, eventTitle);
        return result;
    }

    try {
        // If already a Date object, validate it
        if (dateInput instanceof Date) {
            if (isNaN(dateInput.getTime())) {
                return { date: null, isValid: false, error: 'Invalid Date object', rawInput: dateInput.toString() };
            }
            return { date: dateInput, isValid: true };
        }

        const inputStr = String(dateInput).trim();
        if (!inputStr || inputStr === 'null' || inputStr === 'undefined') {
            const result = { date: null, isValid: false, error: 'Date string is empty or null', rawInput: inputStr };
            logParsingError('date', 'date', inputStr, result.error, eventId, eventTitle);
            return result;
        }

        // Clean up common scraping artifacts
        let cleanedStr = inputStr
            .replace(/\s+/g, ' ') // Multiple spaces
            .replace(/[•·⋅\u2022\u22c5\u00b7]/g, '|') // Bullet points
            .split('|')[0] // Take first part
            .trim()
            .replace(/\s*-\s*/g, ' ') // Replace dashes with spaces
            .replace(/\s*at\s*$/i, '') // Remove trailing "at"
            .trim();

        // Strategy 1: Try native Date() first (fastest for standard formats)
        // Handle Z timezone (UTC) explicitly
        let cleanedForDate = cleanedStr;
        if (cleanedStr.endsWith('Z') && !cleanedStr.includes('T')) {
            // Fix malformed ISO strings like "2026-01-26T13:30:00.000Z"
            cleanedForDate = cleanedStr.replace(/\.\d{3}Z$/, 'Z');
        }
        
        let date = new Date(cleanedForDate);
        if (!isNaN(date.getTime()) && date.getFullYear() > 2000 && date.getFullYear() < 2100) {
            return { date, isValid: true, rawInput: inputStr };
        }

        // Strategy 2: Try parseISO for ISO 8601 formats
        try {
            const isoDate = parseISO(cleanedStr);
            if (isValid(isoDate)) {
                return { date: isoDate, isValid: true, rawInput: inputStr };
            }
        } catch {}

        // Strategy 3: Try date-fns parse with common formats
        const dateFnsFormats = [
            // ISO-like formats
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd'T'HH:mm",
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd HH:mm",
            "yyyy-MM-dd",
            
            // US formats
            "MM/dd/yyyy HH:mm",
            "MM/dd/yyyy",
            "M/d/yyyy HH:mm",
            "M/d/yyyy",
            
            // Text formats
            "MMMM dd, yyyy HH:mm",
            "MMMM dd, yyyy",
            "MMM dd, yyyy HH:mm",
            "MMM dd, yyyy",
            "MMM dd HH:mm",
            "MMM dd",
            
            // With timezone
            "yyyy-MM-dd'T'HH:mm:ssXXX",
            "yyyy-MM-dd'T'HH:mmXXX",
            
            // Common event formats
            "EEEE, MMMM dd, yyyy 'at' HH:mm",
            "EEEE, MMM dd, yyyy 'at' HH:mm",
            "MMMM dd, yyyy 'at' HH:mm a",
            "MMM dd, yyyy 'at' HH:mm a",
        ];

        for (const fmt of dateFnsFormats) {
            try {
                const parsed = parse(cleanedStr, fmt, new Date());
                if (isValid(parsed) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) {
                    return { date: parsed, isValid: true, rawInput: inputStr };
                }
            } catch {}
        }

        // Strategy 4: Try format variations with native Date
        const formatVariations = [
            // ISO 8601 variations
            cleanedStr.replace(/T/, ' ').replace(/Z$/, ''),
            cleanedStr.replace(/T/, ' ').replace(/Z$/, '') + ' EST',
            cleanedStr.replace(/T/, ' ').replace(/Z$/, '') + ' EDT',
            
            // Date format conversions
            cleanedStr.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1'), // YYYY-MM-DD to MM/DD/YYYY
            cleanedStr.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$1-$2'), // MM/DD/YYYY to YYYY-MM-DD
            
            // Add timezone if missing
            cleanedStr + ' EST',
            cleanedStr + ' EDT',
            cleanedStr + ' America/Toronto',
            
            // Remove common prefixes/suffixes
            cleanedStr.replace(/^(on|at|from)\s+/i, ''),
            cleanedStr.replace(/\s+(EST|EDT|PST|PDT|UTC|GMT)$/i, ''),
        ];

        for (const format of formatVariations) {
            date = new Date(format);
            if (!isNaN(date.getTime()) && date.getFullYear() > 2000 && date.getFullYear() < 2100) {
                return { date, isValid: true, rawInput: inputStr };
            }
        }

        // Strategy 5: Try parsing with current year if year is missing
        const yearLessPattern = /^([A-Za-z]{3,})\s+(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i;
        const yearLessMatch = cleanedStr.match(yearLessPattern);
        if (yearLessMatch) {
            const currentYear = new Date().getFullYear();
            const monthName = yearLessMatch[1];
            const day = yearLessMatch[2];
            const hour = yearLessMatch[3] || '12';
            const minute = yearLessMatch[4] || '00';
            const second = yearLessMatch[5] || '00';
            const ampm = yearLessMatch[6] || '';
            
            // Try with current year
            const withYear = `${monthName} ${day}, ${currentYear} ${hour}:${minute}:${second} ${ampm}`.trim();
            date = new Date(withYear);
            if (!isNaN(date.getTime())) {
                const now = new Date();
                // If date is more than 6 months in the past, try next year
                if (date.getTime() < now.getTime() - (1000 * 60 * 60 * 24 * 30 * 6)) {
                    const withNextYear = `${monthName} ${day}, ${currentYear + 1} ${hour}:${minute}:${second} ${ampm}`.trim();
                    const nextYearDate = new Date(withNextYear);
                    if (!isNaN(nextYearDate.getTime())) {
                        return { date: nextYearDate, isValid: true, rawInput: inputStr };
                    }
                }
                return { date, isValid: true, rawInput: inputStr };
            }
        }

        const result = { date: null, isValid: false, error: 'Could not parse date in any known format', rawInput: inputStr };
        logParsingError('date', 'date', inputStr, result.error);
        return result;
    } catch (error: any) {
        const result = { date: null, isValid: false, error: error.message || 'Unknown parsing error', rawInput: String(dateInput) };
        logParsingError('date', 'date', String(dateInput), result.error);
        return result;
    }
}

/**
 * Format date for display with Toronto timezone
 */
export function formatDateForDisplay(date: Date | null, options?: {
    includeTime?: boolean;
    includeYear?: boolean;
    timeZone?: string;
}): string {
    if (!date || isNaN(date.getTime())) {
        return 'Invalid Date';
    }

    const {
        includeTime = false,
        includeYear = false,
        timeZone = 'America/Toronto'
    } = options || {};

    try {
        const dateOptions: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            timeZone
        };

        if (includeYear) {
            dateOptions.year = 'numeric';
        }

        if (includeTime) {
            dateOptions.hour = 'numeric';
            dateOptions.minute = '2-digit';
        }

        return date.toLocaleDateString('en-US', dateOptions);
    } catch (error) {
        return 'Invalid Date';
    }
}

/**
 * Format time for display with Toronto timezone
 */
export function formatTimeForDisplay(date: Date | null, options?: {
    includeSeconds?: boolean;
    timeZone?: string;
}): string {
    if (!date || isNaN(date.getTime())) {
        return 'Invalid Time';
    }

    const {
        includeSeconds = false,
        timeZone = 'America/Toronto'
    } = options || {};

    try {
        const timeOptions: Intl.DateTimeFormatOptions = {
            hour: 'numeric',
            minute: '2-digit',
            timeZone
        };

        if (includeSeconds) {
            timeOptions.second = '2-digit';
        }

        return date.toLocaleTimeString('en-US', timeOptions);
    } catch (error) {
        return 'Invalid Time';
    }
}

/**
 * Get date parts (month, day, year) for display
 */
export function getDateParts(date: Date | null, timeZone: string = 'America/Toronto'): {
    month: string;
    day: string;
    year: string;
    isValid: boolean;
} {
    if (!date || isNaN(date.getTime())) {
        return { month: 'Invalid', day: 'Date', year: '', isValid: false };
    }

    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const parts = formatter.formatToParts(date);
        const partsMap: { [key: string]: string } = {};
        parts.forEach(p => partsMap[p.type] = p.value);

        return {
            month: partsMap.month || 'Invalid',
            day: partsMap.day || 'Date',
            year: partsMap.year || '',
            isValid: true
        };
    } catch (error) {
        return { month: 'Invalid', day: 'Date', year: '', isValid: false };
    }
}
