/**
 * QA: Sample price extraction to verify pricing logic
 * Checks a sample of events without prices and extracts from their pages
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Event } from '../src/lib/types';

interface PriceCheckResult {
    eventId: string;
    title: string;
    url: string;
    source: string;
    oldPrice: string;
    foundPrice?: string;
    foundPriceAmount?: number;
    ticketTypes?: Array<{ name: string; price: number }>;
    method: string;
    success: boolean;
}

async function extractPriceFromPage(url: string): Promise<{
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
        
        const prices: number[] = [];
        const ticketTypes: Array<{ name: string; price: number }> = [];

        // Method 1: JSON-LD
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

        // Method 2: HTML selectors
        const priceSelectors = [
            '[data-testid="price"]',
            '.event-price',
            '.ticket-price',
            '.price-display',
            '[itemprop="price"]',
            '.price',
            '.cost'
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

        // Method 3: Text patterns
        const patterns = [
            /(?:CA\$|CAD|C\$|\$)\s*(\d+(?:\.\d{2})?)/gi,
            /(?:early bird|vip|general|standard|premium|basic|regular|normal|full|admission|ticket|student|senior)\s*(?:ticket|price|admission|pass)?\s*(?:is|for|:)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/gi,
            /\([^)]*(?:early bird|vip|price|cost|ticket|from|starting)\s*(?:at|is|for)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)[^)]*\)/gi,
            /(?:from|starting at|tickets from|price from|cost from)\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/gi,
            /\$\s*(\d+(?:\.\d{2})?)\s*(?:for|\/)/gi
        ];

        for (const pattern of patterns) {
            const matches = [...bodyText.matchAll(pattern)];
            for (const match of matches) {
                const price = parseFloat(match[1] || match[2] || match[0]);
                if (!isNaN(price) && price >= 0 && price <= 5000) {
                    if (price !== 2024 && price !== 2025 && price !== 2026 && 
                        price !== 19 && price !== 21 && price !== 18 && price !== 20) {
                        prices.push(price);
                    }
                }
            }
        }

        const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);

        if (uniquePrices.length > 0) {
            const minPrice = uniquePrices[0];
            const maxPrice = uniquePrices[uniquePrices.length - 1];
            
            if (ticketTypes.length > 0) {
                const uniqueTicketTypes = ticketTypes.filter((t, i, arr) => 
                    arr.findIndex(tt => tt.name === t.name && tt.price === t.price) === i
                );
                
                if (uniqueTicketTypes.length > 1) {
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

async function qaSamplePriceCheck(): Promise<void> {
    console.log('🔍 QA: Sampling events without prices...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const eventsNeedingPrices = events.filter(e => 
        !e.priceAmount || 
        e.price === 'See tickets' || 
        e.price === 'See Tickets' || 
        e.price === 'See App'
    );

    console.log(`Total events needing prices: ${eventsNeedingPrices.length}\n`);

    // Sample first 20 events for QA
    const sampleSize = Math.min(20, eventsNeedingPrices.length);
    const sample = eventsNeedingPrices.slice(0, sampleSize);

    console.log(`Checking sample of ${sampleSize} events...\n`);

    const results: PriceCheckResult[] = [];
    let successCount = 0;

    for (let i = 0; i < sample.length; i++) {
        const event = sample[i];
        console.log(`[${i + 1}/${sample.length}] ${event.title.substring(0, 50)}...`);

        const priceData = await extractPriceFromPage(event.url);
        
        const result: PriceCheckResult = {
            eventId: event.id,
            title: event.title,
            url: event.url,
            source: event.source,
            oldPrice: event.price || 'See tickets',
            method: priceData.method,
            success: false
        };

        if (priceData.price && priceData.priceAmount) {
            result.foundPrice = priceData.price;
            result.foundPriceAmount = priceData.priceAmount;
            result.ticketTypes = priceData.ticketTypes;
            result.success = true;
            successCount++;
            console.log(`  ✅ Found: ${priceData.price} (${priceData.method})`);
        } else {
            console.log(`  ⚠️  ${priceData.method}`);
        }

        results.push(result);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Generate report
    const report = {
        summary: {
            total_events_needing_prices: eventsNeedingPrices.length,
            sample_size: sampleSize,
            prices_found: successCount,
            success_rate: `${((successCount / sampleSize) * 100).toFixed(1)}%`,
            extraction_by_source: results.reduce((acc, r) => {
                if (r.success) {
                    acc[r.source] = (acc[r.source] || 0) + 1;
                }
                return acc;
            }, {} as { [key: string]: number })
        },
        results: results,
        recommendation: successCount > 0 
            ? `Found prices for ${successCount}/${sampleSize} events. Consider running full extraction script.`
            : 'No prices found in sample. May need enhanced extraction or Puppeteer for JavaScript-rendered prices.'
    };

    const reportPath = join(process.cwd(), 'qa-price-sample-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 QA SAMPLE RESULTS:`);
    console.log(`  Sample size: ${sampleSize}`);
    console.log(`  Prices found: ${successCount}`);
    console.log(`  Success rate: ${report.summary.success_rate}`);
    console.log(`\n💾 Report saved to: ${reportPath}`);
    console.log(`\n💡 Recommendation: ${report.recommendation}`);
}

qaSamplePriceCheck().catch(console.error);
