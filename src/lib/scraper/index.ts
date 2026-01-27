import { Event, ScraperSource } from '../types';
import { EventbriteScraper } from './source-eventbrite';
import { AllEventsScraper } from './source-allevents';
import { getEvents, saveEvents } from '../data';
import { isMultiDay, consolidateEvents } from './utils';
import { maximizeCategory } from '../quality/filters';
import { MockScraper } from './source-mock';
import { shouldIncludeEvent } from '../quality/score';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

import { ShowpassScraper } from './source-showpass';
import { FatsomaScraper } from './source-fatsoma';
import { CitySwoonScraper } from './source-cityswoon';
import { TwentyFiveDatesScraper } from './source-25dates';
import { ThursdayScraper } from './source-thursday';
import { TorontoDatingHubScraper } from './source-torontodatinghub';
import { WaterworksScraper } from './source-waterworks';
import { BlogTOScraper } from './source-blogto';
import { NarcityScraper } from './source-narcity';
import { FlareEventsScraper } from './source-flare';

// Register sources
const sources: ScraperSource[] = [
    new EventbriteScraper(),
    new AllEventsScraper(),
    new ShowpassScraper(),
    new FatsomaScraper(),
    new CitySwoonScraper(),
    new TwentyFiveDatesScraper(),
    new ThursdayScraper(),
    new TorontoDatingHubScraper(),
    new WaterworksScraper(),
    new BlogTOScraper(),
    new NarcityScraper(),
    new FlareEventsScraper(),
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

        // Standardize categories
        const originalCategories = Array.from(new Set(fresh.categories));
        fresh.tags = originalCategories; // Store original tags
        fresh.categories = maximizeCategory(originalCategories); // Map to high-level

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
            
            // CRITICAL: Re-check expensive events - prices might have been updated
            // This catches events that were previously missing prices but now have them
            if (existing.priceAmount !== undefined && existing.priceAmount > 150) {
                console.log(`Pruning expensive existing event: ${existing.title} ($${existing.priceAmount})`);
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

    let finalEvents = Array.from(mergedEventsMap.values());
    console.log(`Before consolidation: ${finalEvents.length} events`);
    finalEvents = consolidateEvents(finalEvents);
    console.log(`After consolidation: ${finalEvents.length} events`);

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
