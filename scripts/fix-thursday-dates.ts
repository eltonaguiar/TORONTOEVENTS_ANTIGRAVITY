/**
 * Fix Thursday event dates - they should be on Thursday, not today
 * This script corrects dates for all Thursday events that are incorrectly set to today
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

function getNextThursday(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 4 = Thursday
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7; // Next Thursday (or today if it's Thursday)
    
    // Create date in Toronto timezone
    const torontoDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    const nextThursday = new Date(torontoDate);
    nextThursday.setDate(torontoDate.getDate() + daysUntilThursday);
    nextThursday.setHours(19, 0, 0, 0); // Default to 7 PM Toronto time
    
    // Convert back to UTC for storage
    const torontoOffset = -5 * 60 * 60 * 1000; // EST offset (will need adjustment for DST)
    const utcThursday = new Date(nextThursday.getTime() - torontoOffset);
    return utcThursday;
}

function fixThursdayDates(): void {
    console.log('🔧 Fixing Thursday event dates...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const thursdayEvents = events.filter(e => 
        e.source === 'Thursday' || 
        (e.url && e.url.includes('getthursday.com')) ||
        (e.title && e.title.toLowerCase().includes('thursday'))
    );

    console.log(`Found ${thursdayEvents.length} Thursday events\n`);

    const nextThursday = getNextThursday();
    const nextThursdayStr = nextThursday.toISOString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let fixedCount = 0;

    for (const event of thursdayEvents) {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        
        // Check if date is today or in the past (and it's a Thursday event)
        if (eventDate <= today) {
            const oldDate = event.date;
            event.date = nextThursdayStr;
            event.lastUpdated = new Date().toISOString();
            
            fixedCount++;
            console.log(`✅ Fixed: ${event.title.substring(0, 50)}`);
            console.log(`   ${oldDate} → ${nextThursdayStr}`);
            console.log(`   Old: ${new Date(oldDate).toLocaleString('en-US', {timeZone: 'America/Toronto', weekday: 'long'})}`);
            console.log(`   New: ${new Date(nextThursdayStr).toLocaleString('en-US', {timeZone: 'America/Toronto', weekday: 'long'})}\n`);
        }
    }

    // Save updated events
    writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    console.log(`\n📊 RESULTS:`);
    console.log(`  Total Thursday events: ${thursdayEvents.length}`);
    console.log(`  Fixed: ${fixedCount}`);
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);
}

fixThursdayDates();
