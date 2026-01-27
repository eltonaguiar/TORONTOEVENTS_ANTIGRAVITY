/**
 * Verify today's events for accuracy
 * Checks date, time, and location for events scheduled today
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import axios from 'axios';
import * as cheerio from 'cheerio';

function getTorontoDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        timeZone: 'America/Toronto',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

async function verifyEvent(event: Event): Promise<{
    event: Event;
    dateAccurate: boolean;
    timeAccurate: boolean;
    locationAccurate: boolean;
    issues: string[];
}> {
    const issues: string[] = [];
    let dateAccurate = true;
    let timeAccurate = true;
    let locationAccurate = true;

    try {
        // Check if date is actually today
        const eventDate = new Date(event.date);
        const today = new Date();
        const eventDateStr = getTorontoDate(eventDate);
        const todayStr = getTorontoDate(today);
        
        if (eventDateStr !== todayStr) {
            dateAccurate = false;
            issues.push(`Date is ${eventDateStr}, not today (${todayStr})`);
        }

        // Check if time is reasonable (not midnight unless it's actually a midnight event)
        const eventHour = eventDate.getHours();
        if (eventHour === 0 && eventDate.getMinutes() === 0) {
            timeAccurate = false;
            issues.push('Time is midnight (00:00) - likely missing time information');
        }

        // Check location
        if (!event.location || event.location.trim() === '' || event.location.toLowerCase() === 'toronto, on') {
            locationAccurate = false;
            issues.push('Location is missing or too generic');
        }

        // Try to verify from source URL if available
        if (event.url && (event.url.includes('eventbrite') || event.url.includes('allevents.in'))) {
            try {
                console.log(`  Checking source: ${event.url.substring(0, 60)}...`);
                const response = await axios.get(event.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 5000
                });
                const $ = cheerio.load(response.data);
                
                // Check for JSON-LD
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
                                const sourceDate = new Date(eventData.startDate);
                                const sourceDateStr = getTorontoDate(sourceDate);
                                if (sourceDateStr !== todayStr) {
                                    dateAccurate = false;
                                    issues.push(`Source shows date: ${sourceDateStr}, not today`);
                                }
                            }
                            
                            if (eventData.location) {
                                const sourceLocation = typeof eventData.location === 'string' 
                                    ? eventData.location 
                                    : eventData.location.name || '';
                                if (sourceLocation && sourceLocation !== 'Toronto, ON') {
                                    if (event.location === 'Toronto, ON') {
                                        locationAccurate = false;
                                        issues.push(`Source has specific location: ${sourceLocation}`);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // JSON parsing failed, skip
                    }
                }
            } catch (e) {
                // Source check failed, skip
            }
        }

    } catch (error: any) {
        issues.push(`Verification error: ${error.message}`);
    }

    return {
        event,
        dateAccurate,
        timeAccurate,
        locationAccurate,
        issues
    };
}

async function verifyTodayEvents(): Promise<void> {
    console.log('🔍 Verifying today\'s events...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const today = new Date();
    const todayStr = getTorontoDate(today);

    const todayEvents = events.filter(e => {
        try {
            const eventDate = new Date(e.date);
            return getTorontoDate(eventDate) === todayStr;
        } catch {
            return false;
        }
    });

    console.log(`Found ${todayEvents.length} events scheduled for today (${todayStr})\n`);

    const verifications = [];
    for (let i = 0; i < todayEvents.length; i++) {
        const event = todayEvents[i];
        console.log(`[${i + 1}/${todayEvents.length}] Verifying: ${event.title.substring(0, 60)}`);
        const verification = await verifyEvent(event);
        verifications.push(verification);
        
        if (verification.issues.length > 0) {
            console.log(`  ⚠️  Issues found:`);
            verification.issues.forEach(issue => console.log(`     - ${issue}`));
        } else {
            console.log(`  ✅ All checks passed`);
        }
        console.log('');
        
        // Small delay to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    const accurate = verifications.filter(v => 
        v.dateAccurate && v.timeAccurate && v.locationAccurate
    ).length;
    
    const withIssues = verifications.filter(v => v.issues.length > 0);

    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log(`  Total events today: ${todayEvents.length}`);
    console.log(`  Fully accurate: ${accurate}`);
    console.log(`  With issues: ${withIssues.length}`);
    
    if (withIssues.length > 0) {
        console.log('\n⚠️  Events with issues:');
        withIssues.forEach(v => {
            console.log(`  - ${v.event.title.substring(0, 60)}`);
            v.issues.forEach(issue => console.log(`    ${issue}`));
        });
    }
}

verifyTodayEvents().catch(console.error);
