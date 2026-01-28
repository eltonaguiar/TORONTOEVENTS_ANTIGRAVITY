import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface TicketTypeInfo {
    name: string;
    price?: number;
    priceDisplay?: string;
    available?: boolean;
    soldOut?: boolean;
}

export interface LocationDetails {
    venue?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    isOnline?: boolean;
    onlinePlatform?: string;
}

export interface EventEnrichment {
    realTime?: string; // Start time (ISO 8601)
    endTime?: string; // End time (ISO 8601)
    salesEnded: boolean;
    isSoldOut?: boolean; // Explicit sold-out flag (for filtering)
    genderSoldOut?: 'male' | 'female' | 'both' | 'none'; // Gender-specific sold out status
    isRecurring: boolean;
    fullDescription?: string;
    price?: string;
    priceAmount?: number;
    minPrice?: number;
    maxPrice?: number;
    ticketTypes?: TicketTypeInfo[];
    locationDetails?: LocationDetails;
}

export class EventbriteDetailScraper {
    /**
     * Consolidates multiple checks into a single HTTP request to avoid rate limiting
     * and improve performance significantly.
     */
    static async enrichEvent(eventUrl: string, usePuppeteer: boolean = false): Promise<EventEnrichment> {
        const result: EventEnrichment = {
            salesEnded: false,
            isRecurring: false
        };

        try {
            let html: string;
            
            // Use Puppeteer if requested and available (for JavaScript-rendered content)
            if (usePuppeteer) {
                try {
                    const { scrapeWithPuppeteer } = require('./puppeteer-scraper');
                    html = await scrapeWithPuppeteer({
                        url: eventUrl,
                        waitForSelector: '[data-testid="price"], .event-price',
                        waitForTime: 3000
                    });
                    console.log(`  🌐 Used Puppeteer for ${eventUrl.substring(0, 60)}...`);
                } catch (puppeteerError: any) {
                    console.log(`  ⚠️ Puppeteer failed, falling back to static: ${puppeteerError.message}`);
                    // Fall through to static scraping
                    const response = await axios.get(eventUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                    });
                    html = response.data;
                }
            } else {
                // Static scraping (default, faster)
                const response = await axios.get(eventUrl, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });
                html = response.data;
            }
            
            const $ = cheerio.load(html);
            const bodyText = $('body').text();

