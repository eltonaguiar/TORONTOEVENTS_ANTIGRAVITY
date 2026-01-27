/**
 * Event badge utilities
 * Determines which badges to show for events (New, Popular, Limited Tickets, etc.)
 */

import { Event } from '../types';

export interface EventBadge {
    type: 'sold-out' | 'cancelled' | 'moved' | 'free' | 'new' | 'popular' | 'limited' | 'gender-sold-out';
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

/**
 * Get all badges for an event
 */
export function getEventBadges(event: Event, allEvents: Event[] = []): EventBadge[] {
    const badges: EventBadge[] = [];

    // Status badges (highest priority)
    if (event.status === 'CANCELLED') {
        badges.push({
            type: 'cancelled',
            label: 'CANCELLED',
            color: 'text-red-400',
            bgColor: 'bg-red-600/30',
            borderColor: 'border-red-600'
        });
        return badges; // Don't show other badges if cancelled
    }

    if (event.status === 'MOVED') {
        badges.push({
            type: 'moved',
            label: '📍 Moved',
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-600/30',
            borderColor: 'border-yellow-600'
        });
    }

    // Sold out badges
    if (event.isSoldOut) {
        badges.push({
            type: 'sold-out',
            label: 'Sold Out',
            color: 'text-red-400',
            bgColor: 'bg-red-600',
            borderColor: 'border-red-600'
        });
    } else if (event.genderSoldOut && event.genderSoldOut !== 'none') {
        const genderLabel = event.genderSoldOut === 'both' 
            ? 'Tickets Sold Out' 
            : `${event.genderSoldOut.toUpperCase()} Tickets Sold Out`;
        badges.push({
            type: 'gender-sold-out',
            label: genderLabel,
            color: 'text-blue-400',
            bgColor: 'bg-blue-600',
            borderColor: 'border-blue-600'
        });
    }

    // Free event badge
    if (event.isFree) {
        badges.push({
            type: 'free',
            label: '🎉 Free Event',
            color: 'text-green-400',
            bgColor: 'bg-green-600/30',
            borderColor: 'border-green-600'
        });
    }

    // Limited tickets (if price is high or few ticket types available)
    if (isLimitedTickets(event)) {
        badges.push({
            type: 'limited',
            label: '⚠️ Limited Tickets',
            color: 'text-orange-400',
            bgColor: 'bg-orange-600/30',
            borderColor: 'border-orange-600'
        });
    }

    // New event (added in last 7 days)
    if (isNewEvent(event)) {
        badges.push({
            type: 'new',
            label: '✨ New',
            color: 'text-purple-400',
            bgColor: 'bg-purple-600/30',
            borderColor: 'border-purple-600'
        });
    }

    // Popular event (based on price, description length, or other heuristics)
    if (isPopularEvent(event, allEvents)) {
        badges.push({
            type: 'popular',
            label: '🔥 Popular',
            color: 'text-red-400',
            bgColor: 'bg-red-600/30',
            borderColor: 'border-red-600'
        });
    }

    return badges;
}

/**
 * Check if event has limited tickets
 */
function isLimitedTickets(event: Event): boolean {
    // High price might indicate limited availability
    if (event.priceAmount && event.priceAmount > 150) {
        return true;
    }

    // Few ticket types might indicate limited options
    if (event.ticketTypes && event.ticketTypes.length > 0 && event.ticketTypes.length <= 2) {
        // Check if any ticket type is sold out
        const hasSoldOutType = event.ticketTypes.some(t => t.soldOut);
        if (hasSoldOutType) {
            return true;
        }
    }

    // Check title/description for "limited" keywords
    const text = (event.title + ' ' + (event.description || '')).toLowerCase();
    const limitedKeywords = ['limited', 'few spots', 'almost sold out', 'last chance'];
    return limitedKeywords.some(keyword => text.includes(keyword));
}

/**
 * Check if event is new (added recently)
 */
function isNewEvent(event: Event): boolean {
    if (!event.lastUpdated) return false;

    try {
        const lastUpdated = new Date(event.lastUpdated);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        
        // Consider "new" if added in last 7 days
        return daysSinceUpdate <= 7;
    } catch {
        return false;
    }
}

/**
 * Check if event is popular (heuristic based on multiple factors)
 */
function isPopularEvent(event: Event, allEvents: Event[]): boolean {
    // High price might indicate popularity
    if (event.priceAmount && event.priceAmount > 100) {
        return true;
    }

    // Long description might indicate well-promoted event
    if (event.description && event.description.length > 500) {
        return true;
    }

    // Multiple ticket types might indicate popular event
    if (event.ticketTypes && event.ticketTypes.length > 3) {
        return true;
    }

    // Check if event is in a popular category
    const popularCategories = ['Music', 'Food & Drink', 'Networking', 'Tech'];
    if (event.categories.some(cat => popularCategories.includes(cat))) {
        return true;
    }

    // Check title/description for popularity indicators
    const text = (event.title + ' ' + (event.description || '')).toLowerCase();
    const popularKeywords = ['sold out', 'popular', 'trending', 'bestseller', 'featured'];
    return popularKeywords.some(keyword => text.includes(keyword));
}
