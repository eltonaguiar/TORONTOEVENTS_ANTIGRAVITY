/**
 * Extract prices from existing events using title and description
 * Fixes events with "See tickets" by extracting prices from available text
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

interface PriceExtraction {
    eventId: string;
    title: string;
    source: string;
    oldPrice: string;
    newPrice: string;
    extractedFrom: 'title' | 'description' | 'both';
}

function extractPriceFromText(text: string): number[] {
    const prices: number[] = [];
    
    // Pattern 1: "$X" or "CA$X" or "CAD X"
    const dollarPattern = /(?:CA\$|CAD|C\$|\$)\s*(\d+(?:\.\d{2})?)/gi;
    const dollarMatches = [...text.matchAll(dollarPattern)];
    for (const match of dollarMatches) {
        const price = parseFloat(match[1]);
        if (!isNaN(price) && price >= 0 && price <= 1000) {
            // Filter false positives
            if (price !== 2024 && price !== 2025 && price !== 2026 && 
                price !== 19 && price !== 21 && price !== 18) {
                prices.push(price);
            }
        }
    }
    
    // Pattern 2: "Early Bird $X", "VIP $X", etc.
    const ticketPattern = /(?:early bird|vip|general|standard|premium|basic|regular|normal|full)\s*(?:ticket|price|admission)?\s*(?:is|for|:)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/gi;
    const ticketMatches = [...text.matchAll(ticketPattern)];
    for (const match of ticketMatches) {
        const price = parseFloat(match[1]);
        if (!isNaN(price) && price >= 0 && price <= 1000) {
            if (price !== 2024 && price !== 2025 && price !== 2026) {
                prices.push(price);
            }
        }
    }
    
    // Pattern 3: Prices in parentheses like "(Early Bird $140)"
    const parenPattern = /\([^)]*(?:early bird|vip|price|cost|ticket)\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)[^)]*\)/gi;
    const parenMatches = [...text.matchAll(parenPattern)];
    for (const match of parenMatches) {
        const price = parseFloat(match[1]);
        if (!isNaN(price) && price >= 0 && price <= 1000) {
            prices.push(price);
        }
    }
    
    return [...new Set(prices)].sort((a, b) => a - b);
}

function extractPricesFromEvent(event: Event): PriceExtraction | null {
    if (event.priceAmount && event.price !== 'See tickets' && event.price !== 'See Tickets' && event.price !== 'See App') {
        return null; // Already has valid price
    }

    const titlePrices = extractPriceFromText(event.title);
    const descPrices = event.description ? extractPriceFromText(event.description) : [];
    const allPrices = [...new Set([...titlePrices, ...descPrices])].sort((a, b) => a - b);

    if (allPrices.length === 0) {
        return null; // No prices found
    }

    const minPrice = allPrices[0];
    const maxPrice = allPrices[allPrices.length - 1];
    const newPrice = maxPrice > minPrice ? `$${minPrice} - $${maxPrice}` : `$${minPrice}`;
    
    const extractedFrom = titlePrices.length > 0 && descPrices.length > 0 ? 'both' :
                         titlePrices.length > 0 ? 'title' : 'description';

    return {
        eventId: event.id,
        title: event.title,
        source: event.source,
        oldPrice: event.price || 'See tickets',
        newPrice,
        extractedFrom
    };
}

function extractPricesFromAllEvents(): void {
    console.log('🔍 Extracting prices from event titles and descriptions...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const extractions: PriceExtraction[] = [];
    let fixedCount = 0;

    for (const event of events) {
        const extraction = extractPricesFromEvent(event);
        
        if (extraction) {
            const prices = extractPriceFromText(event.title + ' ' + (event.description || ''));
            const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);
            
            if (uniquePrices.length > 0) {
                const minPrice = uniquePrices[0];
                const maxPrice = uniquePrices[uniquePrices.length - 1];
                
                event.price = maxPrice > minPrice ? `$${minPrice} - $${maxPrice}` : `$${minPrice}`;
                event.priceAmount = minPrice;
                event.minPrice = minPrice;
                if (maxPrice > minPrice) {
                    event.maxPrice = maxPrice;
                }
                event.isFree = minPrice === 0;

                extractions.push(extraction);
                fixedCount++;
            }
        }
    }

    // Save updated events
    writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    // Generate report
    const report = {
        summary: {
            total_events: events.length,
            prices_extracted: fixedCount,
            extraction_by_source: extractions.reduce((acc, e) => {
                acc[e.source] = (acc[e.source] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number }),
            extraction_by_method: {
                from_title: extractions.filter(e => e.extractedFrom === 'title').length,
                from_description: extractions.filter(e => e.extractedFrom === 'description').length,
                from_both: extractions.filter(e => e.extractedFrom === 'both').length
            }
        },
        extractions: extractions.slice(0, 50) // First 50
    };

    const reportPath = join(process.cwd(), 'price-extraction-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 EXTRACTION RESULTS:`);
    console.log(`  Total events: ${events.length}`);
    console.log(`  Prices extracted: ${fixedCount}`);
    console.log(`\n📋 Extractions by source:`);
    for (const [source, count] of Object.entries(report.summary.extraction_by_source)) {
        console.log(`  ${source}: ${count}`);
    }
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);
    console.log(`📄 Extraction report saved to: ${reportPath}`);
}

extractPricesFromAllEvents();
