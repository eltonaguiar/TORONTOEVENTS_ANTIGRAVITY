/**
 * Fix invalid dates in existing events.json
 * Removes events with unparseable dates or fixes malformed ISO strings
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import { normalizeDate } from '../src/lib/scraper/utils';

function main() {
    console.log('🔧 FIXING INVALID DATES IN EVENTS.JSON\n');
    console.log('='.repeat(80));

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    let events: Event[];
    
    try {
        const data = readFileSync(eventsPath, 'utf-8');
        events = JSON.parse(data);
        console.log(`✅ Loaded ${events.length} events from events.json\n`);
    } catch (e: any) {
        console.error(`❌ Failed to load events.json: ${e.message}`);
        process.exit(1);
    }

    let fixed = 0;
    let removed = 0;
    const fixedEvents: Event[] = [];

    for (const event of events) {
        // Try to parse the current date
        const originalDate = event.date;
        let isValid = false;
        
        try {
            const testDate = new Date(originalDate);
            isValid = !isNaN(testDate.getTime());
        } catch {
            isValid = false;
        }

        // If invalid, try to normalize it
        if (!isValid) {
            const normalized = normalizeDate(originalDate);
            
            if (normalized) {
                // Successfully normalized - use the fixed date
                event.date = normalized;
                fixed++;
                fixedEvents.push(event);
                console.log(`✅ Fixed: "${event.title.substring(0, 50)}" - ${originalDate} → ${normalized}`);
            } else {
                // Cannot be fixed - remove the event
                removed++;
                console.log(`❌ Removed: "${event.title.substring(0, 50)}" - unparseable date: ${originalDate}`);
            }
        } else {
            // Already valid - keep it
            fixedEvents.push(event);
        }
    }

    // Save fixed events
    writeFileSync(eventsPath, JSON.stringify(fixedEvents, null, 2));
    console.log(`\n✅ Fixed ${fixed} events`);
    console.log(`❌ Removed ${removed} events with unparseable dates`);
    console.log(`📊 Final count: ${fixedEvents.length} events (was ${events.length})`);

    // Update metadata
    const metadataPath = join(process.cwd(), 'data', 'metadata.json');
    try {
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
        metadata.totalEvents = fixedEvents.length;
        metadata.lastUpdated = new Date().toISOString();
        writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        console.log(`✅ Updated metadata.json`);
    } catch (e: any) {
        console.warn(`⚠️  Could not update metadata: ${e.message}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ INVALID DATE CLEANUP COMPLETE');
    console.log('='.repeat(80));
    console.log('\n💡 Next steps:');
    console.log('  1. Review the fixed events.json');
    console.log('  2. Run scraper to get fresh data: npm run scrape');
    console.log('  3. Deploy to GitHub and FTP');
}

main().catch(console.error);
