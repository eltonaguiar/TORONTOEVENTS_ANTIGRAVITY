/**
 * Event sorting utilities
 * Provides various sorting options for events
 */

import { Event } from '../types';
import { safeParseDate } from './dateHelpers';
import { safeParsePrice } from './priceHelpers';

export type SortOption = 
    | 'date-asc' 
    | 'date-desc' 
    | 'price-asc' 
    | 'price-desc' 
    | 'title-asc' 
    | 'title-desc'
    | 'popularity';

/**
 * Sort events based on the selected option
 */
export function sortEvents(events: Event[], sortOption: SortOption): Event[] {
    const sorted = [...events];

    switch (sortOption) {
        case 'date-asc':
            sorted.sort((a, b) => {
                const dateA = safeParseDate(a.date).date;
                const dateB = safeParseDate(b.date).date;
                if (!dateA || !dateB) return 0;
                return dateA.getTime() - dateB.getTime();
            });
            break;

        case 'date-desc':
            sorted.sort((a, b) => {
                const dateA = safeParseDate(a.date).date;
                const dateB = safeParseDate(b.date).date;
                if (!dateA || !dateB) return 0;
                return dateB.getTime() - dateA.getTime();
            });
            break;

        case 'price-asc':
            sorted.sort((a, b) => {
                const priceA = safeParsePrice(a.price, a.priceAmount).priceAmount || Infinity;
                const priceB = safeParsePrice(b.price, b.priceAmount).priceAmount || Infinity;
                return priceA - priceB;
            });
            break;

        case 'price-desc':
            sorted.sort((a, b) => {
                const priceA = safeParsePrice(a.price, a.priceAmount).priceAmount || -Infinity;
                const priceB = safeParsePrice(b.price, b.priceAmount).priceAmount || -Infinity;
                return priceB - priceA;
            });
            break;

        case 'title-asc':
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;

        case 'title-desc':
            sorted.sort((a, b) => b.title.localeCompare(a.title));
            break;

        case 'popularity':
            // Sort by: has price > has description > has image > date
            sorted.sort((a, b) => {
                const scoreA = getPopularityScore(a);
                const scoreB = getPopularityScore(b);
                return scoreB - scoreA;
            });
            break;

        default:
            // Default: date ascending
            sorted.sort((a, b) => {
                const dateA = safeParseDate(a.date).date;
                const dateB = safeParseDate(b.date).date;
                if (!dateA || !dateB) return 0;
                return dateA.getTime() - dateB.getTime();
            });
    }

    return sorted;
}

/**
 * Calculate popularity score for an event
 */
function getPopularityScore(event: Event): number {
    let score = 0;

    // Has price (more complete data)
    if (event.priceAmount) score += 10;
    if (event.price && event.price !== 'See tickets') score += 5;

    // Has description
    if (event.description && event.description.length > 100) score += 10;
    if (event.description && event.description.length > 500) score += 5;

    // Has image
    if (event.image) score += 5;

    // Has location details
    if (event.locationDetails) score += 5;

    // Has ticket types
    if (event.ticketTypes && event.ticketTypes.length > 0) score += 5;

    // Free events get bonus
    if (event.isFree) score += 3;

    // Not sold out
    if (!event.isSoldOut) score += 2;

    return score;
}
