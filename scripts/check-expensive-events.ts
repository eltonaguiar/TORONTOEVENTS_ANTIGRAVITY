/**
 * Check for expensive events in the current data that should be filtered
 * 
 * Usage:
 *   npx tsx scripts/check-expensive-events.ts
 */

import fs from 'fs';
import path from 'path';

const eventsFile = path.join(process.cwd(), 'data', 'events.json');

if (!fs.existsSync(eventsFile)) {
    console.error('❌ events.json not found');
    process.exit(1);
}

const events = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));

console.log('🔍 Checking for expensive events...\n');

const expensiveEvents = events.filter((e: any) => {
    // Check priceAmount
    if (e.priceAmount !== undefined && e.priceAmount > 120) {
        return true;
    }
    
    // Check description for high prices
    if (e.description) {
        const descText = e.description.toLowerCase();
        const highPricePatterns = [
            /(?:CA\$|CAD|C\$|\$)\s*(\d{3,}(?:\.\d{2})?)/g,
            /(?:regular|normal|full|standard)\s+price[^.]*?(?:CA\$|CAD|C\$|\$)?\s*(\d{3,}(?:\.\d{2})?)/gi,
            /(?:price|cost|fee)\s+(?:is|of|for)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d{3,}(?:\.\d{2})?)/gi
        ];
        
        for (const pattern of highPricePatterns) {
            const matches = [...descText.matchAll(pattern)];
            for (const match of matches) {
                const price = parseFloat(match[1]);
                if (!isNaN(price) && price > 120) {
                    return true;
                }
            }
        }
    }
    
    return false;
});

if (expensiveEvents.length === 0) {
    console.log('✅ No expensive events found in current data.\n');
} else {
    console.log(`⚠️  Found ${expensiveEvents.length} expensive events:\n`);
    
    expensiveEvents.forEach((e: any) => {
        const priceInfo = e.priceAmount !== undefined 
            ? `$${e.priceAmount}` 
            : 'Price in description';
        console.log(`  - "${e.title}"`);
        console.log(`    Source: ${e.source}`);
        console.log(`    Price: ${priceInfo}`);
        console.log(`    URL: ${e.url}`);
        console.log('');
    });
    
    console.log('💡 These events should be filtered by price filters.\n');
}

process.exit(0);
