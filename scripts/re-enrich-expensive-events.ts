/**
 * Re-enrich events that show "See tickets" to extract actual prices
 * and flag expensive events
 * 
 * Usage:
 *   npx tsx scripts/re-enrich-expensive-events.ts
 */

import fs from 'fs';
import path from 'path';
import { EventbriteDetailScraper } from '../src/lib/scraper/detail-scraper';
import { Event } from '../src/lib/types';

const eventsFile = path.join(process.cwd(), 'data', 'events.json');
const MAX_PRICE = 120; // Match the default filter

async function main() {
    if (!fs.existsSync(eventsFile)) {
        console.error('❌ events.json not found');
        process.exit(1);
    }

    const events: Event[] = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
    
    console.log('🔍 Checking events with missing or "See tickets" prices...\n');
    
    // Find events that need price enrichment
    const eventsToCheck = events.filter(e => 
        e.source === 'Eventbrite' && 
        (!e.priceAmount || e.price === 'See tickets') &&
        e.status === 'UPCOMING'
    );
    
    console.log(`Found ${eventsToCheck.length} events to check\n`);
    
    let updatedCount = 0;
    let expensiveFound = 0;
    
    for (let i = 0; i < eventsToCheck.length; i++) {
        const event = eventsToCheck[i];
        console.log(`[${i + 1}/${eventsToCheck.length}] Checking: ${event.title.substring(0, 50)}...`);
        
        try {
            const enrichment = await EventbriteDetailScraper.enrichEvent(event.url);
            
            if (enrichment.priceAmount !== undefined) {
                // Update the event in the main array
                const eventIndex = events.findIndex(e => e.id === event.id);
                if (eventIndex !== -1) {
                    events[eventIndex].priceAmount = enrichment.priceAmount;
                    events[eventIndex].price = enrichment.price || `$${enrichment.priceAmount}`;
                    events[eventIndex].isFree = enrichment.priceAmount === 0;
                    
                    if (enrichment.fullDescription && enrichment.fullDescription.length > event.description.length) {
                        events[eventIndex].description = enrichment.fullDescription;
                    }
                    
                    updatedCount++;
                    
                    if (enrichment.priceAmount > MAX_PRICE) {
                        expensiveFound++;
                        console.log(`  ⚠️  EXPENSIVE: $${enrichment.priceAmount} - Should be filtered!`);
                        // Mark as cancelled to filter it out
                        events[eventIndex].status = 'CANCELLED';
                    } else {
                        console.log(`  ✅ Price: $${enrichment.priceAmount}`);
                    }
                }
            } else {
                console.log(`  ⚠️  Could not extract price`);
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
            console.log(`  ❌ Error: ${error.message}`);
        }
    }
    
    // Save updated events
    if (updatedCount > 0) {
        fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));
        console.log(`\n✅ Updated ${updatedCount} events`);
        console.log(`⚠️  Found ${expensiveFound} expensive events (marked as CANCELLED)`);
        console.log(`\n💾 Saved to ${eventsFile}\n`);
    } else {
        console.log('\n⚠️  No events were updated\n');
    }
}

main().catch(console.error);
