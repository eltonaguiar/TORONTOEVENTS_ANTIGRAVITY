/**
 * QA: Comprehensive price extraction from event pages
 * Visits each event page and extracts prices thoroughly
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Event } from '../src/lib/types';

interface PriceExtraction {
    eventId: string;
    title: string;
    url: string;
    source: string;
    oldPrice: string;
    newPrice: string;
    ticketTypes?: Array<{ name: string; price: number }>;
    method: string;
}

async function extractPricesFromPage(url: string, title: string): Promise<{
    price?: string;
    priceAmount?: number;
    minPrice?: number;
    maxPrice?: number;
    ticketTypes?: Array<{ name: string; price: number }>;
    method: string;
}> {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000,
            maxRedirects: 5
        });

        const $ = cheerio.load(response.data);
        const bodyText = $('body').text();
        
        // Extract all prices from the page
        const prices: number[] = [];
        const ticketTypes: Array<{ name: string; price: number }> = [];

        // Method 1: JSON-LD structured data
        const ldScripts = $('script[type="application/ld+json"]');
        ldScripts.each((_, el) => {
            try {
                const data = JSON.parse($(el).html() || '{}');
                const items = Array.isArray(data) ? data : [data];
                
                for (const item of items) {
                    if (item['@type'] === 'Event' || (Array.isArray(item['@type']) && item['@type'].includes('Event'))) {
                        if (item.offers) {
                            const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
                            for (const offer of offers) {
                                if (offer.price) {
                                    let price: number;
                                    if (typeof offer.price === 'number') {
                                        price = offer.price;
                                    } else if (typeof offer.price === 'string') {
                                        const match = offer.price.match(/(\d+(?:\.\d{2})?)/);
                                        price = match ? parseFloat(match[1]) : NaN;
                                    } else {
                                        continue;
                                    }
                                    
                                    if (!isNaN(price) && price >= 0 && price <= 5000) {
                                        prices.push(price);
                                        if (offer.name || offer.priceCurrency) {
                                            ticketTypes.push({
                                                name: offer.name || 'General Admission',
                                                price: price
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // Skip invalid JSON
            }
        });

        // Method 2: HTML price selectors
        const priceSelectors = [
            '[data-testid="price"]',
            '.event-price',
            '.ticket-price',
            '.price-display',
            '[itemprop="price"]',
            '.price',
            '.cost',
            '.ticket-cost',
            '[class*="price"]',
            '[class*="cost"]'
        ];

        for (const selector of priceSelectors) {
            $(selector).each((_, el) => {
                const text = $(el).text().trim();
                const matches = text.matchAll(/(?:CA\$|CAD|C\$|\$)\s*(\d+(?:\.\d{2})?)/gi);
                for (const match of matches) {
                    const price = parseFloat(match[1]);
                    if (!isNaN(price) && price >= 0 && price <= 5000) {
                        prices.push(price);
                    }
                }
            });
        }

        // Method 3: Text pattern matching (comprehensive)
        const patterns = [
            // Direct prices
            /(?:CA\$|CAD|C\$|\$)\s*(\d+(?:\.\d{2})?)/gi,
            // Ticket types with prices
            /(?:early bird|vip|general|standard|premium|basic|regular|normal|full|admission|ticket|student|senior)\s*(?:ticket|price|admission|pass)?\s*(?:is|for|:)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/gi,
            // Prices in parentheses
            /\([^)]*(?:early bird|vip|price|cost|ticket|from|starting)\s*(?:at|is|for)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)[^)]*\)/gi,
            // "from $X", "starting at $X"
            /(?:from|starting at|tickets from|price from|cost from)\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/gi,
            // "$X for Y"
            /\$\s*(\d+(?:\.\d{2})?)\s*(?:for|\/)/gi
        ];

        for (const pattern of patterns) {
            const matches = [...bodyText.matchAll(pattern)];
            for (const match of matches) {
                const price = parseFloat(match[1] || match[2] || match[0]);
                if (!isNaN(price) && price >= 0 && price <= 5000) {
                    // Filter false positives
                    if (price !== 2024 && price !== 2025 && price !== 2026 && 
                        price !== 19 && price !== 21 && price !== 18 && price !== 20) {
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
            
            // If we have ticket types, use them
            if (ticketTypes.length > 0) {
                const uniqueTicketTypes = ticketTypes.filter((t, i, arr) => 
                    arr.findIndex(tt => tt.name === t.name && tt.price === t.price) === i
                );
                
                if (uniqueTicketTypes.length > 1) {
                    // Multiple ticket types - create detailed price string
                    const priceStr = uniqueTicketTypes
                        .map(t => `${t.name}: $${t.price}`)
                        .join(', ');
                    return {
                        price: priceStr,
                        priceAmount: minPrice,
                        minPrice,
                        maxPrice,
                        ticketTypes: uniqueTicketTypes,
                        method: 'extracted from JSON-LD and page'
                    };
                }
            }
            
            // Single price or range
            const price = maxPrice > minPrice ? `$${minPrice} - $${maxPrice}` : `$${minPrice}`;
            return {
                price,
                priceAmount: minPrice,
                minPrice,
                maxPrice: maxPrice > minPrice ? maxPrice : undefined,
                ticketTypes: ticketTypes.length > 0 ? ticketTypes : undefined,
                method: 'extracted from page'
            };
        }

        return { method: 'no prices found' };
    } catch (error: any) {
        return { method: `error: ${error.message}` };
    }
}

async function qaExtractAllPrices(): Promise<void> {
    console.log('🔍 QA: Extracting prices from all event pages...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const eventsNeedingPrices = events.filter(e => 
        !e.priceAmount || 
        e.price === 'See tickets' || 
        e.price === 'See Tickets' || 
        e.price === 'See App'
    );

    console.log(`Found ${eventsNeedingPrices.length} events needing prices\n`);

    const extractions: PriceExtraction[] = [];
    let fixedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < eventsNeedingPrices.length; i++) {
        const event = eventsNeedingPrices[i];
        console.log(`[${i + 1}/${eventsNeedingPrices.length}] Checking: ${event.title.substring(0, 50)}...`);

        const priceData = await extractPricesFromPage(event.url, event.title);
        
        if (priceData.price && priceData.priceAmount) {
            const oldPrice = event.price || 'See tickets';
            event.price = priceData.price;
            event.priceAmount = priceData.priceAmount;
            if (priceData.minPrice) event.minPrice = priceData.minPrice;
            if (priceData.maxPrice) event.maxPrice = priceData.maxPrice;
            if (priceData.ticketTypes) {
                // Store ticket types in description or a custom field
                event.description = event.description || '';
                if (priceData.ticketTypes.length > 1) {
                    const ticketInfo = '\n\nTicket Prices: ' + priceData.ticketTypes
                        .map(t => `${t.name}: $${t.price}`)
                        .join(', ');
                    event.description += ticketInfo;
                }
            }
            event.isFree = priceData.priceAmount === 0;

            extractions.push({
                eventId: event.id,
                title: event.title,
                url: event.url,
                source: event.source,
                oldPrice,
                newPrice: priceData.price,
                ticketTypes: priceData.ticketTypes,
                method: priceData.method
            });

            fixedCount++;
            console.log(`  ✅ Fixed: ${oldPrice} → ${priceData.price} (${priceData.method})\n`);
        } else {
            errorCount++;
            console.log(`  ⚠️  Could not extract price (${priceData.method})\n`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Save progress every 50 events
        if ((i + 1) % 50 === 0) {
            writeFileSync(eventsPath, JSON.stringify(events, null, 2));
            console.log(`💾 Progress saved (${i + 1}/${eventsNeedingPrices.length})\n`);
        }
    }

    // Final save
    writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    // Generate report
    const report = {
        summary: {
            total_events_checked: eventsNeedingPrices.length,
            prices_extracted: fixedCount,
            extraction_failed: errorCount,
            extraction_by_source: extractions.reduce((acc, e) => {
                acc[e.source] = (acc[e.source] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number })
        },
        sample_extractions: extractions.slice(0, 50)
    };

    const reportPath = join(process.cwd(), 'qa-price-extraction-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 QA EXTRACTION RESULTS:`);
    console.log(`  Events checked: ${eventsNeedingPrices.length}`);
    console.log(`  Prices extracted: ${fixedCount}`);
    console.log(`  Failed: ${errorCount}`);
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);
    console.log(`📄 QA report saved to: ${reportPath}`);
}

qaExtractAllPrices().catch(console.error);
