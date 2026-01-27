/**
 * Comprehensive Price Extraction Investigation
 * 
 * This script investigates why prices are failing to extract correctly from event pages.
 * It tests:
 * 1. Direct Eventbrite events
 * 2. AllEvents.in → Eventbrite link following
 * 3. Price extraction methods (JSON-LD, HTML selectors, text patterns)
 * 4. Ticket type extraction for multi-tier events
 */

import { EventbriteDetailScraper } from '../src/lib/scraper/detail-scraper';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { readFileSync } from 'fs';
import { join } from 'path';

interface InvestigationResult {
    eventUrl: string;
    source: 'Eventbrite' | 'AllEvents';
    title?: string;
    success: boolean;
    extractedPrice?: string;
    extractedPriceAmount?: number;
    extractedMinPrice?: number;
    extractedMaxPrice?: number;
    extractedTicketTypes?: number;
    methods: {
        jsonLd: { found: boolean; prices: number[]; details: string };
        htmlSelectors: { found: boolean; prices: number[]; details: string };
        textPatterns: { found: boolean; prices: number[]; details: string };
    };
    pageAnalysis: {
        hasJsonLd: boolean;
        jsonLdOffers: number;
        priceElements: number;
        priceText: string[];
        errors: string[];
    };
}

async function investigateEventbriteEvent(url: string): Promise<InvestigationResult> {
    const result: InvestigationResult = {
        eventUrl: url,
        source: 'Eventbrite',
        success: false,
        methods: {
            jsonLd: { found: false, prices: [], details: '' },
            htmlSelectors: { found: false, prices: [], details: '' },
            textPatterns: { found: false, prices: [], details: '' }
        },
        pageAnalysis: {
            hasJsonLd: false,
            jsonLdOffers: 0,
            priceElements: 0,
            priceText: [],
            errors: []
        }
    };

    try {
        console.log(`\n🔍 Investigating: ${url}`);
        
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        const $ = cheerio.load(response.data);
        const bodyText = $('body').text();

        // Extract title
        result.title = $('h1').first().text().trim() || 
                      $('[data-testid="event-title"]').first().text().trim() ||
                      $('title').text().trim();

        // Analyze JSON-LD
        const scripts = $('script[type="application/ld+json"]');
        result.pageAnalysis.hasJsonLd = scripts.length > 0;

        const allPrices: number[] = [];
        const priceTexts: string[] = [];

        // Method 1: JSON-LD extraction
        for (let i = 0; i < scripts.length; i++) {
            try {
                const jsonText = $(scripts[i]).html();
                if (!jsonText) continue;
                const data = JSON.parse(jsonText);
                const items = Array.isArray(data) ? data : [data];

                for (const item of items) {
                    const itemType = item['@type'];
                    if (itemType && typeof itemType === 'string' && itemType.includes('Event')) {
                        if (item.offers) {
                            const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
                            result.pageAnalysis.jsonLdOffers = offers.length;

                            for (const offer of offers) {
                                if (offer.price !== undefined && offer.price !== null) {
                                    const p = typeof offer.price === 'string'
                                        ? parseFloat(offer.price.replace(/[^\d.]/g, ''))
                                        : parseFloat(String(offer.price));
                                    if (!isNaN(p) && p >= 0 && p < 100000) {
                                        allPrices.push(p);
                                        result.methods.jsonLd.prices.push(p);
                                        result.methods.jsonLd.found = true;
                                    }
                                }
                                if (offer.lowPrice !== undefined && offer.lowPrice !== null) {
                                    const lp = typeof offer.lowPrice === 'string'
                                        ? parseFloat(offer.lowPrice.replace(/[^\d.]/g, ''))
                                        : parseFloat(String(offer.lowPrice));
                                    if (!isNaN(lp) && lp >= 0 && lp < 100000) {
                                        allPrices.push(lp);
                                        result.methods.jsonLd.prices.push(lp);
                                        result.methods.jsonLd.found = true;
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e: any) {
                result.pageAnalysis.errors.push(`JSON-LD parse error: ${e.message}`);
            }
        }

        result.methods.jsonLd.details = result.methods.jsonLd.found
            ? `Found ${result.methods.jsonLd.prices.length} prices: ${result.methods.jsonLd.prices.join(', ')}`
            : 'No prices found in JSON-LD';

        // Method 2: HTML selector extraction
        const priceSelectors = [
            '[data-testid="price"]',
            '.event-price',
            '.ticket-price',
            '.price-display',
            '[itemprop="price"]',
            '.eds-text-color--primary-brand',
            '.eds-text-weight--heavy',
            '[class*="price"]',
            '[class*="ticket"]'
        ];

        for (const selector of priceSelectors) {
            const priceEl = $(selector);
            if (priceEl.length > 0) {
                result.pageAnalysis.priceElements += priceEl.length;
                priceEl.each((_, el) => {
                    const text = $(el).text().trim();
                    if (text && !priceTexts.includes(text)) {
                        priceTexts.push(text);
                    }

                    const patterns = [
                        /(?:CA\$|CAD|C\$)\s*(\d+(?:\.\d{2})?)/i,
                        /\$\s*(\d+(?:\.\d{2})?)/i,
                        /(?:from|starting at|tickets from)\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i,
                        /(\d+(?:\.\d{2})?)\s*(?:CAD|CA\$|C\$)/i
                    ];

                    for (const pattern of patterns) {
                        const match = text.match(pattern);
                        if (match) {
                            const p = parseFloat(match[1]);
                            if (!isNaN(p) && p >= 0 && p < 100000) {
                                allPrices.push(p);
                                result.methods.htmlSelectors.prices.push(p);
                                result.methods.htmlSelectors.found = true;
                            }
                        }
                    }

                    if (text.toLowerCase().includes('free')) {
                        allPrices.push(0);
                        result.methods.htmlSelectors.prices.push(0);
                        result.methods.htmlSelectors.found = true;
                    }
                });
            }
        }

        result.methods.htmlSelectors.details = result.methods.htmlSelectors.found
            ? `Found ${result.methods.htmlSelectors.prices.length} prices: ${result.methods.htmlSelectors.prices.join(', ')}`
            : 'No prices found via HTML selectors';

        // Method 3: Text pattern extraction
        const bodyPricePatterns = [
            /(?:from|starting at|tickets from|regular price|price|cost|fee)\s*(?:is|for|of)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i,
            /(?:CA\$|CAD|C\$)\s*(\d+(?:\.\d{2})?)/i,
            /\$\s*(\d+(?:\.\d{2})?)/i
        ];

        for (const pattern of bodyPricePatterns) {
            const matches = bodyText.match(pattern);
            if (matches && matches[1]) {
                const p = parseFloat(matches[1]);
                if (!isNaN(p) && p >= 0 && p < 100000) {
                    allPrices.push(p);
                    result.methods.textPatterns.prices.push(p);
                    result.methods.textPatterns.found = true;
                }
            }
        }

        result.methods.textPatterns.details = result.methods.textPatterns.found
            ? `Found ${result.methods.textPatterns.prices.length} prices: ${result.methods.textPatterns.prices.join(', ')}`
            : 'No prices found via text patterns';

        // Test the actual enrichment function
        const enrichment = await EventbriteDetailScraper.enrichEvent(url);
        
        result.extractedPrice = enrichment.price;
        result.extractedPriceAmount = enrichment.priceAmount;
        result.extractedMinPrice = enrichment.minPrice;
        result.extractedMaxPrice = enrichment.maxPrice;
        result.extractedTicketTypes = enrichment.ticketTypes?.length || 0;
        result.success = enrichment.priceAmount !== undefined;

        result.pageAnalysis.priceText = priceTexts.slice(0, 10); // Limit to first 10

        return result;
    } catch (e: any) {
        result.pageAnalysis.errors.push(`Request error: ${e.message}`);
        return result;
    }
}

async function investigateAllEventsFlow(alleventsUrl: string): Promise<InvestigationResult> {
    const result: InvestigationResult = {
        eventUrl: alleventsUrl,
        source: 'AllEvents',
        success: false,
        methods: {
            jsonLd: { found: false, prices: [], details: '' },
            htmlSelectors: { found: false, prices: [], details: '' },
            textPatterns: { found: false, prices: [], details: '' }
        },
        pageAnalysis: {
            hasJsonLd: false,
            jsonLdOffers: 0,
            priceElements: 0,
            priceText: [],
            errors: []
        }
    };

    try {
        console.log(`\n🔍 Investigating AllEvents.in → Eventbrite flow: ${alleventsUrl}`);
        
        const response = await axios.get(alleventsUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        result.title = $('h1').first().text().trim() || $('title').text().trim();

        // Find Eventbrite link
        const eventbriteSelectors = [
            'a[href*="eventbrite.com"]',
            'a[href*="eventbrite.ca"]'
        ];

        let eventbriteUrl: string | null = null;
        for (const selector of eventbriteSelectors) {
            const link = $(selector).first().attr('href');
            if (link && (link.includes('eventbrite.com') || link.includes('eventbrite.ca'))) {
                eventbriteUrl = link.startsWith('http') ? link : `https:${link}`;
                break;
            }
        }

        // Also check page text
        if (!eventbriteUrl) {
            const pageText = $.text();
            const match = pageText.match(/https?:\/\/(?:www\.)?eventbrite\.(?:com|ca)\/[^\s<>"']+/i);
            if (match) {
                eventbriteUrl = match[0];
            }
        }

        if (eventbriteUrl) {
            console.log(`  ✅ Found Eventbrite link: ${eventbriteUrl}`);
            // Now investigate the Eventbrite page
            const eventbriteResult = await investigateEventbriteEvent(eventbriteUrl);
            return {
                ...eventbriteResult,
                eventUrl: `${alleventsUrl} → ${eventbriteUrl}`,
                source: 'AllEvents'
            };
        } else {
            result.pageAnalysis.errors.push('No Eventbrite link found on AllEvents.in page');
            return result;
        }
    } catch (e: any) {
        result.pageAnalysis.errors.push(`Request error: ${e.message}`);
        return result;
    }
}

async function main() {
    console.log('🔬 PRICE EXTRACTION INVESTIGATION\n');
    console.log('=' .repeat(80));

    // Load sample events from events.json
    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const eventsData = JSON.parse(readFileSync(eventsPath, 'utf-8'));
    
    // Get sample events - mix of Eventbrite and AllEvents.in
    const eventbriteEvents = eventsData
        .filter((e: any) => e.source === 'Eventbrite' && e.price === 'See tickets')
        .slice(0, 10);
    
    const alleventsEvents = eventsData
        .filter((e: any) => e.source === 'AllEvents.in' && (!e.priceAmount || e.price === 'See Tickets'))
        .slice(0, 5);

    console.log(`\n📊 Testing ${eventbriteEvents.length} Eventbrite events and ${alleventsEvents.length} AllEvents.in events\n`);

    const results: InvestigationResult[] = [];

    // Test Eventbrite events
    for (const event of eventbriteEvents) {
        const result = await investigateEventbriteEvent(event.url);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }

    // Test AllEvents.in → Eventbrite flow
    for (const event of alleventsEvents) {
        const result = await investigateAllEventsFlow(event.url);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }

    // Generate report
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 INVESTIGATION REPORT');
    console.log('='.repeat(80));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n✅ Successful: ${successful.length}/${results.length} (${(successful.length / results.length * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${failed.length}/${results.length} (${(failed.length / results.length * 100).toFixed(1)}%)`);

    console.log('\n\n📊 METHOD EFFECTIVENESS:');
    const jsonLdSuccess = results.filter(r => r.methods.jsonLd.found).length;
    const htmlSuccess = results.filter(r => r.methods.htmlSelectors.found).length;
    const textSuccess = results.filter(r => r.methods.textPatterns.found).length;

    console.log(`  JSON-LD: ${jsonLdSuccess}/${results.length} (${(jsonLdSuccess / results.length * 100).toFixed(1)}%)`);
    console.log(`  HTML Selectors: ${htmlSuccess}/${results.length} (${(htmlSuccess / results.length * 100).toFixed(1)}%)`);
    console.log(`  Text Patterns: ${textSuccess}/${results.length} (${(textSuccess / results.length * 100).toFixed(1)}%)`);

    console.log('\n\n❌ FAILED CASES:');
    for (const result of failed) {
        console.log(`\n  ${result.title || 'Unknown'}`);
        console.log(`    URL: ${result.eventUrl}`);
        console.log(`    JSON-LD: ${result.methods.jsonLd.details}`);
        console.log(`    HTML: ${result.methods.htmlSelectors.details}`);
        console.log(`    Text: ${result.methods.textPatterns.details}`);
        console.log(`    Page Analysis:`);
        console.log(`      - Has JSON-LD: ${result.pageAnalysis.hasJsonLd}`);
        console.log(`      - JSON-LD Offers: ${result.pageAnalysis.jsonLdOffers}`);
        console.log(`      - Price Elements: ${result.pageAnalysis.priceElements}`);
        if (result.pageAnalysis.priceText.length > 0) {
            console.log(`      - Price Text Found: ${result.pageAnalysis.priceText.join(', ')}`);
        }
        if (result.pageAnalysis.errors.length > 0) {
            console.log(`      - Errors: ${result.pageAnalysis.errors.join('; ')}`);
        }
    }

    console.log('\n\n✅ SUCCESSFUL CASES:');
    for (const result of successful) {
        console.log(`\n  ${result.title || 'Unknown'}`);
        console.log(`    Price: ${result.extractedPrice} (Amount: ${result.extractedPriceAmount})`);
        if (result.extractedMinPrice && result.extractedMaxPrice) {
            console.log(`    Range: $${result.extractedMinPrice} - $${result.extractedMaxPrice}`);
        }
        if (result.extractedTicketTypes && result.extractedTicketTypes > 0) {
            console.log(`    Ticket Types: ${result.extractedTicketTypes}`);
        }
        console.log(`    Methods: ${[
            result.methods.jsonLd.found ? 'JSON-LD' : '',
            result.methods.htmlSelectors.found ? 'HTML' : '',
            result.methods.textPatterns.found ? 'Text' : ''
        ].filter(Boolean).join(', ') || 'Unknown'}`);
    }

    // Save detailed report
    const reportPath = join(process.cwd(), 'price-investigation-report.json');
    require('fs').writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n\n💾 Detailed report saved to: ${reportPath}`);
}

main().catch(console.error);