            // 1. Extract REAL time from JSON-LD (start and end)
            const scripts = $('script[type="application/ld+json"]');
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
                            if (item.startDate) {
                                result.realTime = item.startDate;
                            }
                            if (item.endDate) {
                                result.endTime = item.endDate;
                            }
                            // If we got both, we're done
                            if (result.realTime && result.endTime) break;
                        }
                    }
                    if (result.realTime) break;
                } catch { }
            }

            // Fallback for time from HTML
            if (!result.realTime) {
                result.realTime = $('time[datetime]').first().attr('datetime') || undefined;
            }
            if (!result.endTime) {
                const timeElements = $('time[datetime]');
                if (timeElements.length > 1) {
                    result.endTime = timeElements.last().attr('datetime') || undefined;
                }
            }

            // 2. Check Sales Status
            // Check for "Sold out" text in multiple places (including GeneralEventPanelInfo_label__sPi2U)
            const soldOutSelectors = [
                '.GeneralEventPanelInfo_label__sPi2U',
                '.eds-text-weight--heavy',
                '.eds-notification-bar',
                '[data-testid="sales-status"]',
                '[class*="sold-out"]',
                '[class*="soldout"]'
            ];
            let statusText = '';
            for (const selector of soldOutSelectors) {
                const el = $(selector);
                if (el.length > 0) {
                    statusText += ' ' + el.text().toLowerCase();
                }
            }
            // Also check body text for "Sold out"
            statusText += ' ' + bodyText.toLowerCase();
            
            const directSalesEnded = statusText.includes('sold out') ||
                statusText.includes('sales ended') ||
                statusText.includes('registration closed') ||
                statusText.includes('this event has passed');

            const hasTicketButton = $('button').text().toLowerCase().includes('ticket') ||
                $('button').text().toLowerCase().includes('register') ||
                $('a[href*="checkout"]').length > 0;

            // Check for gender-specific sold out (e.g., "Male tickets sold out" but female tickets available)
            // Events should still show if ANY gender has tickets available
            const genderSoldOutPatterns = {
                male: /(?:male|men|gentlemen|men'?s)\s+(?:tickets?\s+)?sold\s+out/i,
                female: /(?:female|women|ladies|women'?s)\s+(?:tickets?\s+)?sold\s+out/i
            };
            const maleSoldOut = genderSoldOutPatterns.male.test(statusText);
            const femaleSoldOut = genderSoldOutPatterns.female.test(statusText);
            
            // Only mark as completely sold out if BOTH genders are sold out
            const isCompletelySoldOut = (maleSoldOut && femaleSoldOut) || 
                                       (directSalesEnded && !maleSoldOut && !femaleSoldOut);
            
            result.salesEnded = isCompletelySoldOut && !hasTicketButton;
            // Also set isSoldOut explicitly for frontend filtering
            // Only mark as sold out if completely sold out (not gender-specific)
            result.isSoldOut = isCompletelySoldOut && !statusText.includes('not sold out');
            
            // Set gender-specific sold out status for frontend filtering
            if (maleSoldOut && !femaleSoldOut) {
                result.genderSoldOut = 'male';
            } else if (femaleSoldOut && !maleSoldOut) {
                result.genderSoldOut = 'female';
            } else if (maleSoldOut && femaleSoldOut) {
                result.genderSoldOut = 'both';
            }

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
            let prices: number[] = [];

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

            // Method 3: Extract from body text patterns (fallback) - ENHANCED
            if (prices.length === 0) {
                // Get all text from the page including title, meta tags, and body
                const pageTitle = $('title').text() || '';
                const metaDescription = $('meta[name="description"]').attr('content') || '';
                const allText = `${pageTitle} ${metaDescription} ${bodyText}`;
                
                // Enhanced price patterns - more aggressive matching
                const bodyPricePatterns = [
                    // Match "From $X", "Starting at $X", "Tickets from $X"
                    /(?:from|starting at|tickets from|price from|cost from)\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i,
                    // Match "Regular price $X", "Price: $X", "Cost: $X"
                    /(?:regular|normal|standard|full|ticket|event)\s+price\s*(?:is|for|of|:)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i,
                    // Match "Price $X", "Cost $X", "Fee $X"
                    /(?:price|cost|fee|ticket)\s*(?:is|of|for)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i,
                    // Match currency codes with prices
                    /(?:CA\$|CAD|C\$)\s*(\d+(?:\.\d{2})?)/i,
                    // Match dollar signs with prices
                    /\$\s*(\d+(?:\.\d{2})?)/i,
                    // Match prices in parentheses or brackets
                    /[\(\[](?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)\s*(?:CAD|CA\$|C\$)?[\)\]]/i,
                    // Match "Early Bird $X", "VIP $X", etc.
                    /(?:early bird|vip|general|standard|premium|basic)\s*(?:ticket|price)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i
                ];

                for (const pattern of bodyPricePatterns) {
                    const matches = allText.match(pattern);
                    if (matches && matches[1]) {
                        const p = parseFloat(matches[1]);
                        if (!isNaN(p) && p >= 0 && p < 100000) {
                            prices.push(p);
                            // Don't break - collect all prices to find min/max
                        }
                    }
                }
                
                // Also search for ALL price mentions in text (not just high prices)
                // This catches prices that might be in various formats
                const allPriceMatches = allText.matchAll(/(?:CA\$|CAD|C\$|\$)\s*(\d+(?:\.\d{2})?)/gi);
                for (const match of allPriceMatches) {
                    const p = parseFloat(match[1]);
                    // Accept any reasonable price (not just >$100)
                    // Filter out obviously wrong prices (like years, phone numbers, etc.)
                    if (!isNaN(p) && p >= 0 && p < 100000 && p !== 2026 && p !== 2025 && p !== 2024) {
                        // Skip if it looks like a year (4 digits starting with 20)
                        if (!(p >= 2000 && p <= 2099 && p % 1 === 0)) {
                            prices.push(p);
                        }
                    }
                }
                
                // Remove duplicates and sort
                if (prices.length > 0) {
                    prices = [...new Set(prices)].sort((a, b) => a - b);
                }
            }

            // Set final price (use minimum if multiple prices found)
            if (prices.length > 0) {
                priceAmount = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                result.minPrice = priceAmount;
                result.maxPrice = maxPrice > priceAmount ? maxPrice : undefined;
                
                if (priceAmount === 0) {
                    price = 'Free';
                } else {
                    price = result.maxPrice ? `$${priceAmount} - $${result.maxPrice}` : `$${priceAmount}`;
                }
                result.price = price;
                result.priceAmount = priceAmount;
            }

            // 4b. Extract ALL Ticket Types with prices
            const ticketTypes: TicketTypeInfo[] = [];
            
            // Method 1: Extract from JSON-LD offers
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
                                
                                for (const offer of offers) {
                                    let ticketPrice: number | undefined;
                                    let ticketPriceDisplay: string | undefined;
                                    
                                    if (offer.price !== undefined && offer.price !== null) {
                                        const p = typeof offer.price === 'string' 
                                            ? parseFloat(offer.price.replace(/[^\d.]/g, ''))
                                            : parseFloat(String(offer.price));
                                        if (!isNaN(p) && p >= 0 && p < 100000) {
                                            ticketPrice = p;
                                            ticketPriceDisplay = p === 0 ? 'Free' : `$${p}`;
                                        }
                                    }
                                    
                                    const ticketName = offer.name || offer.category || 'General Admission';
                                    ticketTypes.push({
                                        name: ticketName,
                                        price: ticketPrice,
                                        priceDisplay: ticketPriceDisplay,
                                        available: offer.availability !== 'SoldOut',
                                        soldOut: offer.availability === 'SoldOut'
                                    });
                                }
                            }
                        }
                    }
                } catch { }
            }
            
            // Method 2: Extract from HTML ticket tables/lists
            if (ticketTypes.length === 0) {
                // Look for ticket selection elements
                const ticketSelectors = [
                    '[data-testid="ticket-type"]',
                    '.ticket-type',
                    '.ticket-tier',
                    '.pricing-tier',
                    '[class*="ticket"]',
                    '[class*="pricing"]'
                ];
                
                for (const selector of ticketSelectors) {
                    const ticketElements = $(selector);
                    if (ticketElements.length > 0) {
                        ticketElements.each((_, el) => {
                            const $el = $(el);
                            const ticketName = $el.find('[class*="name"], [class*="title"], [class*="label"]').first().text().trim() || 
                                             $el.text().split('$')[0].trim() || 'General Admission';
                            
                            const priceText = $el.text();
                            const priceMatch = priceText.match(/(?:CA\$|CAD|C\$|\$)\s*(\d+(?:\.\d{2})?)/i);
                            let ticketPrice: number | undefined;
                            let ticketPriceDisplay: string | undefined;
                            
                            if (priceMatch) {
                                ticketPrice = parseFloat(priceMatch[1]);
                                ticketPriceDisplay = `$${ticketPrice}`;
                            } else if (priceText.toLowerCase().includes('free')) {
                                ticketPrice = 0;
                                ticketPriceDisplay = 'Free';
                            }
                            
                            const isSoldOut = priceText.toLowerCase().includes('sold out') || 
                                            $el.find('[class*="sold"], [class*="unavailable"]').length > 0;
                            
                            if (ticketName && ticketName.length > 0) {
                                ticketTypes.push({
                                    name: ticketName,
                                    price: ticketPrice,
                                    priceDisplay: ticketPriceDisplay,
                                    available: !isSoldOut,
                                    soldOut: isSoldOut
                                });
                            }
                        });
                        if (ticketTypes.length > 0) break;
                    }
                }
            }
            
            if (ticketTypes.length > 0) {
                result.ticketTypes = ticketTypes;
            }

            // 5. Extract Full Description
            // Try multiple selectors common on Eventbrite
            const descriptionSelectors = [
                '[data-automation="listing-event-description"]',
                '.event-description__content',
                '.eds-text--left.eds-text--html', // Common generic text block
                '#event-page-description',
                '[itemprop="description"]',
                '.event-details__description',
                '.description-content'
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
                    const cleaned = cleanDescription(html);
                    // Always use the longest description found
                    if (!result.fullDescription || cleaned.length > result.fullDescription.length) {
                        result.fullDescription = cleaned;
                    }
                    // If we found a substantial description, we can stop
                    if (result.fullDescription && result.fullDescription.length > 500) break;
                }
            }
            
            // Fallback: Extract from JSON-LD description
            if (!result.fullDescription || result.fullDescription.length < 100) {
                for (let i = 0; i < scripts.length; i++) {
                    try {
                        const jsonText = $(scripts[i]).html();
                        if (!jsonText) continue;
                        const data = JSON.parse(jsonText);
                        const items = Array.isArray(data) ? data : [data];
                        
                        for (const item of items) {
                            if (item.description && typeof item.description === 'string') {
                                const { cleanDescription } = require('./utils');
                                const cleaned = cleanDescription(item.description);
                                if (!result.fullDescription || cleaned.length > result.fullDescription.length) {
                                    result.fullDescription = cleaned;
                                }
                            }
                        }
                    } catch { }
                }
            }

            // 6. Extract Detailed Location Information
            const locationDetails: LocationDetails = {};
            
            // Extract from JSON-LD
            for (let i = 0; i < scripts.length; i++) {
                try {
                    const jsonText = $(scripts[i]).html();
                    if (!jsonText) continue;
                    const data = JSON.parse(jsonText);
                    const items = Array.isArray(data) ? data : [data];
                    
                    for (const item of items) {
                        const itemType = item['@type'];
                        if (itemType && typeof itemType === 'string' && itemType.includes('Event')) {
                            if (item.location) {
                                const loc = item.location;
                                
                                // Handle both object and string formats
                                if (typeof loc === 'object') {
                                    if (loc.name) locationDetails.venue = loc.name;
                                    if (loc.address) {
                                        if (typeof loc.address === 'string') {
                                            locationDetails.address = loc.address;
                                        } else if (loc.address.streetAddress) {
                                            locationDetails.address = loc.address.streetAddress;
                                            if (loc.address.addressLocality) locationDetails.city = loc.address.addressLocality;
                                            if (loc.address.addressRegion) locationDetails.province = loc.address.addressRegion;
                                            if (loc.address.postalCode) locationDetails.postalCode = loc.address.postalCode;
                                        }
                                    }
                                }
                                
                                // Check for online events
                                if (item.eventAttendanceMode === 'OnlineEventAttendanceMode' || 
                                    bodyText.toLowerCase().includes('online') ||
                                    bodyText.toLowerCase().includes('zoom') ||
                                    bodyText.toLowerCase().includes('googlemeet') ||
                                    bodyText.toLowerCase().includes('virtual')) {
                                    locationDetails.isOnline = true;
                                    if (bodyText.toLowerCase().includes('zoom')) locationDetails.onlinePlatform = 'Zoom';
                                    else if (bodyText.toLowerCase().includes('googlemeet')) locationDetails.onlinePlatform = 'GoogleMeet';
                                    else if (bodyText.toLowerCase().includes('teams')) locationDetails.onlinePlatform = 'Microsoft Teams';
                                    else locationDetails.onlinePlatform = 'Online';
                                }
                            }
                        }
                    }
                } catch { }
            }
            
            // Extract from HTML if not found in JSON-LD
            if (!locationDetails.venue && !locationDetails.address) {
                const venueSelectors = [
                    '[data-testid="venue-name"]',
                    '.venue-name',
                    '.event-venue',
                    '[itemprop="name"]'
                ];
                
                for (const selector of venueSelectors) {
                    const venueEl = $(selector);
                    if (venueEl.length > 0) {
                        locationDetails.venue = venueEl.text().trim();
                        break;
                    }
                }
                
                const addressSelectors = [
                    '[data-testid="venue-address"]',
                    '.venue-address',
                    '[itemprop="address"]'
                ];
                
                for (const selector of addressSelectors) {
                    const addrEl = $(selector);
                    if (addrEl.length > 0) {
                        locationDetails.address = addrEl.text().trim();
                        break;
                    }
                }
            }
            
            if (locationDetails.venue || locationDetails.address || locationDetails.isOnline) {
                result.locationDetails = locationDetails;
            }

            return result;
        } catch (e: any) {
            console.log(`Could not enrich event via ${eventUrl}: ${e.message}`);
            return result;
        }
    }
}
