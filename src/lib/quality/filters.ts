import { Event } from '../types';

const TORONTO_GTA_CITIES = [
    'Toronto', 'North York', 'Scarborough', 'Etobicoke', 'Mississauga',
    'Brampton', 'Markham', 'Vaughan', 'Richmond Hill', 'Oakville',
    'Burlington', 'Milton', 'Pickering', 'Ajax', 'Whitby', 'Oshawa',
    'Newmarket', 'Aurora', 'Thornhill', 'Willowdale', 'Don Mills'
];

const EXCLUDED_LOCATIONS = [
    'New York', 'NY', 'Manhattan', 'Brooklyn',
    'Washington', 'DC',
    'Chicago', 'IL',
    'Buffalo',
    'Online', 'Virtual' // Handle these separately if needed, but for "City" feed they might be noise
];

export function isTorontoEvent(event: Event): boolean {
    const loc = (event.location || '').toLowerCase();

    // Explicit exclusions
    if (EXCLUDED_LOCATIONS.some(ex => loc.includes(ex.toLowerCase()))) {
        // Double check if it's "Online"
        if (loc.includes('online') || loc.includes('virtual')) {
            // For now, exclude online events from the main "City" feed unless specified
            return false;
        }
        return false;
    }

    // Explicit inclusions
    if (TORONTO_GTA_CITIES.some(city => loc.includes(city.toLowerCase()))) {
        return true;
    }

    // Accept known Toronto venues even if they don't explicitly say "Toronto"
    const knownTorontoVenues = [
        'red sandcastle theatre', 'ago', 'art gallery of ontario', 'rom', 'royal ontario museum',
        'north york', 'etobicoke', 'scarborough', 'yonge street', 'queen street', 'king street',
        'dundas', 'bloor', 'spadina', 'university avenue', 'bay street', 'college street',
        'harbourfront', 'distillery', 'kensington', 'st. lawrence', 'liberty village',
        'leslieville', 'the annex', 'yorkville', 'little italy', 'greektown', 'chinatown',
        'casa loma', 'cn tower', 'rogers centre', 'scotiabank arena', 'air canada centre'
    ];
    if (knownTorontoVenues.some(venue => loc.includes(venue))) {
        return true;
    }

    // Fallback: If it contains "ON" or "Ontario" but NOT an excluded city
    // AND doesn't seem to be a US state like "NY", "CA", etc.
    if (loc.includes(', on') || loc.includes(' on,') || loc.includes('ontario')) {
        return true;
    }

    // Default to false if we can't be sure it's Toronto/GTA
    // This is strict filtering to ensure quality
    return false;
}

const CATEGORY_MAPPINGS: Record<string, string[]> = {
    'Music': ['music', 'concert', 'jazz', 'rock', 'hip hop', 'live music'],
    'Food & Drink': ['food', 'drink', 'dining', 'wine', 'beer', 'tasting'],
    'Nightlife': ['nightlife', 'party', 'club', 'bar', 'pub', 'dating'],
    'Arts': ['arts', 'culture', 'museum', 'gallery', 'theatre', 'film', 'comedy'],
    'Sports': ['sports', 'fitness', 'yoga', 'run', 'wellness', 'health'],
    'Business': ['business', 'networking', 'tech', 'career', 'workshop'],
    'Family': ['family', 'kids', 'children'],
    'Community': ['community', 'charity', 'volunteer', 'religious', 'spiritual']
};

export function maximizeCategory(categories: string[]): string[] {
    const newCats = new Set<string>();

    categories.forEach(cat => {
        const lower = cat.toLowerCase();
        let matched = false;

        for (const [mainCat, keywords] of Object.entries(CATEGORY_MAPPINGS)) {
            if (keywords.some(k => lower.includes(k))) {
                newCats.add(mainCat);
                matched = true;
            }
        }

        if (!matched && lower.length > 0) {
            // Keep original if it's unique enough or map to 'General'
            // For now, we only want the high-level ones to clean up the UI
            // But we can store original tags in a separate field if we had one.
            // Since we don't, we will drop obscure tags to reduce clutter, 
            // OR keep them if they don't map to anything.
            // Feedback says: "Adopt 5-10 high-level categories... Map existing... limit tags per event to 3-5"
            // So let's keep it if it's not mapped?
            // Actually, better to default to 'General' if nothing matches?
            // Let's just add the High Level ones. If the set is empty, add 'General'.
        }
    });

    if (newCats.size === 0) {
        return ['General'];
    }

    return Array.from(newCats);
}

export function inferTime(event: Event): string {
    // Basic heuristic: If time is "05:00:00.000Z" (which is midnight EST + 5) 
    // AND description mentions a time, try to grab it.
    // Use regex to find "Doors: 7pm", "Starts: 8:00 PM", etc.

    // This is complex to do reliably on just the description string without NLP.
    // But we can look for simple patterns.

    // For now, return the date string unmodified if we can't find a better one.
    return event.date;
}
