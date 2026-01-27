/**
 * Test script to check comprehensive data extraction for a specific Eventbrite event
 * 
 * Usage:
 *   npx tsx scripts/test-price-extraction.ts [eventbrite-url]
 */

import { EventbriteDetailScraper } from '../src/lib/scraper/detail-scraper';

async function main() {
    const eventUrl = process.argv[2] || 'https://www.eventbrite.ca/e/toronto-marriage-minded-singles-one-on-one-tickets-1981517745919';
    
    console.log('🔍 Testing comprehensive data extraction...');
    console.log(`   URL: ${eventUrl}\n`);
    
    try {
        const enrichment = await EventbriteDetailScraper.enrichEvent(eventUrl);
        
        console.log('📊 Extraction Results:');
        console.log('=====================================\n');
        
        // Pricing Information
        console.log('💰 PRICING:');
        console.log(`   Price: ${enrichment.price || 'Not found'}`);
        console.log(`   Price Amount: ${enrichment.priceAmount !== undefined ? `$${enrichment.priceAmount}` : 'Not found'}`);
        console.log(`   Min Price: ${enrichment.minPrice !== undefined ? `$${enrichment.minPrice}` : 'Not found'}`);
        console.log(`   Max Price: ${enrichment.maxPrice !== undefined ? `$${enrichment.maxPrice}` : 'Not found'}`);
        
        // Ticket Types
        if (enrichment.ticketTypes && enrichment.ticketTypes.length > 0) {
            console.log(`\n🎫 TICKET TYPES (${enrichment.ticketTypes.length}):`);
            enrichment.ticketTypes.forEach((ticket, i) => {
                console.log(`   ${i + 1}. ${ticket.name}`);
                console.log(`      Price: ${ticket.priceDisplay || 'Not specified'}`);
                console.log(`      Available: ${ticket.available !== false ? 'Yes' : 'No'}`);
                console.log(`      Sold Out: ${ticket.soldOut ? 'Yes' : 'No'}`);
            });
        } else {
            console.log('\n🎫 TICKET TYPES: Not found');
        }
        
        // Time Information
        console.log(`\n🕒 TIMING:`);
        console.log(`   Start Time: ${enrichment.realTime || 'Not found'}`);
        console.log(`   End Time: ${enrichment.endTime || 'Not found'}`);
        
        // Location Details
        if (enrichment.locationDetails) {
            console.log(`\n📍 LOCATION DETAILS:`);
            if (enrichment.locationDetails.venue) console.log(`   Venue: ${enrichment.locationDetails.venue}`);
            if (enrichment.locationDetails.address) console.log(`   Address: ${enrichment.locationDetails.address}`);
            if (enrichment.locationDetails.city) console.log(`   City: ${enrichment.locationDetails.city}`);
            if (enrichment.locationDetails.province) console.log(`   Province: ${enrichment.locationDetails.province}`);
            if (enrichment.locationDetails.postalCode) console.log(`   Postal Code: ${enrichment.locationDetails.postalCode}`);
            if (enrichment.locationDetails.isOnline) {
                console.log(`   Online Event: Yes`);
                if (enrichment.locationDetails.onlinePlatform) {
                    console.log(`   Platform: ${enrichment.locationDetails.onlinePlatform}`);
                }
            }
        } else {
            console.log(`\n📍 LOCATION DETAILS: Not found`);
        }
        
        // Description
        console.log(`\n📝 DESCRIPTION:`);
        console.log(`   Length: ${enrichment.fullDescription?.length || 0} characters`);
        if (enrichment.fullDescription) {
            const preview = enrichment.fullDescription.substring(0, 200);
            console.log(`   Preview: ${preview}${enrichment.fullDescription.length > 200 ? '...' : ''}`);
        } else {
            console.log(`   Content: Not found`);
        }
        
        // Status
        console.log(`\n📊 STATUS:`);
        console.log(`   Sales Ended: ${enrichment.salesEnded}`);
        console.log(`   Is Recurring: ${enrichment.isRecurring}`);
        
        // Summary
        console.log('\n=====================================');
        console.log('📈 EXTRACTION SUMMARY:');
        const extracted = [];
        if (enrichment.priceAmount !== undefined) extracted.push('✅ Price');
        if (enrichment.ticketTypes && enrichment.ticketTypes.length > 0) extracted.push(`✅ ${enrichment.ticketTypes.length} Ticket Types`);
        if (enrichment.realTime) extracted.push('✅ Start Time');
        if (enrichment.endTime) extracted.push('✅ End Time');
        if (enrichment.locationDetails) extracted.push('✅ Location Details');
        if (enrichment.fullDescription && enrichment.fullDescription.length > 100) extracted.push('✅ Full Description');
        
        if (extracted.length > 0) {
            console.log(`   ${extracted.join(', ')}`);
        } else {
            console.log('   ⚠️  No data extracted');
        }
        
        if (enrichment.priceAmount === undefined) {
            console.log('\n⚠️  WARNING: Price not extracted!');
            console.log('   This event may slip through price filters.\n');
        } else if (enrichment.priceAmount > 120) {
            console.log(`\n⚠️  WARNING: Event is expensive ($${enrichment.priceAmount})`);
            console.log('   Should be filtered by price filters.\n');
        } else {
            console.log('\n✅ Data extraction successful!\n');
        }
        
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
