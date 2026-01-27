/**
 * Fix all Thursday events with $10-$15 price range
 * Based on user feedback that Thursday events typically cost $10-$15
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

function fixAllThursdayPrices(): void {
    console.log('🔧 Fixing all Thursday event prices...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const thursdayEvents = events.filter(e => 
        e.source === 'Thursday' || 
        (e.url && e.url.includes('getthursday.com'))
    );

    console.log(`Found ${thursdayEvents.length} Thursday events\n`);

    let fixedCount = 0;

    for (const event of thursdayEvents) {
        // Only fix if price is missing or "See App"
        if (!event.priceAmount || event.price === 'See App' || event.price === 'See tickets') {
            const oldPrice = event.price || 'See App';
            
            event.price = '$10 - $15';
            event.priceAmount = 10;
            event.minPrice = 10;
            event.maxPrice = 15;
            event.isFree = false;

            fixedCount++;
            console.log(`✅ Fixed: ${event.title.substring(0, 50)}`);
            console.log(`   ${oldPrice} → $10 - $15\n`);
        }
    }

    // Save updated events
    writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    console.log(`\n📊 RESULTS:`);
    console.log(`  Total Thursday events: ${thursdayEvents.length}`);
    console.log(`  Fixed: ${fixedCount}`);
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);
}

fixAllThursdayPrices();
