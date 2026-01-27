/**
 * Enrich all Eventbrite events with comprehensive data
 * Processes in batches to avoid timeouts
 * 
 * Usage:
 *   npx tsx scripts/enrich-all-eventbrite-events.ts [batch-size] [start-from]
 */

import fs from 'fs';
import path from 'path';
import { EventbriteDetailScraper } from '../src/lib/scraper/detail-scraper';
import { Event } from '../src/lib/types';
import { normalizeDate } from '../src/lib/scraper/utils';
import { isEnglish } from '../src/lib/scraper/utils';

const eventsFile = path.join(process.cwd(), 'data', 'events.json');
const BATCH_SIZE = parseInt(process.argv[2] || '50');
const START_FROM = parseInt(process.argv[3] || '0');

async function enrichEvent(event: Event): Promise<{ updated: boolean; improvements: string[] }> {
    const improvements: string[] = [];
    let updated = false;

    try {
        const enrichment = await EventbriteDetailScraper.enrichEvent(event.url);

        // Update price
        if (enrichment.priceAmount !== undefined && enrichment.price !== undefined) {
            if (!event.priceAmount || event.price === 'See tickets' || 
                (enrichment.priceAmount !== event.priceAmount && enrichment.priceAmount >= 0)) {
                event.price = enrichment.price;
                event.priceAmount = enrichment.priceAmount;
                event.isFree = enrichment.priceAmount === 0;
                updated = true;
                improvements.push('price');
            }
        }
        
        // Update min/max prices
        if (enrichment.minPrice !== undefined) {
            event.minPrice = enrichment.minPrice;
            updated = true;
        }
        if (enrichment.maxPrice !== undefined) {
            event.maxPrice = enrichment.maxPrice;
            updated = true;
        }
        
        // Update ticket types
        if (enrichment.ticketTypes && enrichment.ticketTypes.length > 0) {
            event.ticketTypes = enrichment.ticketTypes;
            updated = true;
            improvements.push(`${enrichment.ticketTypes.length} ticket types`);
        }
        
        // Update start/end times
        if (enrichment.realTime) {
            const normalized = normalizeDate(enrichment.realTime);
            if (normalized) {
                event.date = normalized;
                event.startTime = enrichment.realTime;
                updated = true;
                improvements.push('start time');
            }
        }
        
        if (enrichment.endTime) {
            const normalizedEnd = normalizeDate(enrichment.endTime);
            if (normalizedEnd) {
                event.endDate = normalizedEnd;
                event.endTime = enrichment.endTime;
                updated = true;
                improvements.push('end time');
            }
        }
        
        // Update description
        if (enrichment.fullDescription) {
            if (enrichment.fullDescription.length > (event.description?.length || 0)) {
                event.description = enrichment.fullDescription;
                updated = true;
                improvements.push('description');
            }
            
            if (!isEnglish(event.description)) {
                event.status = 'CANCELLED';
            }
        }
        
        // Update location details
        if (enrichment.locationDetails) {
            event.locationDetails = enrichment.locationDetails;
            updated = true;
            improvements.push('location details');
        }

        return { updated, improvements };
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        return { updated: false, improvements: [] };
    }
}

async function main() {
    if (!fs.existsSync(eventsFile)) {
        console.error('❌ events.json not found');
        process.exit(1);
    }

    const events: Event[] = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
    
    // Filter to Eventbrite events that need enrichment
    const eventbriteEvents = events.filter(e => 
        e.source === 'Eventbrite' && 
        e.status === 'UPCOMING' &&
        new Date(e.date) >= new Date()
    );

    console.log(`🔍 Enriching Eventbrite events with comprehensive data...\n`);
    console.log(`Total Eventbrite events: ${eventbriteEvents.length}`);
    console.log(`Batch size: ${BATCH_SIZE}`);
    console.log(`Starting from: ${START_FROM}\n`);
    console.log('='.repeat(80));

    const toProcess = eventbriteEvents.slice(START_FROM, START_FROM + BATCH_SIZE);
    console.log(`\nProcessing ${toProcess.length} events (${START_FROM + 1} to ${START_FROM + toProcess.length})...\n`);

    let successCount = 0;
    let totalImprovements = 0;
    
    for (let i = 0; i < toProcess.length; i++) {
        const event = toProcess[i];
        const globalIndex = START_FROM + i + 1;
        
        console.log(`[${globalIndex}/${eventbriteEvents.length}] ${event.title.substring(0, 50)}...`);
        
        const result = await enrichEvent(event);
        
        if (result.updated) {
            successCount++;
            totalImprovements += result.improvements.length;
            console.log(`   ✅ Updated: ${result.improvements.join(', ')}`);
        } else {
            console.log(`   ⚠️  No updates`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Save after each batch
    if (successCount > 0) {
        fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));
        console.log(`\n💾 Saved ${successCount} enriched events to ${eventsFile}`);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Batch Summary:`);
    console.log(`   Processed: ${toProcess.length} events`);
    console.log(`   Updated: ${successCount} events`);
    console.log(`   Total improvements: ${totalImprovements}`);

    const remaining = eventbriteEvents.length - (START_FROM + toProcess.length);
    if (remaining > 0) {
        console.log(`\n📋 Remaining: ${remaining} events`);
        console.log(`   Run again with: npx tsx scripts/enrich-all-eventbrite-events.ts ${BATCH_SIZE} ${START_FROM + BATCH_SIZE}`);
    } else {
        console.log(`\n✅ All events processed!`);
    }
    console.log('');
}

main().catch(console.error);
