/**
 * Re-enrich a sample of 30 events to demonstrate comprehensive data extraction
 * 
 * This script will:
 * 1. Select 30 upcoming Eventbrite events
 * 2. Re-enrich them with comprehensive data extraction
 * 3. Show before/after comparison
 * 
 * Usage:
 *   npx tsx scripts/re-enrich-sample-events.ts
 */

import fs from 'fs';
import path from 'path';
import { EventbriteDetailScraper } from '../src/lib/scraper/detail-scraper';
import { Event } from '../src/lib/types';

const eventsFile = path.join(process.cwd(), 'data', 'events.json');
const SAMPLE_SIZE = 30;

interface BeforeAfter {
    event: Event;
    before: {
        hasPrice: boolean;
        hasTicketTypes: boolean;
        hasFullDescription: boolean;
        hasStartTime: boolean;
        hasEndTime: boolean;
        hasLocationDetails: boolean;
    };
    after: {
        hasPrice: boolean;
        hasTicketTypes: boolean;
        hasFullDescription: boolean;
        hasStartTime: boolean;
        hasEndTime: boolean;
        hasLocationDetails: boolean;
    };
    improvements: string[];
}

async function enrichEvent(event: Event): Promise<BeforeAfter> {
    const before = {
        hasPrice: event.priceAmount !== undefined,
        hasTicketTypes: event.ticketTypes !== undefined && event.ticketTypes.length > 0,
        hasFullDescription: event.description !== undefined && event.description.length > 100,
        hasStartTime: event.startTime !== undefined,
        hasEndTime: event.endTime !== undefined,
        hasLocationDetails: event.locationDetails !== undefined
    };

    const enrichment = await EventbriteDetailScraper.enrichEvent(event.url);
    const improvements: string[] = [];

    // Update price
    if (enrichment.priceAmount !== undefined) {
        event.priceAmount = enrichment.priceAmount;
        event.price = enrichment.price || `$${enrichment.priceAmount}`;
        event.isFree = enrichment.priceAmount === 0;
        if (!before.hasPrice) improvements.push('Added price');
    }
    
    // Update min/max prices
    if (enrichment.minPrice !== undefined) {
        event.minPrice = enrichment.minPrice;
        if (!event.maxPrice && enrichment.maxPrice) {
            event.maxPrice = enrichment.maxPrice;
        }
        improvements.push('Added price range');
    }
    if (enrichment.maxPrice !== undefined) {
        event.maxPrice = enrichment.maxPrice;
    }
    
    // Update ticket types
    if (enrichment.ticketTypes && enrichment.ticketTypes.length > 0) {
        event.ticketTypes = enrichment.ticketTypes;
        if (!before.hasTicketTypes) improvements.push(`Added ${enrichment.ticketTypes.length} ticket types`);
    }
    
    // Update start/end times
    if (enrichment.realTime) {
        const { normalizeDate } = require('../src/lib/scraper/utils');
        const normalized = normalizeDate(enrichment.realTime);
        if (normalized) {
            event.date = normalized;
            event.startTime = enrichment.realTime;
            if (!before.hasStartTime) improvements.push('Added start time');
        }
    }
    
    if (enrichment.endTime) {
        const { normalizeDate } = require('../src/lib/scraper/utils');
        const normalizedEnd = normalizeDate(enrichment.endTime);
        if (normalizedEnd) {
            event.endDate = normalizedEnd;
            event.endTime = enrichment.endTime;
            if (!before.hasEndTime) improvements.push('Added end time');
        }
    }
    
    // Update description
    if (enrichment.fullDescription) {
        if (enrichment.fullDescription.length > (event.description?.length || 0)) {
            event.description = enrichment.fullDescription;
            if (!before.hasFullDescription || enrichment.fullDescription.length > event.description.length) {
                improvements.push(`Enhanced description (${enrichment.fullDescription.length} chars)`);
            }
        }
    }
    
    // Update location details
    if (enrichment.locationDetails) {
        event.locationDetails = enrichment.locationDetails;
        if (!before.hasLocationDetails) improvements.push('Added location details');
    }

    const after = {
        hasPrice: event.priceAmount !== undefined,
        hasTicketTypes: event.ticketTypes !== undefined && event.ticketTypes.length > 0,
        hasFullDescription: event.description !== undefined && event.description.length > 100,
        hasStartTime: event.startTime !== undefined,
        hasEndTime: event.endTime !== undefined,
        hasLocationDetails: event.locationDetails !== undefined
    };

    return { event, before, after, improvements };
}

