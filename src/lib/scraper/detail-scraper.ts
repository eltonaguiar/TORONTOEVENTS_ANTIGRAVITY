import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface EventEnrichment {
    realTime?: string;
    salesEnded: boolean;
    isRecurring: boolean;
    fullDescription?: string;
    price?: string;
    priceAmount?: number;
}

export class EventbriteDetailScraper {
    /**
     * Consolidates multiple checks into a single HTTP request to avoid rate limiting
     * and improve performance significantly.
     */
    static async enrichEvent(eventUrl: string): Promise<EventEnrichment> {
        const result: EventEnrichment = {
            salesEnded: false,
            isRecurring: false
        };

        try {
            const response = await axios.get(eventUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(response.data);
            const bodyText = $('body').text();

            // 1. Extract REAL time from JSON-LD
            const scripts = $('script[type="application/ld+json"]');
            for (let i = 0; i < scripts.length; i++) {
                try {
                    const jsonText = $(scripts[i]).html();
                    if (!jsonText) continue;
                    const data = JSON.parse(jsonText);
                    const type = data['@type'];
                    if (type && typeof type === 'string' && type.includes('Event') && data.startDate) {
                        result.realTime = data.startDate;
                        break;
                    }
                } catch { }
            }

            // Fallback for time
            if (!result.realTime) {
                result.realTime = $('time[datetime]').first().attr('datetime') || undefined;
            }

            // 2. Check Sales Status
            const statusText = $('.eds-text-weight--heavy, .eds-notification-bar, [data-testid="sales-status"]').text().toLowerCase();
            const directSalesEnded = statusText.includes('sales ended') ||
                statusText.includes('registration closed') ||
                statusText.includes('this event has passed');

            const hasTicketButton = $('button').text().toLowerCase().includes('ticket') ||
                $('button').text().toLowerCase().includes('register') ||
                $('a[href*="checkout"]').length > 0;

            result.salesEnded = directSalesEnded && !hasTicketButton;

            // 3. Check Recurring Status
            // 3. Check Recurring Status
            // 'Check availability' often appears for single day events with multiple ticket tiers, causing false positives. 
            // 'Multiple dates' is the gold standard for Eventbrite series.
            const recurringIndicators = [
                'Multiple Dates',
                'Event Series',
                'Select a date' // specific to series picker
            ];

            // Search in specific areas first to avoid footer matches
            const heroText = $('.eds-layout__body').text() || bodyText;
            result.isRecurring = recurringIndicators.some(indicator => heroText.includes(indicator));

            // 4. Extract Price from Detail Page (CRITICAL FIX)
            // Strategy: JSON-LD first, then HTML selectors, then text patterns
            let priceAmount: number | undefined;
            let price: string | undefined;
            const prices: number[] = [];

            // Method 1: Extract from JSON-LD structured data (most reliable)
            for (let i = 0; i < scripts.length; i++) {
                try {
                    const jsonText = $(scripts[i]).html();
                    if (!jsonText) continue;
                    const data = JSON.parse(jsonText);
                    
                    // Handle both single Event objects and arrays
                    const items = Array.isArray(data) ? data : [data];
                    
                    for (const item of items) {
                        const itemType = item['@type'];
                        if (itemType && typeof itemType === 'string' && itemType.includes('Event')) {
                            if (item.offers) {
                                const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
                                
                                for (const offer of offers) {
                                    // Check price field (can be number or string)
                                    if (offer.price !== undefined && offer.price !== null) {
                                        const p = typeof offer.price === 'string' 
                                            ? parseFloat(offer.price.replace(/[^\d.]/g, ''))
                                            : parseFloat(String(offer.price));
                                        if (!isNaN(p) && p >= 0 && p < 100000) {
                                            prices.push(p);
                                        }
                                    }
                                    
                                    // Check lowPrice (price range)
                                    if (offer.lowPrice !== undefined && offer.lowPrice !== null) {
                                        const lp = typeof offer.lowPrice === 'string'
                                            ? parseFloat(offer.lowPrice.replace(/[^\d.]/g, ''))
                                            : parseFloat(String(offer.lowPrice));
                                        if (!isNaN(lp) && lp >= 0 && lp < 100000) {
                                            prices.push(lp);
                                        }
                                    }
                                    
                                    // Check priceCurrency to handle CA$ correctly
                                    if (offer.priceCurrency && offer.price) {
                                        const p = typeof offer.price === 'string'
                                            ? parseFloat(offer.price.replace(/[^\d.]/g, ''))
                                            : parseFloat(String(offer.price));
                                        if (!isNaN(p) && p >= 0 && p < 100000) {
                                            prices.push(p);
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch { }
            }

            // Method 2: Extract from HTML price elements (Eventbrite-specific selectors)
            if (prices.length === 0) {
                const priceSelectors = [
                    '[data-testid="price"]',
                    '.event-price',
                    '.ticket-price',
                    '.price-display',
                    '[itemprop="price"]',
                    '.eds-text-color--primary-brand',
                    '.eds-text-weight--heavy'
                ];

                for (const selector of priceSelectors) {
                    const priceEl = $(selector);
                    if (priceEl.length > 0) {
                        const priceText = priceEl.text().trim();
                        
                        // Match patterns: CA$699.00, $699, From $699, Starting at CA$699, etc.
                        const patterns = [
                            /(?:CA\$|CAD|C\$)\s*(\d+(?:\.\d{2})?)/i,
                            /\$\s*(\d+(?:\.\d{2})?)/i,
                            /(?:from|starting at|tickets from)\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i,
                            /(\d+(?:\.\d{2})?)\s*(?:CAD|CA\$|C\$)/i
                        ];

                        for (const pattern of patterns) {
                            const match = priceText.match(pattern);
                            if (match) {
                                const p = parseFloat(match[1]);
                                if (!isNaN(p) && p >= 0 && p < 100000) {
                                    prices.push(p);
                                    break;
                                }
                            }
                        }
                        
                        // Check for "Free"
                        if (priceText.toLowerCase().includes('free')) {
                            prices.push(0);
                        }
                    }
                }
            }

            // Method 3: Extract from body text patterns (fallback)
            if (prices.length === 0) {
                const bodyPricePatterns = [
                    /(?:from|starting at|tickets from)\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i,
                    /(?:CA\$|CAD|C\$)\s*(\d+(?:\.\d{2})?)/i,
                    /\$\s*(\d+(?:\.\d{2})?)/i
                ];

                for (const pattern of bodyPricePatterns) {
                    const matches = bodyText.match(pattern);
                    if (matches && matches[1]) {
                        const p = parseFloat(matches[1]);
                        if (!isNaN(p) && p >= 0 && p < 100000) {
                            prices.push(p);
                            break;
                        }
                    }
                }
            }

            // Set final price (use minimum if multiple prices found)
            if (prices.length > 0) {
                priceAmount = Math.min(...prices);
                if (priceAmount === 0) {
                    price = 'Free';
                } else {
                    price = `$${priceAmount}`;
                }
                result.price = price;
                result.priceAmount = priceAmount;
            }

            // 5. Extract Full Description
            // Try multiple selectors common on Eventbrite
            const descriptionSelectors = [
                '[data-automation="listing-event-description"]',
                '.event-description__content',
                '.eds-text--left.eds-text--html', // Common generic text block
                '#event-page-description'
            ];

            for (const selector of descriptionSelectors) {
                const descEl = $(selector);
                if (descEl.length > 0) {
                    // Preserving HTML structure for line breaks
                    let html = descEl.html() || '';
                    html = html
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<\/p>/gi, '\n\n')
                        .replace(/<[^>]+>/g, '');

                    const { cleanDescription } = require('./utils');
                    result.fullDescription = cleanDescription(html);
                    if (result.fullDescription && result.fullDescription.length > 100) break;
                }
            }

            return result;
        } catch (e: any) {
            console.log(`Could not enrich event via ${eventUrl}: ${e.message}`);
            return result;
        }
    }
}
