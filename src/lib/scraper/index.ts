import { Event, ScraperSource } from '../types';
import { EventbriteScraper } from './source-eventbrite';
import { AllEventsScraper } from './source-allevents';
import { getEvents, saveEvents } from '../data';
import { isMultiDay } from './utils';
import { MockScraper } from './source-mock';
import { shouldIncludeEvent } from '../quality/score';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

import { ShowpassScraper } from './source-showpass';
import { FatsomaScraper } from './source-fatsoma';

// Register sources
const sources: ScraperSource[] = [
    new EventbriteScraper(),
    new AllEventsScraper(),
    new ShowpassScraper(),
    new FatsomaScraper(),
];

async function checkLinkStatus(url: string): Promise<boolean> {
    try {
        await axios.head(url, { timeout: 5000 });
        return true;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            return false;
        }
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

    console.log(`TOTAL FRESH EVENTS COLLECTED: ${freshEvents.length}`);

    // 2. Load existing
    const existingEvents = getEvents();
    const existingMap = new Map(existingEvents.map(e => [e.id, e]));

    // 3. Merge & Filter with quality gates
    const mergedEventsMap = new Map<string, Event>();

    // Process fresh events with quality checks
    for (const fresh of freshEvents) {
        // QUALITY GATE: Skip past or low-quality events
        if (!shouldIncludeEvent(fresh)) {
            console.log(`Skipping low-quality/past event from ${fresh.source}: ${fresh.title}`);
            continue;
        }

        // Tag multi-day
        if (isMultiDay(fresh)) {
            if (!fresh.categories.includes('Multi-Day')) {
                fresh.categories.push('Multi-Day');
            }
        }

        // Deduplicate categories
        fresh.categories = Array.from(new Set(fresh.categories));

        if (existingMap.has(fresh.id)) {
            // Update existing
            mergedEventsMap.set(fresh.id, fresh);
        } else {
            // New event
            mergedEventsMap.set(fresh.id, fresh);
        }
    }

    // 4. Handle Stale/Cancelled events
    for (const [id, existing] of existingMap) {
        if (!mergedEventsMap.has(id)) {
            // Verify it still meets quality/date standards (auto-prune past)
            if (!shouldIncludeEvent(existing)) {
                console.log(`Pruning past or low-quality existing event: ${existing.title}`);
                continue;
            }

            // Check link status
            console.log(`Checking status for potentially removed event: ${existing.title}`);
            const isAlive = await checkLinkStatus(existing.url);

            if (!isAlive) {
                existing.status = 'CANCELLED';
                existing.lastUpdated = new Date().toISOString();
                mergedEventsMap.set(id, existing);
            } else {
                mergedEventsMap.set(id, existing);
            }
        }
    }

    const finalEvents = Array.from(mergedEventsMap.values());

    // Sort by date
    finalEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Save metadata about scrape job
    const metadata = {
        lastUpdated: new Date().toISOString(),
        totalEvents: finalEvents.length,
        sources: sources.map(s => s.name)
    };

    const DATA_DIR = path.join(process.cwd(), 'data');
    fs.writeFileSync(
        path.join(DATA_DIR, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
    );

    saveEvents(finalEvents);
    console.log(`Scrape complete. Saved ${finalEvents.length} events.`);
}
