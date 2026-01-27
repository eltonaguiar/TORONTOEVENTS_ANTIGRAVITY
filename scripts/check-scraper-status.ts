/**
 * Check scraper status and data completeness
 * 
 * Usage:
 *   npx tsx scripts/check-scraper-status.ts
 */

import fs from 'fs';
import path from 'path';
import { Event } from '../src/lib/types';

const eventsFile = path.join(process.cwd(), 'data', 'events.json');
const metadataFile = path.join(process.cwd(), 'data', 'metadata.json');

function main() {
    console.log('📊 Scraper Status Check\n');
    console.log('='.repeat(80));

    // Check metadata
    if (fs.existsSync(metadataFile)) {
        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
        console.log('📅 Last Scrape:');
        console.log(`   Date: ${new Date(metadata.lastUpdated).toLocaleString()}`);
        console.log(`   Total Events: ${metadata.totalEvents}`);
        console.log(`   Sources: ${metadata.sources.join(', ')}\n`);
    } else {
        console.log('⚠️  metadata.json not found\n');
    }

    // Check events
    if (!fs.existsSync(eventsFile)) {
        console.log('❌ events.json not found');
        process.exit(1);
    }

    const events: Event[] = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
    console.log(`📦 Total Events: ${events.length}\n`);

    // Eventbrite events analysis
    const eventbriteEvents = events.filter(e => e.source === 'Eventbrite');
    console.log(`🎫 Eventbrite Events: ${eventbriteEvents.length}`);

    const stats = {
        withPrice: eventbriteEvents.filter(e => e.priceAmount !== undefined).length,
        withMinMaxPrice: eventbriteEvents.filter(e => e.minPrice !== undefined || e.maxPrice !== undefined).length,
        withTicketTypes: eventbriteEvents.filter(e => e.ticketTypes && e.ticketTypes.length > 0).length,
        withFullDescription: eventbriteEvents.filter(e => e.description && e.description.length > 100).length,
        withStartTime: eventbriteEvents.filter(e => e.startTime !== undefined).length,
        withEndTime: eventbriteEvents.filter(e => e.endTime !== undefined).length,
        withLocationDetails: eventbriteEvents.filter(e => e.locationDetails !== undefined).length,
    };

    console.log('\n📊 Comprehensive Data Coverage:');
    console.log(`   Prices: ${stats.withPrice}/${eventbriteEvents.length} (${Math.round(stats.withPrice/eventbriteEvents.length*100)}%)`);
    console.log(`   Min/Max Prices: ${stats.withMinMaxPrice}/${eventbriteEvents.length} (${Math.round(stats.withMinMaxPrice/eventbriteEvents.length*100)}%)`);
    console.log(`   Ticket Types: ${stats.withTicketTypes}/${eventbriteEvents.length} (${Math.round(stats.withTicketTypes/eventbriteEvents.length*100)}%)`);
    console.log(`   Full Descriptions: ${stats.withFullDescription}/${eventbriteEvents.length} (${Math.round(stats.withFullDescription/eventbriteEvents.length*100)}%)`);
    console.log(`   Start Times: ${stats.withStartTime}/${eventbriteEvents.length} (${Math.round(stats.withStartTime/eventbriteEvents.length*100)}%)`);
    console.log(`   End Times: ${stats.withEndTime}/${eventbriteEvents.length} (${Math.round(stats.withEndTime/eventbriteEvents.length*100)}%)`);
    console.log(`   Location Details: ${stats.withLocationDetails}/${eventbriteEvents.length} (${Math.round(stats.withLocationDetails/eventbriteEvents.length*100)}%)`);

    // Fully comprehensive events
    const fullyComprehensive = eventbriteEvents.filter(e => 
        e.priceAmount !== undefined &&
        e.ticketTypes && e.ticketTypes.length > 0 &&
        e.startTime !== undefined &&
        e.endTime !== undefined &&
        e.locationDetails !== undefined &&
        e.description && e.description.length > 100
    );

    console.log(`\n✅ Fully Comprehensive Events: ${fullyComprehensive.length}/${eventbriteEvents.length} (${Math.round(fullyComprehensive.length/eventbriteEvents.length*100)}%)`);

    // Recent events (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = events.filter(e => new Date(e.lastUpdated) > oneHourAgo);
    console.log(`\n🕐 Events Updated in Last Hour: ${recentEvents.length}`);

    // Sample comprehensive event
    if (fullyComprehensive.length > 0) {
        const sample = fullyComprehensive[0];
        console.log('\n📋 Sample Comprehensive Event:');
        console.log(`   Title: ${sample.title.substring(0, 60)}...`);
        console.log(`   Price: ${sample.price} (${sample.priceAmount !== undefined ? `$${sample.priceAmount}` : 'N/A'})`);
        console.log(`   Ticket Types: ${sample.ticketTypes?.length || 0}`);
        console.log(`   Start Time: ${sample.startTime || 'N/A'}`);
        console.log(`   End Time: ${sample.endTime || 'N/A'}`);
        console.log(`   Location: ${sample.locationDetails?.venue || sample.location || 'N/A'}`);
        console.log(`   Description Length: ${sample.description?.length || 0} chars`);
    }

    // Status summary
    console.log('\n' + '='.repeat(80));
    if (fullyComprehensive.length > 0) {
        console.log('✅ Status: Comprehensive extraction is working!');
        console.log(`   ${fullyComprehensive.length} Eventbrite events have complete data.`);
        if (fullyComprehensive.length < eventbriteEvents.length) {
            console.log(`   ${eventbriteEvents.length - fullyComprehensive.length} events need re-scraping for full data.`);
        }
    } else {
        console.log('⚠️  Status: No fully comprehensive events found.');
        console.log('   Run the scraper to populate comprehensive data.');
    }
    console.log('');
}

main();
