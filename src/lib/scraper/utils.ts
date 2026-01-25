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

export function normalizeDate(dateStr: string): string | null {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
    } catch {
        return null;
    }
}
