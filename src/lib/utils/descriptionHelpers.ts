/**
 * Description extraction and validation utilities
 * Ensures descriptions are properly extracted and formatted
 */

/**
 * Safely get a description with fallback
 */
export function safeGetDescription(
    description: string | undefined | null,
    fallback: string = 'Description not available. Please visit the event page for more details.'
): string {
    if (!description) {
        return fallback;
    }

    const desc = String(description).trim();
    
    if (desc === '' || desc === 'null' || desc === 'undefined') {
        return fallback;
    }

    // Remove excessive whitespace
    return desc.replace(/\s+/g, ' ').trim();
}

/**
 * Truncate description to a maximum length
 */
export function truncateDescription(
    description: string,
    maxLength: number = 200,
    suffix: string = '...'
): string {
    if (!description || description.length <= maxLength) {
        return description;
    }

    // Try to truncate at word boundary
    const truncated = description.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
        return truncated.substring(0, lastSpace) + suffix;
    }

    return truncated + suffix;
}

/**
 * Check if description is valid (not empty, not placeholder)
 */
export function isValidDescription(description: string | undefined | null): boolean {
    if (!description) {
        return false;
    }

    const desc = String(description).trim().toLowerCase();
    
    // Check for placeholder text
    const placeholders = [
        'no description',
        'no description available',
        'description coming soon',
        'tba',
        'tbd',
        'to be announced',
        'null',
        'undefined'
    ];

    return desc.length > 10 && !placeholders.some(p => desc.includes(p));
}
