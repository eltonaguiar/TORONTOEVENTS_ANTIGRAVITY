/**
 * Fix date parsing issues in existing events
 * Re-parses all dates using enhanced parsing logic
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import { safeParseDate } from '../src/lib/utils/dateHelpers';

function fixDateParsing(): void {
    console.log('🔧 Fixing date parsing issues...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    let fixedCount = 0;
    let stillInvalidCount = 0;

    for (const event of events) {
        const dateResult = safeParseDate(event.date, event.id, event.title);
        
        if (!dateResult.isValid) {
            // Try to fix the date
            const fixedDate = dateResult.date;
            if (fixedDate && !isNaN(fixedDate.getTime())) {
                // Update event with fixed date
                event.date = fixedDate.toISOString();
                fixedCount++;
                console.log(`✅ Fixed date for: ${event.title.substring(0, 50)}`);
            } else {
                stillInvalidCount++;
                console.log(`❌ Still invalid: ${event.title.substring(0, 50)} - ${dateResult.error}`);
            }
        }
    }

    // Save fixed events
    writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    console.log(`\n📊 RESULTS:`);
    console.log(`  Total Events: ${events.length}`);
    console.log(`  Fixed: ${fixedCount}`);
    console.log(`  Still Invalid: ${stillInvalidCount}`);
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);
}

fixDateParsing();
