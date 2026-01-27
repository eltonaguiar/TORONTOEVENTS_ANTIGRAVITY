/**
 * Price parsing and validation utilities
 * Handles multiple price formats and provides safe fallbacks
 */

import { logParsingError } from './errorLogger';

export interface PriceParseResult {
    price: string;
    priceAmount: number | undefined;
    isValid: boolean;
    error?: string;
    rawInput?: string;
}

/**
 * Safely parse and format a price
 */
export function safeParsePrice(
    priceInput: string | number | undefined | null,
    priceAmount?: number | undefined,
    eventId?: string,
    eventTitle?: string
): PriceParseResult {
    // If priceAmount is already provided and valid, use it
    if (priceAmount !== undefined && !isNaN(priceAmount) && priceAmount >= 0) {
        return {
            price: formatPrice(priceAmount),
            priceAmount,
            isValid: true
        };
    }

    // If no input, return default
    if (!priceInput && priceInput !== 0) {
        return {
            price: 'See tickets',
            priceAmount: undefined,
            isValid: false,
            error: 'Price input is empty'
        };
    }

    try {
        // If it's already a number
        if (typeof priceInput === 'number') {
            if (isNaN(priceInput) || priceInput < 0) {
                return {
                    price: 'See tickets',
                    priceAmount: undefined,
                    isValid: false,
                    error: 'Invalid price number',
                    rawInput: String(priceInput)
                };
            }
            return {
                price: formatPrice(priceInput),
                priceAmount: priceInput,
                isValid: true
            };
        }

        const priceStr = String(priceInput).trim();

        // Check for "Free"
        if (priceStr.toLowerCase() === 'free' || priceStr.toLowerCase().includes('free')) {
            return {
                price: 'Free',
                priceAmount: 0,
                isValid: true
            };
        }

        // Check for "See tickets" or similar
        if (priceStr.toLowerCase().includes('see') || 
            priceStr.toLowerCase().includes('tba') ||
            priceStr.toLowerCase().includes('tbd') ||
            priceStr === '' ||
            priceStr === 'null' ||
            priceStr === 'undefined') {
            return {
                price: 'See tickets',
                priceAmount: undefined,
                isValid: false,
                error: 'Price not available',
                rawInput: priceStr
            };
        }

        // Extract number from string (handles CA$, CAD, C$, $, etc.)
        const priceMatch = priceStr.match(/(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i);
        if (priceMatch && priceMatch[1]) {
            const amount = parseFloat(priceMatch[1]);
            if (!isNaN(amount) && amount >= 0 && amount < 1000000) {
                return {
                    price: formatPrice(amount),
                    priceAmount: amount,
                    isValid: true,
                    rawInput: priceStr
                };
            }
        }

        // Try to parse as-is
        const directParse = parseFloat(priceStr.replace(/[^\d.]/g, ''));
        if (!isNaN(directParse) && directParse >= 0 && directParse < 1000000) {
            return {
                price: formatPrice(directParse),
                priceAmount: directParse,
                isValid: true,
                rawInput: priceStr
            };
        }

        const result = {
            price: 'See tickets',
            priceAmount: undefined,
            isValid: false,
            error: 'Could not parse price',
            rawInput: priceStr
        };
        logParsingError('price', 'price', priceStr, result.error, eventId, eventTitle);
        return result;
    } catch (error: any) {
        const result = {
            price: 'See tickets',
            priceAmount: undefined,
            isValid: false,
            error: error.message || 'Unknown parsing error',
            rawInput: String(priceInput)
        };
        logParsingError('price', 'price', String(priceInput), result.error, eventId, eventTitle);
        return result;
    }
}

/**
 * Format a price amount as a display string
 */
export function formatPrice(amount: number | undefined | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return 'See tickets';
    }

    if (amount === 0) {
        return 'Free';
    }

    // Format with 2 decimal places if needed
    const formatted = amount % 1 === 0 
        ? amount.toString() 
        : amount.toFixed(2);

    return `$${formatted}`;
}

/**
 * Format a price range
 */
export function formatPriceRange(
    minPrice: number | undefined,
    maxPrice: number | undefined
): string {
    if (minPrice === undefined && maxPrice === undefined) {
        return 'See tickets';
    }

    if (minPrice === undefined) {
        return formatPrice(maxPrice);
    }

    if (maxPrice === undefined || minPrice === maxPrice) {
        return formatPrice(minPrice);
    }

    return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
}

/**
 * Validate price is within reasonable range
 */
export function isValidPrice(price: number | undefined | null): boolean {
    if (price === undefined || price === null || isNaN(price)) {
        return false;
    }

    return price >= 0 && price < 1000000; // Reasonable upper limit
}