async function main() {
    if (!fs.existsSync(eventsFile)) {
        console.error('❌ events.json not found');
        process.exit(1);
    }

    const events: Event[] = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
    
    console.log('🔍 Re-enriching sample events with comprehensive data extraction...\n');
    
    // Filter to Eventbrite events only (they support comprehensive extraction)
    const eventbriteEvents = events.filter(e => 
        e.source === 'Eventbrite' && 
        e.status === 'UPCOMING' && 
        new Date(e.date) >= new Date()
    );

    if (eventbriteEvents.length === 0) {
        console.log('⚠️  No upcoming Eventbrite events found');
        process.exit(0);
    }

    // Take a sample
    const sample = eventbriteEvents.slice(0, Math.min(SAMPLE_SIZE, eventbriteEvents.length));
    
    console.log(`📊 Selected ${sample.length} Eventbrite events for re-enrichment\n`);
    console.log('='.repeat(80));

    const results: BeforeAfter[] = [];
    let successCount = 0;
    
    for (let i = 0; i < sample.length; i++) {
        const event = sample[i];
        console.log(`\n[${i + 1}/${sample.length}] Enriching: ${event.title.substring(0, 50)}...`);
        
        try {
            const result = await enrichEvent(event);
            results.push(result);
            
            if (result.improvements.length > 0) {
                successCount++;
                console.log(`   ✅ Improvements: ${result.improvements.join(', ')}`);
                console.log(`   Before: Price:${result.before.hasPrice ? '✅' : '❌'} Tickets:${result.before.hasTicketTypes ? '✅' : '❌'} Desc:${result.before.hasFullDescription ? '✅' : '❌'} Times:${result.before.hasStartTime ? '✅' : '❌'}/${result.before.hasEndTime ? '✅' : '❌'} Loc:${result.before.hasLocationDetails ? '✅' : '❌'}`);
                console.log(`   After:  Price:${result.after.hasPrice ? '✅' : '❌'} Tickets:${result.after.hasTicketTypes ? '✅' : '❌'} Desc:${result.after.hasFullDescription ? '✅' : '❌'} Times:${result.after.hasStartTime ? '✅' : '❌'}/${result.after.hasEndTime ? '✅' : '❌'} Loc:${result.after.hasLocationDetails ? '✅' : '❌'}`);
            } else {
                console.log(`   ⚠️  No improvements (already had data or extraction failed)`);
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }

    // Save updated events
    if (successCount > 0) {
        fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));
        console.log(`\n💾 Saved ${successCount} enriched events to ${eventsFile}`);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 ENRICHMENT SUMMARY\n');

    const beforeStats = {
        hasPrice: results.filter(r => r.before.hasPrice).length,
        hasTicketTypes: results.filter(r => r.before.hasTicketTypes).length,
        hasFullDescription: results.filter(r => r.before.hasFullDescription).length,
        hasStartTime: results.filter(r => r.before.hasStartTime).length,
        hasEndTime: results.filter(r => r.before.hasEndTime).length,
        hasLocationDetails: results.filter(r => r.before.hasLocationDetails).length,
    };

    const afterStats = {
        hasPrice: results.filter(r => r.after.hasPrice).length,
        hasTicketTypes: results.filter(r => r.after.hasTicketTypes).length,
        hasFullDescription: results.filter(r => r.after.hasFullDescription).length,
        hasStartTime: results.filter(r => r.after.hasStartTime).length,
        hasEndTime: results.filter(r => r.after.hasEndTime).length,
        hasLocationDetails: results.filter(r => r.after.hasLocationDetails).length,
    };

    const total = results.length;
    
    console.log('Before Enrichment:');
    console.log(`   Prices: ${beforeStats.hasPrice}/${total} | Ticket Types: ${beforeStats.hasTicketTypes}/${total} | Descriptions: ${beforeStats.hasFullDescription}/${total}`);
    console.log(`   Start Times: ${beforeStats.hasStartTime}/${total} | End Times: ${beforeStats.hasEndTime}/${total} | Location Details: ${beforeStats.hasLocationDetails}/${total}`);
    
    console.log('\nAfter Enrichment:');
    console.log(`   Prices: ${afterStats.hasPrice}/${total} | Ticket Types: ${afterStats.hasTicketTypes}/${total} | Descriptions: ${afterStats.hasFullDescription}/${total}`);
    console.log(`   Start Times: ${afterStats.hasStartTime}/${total} | End Times: ${afterStats.hasEndTime}/${total} | Location Details: ${afterStats.hasLocationDetails}/${total}`);
    
    const improvements = {
        price: afterStats.hasPrice - beforeStats.hasPrice,
        ticketTypes: afterStats.hasTicketTypes - beforeStats.hasTicketTypes,
        description: afterStats.hasFullDescription - beforeStats.hasFullDescription,
        startTime: afterStats.hasStartTime - beforeStats.hasStartTime,
        endTime: afterStats.hasEndTime - beforeStats.hasEndTime,
        locationDetails: afterStats.hasLocationDetails - beforeStats.hasLocationDetails,
    };

    console.log('\n📈 Improvements:');
    console.log(`   +${improvements.price} prices | +${improvements.ticketTypes} ticket types | +${improvements.description} descriptions`);
    console.log(`   +${improvements.startTime} start times | +${improvements.endTime} end times | +${improvements.locationDetails} location details`);

    console.log('\n✅ Re-enrichment complete!\n');
}

main().catch(console.error);
