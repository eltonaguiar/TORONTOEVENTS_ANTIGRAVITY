/**
 * Test script to simulate frontend filtering logic
 * This will show exactly which events are being filtered out and why
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface Event {
    id: string;
    title: string;
    date: string;
    location?: string;
    source: string;
    endDate?: string;
    [key: string]: any;
}

function getTorontoDateParts(date: Date): string {
    if (isNaN(date.getTime())) return 'invalid-date';
    try {
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
    } catch (e) {
        return 'invalid-date';
    }
}

function isToday(date: string): boolean {
    const eventDate = new Date(date);
    const today = new Date();
    return getTorontoDateParts(eventDate) === getTorontoDateParts(today);
}

function isMultiDay(e: Event): boolean {
    return e.categories?.includes('Multi-Day') || false;
}

function main() {
    console.log('🧪 TESTING FRONTEND FILTERING LOGIC\n');
    console.log('='.repeat(80));

    // Load events
    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));
    console.log(`Loaded ${events.length} events\n`);

    // Simulate frontend filtering
    const now = new Date();
    const showStarted = false; // Default value
    const dateFilter = 'all'; // Default value
    const gracePeriod = 60 * 60 * 1000; // 1 hour

    let filteredCount = 0;
    const reasons: { [key: string]: number } = {};

    events.forEach(e => {
        let rejected = false;
        let reason = '';

        try {
            const eventStartDate = new Date(e.date);
            const eventEndDate = e.endDate ? new Date(e.endDate) : new Date(eventStartDate.getTime() + 3 * 60 * 60 * 1000);

            // Check 1: Hide started events (if showStarted is false)
            if (!showStarted && now) {
                if (!isMultiDay(e)) {
                    // Hide if ended (with grace period)
                    if (eventEndDate < new Date(now.getTime() - gracePeriod)) {
                        rejected = true;
                        reason = 'Event ended (past end time)';
                    }
                    // Hide if started (with grace period)
                    else if (eventStartDate < new Date(now.getTime() - gracePeriod)) {
                        rejected = true;
                        reason = 'Event started (past start time)';
                    }
                } else {
                    // Multi-day: Hide if totally over
                    if (eventEndDate < new Date(now.getTime() - gracePeriod)) {
                        rejected = true;
                        reason = 'Multi-day event ended';
                    }
                }
            }

            // Check 2: Date filter (if not 'all')
            if (!rejected && dateFilter !== 'all' && now) {
                if (dateFilter === 'today') {
                    if (!isToday(e.date)) {
                        rejected = true;
                        reason = 'Not today';
                    }
                }
                // Add other date filters as needed
            }

            if (rejected) {
                filteredCount++;
                reasons[reason] = (reasons[reason] || 0) + 1;
            }
        } catch (err) {
            filteredCount++;
            reasons['Invalid date'] = (reasons['Invalid date'] || 0) + 1;
        }
    });

    const passing = events.length - filteredCount;

    console.log('📊 FILTERING RESULTS');
    console.log('-'.repeat(80));
    console.log(`Total events: ${events.length}`);
    console.log(`Filtered out: ${filteredCount}`);
    console.log(`Passing filter: ${passing}`);
    console.log(`\nRejection reasons:`);
    Object.entries(reasons)
        .sort((a, b) => b[1] - a[1])
        .forEach(([reason, count]) => {
            console.log(`  ${reason}: ${count} events`);
        });

    // Check events happening today
    console.log('\n\n📅 EVENTS HAPPENING TODAY');
    console.log('-'.repeat(80));
    const todayEvents = events.filter(e => {
        try {
            return isToday(e.date);
        } catch {
            return false;
        }
    });
    console.log(`Events with today's date: ${todayEvents.length}`);
    if (todayEvents.length > 0) {
        console.log(`Sample today events:`);
        todayEvents.slice(0, 5).forEach(e => {
            const d = new Date(e.date);
            console.log(`  - ${e.title.substring(0, 50)}`);
            console.log(`    Date: ${e.date}`);
            console.log(`    Parsed: ${d.toISOString()}`);
            console.log(`    Toronto date: ${getTorontoDateParts(d)}`);
            console.log(`    Today: ${getTorontoDateParts(new Date())}`);
            console.log(`    isToday(): ${isToday(e.date)}`);
        });
    }

    // Check events happening in next 24 hours
    console.log('\n\n⏰ EVENTS IN NEXT 24 HOURS');
    console.log('-'.repeat(80));
    const next24h = events.filter(e => {
        try {
            const eventDate = new Date(e.date);
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            return eventDate >= now && eventDate <= in24h;
        } catch {
            return false;
        }
    });
    console.log(`Events in next 24 hours: ${next24h.length}`);
    if (next24h.length > 0) {
        console.log(`Sample next 24h events:`);
        next24h.slice(0, 5).forEach(e => {
            const d = new Date(e.date);
            const hoursUntil = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
            console.log(`  - ${e.title.substring(0, 50)}`);
            console.log(`    Date: ${e.date}`);
            console.log(`    Hours until: ${hoursUntil.toFixed(1)}`);
            console.log(`    Would be filtered: ${eventStartDate < new Date(now.getTime() - gracePeriod) ? 'YES (started)' : 'NO'}`);
        });
    }

    console.log('\n\n💡 DIAGNOSIS');
    console.log('-'.repeat(80));
    if (passing === 0) {
        console.log('❌ CRITICAL: All events are being filtered out!');
        console.log(`   Most common reason: ${Object.entries(reasons).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'}`);
    } else {
        console.log(`✅ ${passing} events should be displaying`);
        if (filteredCount > 0) {
            console.log(`⚠️  ${filteredCount} events are being filtered out`);
        }
    }
}

main();
