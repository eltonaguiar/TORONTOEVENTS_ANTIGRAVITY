/**
 * Aggressive price extraction from existing events
 * Extracts prices from titles, descriptions, and applies intelligent defaults
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

interface ExtractionResult {
    eventId: string;
    title: string;
    source: string;
    oldPrice: string;
    newPrice: string;
    priceAmount: number;
    method: string;
}

function extractAllPrices(text: string): number[] {
    const prices: number[] = [];
    
    // Pattern 1: Direct dollar amounts "$X" or "CA$X"
    const dollarPattern = /(?:CA\$|CAD|C\$|\$)\s*(\d+(?:\.\d{2})?)/gi;
    const dollarMatches = [...text.matchAll(dollarPattern)];
    for (const match of dollarMatches) {
        const price = parseFloat(match[1]);
        if (!isNaN(price) && price >= 0 && price <= 2000) {
            // Filter false positives
            if (price !== 2024 && price !== 2025 && price !== 2026 && 
                price !== 19 && price !== 21 && price !== 18 && price !== 20) {
                prices.push(price);
            }
        }
    }
    
    // Pattern 2: Ticket types with prices
    const ticketPattern = /(?:early bird|vip|general|standard|premium|basic|regular|normal|full|admission|ticket)\s*(?:ticket|price|admission|pass)?\s*(?:is|for|:)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/gi;
    const ticketMatches = [...text.matchAll(ticketPattern)];
    for (const match of ticketMatches) {
        const price = parseFloat(match[1]);
        if (!isNaN(price) && price >= 0 && price <= 2000) {
            if (price !== 2024 && price !== 2025 && price !== 2026) {
                prices.push(price);
            }
        }
    }
    
    // Pattern 3: Prices in parentheses "(Early Bird $140)"
    const parenPattern = /\([^)]*(?:early bird|vip|price|cost|ticket|from|starting)\s*(?:at|is|for)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)[^)]*\)/gi;
    const parenMatches = [...text.matchAll(parenPattern)];
    for (const match of parenMatches) {
        const price = parseFloat(match[1]);
        if (!isNaN(price) && price >= 0 && price <= 2000) {
            prices.push(price);
        }
    }
    
    // Pattern 4: "from $X", "starting at $X"
    const fromPattern = /(?:from|starting at|tickets from|price from|cost from)\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/gi;
    const fromMatches = [...text.matchAll(fromPattern)];
    for (const match of fromMatches) {
        const price = parseFloat(match[1]);
        if (!isNaN(price) && price >= 0 && price <= 2000) {
            if (price !== 2024 && price !== 2025 && price !== 2026) {
                prices.push(price);
            }
        }
    }
    
    // Pattern 5: "$X for Y" or "$X/Y" (e.g., "$35 for 1", "$60 for 2")
    const forPattern = /\$\s*(\d+(?:\.\d{2})?)\s*(?:for|\/)/gi;
    const forMatches = [...text.matchAll(forPattern)];
    for (const match of forMatches) {
        const price = parseFloat(match[1]);
        if (!isNaN(price) && price >= 0 && price <= 2000) {
            prices.push(price);
        }
    }
    
    return [...new Set(prices)].sort((a, b) => a - b);
}

function extractPriceForEvent(event: Event): ExtractionResult | null {
    // Skip if already has valid price
    if (event.priceAmount && 
        event.price !== 'See tickets' && 
        event.price !== 'See Tickets' && 
        event.price !== 'See App' &&
        event.price !== 'Free') {
        return null;
    }

    const combinedText = `${event.title} ${event.description || ''}`;
    const prices = extractAllPrices(combinedText);

    if (prices.length === 0) {
        return null;
    }

    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    const newPrice = maxPrice > minPrice ? `$${minPrice} - $${maxPrice}` : `$${minPrice}`;
    
    // Determine extraction method
    let method = 'extracted from text';
    if (event.title.match(/\$/)) {
        method = 'extracted from title';
    } else if (event.description && event.description.match(/\$/)) {
        method = 'extracted from description';
    }

    return {
        eventId: event.id,
        title: event.title,
        source: event.source,
        oldPrice: event.price || 'See tickets',
        newPrice,
        priceAmount: minPrice,
        method
    };
}

function aggressivePriceExtraction(): void {
    console.log('🔍 Aggressive price extraction from all events...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const extractions: ExtractionResult[] = [];
    let fixedCount = 0;

    for (const event of events) {
        const extraction = extractPriceForEvent(event);
        
        if (extraction) {
            const combinedText = `${event.title} ${event.description || ''}`;
            const prices = extractAllPrices(combinedText);
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
                from_title: extractions.filter(e => e.method.includes('title')).length,
                from_description: extractions.filter(e => e.method.includes('description')).length,
                from_text: extractions.filter(e => e.method.includes('text')).length
            }
        },
        sample_extractions: extractions.slice(0, 100)
    };

    const reportPath = join(process.cwd(), 'aggressive-price-extraction-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 AGGRESSIVE EXTRACTION RESULTS:`);
    console.log(`  Total events: ${events.length}`);
    console.log(`  Prices extracted: ${fixedCount}`);
    console.log(`\n📋 Extractions by source:`);
    for (const [source, count] of Object.entries(report.summary.extraction_by_source)) {
        console.log(`  ${source}: ${count}`);
    }
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);
    console.log(`📄 Extraction report saved to: ${reportPath}`);
}

aggressivePriceExtraction();
