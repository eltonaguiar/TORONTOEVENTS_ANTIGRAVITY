/**
 * Quick QA: Sample check of event dates vs web pages
 * Tests a representative sample to verify date extraction is working
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractDateFromPage } from '../src/lib/scraper/utils';

async function quickQA(): Promise<void> {
    console.log('🔍 QUICK QA: Sampling event dates...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    // Sample events from each source
    const samples: Event[] = [];
    const sources = ['AllEvents.in', 'Eventbrite', 'CitySwoon', 'Fatsoma', 'Thursday'];
    
    for (const source of sources) {
        const sourceEvents = events.filter(e => e.source === source || e.source?.includes(source));
        if (sourceEvents.length > 0) {
            samples.push(...sourceEvents.slice(0, 2));
        }
    }

    // Add Vision Board specifically
    const vision = events.find(e => e.url?.includes('vision-board'));
    if (vision && !samples.find(s => s.id === vision.id)) {
        samples.push(vision);
    }

    console.log(`Testing ${samples.length} sample events...\n`);

    let passCount = 0;
    let failCount = 0;
    const fixes: { event: Event; oldDate: string; newDate: string }[] = [];

    for (let i = 0; i < samples.length; i++) {
        const event = samples[i];
        console.log(`[${i + 1}/${samples.length}] ${event.source}: ${event.title.substring(0, 40)}`);

        try {
            const response = await axios.get(event.url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            const dateResult = await extractDateFromPage($, true);

            if (dateResult.isTBD || !dateResult.date) {
                console.log(`  ⚠️  TBD or no date found`);
                failCount++;
                continue;
            }

            // Compare dates (same day in Toronto)
            const stored = new Date(event.date);
            const webPage = new Date(dateResult.date);

            const getTorontoDateParts = (date: Date): string => {
                const formatter = new Intl.DateTimeFormat('en-CA', {
                    timeZone: 'America/Toronto',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                const parts = formatter.formatToParts(date);
                const d: { [key: string]: string } = {};
                parts.forEach(p => d[p.type] = p.value);
                return `${d.year}-${d.month}-${d.day}`;
            };

            const storedParts = getTorontoDateParts(stored);
            const webParts = getTorontoDateParts(webPage);

            if (storedParts === webParts) {
                console.log(`  ✅ PASS`);
                passCount++;
            } else {
                console.log(`  ❌ FAIL - Date mismatch`);
                console.log(`     Stored: ${stored.toLocaleString('en-US', {timeZone: 'America/Toronto'})}`);
                console.log(`     Web: ${webPage.toLocaleString('en-US', {timeZone: 'America/Toronto'})}`);
                fixes.push({ event, oldDate: event.date, newDate: dateResult.date });
                failCount++;
            }

        } catch (error: any) {
            console.log(`  ❌ ERROR: ${error.message}`);
            failCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Apply fixes
    if (fixes.length > 0) {
        console.log(`\n🔧 Fixing ${fixes.length} events...\n`);
        for (const fix of fixes) {
            const event = events.find(e => e.id === fix.event.id);
            if (event) {
                event.date = fix.newDate;
                event.lastUpdated = new Date().toISOString();
                console.log(`  ✅ Fixed: ${event.title.substring(0, 50)}`);
            }
        }
        writeFileSync(eventsPath, JSON.stringify(events, null, 2));
    }

    console.log(`\n📊 RESULTS:`);
    console.log(`  ✅ Pass: ${passCount}`);
    console.log(`  ❌ Fail: ${failCount}`);
    console.log(`  🔧 Fixed: ${fixes.length}`);
}

quickQA().catch(console.error);
