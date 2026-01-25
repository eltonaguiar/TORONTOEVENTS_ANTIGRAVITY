import { Event, ScraperSource } from '../types';
import { EventbriteScraper } from './source-eventbrite';
import { AllEventsScraper } from './source-allevents';
import { getEvents, saveEvents } from '../data';
import { isMultiDay } from './utils';
import { MockScraper } from './source-mock';
import axios from 'axios';

// Register sources
const sources: ScraperSource[] = [
    new EventbriteScraper(),
    new AllEventsScraper(),
    // new MockScraper(),
    // Add other sources here
];

async function checkLinkStatus(url: string): Promise<boolean> {
    try {
        await axios.head(url, { timeout: 5000 });
        return true;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            return false;
        }
        // Consider other errors (timeouts) as temporary failures, so assume valid for now
        // to avoid deleting good events on flakey connection
        return true;
    }
}

export async function runScraper() {
    console.log('Starting scraper job...');

    // 1. Fetch fresh data
    let freshEvents: Event[] = [];
    for (const source of sources) {
        try {
            const result = await source.scrape();
            freshEvents = [...freshEvents, ...result.events];
            console.log(`Source ${source.name} returned ${result.events.length} events.`);
            if (result.errors.length > 0) {
                console.warn(`Source ${source.name} errors:`, result.errors);
            }
        } catch (e) {
            console.error(`Source ${source.name} failed hard:`, e);
        }
    }

    // 2. Load existing
    const existingEvents = getEvents();
    const existingMap = new Map(existingEvents.map(e => [e.id, e]));

    // 3. Merge & Diff
    const mergedEventsMap = new Map<string, Event>();

    // Process fresh events
    for (const fresh of freshEvents) {
        // Tag multi-day
        if (isMultiDay(fresh)) {
            if (!fresh.categories.includes('Multi-Day')) {
                fresh.categories.push('Multi-Day');
            }
        }

        if (existingMap.has(fresh.id)) {
            // Update existing
            const existing = existingMap.get(fresh.id)!;
            // Preserve some fields if needed, but usually fresh data wins
            // Except maybe 'status' if we manually set it to cancelled? 
            // Assuming scraper detects status better.
            mergedEventsMap.set(fresh.id, fresh);
        } else {
            // New event
            // Verify link first before adding?
            // Optional: const isValid = await checkLinkStatus(fresh.url);
            // For speed, maybe trust scraper, but verify later.
            mergedEventsMap.set(fresh.id, fresh);
        }
    }

    // 4. Handle Stale/Cancelled events
    // If an event was in existing but NOT in fresh...
    for (const [id, existing] of existingMap) {
        if (!mergedEventsMap.has(id)) {
            // It is missing from scrape. Is it cancelled? Or just page drifted?
            // Check date. If past, ignore (autoprune).
            if (new Date(existing.date) < new Date()) {
                continue; // Prune past events
            }

            // Check link status
            console.log(`Checking status for potentially removed event: ${existing.title}`);
            const isAlive = await checkLinkStatus(existing.url);

            if (!isAlive) {
                existing.status = 'CANCELLED';
                existing.lastUpdated = new Date().toISOString();
                mergedEventsMap.set(id, existing);
            } else {
                // Still alive but not on front page? Keep it but maybe mark "Unknown" or just keep as is?
                // We will keep it.
                mergedEventsMap.set(id, existing);
            }
        }
    }

    const finalEvents = Array.from(mergedEventsMap.values());

    // Sort by date
    finalEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    saveEvents(finalEvents);
    console.log(`Scrape complete. Saved ${finalEvents.length} events.`);
}
