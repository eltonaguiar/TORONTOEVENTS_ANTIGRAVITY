/**
 * Diagnostic script to identify why events are being filtered out
 * Tests all three suspected issues:
 * 1. Default date bug (2026-01-01 in the past)
 * 2. Toronto geofence too strict
 * 3. Build/JSON issues
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface Event {
    id: string;
    title: string;
    date: string;
    location?: string;
    source: string;
    [key: string]: any;
}

function main() {
    console.log('🔍 DIAGNOSING ZERO EVENTS ISSUE\n');
    console.log('='.repeat(80));

    // Load events
    const eventsPath = join(process.cwd(), 'data', 'events.json');
    let events: Event[];
    try {
        const data = readFileSync(eventsPath, 'utf-8');
        events = JSON.parse(data);
        console.log(`✅ Loaded ${events.length} events from events.json\n`);
    } catch (e: any) {
        console.error(`❌ Failed to load events.json: ${e.message}`);
        return;
    }

    if (events.length === 0) {
        console.error('❌ events.json is EMPTY! This is the root cause.');
        return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const jan1_2026 = new Date('2026-01-01T00:00:00Z');

    // Issue 1: Default Date Bug (2026-01-01)
    console.log('📅 ISSUE 1: Default Date Bug (2026-01-01)');
    console.log('-'.repeat(80));
    const jan1Events = events.filter(e => {
        try {
            const eventDate = new Date(e.date);
            return eventDate.getTime() === jan1_2026.getTime();
        } catch {
            return false;
        }
    });
    console.log(`  Events with date 2026-01-01: ${jan1Events.length}`);
    if (jan1Events.length > 0) {
        console.log(`  ⚠️  These events are in the PAST and will be filtered out!`);
        console.log(`  Sample events:`);
        jan1Events.slice(0, 5).forEach(e => {
            console.log(`    - ${e.title.substring(0, 50)} (${e.date})`);
        });
    } else {
        console.log(`  ✅ No events with default date found`);
    }

    // Check past events
    const pastEvents = events.filter(e => {
        try {
            const eventDate = new Date(e.date);
            return eventDate < today;
        } catch {
            return false;
        }
    });
    console.log(`\n  Total past events: ${pastEvents.length} (will be filtered by "Hide Past Events")`);
    if (pastEvents.length > 0) {
        const pastByDate = pastEvents.reduce((acc, e) => {
            try {
                const d = new Date(e.date);
                const dateStr = d.toISOString().split('T')[0];
                acc[dateStr] = (acc[dateStr] || 0) + 1;
                return acc;
            } catch {
                return acc;
            }
        }, {} as { [key: string]: number });
        console.log(`  Top past dates:`);
        Object.entries(pastByDate)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([date, count]) => {
                console.log(`    ${date}: ${count} events`);
            });
    }

    // Issue 2: Toronto Geofence
    console.log('\n\n📍 ISSUE 2: Toronto Geofence Filter');
    console.log('-'.repeat(80));
    
    // Check location patterns
    const locationPatterns = {
        'Toronto, ON': 0,
        'Toronto': 0,
        'GTA': 0,
        'Mississauga': 0,
        'Brampton': 0,
        'Markham': 0,
        'Vaughan': 0,
        'Richmond Hill': 0,
        'Online': 0,
        'Virtual': 0,
        'Other': 0,
        'Missing': 0
    };

    events.forEach(e => {
        const loc = (e.location || '').toLowerCase();
        if (!loc) {
            locationPatterns['Missing']++;
        } else if (loc.includes('toronto, on') || loc.includes('toronto on')) {
            locationPatterns['Toronto, ON']++;
        } else if (loc.includes('toronto')) {
            locationPatterns['Toronto']++;
        } else if (loc.includes('gta')) {
            locationPatterns['GTA']++;
        } else if (loc.includes('mississauga')) {
            locationPatterns['Mississauga']++;
        } else if (loc.includes('brampton')) {
            locationPatterns['Brampton']++;
        } else if (loc.includes('markham')) {
            locationPatterns['Markham']++;
        } else if (loc.includes('vaughan')) {
            locationPatterns['Vaughan']++;
        } else if (loc.includes('richmond hill')) {
            locationPatterns['Richmond Hill']++;
        } else if (loc.includes('online') || loc.includes('virtual')) {
            locationPatterns['Online']++;
        } else {
            locationPatterns['Other']++;
        }
    });

    console.log(`  Location distribution:`);
    Object.entries(locationPatterns).forEach(([pattern, count]) => {
        if (count > 0) {
            console.log(`    ${pattern}: ${count} events`);
        }
    });

    // Check for events that might be rejected by geofence
    const suspiciousLocations = events.filter(e => {
        const loc = (e.location || '').toLowerCase();
        return loc && 
               !loc.includes('toronto') && 
               !loc.includes('gta') &&
               !loc.includes('mississauga') &&
               !loc.includes('brampton') &&
               !loc.includes('markham') &&
               !loc.includes('vaughan') &&
               !loc.includes('richmond hill') &&
               !loc.includes('online') &&
               !loc.includes('virtual');
    });
    console.log(`\n  Events with suspicious locations (might be rejected): ${suspiciousLocations.length}`);
    if (suspiciousLocations.length > 0) {
        console.log(`  Sample suspicious locations:`);
        const unique = new Set<string>();
        suspiciousLocations.slice(0, 20).forEach(e => {
            if (e.location && !unique.has(e.location)) {
                unique.add(e.location);
                console.log(`    - "${e.location}"`);
            }
        });
    }

    // Issue 3: Future events that should show
    console.log('\n\n✅ ISSUE 3: Events That SHOULD Display');
    console.log('-'.repeat(80));
    
    const futureEvents = events.filter(e => {
        try {
            const eventDate = new Date(e.date);
            return eventDate >= today;
        } catch {
            return false;
        }
    });
    console.log(`  Future events (should display): ${futureEvents.length}`);
    
    // Check if they have valid locations
    const validFutureEvents = futureEvents.filter(e => {
        const loc = (e.location || '').toLowerCase();
        return loc && (
            loc.includes('toronto') ||
            loc.includes('gta') ||
            loc.includes('mississauga') ||
            loc.includes('brampton') ||
            loc.includes('markham') ||
            loc.includes('vaughan') ||
            loc.includes('richmond hill') ||
            loc.includes('online') ||
            loc.includes('virtual')
        );
    });
    console.log(`  Future events with valid Toronto/GTA locations: ${validFutureEvents.length}`);

    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total events in JSON: ${events.length}`);
    console.log(`Past events (filtered out): ${pastEvents.length}`);
    console.log(`Future events: ${futureEvents.length}`);
    console.log(`Future events with valid locations: ${validFutureEvents.length}`);
    console.log(`Events with default date (2026-01-01): ${jan1Events.length}`);

    console.log('\n💡 RECOMMENDATIONS:');
    if (jan1Events.length > 0) {
        console.log(`  1. ⚠️  Fix date parsing - ${jan1Events.length} events defaulted to 2026-01-01`);
        console.log(`     These are now in the past and will be filtered out.`);
    }
    if (suspiciousLocations.length > 0) {
        console.log(`  2. ⚠️  Review geofence - ${suspiciousLocations.length} events have non-standard locations`);
        console.log(`     Check if these are valid Toronto events being incorrectly rejected.`);
    }
    if (validFutureEvents.length === 0) {
        console.log(`  3. ❌ CRITICAL: No valid future events found!`);
        console.log(`     This explains why you see 0 events.`);
    } else {
        console.log(`  3. ✅ ${validFutureEvents.length} events should be displaying`);
        console.log(`     If you still see 0, check the frontend filtering logic.`);
    }

    // Check EventFeed filtering
    console.log('\n\n🔍 FRONTEND FILTERING CHECK');
    console.log('-'.repeat(80));
    console.log('Check EventFeed.tsx for:');
    console.log('  - isToday() function - might be too strict');
    console.log('  - Date filtering logic - might be rejecting valid dates');
    console.log('  - Location filtering - might be rejecting valid Toronto locations');
    console.log('  - showStarted toggle - might be hiding events that already started today');
}

main();
