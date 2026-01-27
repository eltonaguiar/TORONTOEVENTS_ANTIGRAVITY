/**
 * Re-verify all events by fetching detail pages and extracting accurate dates/times
 * This ensures dates and times are correctly captured from source pages
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { normalizeDate } from '../src/lib/scraper/utils';

interface VerificationResult {
    eventId: string;
    title: string;
    url: string;
    oldDate: string;
    newDate: string | null;
    oldLocation: string;
    newLocation: string | null;
    fixed: boolean;
    error?: string;
}

async function extractDateFromPage(url: string): Promise<{ date: string | null; location: string | null }> {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        let date: string | null = null;
        let location: string | null = null;

        // Try JSON-LD first (most reliable)
        const ldScript = $('script[type="application/ld+json"]').html();
        if (ldScript) {
            try {
                const data = JSON.parse(ldScript);
                const items = Array.isArray(data) ? data : [data];
                const eventData = items.find((i: any) => 
                    i['@type'] === 'Event' || 
                    (Array.isArray(i['@type']) && i['@type'].includes('Event'))
                );
                
                if (eventData) {
                    if (eventData.startDate) {
                        date = normalizeDate(eventData.startDate);
                    }
                    if (eventData.location) {
                        if (typeof eventData.location === 'string') {
                            location = eventData.location;
                        } else if (eventData.location.name) {
                            location = eventData.location.name;
                            if (eventData.location.address) {
                                const addr = typeof eventData.location.address === 'string' 
                                    ? eventData.location.address 
                                    : eventData.location.address.streetAddress || '';
                                if (addr) {
                                    location = `${location}, ${addr}`;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // JSON parsing failed
            }
        }

        // Fallback: Try HTML selectors
        if (!date) {
            const dateStr = $('[itemprop="startDate"]').attr('content') ||
                $('.event-date').text() ||
                $('.date-time').text() ||
                $('time[datetime]').attr('datetime') ||
                $('.highlights').text().match(/[A-Za-z]{3},\s+\d+\s+[A-Za-z]{3},\s+\d{4}\s+at\s+\d{2}:\d{2}/)?.[0];
            
            if (dateStr) {
                date = normalizeDate(dateStr);
            }
        }

        // Fallback: Try location from HTML
        if (!location) {
            const locationStr = $('[itemprop="location"]').text() ||
                $('.venue').text() ||
                $('.event-location').text() ||
                $('.location').text();
            
            if (locationStr && locationStr.trim().length > 5) {
                location = locationStr.trim();
            }
        }

        return { date, location };
    } catch (error: any) {
        return { date: null, location: null };
    }
}

async function verifyAllEvents(): Promise<void> {
    console.log('🔍 Re-verifying all events by fetching detail pages...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const results: VerificationResult[] = [];
    let fixedCount = 0;
    let errorCount = 0;

    // Process events in batches to avoid overwhelming servers
    const batchSize = 10;
    for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)} (events ${i + 1}-${Math.min(i + batchSize, events.length)})...`);

        for (const event of batch) {
            try {
                // Skip if URL is invalid
                if (!event.url || event.url.includes('forms.gle') || event.url.includes('google.com/forms')) {
                    continue;
                }

                const extracted = await extractDateFromPage(event.url);
                
                let fixed = false;
                let newDate = event.date;
                let newLocation = event.location;

                // Check if date needs updating
                if (extracted.date && extracted.date !== event.date) {
                    const oldDate = new Date(event.date);
                    const newDateObj = new Date(extracted.date);
                    
                    // Only update if dates are significantly different (more than 1 hour)
                    const timeDiff = Math.abs(newDateObj.getTime() - oldDate.getTime());
                    if (timeDiff > 60 * 60 * 1000) {
                        newDate = extracted.date;
                        fixed = true;
                    }
                }

                // Check if location needs updating
                if (extracted.location && 
                    extracted.location !== event.location &&
                    extracted.location.length > 10 &&
                    !event.location?.includes(extracted.location)) {
                    newLocation = extracted.location;
                    fixed = true;
                }

                if (fixed) {
                    event.date = newDate;
                    if (newLocation) {
                        event.location = newLocation;
                    }
                    event.lastUpdated = new Date().toISOString();
                    fixedCount++;

                    results.push({
                        eventId: event.id,
                        title: event.title,
                        url: event.url,
                        oldDate: event.date,
                        newDate: newDate,
                        oldLocation: event.location,
                        newLocation: newLocation,
                        fixed: true
                    });

                    console.log(`  ✅ Fixed: ${event.title.substring(0, 50)}`);
                    if (newDate !== event.date) {
                        const oldD = new Date(event.date);
                        const newD = new Date(newDate);
                        console.log(`     Date: ${oldD.toLocaleString('en-US', {timeZone: 'America/Toronto'})} → ${newD.toLocaleString('en-US', {timeZone: 'America/Toronto'})}`);
                    }
                    if (newLocation && newLocation !== event.location) {
                        console.log(`     Location: ${event.location} → ${newLocation}`);
                    }
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error: any) {
                errorCount++;
                results.push({
                    eventId: event.id,
                    title: event.title,
                    url: event.url,
                    oldDate: event.date,
                    newDate: null,
                    oldLocation: event.location,
                    newLocation: null,
                    fixed: false,
                    error: error.message
                });
            }
        }

        // Longer delay between batches
        if (i + batchSize < events.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Save updated events
    writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    console.log(`\n📊 RESULTS:`);
    console.log(`  Total events processed: ${events.length}`);
    console.log(`  Events fixed: ${fixedCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);

    // Save verification report
    const reportPath = join(process.cwd(), 'date-verification-report.json');
    writeFileSync(reportPath, JSON.stringify({
        summary: {
            total: events.length,
            fixed: fixedCount,
            errors: errorCount
        },
        results: results.filter(r => r.fixed)
    }, null, 2));
    console.log(`📄 Verification report saved to: ${reportPath}`);
}

// For now, let's focus on fixing specific events mentioned by user
async function fixSpecificEvents(): Promise<void> {
    console.log('🔧 Fixing specific events mentioned by user...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const fixes = [
        {
            url: 'tuesday-night-yoga-with-valerie-tiu/100001979807988990',
            date: '2026-01-27T18:00:00-05:00', // Tue, 27 Jan, 2026 at 06:00 pm
            location: 'lululemon Queen St., 318 Queen Street West, Toronto, ON'
        }
    ];

    let fixedCount = 0;

    for (const fix of fixes) {
        const event = events.find(e => e.url?.includes(fix.url));
        if (event) {
            const oldDate = event.date;
            const oldLocation = event.location;
            
            event.date = new Date(fix.date).toISOString();
            event.location = fix.location;
            event.lastUpdated = new Date().toISOString();
            
            fixedCount++;
            console.log(`✅ Fixed: ${event.title}`);
            console.log(`   Date: ${oldDate} → ${event.date}`);
            console.log(`   Location: ${oldLocation} → ${event.location}\n`);
        }
    }

    if (fixedCount > 0) {
        writeFileSync(eventsPath, JSON.stringify(events, null, 2));
        console.log(`💾 Updated ${fixedCount} events`);
    }
}

// Run quick fix first, then full verification
fixSpecificEvents().then(() => {
    console.log('\n⚠️  Full verification would take a long time (1000+ events).');
    console.log('   Run verifyAllEvents() separately if needed.\n');
}).catch(console.error);
