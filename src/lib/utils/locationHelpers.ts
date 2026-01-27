/**
 * Location formatting and validation utilities
 * Standardizes location display and handles missing/incomplete locations
 */

import { Event } from '../types';

/**
 * Format location for display
 * Handles missing locations, incomplete addresses, and online events
 */
export function formatLocation(event: Event): string {
    // Check if it's an online event
    if (event.locationDetails?.isOnline) {
        const platform = event.locationDetails.onlinePlatform;
        if (platform) {
            return `Online (${platform})`;
        }
        return 'Online Event';
    }

    // Use locationDetails if available (more complete)
    if (event.locationDetails) {
        const { venue, address, city, province } = event.locationDetails;
        
        // Build full address
        const parts: string[] = [];
        if (venue) parts.push(venue);
        if (address) parts.push(address);
        if (city) parts.push(city);
        if (province) parts.push(province);
        
        if (parts.length > 0) {
            return parts.join(', ');
        }
    }

    // Fallback to location field
    if (event.location) {
        const loc = event.location.trim();
        
        // Check if it's just "Toronto" or too generic
        if (loc.toLowerCase() === 'toronto' || loc.toLowerCase() === 'toronto, on') {
            return 'Toronto, ON (Location TBA)';
        }
        
        // If location seems incomplete (too short or missing key info)
        if (loc.length < 10 || (!loc.includes(',') && !loc.includes('Street') && !loc.includes('Avenue') && !loc.includes('Road'))) {
            return `${loc} (Location TBA)`;
        }
        
        return loc;
    }

    // Default fallback
    return 'Location TBA';
}

/**
 * Get short location (city only or venue name)
 */
export function getShortLocation(event: Event): string {
    if (event.locationDetails?.isOnline) {
        return 'Online';
    }

    if (event.locationDetails?.city) {
        return event.locationDetails.city;
    }

    if (event.locationDetails?.venue) {
        return event.locationDetails.venue;
    }

    // Extract city from location string
    const location = event.location || '';
    const cityMatch = location.match(/([A-Za-z\s]+),?\s*(ON|Ontario)/i);
    if (cityMatch) {
        return cityMatch[1].trim();
    }

    return 'Toronto';
}

/**
 * Check if location is complete (has address details)
 */
export function isLocationComplete(event: Event): boolean {
    if (event.locationDetails?.isOnline) {
        return true; // Online events are considered "complete"
    }

    if (event.locationDetails) {
        const { address, city } = event.locationDetails;
        return !!(address && city);
    }

    const location = event.location || '';
    // Check if it has more than just "Toronto"
    return location.length > 15 && (location.includes('Street') || location.includes('Avenue') || location.includes('Road') || location.includes(','));
}
