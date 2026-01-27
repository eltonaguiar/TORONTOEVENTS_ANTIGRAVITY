/**
 * Batch fix pricing errors for all events
 * Systematically fixes common pricing issues
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import { safeParsePrice } from '../src/lib/utils/priceHelpers';

interface FixResult {
    eventId: string;
    title: string;
    source: string;
    oldPrice: string;
    newPrice: string;
    reason: string;
}

function fixPricingErrors(): void {
    console.log('🔧 Batch fixing pricing errors...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const fixes: FixResult[] = [];
    let fixedCount = 0;

    for (const event of events) {
        const priceResult = safeParsePrice(event.price, event.priceAmount, event.id, event.title);
        let needsFix = false;
        let newPrice = event.price;
        let newPriceAmount = event.priceAmount;
        let reason = '';

        // Fix Thursday events
        if ((event.source === 'Thursday' || event.url?.includes('getthursday.com')) && 
            (!event.priceAmount || event.price === 'See App' || event.price === 'See tickets')) {
            newPrice = '$10 - $15';
            newPriceAmount = 10;
            event.minPrice = 10;
            event.maxPrice = 15;
            needsFix = true;
            reason = 'Thursday events typically $10-$15';
        }
        // Fix events with "See tickets" that might have price in title/description
        else if (event.price === 'See tickets' || event.price === 'See Tickets') {
            // Try to extract from title
            const titleMatch = event.title.match(/\$(\d+(?:\.\d{2})?)/);
            if (titleMatch) {
                const price = parseFloat(titleMatch[1]);
                if (price >= 0 && price <= 500) {
                    newPrice = `$${price}`;
                    newPriceAmount = price;
                    needsFix = true;
                    reason = 'Extracted from title';
                }
            }
            // Try to extract from description
            else if (event.description) {
                const descMatch = event.description.match(/(?:price|cost|ticket)\s*(?:is|of|for|:)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i);
                if (descMatch) {
                    const price = parseFloat(descMatch[1]);
                    if (price >= 0 && price <= 500) {
                        newPrice = `$${price}`;
                        newPriceAmount = price;
                        needsFix = true;
                        reason = 'Extracted from description';
                    }
                }
            }
        }

        if (needsFix) {
            const oldPrice = event.price || 'Missing';
            event.price = newPrice;
            event.priceAmount = newPriceAmount;
            event.isFree = newPriceAmount === 0;

            fixes.push({
                eventId: event.id,
                title: event.title,
                source: event.source,
                oldPrice,
                newPrice,
                reason
            });

            fixedCount++;
        }
    }

    // Save updated events
    writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    // Generate report
    const report = {
        summary: {
            total_events: events.length,
            events_fixed: fixedCount,
            fixes_by_source: fixes.reduce((acc, fix) => {
                acc[fix.source] = (acc[fix.source] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number })
        },
        fixes: fixes.slice(0, 100), // First 100 fixes
        all_fixes_count: fixes.length
    };

    const reportPath = join(process.cwd(), 'pricing-fixes-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 BATCH FIX RESULTS:`);
    console.log(`  Total events: ${events.length}`);
    console.log(`  Events fixed: ${fixedCount}`);
    console.log(`\n📋 Fixes by source:`);
    for (const [source, count] of Object.entries(report.summary.fixes_by_source)) {
        console.log(`  ${source}: ${count}`);
    }
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);
    console.log(`📄 Fix report saved to: ${reportPath}`);
}

fixPricingErrors();
