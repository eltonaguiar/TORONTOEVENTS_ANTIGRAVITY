/**
 * Quick fix for the specific expensive event
 * Updates the event with the correct price and marks it as CANCELLED
 * 
 * Usage:
 *   npx tsx scripts/fix-expensive-event.ts
 */

import fs from 'fs';
import path from 'path';
import { EventbriteDetailScraper } from '../src/lib/scraper/detail-scraper';

const eventsFile = path.join(process.cwd(), 'data', 'events.json');
const TARGET_URL = 'https://www.eventbrite.ca/e/toronto-marriage-minded-singles-one-on-one-tickets-1981517745919';

async function main() {
    if (!fs.existsSync(eventsFile)) {
        console.error('❌ events.json not found');
        process.exit(1);
    }

    const events = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
    
    console.log('🔍 Finding and fixing expensive event...\n');
    
    // Find the event
    const eventIndex = events.findIndex((e: any) => e.url === TARGET_URL);
    
    if (eventIndex === -1) {
        console.log('⚠️  Event not found in data. It may have been removed or URL changed.\n');
        process.exit(0);
    }
    
    const event = events[eventIndex];
    console.log(`Found: "${event.title}"`);
    console.log(`Current price: ${event.price}`);
    console.log(`Current priceAmount: ${event.priceAmount || 'undefined'}\n`);
    
    console.log('🔍 Enriching event to get actual price...\n');
    
    try {
        const enrichment = await EventbriteDetailScraper.enrichEvent(event.url);
        
        console.log('📊 Enrichment Results:');
        console.log(`   Price: ${enrichment.price || 'Not found'}`);
        console.log(`   Price Amount: ${enrichment.priceAmount !== undefined ? `$${enrichment.priceAmount}` : 'Not found'}`);
        console.log(`   Description Length: ${enrichment.fullDescription?.length || 0} characters\n`);
        
        // Update the event
        if (enrichment.priceAmount !== undefined) {
            events[eventIndex].priceAmount = enrichment.priceAmount;
            events[eventIndex].price = enrichment.price || `$${enrichment.priceAmount}`;
            events[eventIndex].isFree = enrichment.priceAmount === 0;
            
            if (enrichment.fullDescription && enrichment.fullDescription.length > event.description.length) {
                events[eventIndex].description = enrichment.fullDescription;
            }
            
            // Mark as CANCELLED if expensive
            if (enrichment.priceAmount > 120) {
                events[eventIndex].status = 'CANCELLED';
                console.log(`⚠️  Event is expensive ($${enrichment.priceAmount}) - Marked as CANCELLED\n`);
            } else {
                console.log(`✅ Event price updated: $${enrichment.priceAmount}\n`);
            }
            
            // Save
            fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));
            console.log(`💾 Updated and saved to ${eventsFile}\n`);
        } else {
            console.log('⚠️  Could not extract price. Event may need manual review.\n');
        }
        
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);
