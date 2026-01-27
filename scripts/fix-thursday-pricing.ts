/**
 * Fix pricing for Thursday events
 * Extracts prices from event pages and updates events.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Event } from '../src/lib/types';

interface PriceFix {
    eventId: string;
    title: string;
    url: string;
    oldPrice: string;
    newPrice: string;
    priceAmount?: number;
    minPrice?: number;
    maxPrice?: number;
}

async function extractPriceFromThursdayPage(url: string): Promise<{
    price?: string;
    priceAmount?: number;
    minPrice?: number;
    maxPrice?: number;
}> {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const bodyText = $('body').text();
        
        // Look for price patterns in the page
        const pricePatterns = [
            // Match "Early Bird $X" and "General Admission $Y"
            /(?:early bird|general admission|ticket)\s*(?:is|for|:)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/gi,
            // Match dollar amounts
            /\$\s*(\d+(?:\.\d{2})?)/g,
            // Match prices in text
            /(?:price|cost|ticket)\s*(?:is|of|for|:)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/gi
        ];

        const prices: number[] = [];
        
        for (const pattern of pricePatterns) {
            const matches = [...bodyText.matchAll(pattern)];
            for (const match of matches) {
                const price = parseFloat(match[1]);
                // Filter reasonable prices (between $0 and $200 for Thursday events)
                if (!isNaN(price) && price >= 0 && price <= 200) {
                    // Filter out common false positives (years, ages, etc.)
                    if (price !== 2024 && price !== 2025 && price !== 2026 && price !== 19 && price !== 21) {
                        prices.push(price);
                    }
                }
            }
        }

        // Remove duplicates and sort
        const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);

        if (uniquePrices.length > 0) {
            const minPrice = uniquePrices[0];
            const maxPrice = uniquePrices[uniquePrices.length - 1];
            
            return {
                price: maxPrice > minPrice ? `$${minPrice} - $${maxPrice}` : `$${minPrice}`,
                priceAmount: minPrice,
                minPrice,
                maxPrice: maxPrice > minPrice ? maxPrice : undefined
            };
        }

        return {};
    } catch (error: any) {
        console.error(`Failed to extract price from ${url}:`, error.message);
        return {};
    }
}

async function fixThursdayPricing(): Promise<void> {
    console.log('🔍 Auditing Thursday events for pricing errors...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const thursdayEvents = events.filter(e => 
        e.source === 'Thursday' || 
        (e.url && e.url.includes('getthursday.com'))
    );

    console.log(`Found ${thursdayEvents.length} Thursday events to check\n`);

    const fixes: PriceFix[] = [];
    let fixedCount = 0;

    for (const event of thursdayEvents) {
        // Skip if already has a valid price
        if (event.priceAmount && event.price !== 'See App' && event.price !== 'See tickets') {
            continue;
        }

        console.log(`Checking: ${event.title.substring(0, 50)}...`);
        console.log(`  URL: ${event.url}`);
        console.log(`  Current price: ${event.price}`);

        const priceData = await extractPriceFromThursdayPage(event.url);
        
        if (priceData.price && priceData.priceAmount) {
            const oldPrice = event.price;
            event.price = priceData.price;
            event.priceAmount = priceData.priceAmount;
            if (priceData.minPrice) event.minPrice = priceData.minPrice;
            if (priceData.maxPrice) event.maxPrice = priceData.maxPrice;
            event.isFree = priceData.priceAmount === 0;

            fixes.push({
                eventId: event.id,
                title: event.title,
                url: event.url,
                oldPrice,
                newPrice: priceData.price,
                priceAmount: priceData.priceAmount,
                minPrice: priceData.minPrice,
                maxPrice: priceData.maxPrice
            });

            fixedCount++;
            console.log(`  ✅ Fixed: ${oldPrice} → ${priceData.price}\n`);
        } else {
            console.log(`  ⚠️  Could not extract price\n`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Special fix for the flagged event
    const flaggedEvent = events.find(e => 
        e.url && e.url.includes('thursday-bangarang-lgbtq-toronto-2')
    );

    if (flaggedEvent && (!flaggedEvent.priceAmount || flaggedEvent.price === 'See App')) {
        // Set to $10-$15 range as specified
        flaggedEvent.price = '$10 - $15';
        flaggedEvent.priceAmount = 10;
        flaggedEvent.minPrice = 10;
        flaggedEvent.maxPrice = 15;
        flaggedEvent.isFree = false;

        if (!fixes.find(f => f.eventId === flaggedEvent.id)) {
            fixes.push({
                eventId: flaggedEvent.id,
                title: flaggedEvent.title,
                url: flaggedEvent.url,
                oldPrice: flaggedEvent.price || 'See App',
                newPrice: '$10 - $15',
                priceAmount: 10,
                minPrice: 10,
                maxPrice: 15
            });
            fixedCount++;
        }

        console.log(`\n✅ Fixed flagged event: ${flaggedEvent.title}`);
        console.log(`   Price: ${flaggedEvent.price}`);
    }

    // Save updated events
    writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    // Generate report
    const report = {
        audit_summary: {
            totaleventschecked: thursdayEvents.length,
            pricingerrorsfound: fixes.length,
            status: 'complete' as const
        },
        flagged_event: flaggedEvent ? {
            event_name: flaggedEvent.title,
            url: flaggedEvent.url,
            current_price: flaggedEvent.price || 'See App',
            expected_price: '$10 - $15',
            correction_needed: 'Updated to $10 - $15 range'
        } : null,
        otherpricingissues: fixes.map(f => ({
            event_name: f.title,
            current_price: f.oldPrice,
            corrected_price: f.newPrice,
            reason: 'Extracted from event page'
        })),
        next_steps: [
            'Re-run scraper to ensure prices are extracted going forward',
            'Update Thursday scraper to extract prices automatically',
            'Monitor for pricing changes on event pages'
        ]
    };

    const reportPath = join(process.cwd(), 'thursday-pricing-audit-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 AUDIT SUMMARY:`);
    console.log(`  Total Thursday events checked: ${thursdayEvents.length}`);
    console.log(`  Pricing errors fixed: ${fixedCount}`);
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);
    console.log(`📄 Audit report saved to: ${reportPath}`);
}

fixThursdayPricing().catch(console.error);
