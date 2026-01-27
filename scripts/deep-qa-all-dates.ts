/**
 * Deep QA: Verify ALL event dates match their source web pages
 * This ensures 100% accuracy
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { normalizeDate, extractDateFromPage } from '../src/lib/scraper/utils';

interface QAResult {
    eventId: string;
    title: string;
    url: string;
    source: string;
    storedDate: string;
    webPageDate: string | null;
    match: boolean;
    error?: string;
    needsFix: boolean;
}

async function verifyEventDate(event: Event): Promise<QAResult> {
    const result: QAResult = {
        eventId: event.id,
        title: event.title,
        url: event.url,
        source: event.source,
        storedDate: event.date,
        webPageDate: null,
        match: false,
        needsFix: false
    };

    try {
        // Skip invalid URLs
        if (!event.url || event.url.includes('forms.gle') || event.url.includes('google.com/forms')) {
            return result;
        }

        const response = await axios.get(event.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const dateResult = await extractDateFromPage($, true);

        if (dateResult.isTBD) {
            result.error = 'Event has TBD date on page';
            result.needsFix = true;
            return result;
        }

        if (!dateResult.date) {
            result.error = 'Could not extract date from page';
            result.needsFix = true;
            return result;
        }

        result.webPageDate = dateResult.date;

        // Compare dates (same day in Toronto timezone)
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

        result.match = storedParts === webParts;

        if (!result.match) {
            result.needsFix = true;
        }

    } catch (error: any) {
        result.error = error.message;
        result.needsFix = true;
    }

    return result;
}

async function deepQA(): Promise<void> {
    console.log('🔍 DEEP QA: Verifying ALL event dates match source web pages...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const results: QAResult[] = [];
    let matchCount = 0;
    let mismatchCount = 0;
    let errorCount = 0;

    console.log(`Total events to verify: ${events.length}\n`);

    // Process in batches
    const batchSize = 5;
    for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(events.length / batchSize);
        
        console.log(`Processing batch ${batchNum}/${totalBatches} (events ${i + 1}-${Math.min(i + batchSize, events.length)})...`);

        for (const event of batch) {
            const result = await verifyEventDate(event);
            results.push(result);

            if (result.match) {
                matchCount++;
            } else if (result.error) {
                errorCount++;
            } else {
                mismatchCount++;
                console.log(`  ❌ MISMATCH: ${event.title.substring(0, 50)}`);
                console.log(`     Stored: ${new Date(result.storedDate).toLocaleString('en-US', {timeZone: 'America/Toronto'})}`);
                if (result.webPageDate) {
                    console.log(`     Web: ${new Date(result.webPageDate).toLocaleString('en-US', {timeZone: 'America/Toronto'})}`);
                }
            }

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Longer delay between batches
        if (i + batchSize < events.length) {
            console.log('  Waiting 2 seconds...\n');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Fix mismatches
    const eventsToFix = results.filter(r => r.needsFix && r.webPageDate);
    console.log(`\n\n🔧 Fixing ${eventsToFix.length} events with date mismatches...\n`);

    for (const result of eventsToFix) {
        if (result.webPageDate) {
            const event = events.find(e => e.id === result.eventId);
            if (event) {
                const oldDate = event.date;
                event.date = result.webPageDate;
                event.lastUpdated = new Date().toISOString();
                console.log(`  ✅ Fixed: ${event.title.substring(0, 50)}`);
                console.log(`     ${oldDate} → ${result.webPageDate}`);
            }
        }
    }

    // Save updated events
    writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    console.log(`\n\n📊 QA RESULTS:`);
    console.log(`  Total events: ${events.length}`);
    console.log(`  ✅ Matches: ${matchCount}`);
    console.log(`  ❌ Mismatches: ${mismatchCount}`);
    console.log(`  ⚠️  Errors: ${errorCount}`);
    console.log(`  🔧 Fixed: ${eventsToFix.length}`);

    // Save QA report
    const reportPath = join(process.cwd(), 'deep-qa-report.json');
    writeFileSync(reportPath, JSON.stringify({
        summary: {
            total: events.length,
            matches: matchCount,
            mismatches: mismatchCount,
            errors: errorCount,
            fixed: eventsToFix.length
        },
        mismatches: results.filter(r => r.needsFix)
    }, null, 2));
    console.log(`\n📄 QA report saved to: ${reportPath}`);
}

deepQA().catch(console.error);
