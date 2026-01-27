/**
 * Fix invalid events:
 * 1. Remove "Upcoming Events" that points to Google forms
 * 2. Fix Vision Board event date to correct time
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

function fixInvalidEvents(): void {
    console.log('🔧 Fixing invalid events...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    let removedCount = 0;
    let fixedCount = 0;

    // Remove invalid "Upcoming Events" entries
    const validEvents = events.filter(event => {
        const isInvalid = 
            (event.title === 'Upcoming Events' || event.title.toLowerCase().includes('upcoming events')) &&
            (event.url?.includes('forms.gle') || event.url?.includes('google.com/forms'));
        
        if (isInvalid) {
            removedCount++;
            console.log(`❌ Removed invalid event: ${event.title}`);
            console.log(`   URL: ${event.url}\n`);
            return false;
        }
        return true;
    });

    // Fix Vision Board event date - only the specific one mentioned
    for (const event of validEvents) {
        // Only fix the specific event URL mentioned by user
        if (event.url?.includes('vision-board-and-health-check-in-event/100001980221561998')) {
            // Set to correct date: Tue, 27 Jan, 2026 at 05:00 pm EST
            const correctDate = new Date('2026-01-27T17:00:00-05:00');
            const oldDate = event.date;
            
            event.date = correctDate.toISOString();
            event.lastUpdated = new Date().toISOString();
            
            // Also update location if it's generic
            if (!event.location || event.location === 'Toronto, ON') {
                event.location = 'Scarborough Village Recreation Centre, 3600 Kingston Road, Toronto, ON';
            }
            
            fixedCount++;
            console.log(`✅ Fixed Vision Board event:`);
            console.log(`   Title: ${event.title}`);
            console.log(`   URL: ${event.url}`);
            console.log(`   Old date: ${oldDate}`);
            console.log(`   New date: ${event.date}`);
            console.log(`   Toronto time: ${correctDate.toLocaleString('en-US', {timeZone: 'America/Toronto', weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}`);
            console.log(`   Location: ${event.location}\n`);
        }
    }

    // Save updated events
    writeFileSync(eventsPath, JSON.stringify(validEvents, null, 2));

    console.log(`\n📊 RESULTS:`);
    console.log(`  Total events before: ${events.length}`);
    console.log(`  Invalid events removed: ${removedCount}`);
    console.log(`  Events fixed: ${fixedCount}`);
    console.log(`  Total events after: ${validEvents.length}`);
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);
}

fixInvalidEvents();
