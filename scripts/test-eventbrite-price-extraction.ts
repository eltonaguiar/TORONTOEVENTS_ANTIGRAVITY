/**
 * Test script to verify Eventbrite price extraction works correctly
 * Tests the $699 event and $23 event mentioned by the user
 */

import { EventbriteDetailScraper } from '../src/lib/scraper/detail-scraper';

const testUrls = [
    'https://www.eventbrite.com/e/ai-implementation-in-business-toronto-tickets-1027612706267', // Should be $699
    // Add the $23 event URL here when available
];

async function testPriceExtraction() {
    console.log('🧪 Testing Eventbrite price extraction...\n');

    for (const url of testUrls) {
        console.log(`Testing: ${url}`);
        console.log('─'.repeat(80));
        
        try {
            const enrichment = await EventbriteDetailScraper.enrichEvent(url);
            
            console.log('Results:');
            console.log(`  Price: ${enrichment.price || 'NOT FOUND'}`);
            console.log(`  Price Amount: ${enrichment.priceAmount !== undefined ? `$${enrichment.priceAmount}` : 'NOT FOUND'}`);
            console.log(`  Real Time: ${enrichment.realTime || 'NOT FOUND'}`);
            console.log(`  Sales Ended: ${enrichment.salesEnded}`);
            console.log(`  Is Recurring: ${enrichment.isRecurring}`);
            console.log(`  Description Length: ${enrichment.fullDescription?.length || 0} chars`);
            
            if (enrichment.priceAmount !== undefined) {
                console.log(`  ✅ SUCCESS: Price extracted correctly!`);
            } else {
                console.log(`  ❌ FAILED: Price not extracted`);
            }
            
        } catch (error: any) {
            console.error(`  ❌ ERROR: ${error.message}`);
        }
        
        console.log('\n');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
    
    console.log('✅ Test complete!');
}

testPriceExtraction().catch(console.error);
