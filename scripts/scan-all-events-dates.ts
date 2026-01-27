/**
 * Scan all events and verify dates/times are correctly extracted
 * Fetches detail pages to ensure accuracy
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { normalizeDate } from '../src/lib/scraper/utils';

interface ScanResult {
    eventId: string;
    title: string;
    url: string;
    needsFix: boolean;
    issue: string;
    oldDate?: string;
    newDate?: string;
    oldLocation?: string;
    newLocation?: string;
}

async function extractAccurateData(url: string): Promise<{ date: string | null; location: string | null }> {
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

        // Fallback: Try HTML selectors for date
        if (!date) {
            const dateStr = $('[itemprop="startDate"]').attr('content') ||
                $('.highlights').text().match(/[A-Za-z]{3},\s+\d+\s+[A-Za-z]{3},\s+\d{4}\s+at\s+\d{2}:\d{2}\s+pm/i)?.[0] ||
                $('.event-date').text() ||
                $('.date-time').text() ||
                $('time[datetime]').attr('datetime');
            
            if (dateStr) {
                date = normalizeDate(dateStr);
            }
        }

        // Fallback: Try HTML selectors for location
        if (!location) {
            const locationStr = $('.venue').text() ||
                $('.event-location').text() ||
                $('[itemprop="location"]').text() ||
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

async function scanAllEvents(): Promise<void> {
    console.log('🔍 Scanning all events for date/time accuracy...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const results: ScanResult[] = [];
    let fixedCount = 0;
    let checkedCount = 0;

    // Focus on events that likely have issues:
    // 1. Events with midnight times (likely missing time info)
    // 2. Events with generic locations
    // 3. AllEvents.in events (most prone to date/time issues)
    const suspiciousEvents = events.filter(e => {
        if (!e.url || e.url.includes('forms.gle') || e.url.includes('google.com/forms')) {
            return false;
        }
        
        try {
            const eventDate = new Date(e.date);
            const hour = eventDate.getHours();
            const minute = eventDate.getMinutes();
            
            // Check for midnight times (likely missing time)
            const hasMidnightTime = hour === 0 && minute === 0;
            
            // Check for generic location
            const hasGenericLocation = !e.location || 
                e.location === 'Toronto, ON' || 
                e.location.length < 10;
            
            // Check if AllEvents.in source
            const isAllEvents = e.source === 'AllEvents.in';
            
            return hasMidnightTime || (hasGenericLocation && isAllEvents);
        } catch {
            return false;
        }
    });

    console.log(`Found ${suspiciousEvents.length} events that may need date/time fixes\n`);
    console.log(`(Filtering: midnight times, generic locations from AllEvents.in)\n`);

    // Process in smaller batches to avoid overwhelming servers
    const batchSize = 5;
    const totalBatches = Math.ceil(suspiciousEvents.length / batchSize);
    for (let i = 0; i < suspiciousEvents.length; i += batchSize) {
        const batch = suspiciousEvents.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${totalBatches} (events ${i + 1}-${Math.min(i + batchSize, suspiciousEvents.length)})...`);

        for (const event of batch) {
            try {
                checkedCount++;
                const extracted = await extractAccurateData(event.url);
                
                let needsFix = false;
                const issues: string[] = [];

                // Check date accuracy
                if (extracted.date) {
                    const currentDate = new Date(event.date);
                    const extractedDate = new Date(extracted.date);
                    
                    // Check if time is significantly different (more than 30 minutes)
                    const timeDiff = Math.abs(extractedDate.getTime() - currentDate.getTime());
                    if (timeDiff > 30 * 60 * 1000) {
                        needsFix = true;
                        issues.push(`Time mismatch: ${currentDate.toLocaleTimeString('en-US', {timeZone: 'America/Toronto'})} vs ${extractedDate.toLocaleTimeString('en-US', {timeZone: 'America/Toronto'})}`);
                    }
                    
                    // Check if date is different
                    const currentDateStr = currentDate.toLocaleDateString('en-US', {timeZone: 'America/Toronto'});
                    const extractedDateStr = extractedDate.toLocaleDateString('en-US', {timeZone: 'America/Toronto'});
                    if (currentDateStr !== extractedDateStr) {
                        needsFix = true;
                        issues.push(`Date mismatch: ${currentDateStr} vs ${extractedDateStr}`);
                    }
                }

                // Check location accuracy
                if (extracted.location && 
                    extracted.location !== event.location &&
                    extracted.location.length > event.location.length &&
                    !extracted.location.match(/^Toronto, ON$/i)) {
                    needsFix = true;
                    issues.push(`Location can be improved: ${event.location} → ${extracted.location}`);
                }

                if (needsFix) {
                    const oldDate = event.date;
                    const oldLocation = event.location;
                    
                    if (extracted.date) {
                        event.date = extracted.date;
                    }
                    if (extracted.location) {
                        event.location = extracted.location;
                    }
                    event.lastUpdated = new Date().toISOString();
                    
                    fixedCount++;
                    results.push({
                        eventId: event.id,
                        title: event.title,
                        url: event.url,
                        needsFix: true,
                        issue: issues.join('; '),
                        oldDate,
                        newDate: extracted.date || undefined,
                        oldLocation,
                        newLocation: extracted.location || undefined
                    });

                    console.log(`  ✅ Fixed: ${event.title.substring(0, 50)}`);
                    issues.forEach(issue => console.log(`     - ${issue}`));
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error: any) {
                results.push({
                    eventId: event.id,
                    title: event.title,
                    url: event.url,
                    needsFix: false,
                    issue: `Error: ${error.message}`
                });
            }
        }

        // Longer delay between batches
        if (i + batchSize < suspiciousEvents.length) {
            console.log('  Waiting 3 seconds before next batch...\n');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    // Save updated events
    writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    console.log(`\n📊 SCAN RESULTS:`);
    console.log(`  Events checked: ${checkedCount}`);
    console.log(`  Events fixed: ${fixedCount}`);
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);

    // Save scan report
    const reportPath = join(process.cwd(), 'events-scan-report.json');
    writeFileSync(reportPath, JSON.stringify({
        summary: {
            totalChecked: checkedCount,
            fixed: fixedCount
        },
        fixedEvents: results.filter(r => r.needsFix)
    }, null, 2));
    console.log(`📄 Scan report saved to: ${reportPath}`);
}

scanAllEvents().catch(console.error);
