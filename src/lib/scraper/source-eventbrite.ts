import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent, isEnglish, cleanDescription } from './utils';
import { EventbriteDetailScraper } from './detail-scraper';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class EventbriteScraper implements ScraperSource {
    name = 'Eventbrite';
    private baseUrl = 'https://www.eventbrite.ca';

    private searchUrls: string[] = [];

    constructor() { // Generate URLs dynamically
        // 1. CRITICAL: Aggressively target "Today" to ensure high volume
        // The user specifically complained about low "Today" counts.
        this.searchUrls.push('/d/canada--toronto/events--today/');
        for (let i = 2; i <= 5; i++) {
            this.searchUrls.push(`/d/canada--toronto/events--today/?page=${i}`);
        }
        
        // CRITICAL: Add today's dating events specifically
        // This ensures we capture dating events happening today
        this.searchUrls.push('/d/canada--toronto/events--today/dating/');
        for (let i = 2; i <= 3; i++) {
            this.searchUrls.push(`/d/canada--toronto/events--today/dating/?page=${i}`);
        }

        const baseCategories = [
            'events--this-week',
            'food-and-drink--events',
            'arts--events',
            'music--events',
            'community--events',
            'classes--events',
            'hobbies--events',
            'health--events',
            'business--events',
            'charity-and-causes--events',
            'film-and-media--events',
            'fashion--events',
            'sports-and-fitness--events',
            'travel-and-outdoor--events',
            'science-and-tech--events',
            'performing-arts',
            'free--events', // Very important for volume
            'dating--events',
            'singles--events'
        ];

        // Deep paging for massive volume (Pages 1-8)
        // This is aggressive but necessary for "200 events/day"
        for (const cat of baseCategories) {
            this.searchUrls.push(`/d/canada--toronto/${cat}/`);
            for (let i = 2; i <= 8; i++) {
                this.searchUrls.push(`/d/canada--toronto/${cat}/?page=${i}`);
            }
        }

        // Specific targeted searches for "Toronto Dating Hub" as requested
        const hubQueries = [
            'd/canada--toronto/toronto-dating-hub/',
            'd/canada--toronto/dating-hub/',
            'o/toronto-dating-hub-31627918491/',
            'o/mohan-matchmaking-63764588373/'
        ];
        for (const query of hubQueries) {
            this.searchUrls.push(`/${query}`);
            for (let i = 2; i <= 5; i++) {
                this.searchUrls.push(`/${query}?page=${i}`);
            }
        }
    }

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];

        // Hardcoded robust headers
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"'
        };

        for (const path of this.searchUrls) {
            try {
                console.log(`Scraping ${path}...`);
                const url = `${this.baseUrl}${path}`;
                const response = await axios.get(url, { headers });
                console.log(`Response status: ${response.status}, length: ${response.data.length}`);

                const $ = cheerio.load(response.data);

                // Strategy 1: JSON-LD (Most reliable)
                const scripts = $('script[type="application/ld+json"]');
                console.log(`Found ${scripts.length} JSON-LD scripts.`);

                // Convert to array and use for loop to handle async operations
                const scriptsArray = scripts.toArray();
                for (const script of scriptsArray) {
                    try {
                        const jsonText = $(script).html() || '{}';
                        const data = JSON.parse(jsonText);
                        const items = Array.isArray(data) ? data : [data];
                        console.log(`JSON-LD contains ${items.length} items.`);

                        for (const item of items) {
                            if (item['@type'] === 'ItemList' && item.itemListElement) {
                                const subItems = item.itemListElement;
                                console.log(`Found ItemList with ${subItems.length} elements`);

                                for (const sub of subItems) {
                                    const eventItem = sub.item;
                                    const type = eventItem?.['@type'];
                                    if (eventItem && typeof type === 'string' && type.includes('Event')) {
                                        const title = eventItem.name;
                                        const url = eventItem.url;
                                        if (!title || !url) continue;

                                        if (!isEnglish(title)) {
                                            console.log(`Skipping non-English event: ${title}`);
                                            continue;
                                        }

                                        const eventId = generateEventId(url);
                                        let date = normalizeDate(eventItem.startDate);
                                        
                                        // If JSON-LD doesn't have startDate, try fetching detail page (like AllEvents does)
                                        // Eventbrite pages often load dates via JavaScript, so detail page may have it
                                        if (!date) {
                                            try {
                                                console.log(`  📅 JSON-LD missing startDate, fetching detail page: ${url}`);
                                                const detailResponse = await axios.get(url, {
                                                    headers: {
                                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                                    },
                                                    timeout: 10000
                                                });
                                                const $detail = cheerio.load(detailResponse.data);
                                                
                                                // Try JSON-LD from detail page first
                                                const detailScripts = $detail('script[type="application/ld+json"]');
                                                for (let i = 0; i < detailScripts.length; i++) {
                                                    try {
                                                        const jsonText = $detail(detailScripts[i]).html();
                                                        if (!jsonText) continue;
                                                        const detailData = JSON.parse(jsonText);
                                                        const detailItems = Array.isArray(detailData) ? detailData : [detailData];
                                                        
                                                        for (const detailItem of detailItems) {
                                                            const detailType = detailItem['@type'];
                                                            if (detailType && typeof detailType === 'string' && detailType.includes('Event')) {
                                                                if (detailItem.startDate) {
                                                                    date = normalizeDate(detailItem.startDate);
                                                                    if (date) {
                                                                        console.log(`  ✅ Extracted date from detail page JSON-LD: ${date}`);
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        if (date) break;
                                                    } catch { }
                                                }
                                                
                                                // Fallback to HTML selectors
                                                if (!date) {
                                                    const htmlDate = $detail('time[datetime]').first().attr('datetime') ||
                                                        $detail('[itemprop="startDate"]').attr('content') ||
                                                        $detail('.event-date, .start-date').first().text().trim();
                                                    if (htmlDate) {
                                                        date = normalizeDate(htmlDate);
                                                        if (date) {
                                                            console.log(`  ✅ Extracted date from detail page HTML: ${date}`);
                                                        }
                                                    }
                                                }
                                            } catch (e: any) {
                                                console.log(`  ⚠️ Failed to fetch detail page for date: ${e.message}`);
                                            }
                                        }
                                        
                                        if (!date) {
                                            // Log missing dates - likely due to JavaScript-rendered content requiring Puppeteer
                                            console.log(`  ⚠️ Skipping event without valid date (may need Puppeteer): "${title}"`);
                                            continue; // REJECT events without valid dates - don't default to today
                                        }
                                        const endDate = normalizeDate(eventItem.endDate) || undefined;

                                        let location = 'Toronto, ON';
                                        let latitude: number | undefined;
                                        let longitude: number | undefined;

                                        if (eventItem.location) {
                                            if (typeof eventItem.location === 'string') location = eventItem.location;
                                            else if (eventItem.location.name) location = eventItem.location.name;
                                            else if (eventItem.location.address?.addressLocality) location = eventItem.location.address.addressLocality;

                                            if (eventItem.location.geo) {
                                                latitude = parseFloat(eventItem.location.geo.latitude);
                                                longitude = parseFloat(eventItem.location.geo.longitude);
                                            }
                                        }

                                        // Extract categories from keywords if available
                                        let categories = ['General'];
                                        if (eventItem.keywords) {
                                            if (typeof eventItem.keywords === 'string') {
                                                categories = eventItem.keywords.split(',').map((k: string) => cleanText(k));
                                            } else if (Array.isArray(eventItem.keywords)) {
                                                categories = eventItem.keywords.map((k: string) => cleanText(k));
                                            }
                                        }

                                        // Enhanced price extraction - get minimum price from all offers
                                        // Handle both number and string prices, and currency codes
                                        let priceAmount: number | undefined;
                                        let isFree = eventItem.isAccessibleForFree === true;
                                        
                                        if (eventItem.offers) {
                                            const offers = Array.isArray(eventItem.offers) ? eventItem.offers : [eventItem.offers];
                                            const prices: number[] = [];
                                            
                                            for (const offer of offers) {
                                                // Handle price field (can be number, string, or formatted string)
                                                if (offer.price !== undefined && offer.price !== null) {
                                                    let priceValue: number;
                                                    
                                                    if (typeof offer.price === 'string') {
                                                        // Remove currency symbols and parse
                                                        priceValue = parseFloat(offer.price.replace(/[^\d.]/g, ''));
                                                    } else {
                                                        priceValue = parseFloat(String(offer.price));
                                                    }
                                                    
                                                    if (!isNaN(priceValue)) {
                                                        if (priceValue === 0 || priceValue === 0.0) {
                                                            isFree = true;
                                                            prices.push(0);
                                                        } else if (priceValue > 0 && priceValue < 100000) {
                                                            prices.push(priceValue);
                                                        }
                                                    }
                                                }
                                                
                                                // Also check lowPrice and highPrice (price ranges)
                                                if (offer.lowPrice !== undefined && offer.lowPrice !== null) {
                                                    const lowPrice = typeof offer.lowPrice === 'string'
                                                        ? parseFloat(offer.lowPrice.replace(/[^\d.]/g, ''))
                                                        : parseFloat(String(offer.lowPrice));
                                                    if (!isNaN(lowPrice) && lowPrice >= 0 && lowPrice < 100000) {
                                                        prices.push(lowPrice);
                                                    }
                                                }
                                                
                                                if (offer.highPrice !== undefined && offer.highPrice !== null) {
                                                    const highPrice = typeof offer.highPrice === 'string'
                                                        ? parseFloat(offer.highPrice.replace(/[^\d.]/g, ''))
                                                        : parseFloat(String(offer.highPrice));
                                                    if (!isNaN(highPrice) && highPrice >= 0 && highPrice < 100000) {
                                                        prices.push(highPrice);
                                                    }
                                                }
                                            }
                                            
                                            if (prices.length > 0) {
                                                priceAmount = Math.min(...prices);
                                                isFree = priceAmount === 0;
                                            }
                                        }

                                        let isRecurring = eventItem['@type'] === 'EventSeries' ||
                                            title.toLowerCase().includes('multiple dates') ||
                                            (eventItem.description || '').toLowerCase().includes('multiple dates');

                                        const event: Event = {
                                            id: eventId,
                                            title: cleanText(title),
                                            date,
                                            endDate: isRecurring ? (endDate || date) : endDate,
                                            location: cleanText(location),
                                            source: 'Eventbrite',
                                            host: eventItem.organizer?.name || 'Various Organizers',
                                            url,
                                            image: eventItem.image,
                                            price: priceAmount === 0 ? 'Free' : (priceAmount ? `$${priceAmount}` : 'See tickets'),
                                            priceAmount,
                                            isFree,
                                            description: cleanDescription(eventItem.description || ''),
                                            latitude,
                                            longitude,
                                            categories: isRecurring
                                                ? [...new Set([...categorizeEvent(title, eventItem.description || ''), 'Multi-Day'])]
                                                : categorizeEvent(title, eventItem.description || ''),
                                            status: 'UPCOMING',
                                            lastUpdated: new Date().toISOString()
                                        };
                                        
                                        // Log raw data for events with missing prices/dates
                                        if (!priceAmount || !date) {
                                            const { logRawEventData } = require('../utils/rawDataLogger');
                                            logRawEventData(
                                                eventId,
                                                title,
                                                'Eventbrite',
                                                url,
                                                eventItem.startDate || date,
                                                eventItem.offers?.[0]?.price || String(priceAmount || ''),
                                                priceAmount,
                                                eventItem.description
                                            );
                                        }
                                        
                                        events.push(event);
                                    }
                                }
                            }

                            const itemType = item['@type'];
                            if (typeof itemType === 'string' && itemType.includes('Event')) {
                                // Extract fields
                                const title = item.name;
                                const url = item.url;
                                if (!title || !url) continue;

                                if (!isEnglish(title)) {
                                    console.log(`Skipping non-English event: ${title}`);
                                    continue;
                                }

                                const eventId = generateEventId(url);
                                let date = item.startDate ? normalizeDate(item.startDate) : null;
                                
                                // If JSON-LD doesn't have startDate, try fetching detail page (like AllEvents does)
                                // Eventbrite pages often load dates via JavaScript, so detail page may have it
                                if (!date) {
                                    try {
                                        console.log(`  📅 JSON-LD missing startDate, fetching detail page: ${url}`);
                                        const detailResponse = await axios.get(url, {
                                            headers: {
                                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                            },
                                            timeout: 10000
                                        });
                                        const $detail = cheerio.load(detailResponse.data);
                                        
                                        // Try JSON-LD from detail page first
                                        const detailScripts = $detail('script[type="application/ld+json"]');
                                        for (let i = 0; i < detailScripts.length; i++) {
                                            try {
                                                const jsonText = $detail(detailScripts[i]).html();
                                                if (!jsonText) continue;
                                                const detailData = JSON.parse(jsonText);
                                                const detailItems = Array.isArray(detailData) ? detailData : [detailData];
                                                
                                                for (const detailItem of detailItems) {
                                                    const detailType = detailItem['@type'];
                                                    if (detailType && typeof detailType === 'string' && detailType.includes('Event')) {
                                                        if (detailItem.startDate) {
                                                            date = normalizeDate(detailItem.startDate);
                                                            if (date) {
                                                                console.log(`  ✅ Extracted date from detail page JSON-LD: ${date}`);
                                                                break;
                                                            }
                                                        }
                                                    }
                                                }
                                                if (date) break;
                                            } catch { }
                                        }
                                        
                                        // Fallback to HTML selectors
                                        if (!date) {
                                            const htmlDate = $detail('time[datetime]').first().attr('datetime') ||
                                                $detail('[itemprop="startDate"]').attr('content') ||
                                                $detail('.event-date, .start-date').first().text().trim();
                                            if (htmlDate) {
                                                date = normalizeDate(htmlDate);
                                                if (date) {
                                                    console.log(`  ✅ Extracted date from detail page HTML: ${date}`);
                                                }
                                            }
                                        }
                                    } catch (e: any) {
                                        console.log(`  ⚠️ Failed to fetch detail page for date: ${e.message}`);
                                    }
                                }
                                
                                if (!date) {
                                    // Log missing dates - likely due to JavaScript-rendered content requiring Puppeteer
                                    console.log(`  ⚠️ Skipping event without valid date (may need Puppeteer): "${title}"`);
                                    continue; // REJECT events without valid dates - don't default to today
                                }
                                const endDate = item.endDate ? (normalizeDate(item.endDate) || undefined) : undefined;

                                let location = 'Toronto, ON';
                                let latitude: number | undefined;
                                let longitude: number | undefined;

                                if (item.location) {
                                    if (typeof item.location === 'string') location = item.location;
                                    else if (item.location.name) location = item.location.name;
                                    else if (item.location.address?.addressLocality) location = item.location.address.addressLocality;

                                    if (item.location.geo) {
                                        latitude = parseFloat(item.location.geo.latitude);
                                        longitude = parseFloat(item.location.geo.longitude);
                                    }
                                }

                                // Enhanced price extraction - get minimum price from all offers
                                // Handle both number and string prices, and currency codes
                                let priceAmount: number | undefined;
                                let isFree = item.isAccessibleForFree === true;
                                
                                if (item.offers) {
                                    const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
                                    const prices: number[] = [];
                                    
                                    for (const offer of offers) {
                                        // Handle price field (can be number, string, or formatted string)
                                        if (offer.price !== undefined && offer.price !== null) {
                                            let priceValue: number;
                                            
                                            if (typeof offer.price === 'string') {
                                                // Remove currency symbols and parse
                                                priceValue = parseFloat(offer.price.replace(/[^\d.]/g, ''));
                                            } else {
                                                priceValue = parseFloat(String(offer.price));
                                            }
                                            
                                            if (!isNaN(priceValue)) {
                                                if (priceValue === 0 || priceValue === 0.0) {
                                                    isFree = true;
                                                    prices.push(0);
                                                } else if (priceValue > 0 && priceValue < 100000) {
                                                    prices.push(priceValue);
                                                }
                                            }
                                        }
                                        
                                        // Also check lowPrice and highPrice (price ranges)
                                        if (offer.lowPrice !== undefined && offer.lowPrice !== null) {
                                            const lowPrice = typeof offer.lowPrice === 'string'
                                                ? parseFloat(offer.lowPrice.replace(/[^\d.]/g, ''))
                                                : parseFloat(String(offer.lowPrice));
                                            if (!isNaN(lowPrice) && lowPrice >= 0 && lowPrice < 100000) {
                                                prices.push(lowPrice);
                                            }
                                        }
                                        
                                        if (offer.highPrice !== undefined && offer.highPrice !== null) {
                                            const highPrice = typeof offer.highPrice === 'string'
                                                ? parseFloat(offer.highPrice.replace(/[^\d.]/g, ''))
                                                : parseFloat(String(offer.highPrice));
                                            if (!isNaN(highPrice) && highPrice >= 0 && highPrice < 100000) {
                                                prices.push(highPrice);
                                            }
                                        }
                                    }
                                    
                                    if (prices.length > 0) {
                                        priceAmount = Math.min(...prices);
                                        isFree = priceAmount === 0;
                                    }
                                }

                                // REJECT events without valid dates - don't default to today
                                if (!date) {
                                    console.log(`Rejecting Eventbrite event without valid date: ${title}`);
                                    continue;
                                }

                                let isRecurring = item['@type'] === 'EventSeries' ||
                                    title.toLowerCase().includes('multiple dates') ||
                                    (item.description || '').toLowerCase().includes('multiple dates');

                                const event: Event = {
                                    id: eventId,
                                    title: cleanText(title),
                                    date: date,
                                    endDate: isRecurring ? (endDate || date) : endDate,
                                    location: cleanText(location),
                                    source: 'Eventbrite',
                                    host: item.organizer?.name || 'Various Organizers',
                                    url,
                                    image: item.image,
                                    price: priceAmount === 0 ? 'Free' : (priceAmount ? `$${priceAmount}` : 'See tickets'),
                                    priceAmount,
                                    isFree,
                                    description: cleanDescription(item.description || ''),
                                    latitude,
                                    longitude,
                                    categories: isRecurring
                                        ? [...new Set([...categorizeEvent(title, item.description || ''), 'Multi-Day'])]
                                        : categorizeEvent(title, item.description || ''),
                                    status: 'UPCOMING',
                                    lastUpdated: new Date().toISOString()
                                };
                                
                                // Log raw data for events with missing prices/dates
                                if (!priceAmount || !date) {
                                    const { logRawEventData } = require('../utils/rawDataLogger');
                                    logRawEventData(
                                        eventId,
                                        title,
                                        'Eventbrite',
                                        url,
                                        item.startDate || date,
                                        item.offers?.[0]?.price || String(priceAmount || ''),
                                        priceAmount,
                                        item.description
                                    );
                                }
                                
                                events.push(event);
                            }
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                }

            } catch (error: any) {
                errors.push(`Error fetching ${path}: ${error.message}`);
            }
        }

        // Deduplicate
        const uniqueEvents = Array.from(new Map(events.map(item => [item.id, item])).values());

        // CRITICAL: Enrich with REAL times from individual event pages
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        // CRITICAL: Enrich ALL events with comprehensive data from detail pages
        // This ensures we capture: prices, ticket types, full descriptions, precise times, location details
        // Prioritize events without prices, but enrich all for completeness
        const eventsWithoutPrices = uniqueEvents.filter(e => !e.priceAmount || e.price === 'See tickets');
        const eventsWithPrices = uniqueEvents.filter(e => e.priceAmount && e.price !== 'See tickets');
        
        // Enrich events without prices first, then others
        const eventsToEnrich = [...eventsWithoutPrices, ...eventsWithPrices];
        
        // Check if Puppeteer is available (optional, for JavaScript-rendered content)
        // Eventbrite pages often load dates via JavaScript, so Puppeteer is important for date extraction
        let usePuppeteer = false;
        try {
            const { isPuppeteerAvailable } = require('./puppeteer-scraper');
            usePuppeteer = isPuppeteerAvailable() && process.env.USE_PUPPETEER === 'true';
            if (usePuppeteer) {
                console.log(`  🌐 Puppeteer enabled for dynamic content extraction (dates, prices)`);
            } else {
                console.log(`  ⚠️ Puppeteer not enabled - some Eventbrite dates may be missing (set USE_PUPPETEER=true)`);
            }
        } catch {
            // Puppeteer not installed, use static scraping only
            console.log(`  ⚠️ Puppeteer not available - some Eventbrite dates may be missing (install puppeteer)`);
        }
        
        console.log(`Enriching ${eventsToEnrich.length} events with comprehensive detail page data (${eventsWithoutPrices.length} without prices, ${eventsWithPrices.length} with prices)...`);
        console.log(`  📊 Extracting: prices, ticket types, full descriptions, start/end times, location details`);
        let successCount = 0;
        let priceUpdateCount = 0;
        let puppeteerUsedCount = 0;
        let dateExtractionFailures = 0;
        
        for (const event of eventsToEnrich) {
            // Use Puppeteer for events that failed price extraction OR if date seems incomplete
            // Eventbrite dates are often loaded via JavaScript, so use Puppeteer when available
            const shouldUsePuppeteer = usePuppeteer && (
                !event.priceAmount || 
                event.price === 'See tickets' ||
                !event.date || // Use Puppeteer if date is missing (shouldn't happen due to earlier filtering, but be safe)
                event.date.includes('Invalid') // Use Puppeteer if date is invalid
            );
            const enrichment = await EventbriteDetailScraper.enrichEvent(event.url, shouldUsePuppeteer);
            if (shouldUsePuppeteer) puppeteerUsedCount++;

            // Update price from detail page if available (CRITICAL FIX)
            if (enrichment.priceAmount !== undefined && enrichment.price !== undefined) {
                // Use detail page price if:
                // 1. We don't have a price yet, OR
                // 2. The detail page price is different (more accurate), OR
                // 3. The current price is "See tickets" (placeholder)
                if (!event.priceAmount || event.price === 'See tickets' || 
                    (enrichment.priceAmount !== event.priceAmount && enrichment.priceAmount >= 0)) {
                    event.price = enrichment.price;
                    event.priceAmount = enrichment.priceAmount;
                    event.isFree = enrichment.priceAmount === 0;
                    priceUpdateCount++;
                    console.log(`  💰 Updated price for "${event.title.substring(0, 40)}": ${enrichment.price}`);
                }
            }
            
            // Update min/max prices if available
            if (enrichment.minPrice !== undefined) {
                event.minPrice = enrichment.minPrice;
            }
            if (enrichment.maxPrice !== undefined) {
                event.maxPrice = enrichment.maxPrice;
            }
            
            // Update ticket types if available
            if (enrichment.ticketTypes && enrichment.ticketTypes.length > 0) {
                event.ticketTypes = enrichment.ticketTypes;
                console.log(`  🎫 Found ${enrichment.ticketTypes.length} ticket types for "${event.title.substring(0, 40)}"`);
            }

            // Update start/end times (more precise than just dates)
            // This is critical for Eventbrite since dates are often loaded via JavaScript
            if (enrichment.realTime) {
                const normalized = normalizeDate(enrichment.realTime);
                if (normalized) {
                    event.date = normalized;
                    event.startTime = enrichment.realTime; // Keep full ISO 8601 with time
                    successCount++;
                } else {
                    // Log when date extraction fails even from detail page
                    console.log(`  ⚠️ Could not normalize date from detail page: "${enrichment.realTime}" for "${event.title.substring(0, 40)}"`);
                    dateExtractionFailures++;
                }
            }
            
            if (enrichment.endTime) {
                const normalizedEnd = normalizeDate(enrichment.endTime);
                if (normalizedEnd) {
                    event.endDate = normalizedEnd;
                    event.endTime = enrichment.endTime; // Keep full ISO 8601 with time
                }
            }

            // Update full description (always use longest available)
            if (enrichment.fullDescription) {
                if (enrichment.fullDescription.length > (event.description?.length || 0)) {
                    event.description = enrichment.fullDescription;
                    console.log(`  📝 Updated description (${enrichment.fullDescription.length} chars) for "${event.title.substring(0, 40)}"`);
                }

                // Double check language on full description if it wasn't caught by title
                if (!isEnglish(event.description)) {
                    event.status = 'CANCELLED'; // Or separate status, but CANCELLED hides it currently
                    console.log(`  ⚠ Non-English description detected: ${event.title.substring(0, 40)}`);
                }
            }
            
            // Update location details
            if (enrichment.locationDetails) {
                event.locationDetails = enrichment.locationDetails;
                
                // Enhance location string if we have more details
                if (enrichment.locationDetails.venue && !event.location.includes(enrichment.locationDetails.venue)) {
                    event.location = enrichment.locationDetails.isOnline 
                        ? `${enrichment.locationDetails.venue} (${enrichment.locationDetails.onlinePlatform || 'Online'})`
                        : enrichment.locationDetails.venue;
                }
                
                if (enrichment.locationDetails.address && !event.location.includes(enrichment.locationDetails.address)) {
                    // Append address if venue name is already in location
                    if (enrichment.locationDetails.venue && event.location.includes(enrichment.locationDetails.venue)) {
                        event.location = `${event.location}, ${enrichment.locationDetails.address}`;
                    }
                }
                
                console.log(`  📍 Updated location details for "${event.title.substring(0, 40)}"`);
            }
            
            // CRITICAL: If price still not found, extract from description text as fallback
            // This catches cases where price is mentioned in description but not in JSON-LD
            if (!event.priceAmount && event.description) {
                const descText = event.description;
                // Look for prices mentioned in description (especially high prices)
                const pricePatterns = [
                    /(?:regular|normal|full|standard)\s+price\s+(?:for|is|of)?\s*(?:this|the)?\s*(?:service|event|ticket)?\s*(?:is)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i,
                    /(?:price|cost|fee)\s+(?:is|of|for)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d{3,}(?:\.\d{2})?)/i,
                    /(?:CA\$|CAD|C\$|\$)\s*(\d{3,}(?:\.\d{2})?)/g
                ];
                
                const foundPrices: number[] = [];
                for (const pattern of pricePatterns) {
                    const matches = [...descText.matchAll(pattern)];
                    for (const match of matches) {
                        const price = parseFloat(match[1]);
                        if (!isNaN(price) && price >= 0 && price < 100000) {
                            foundPrices.push(price);
                        }
                    }
                }
                
                if (foundPrices.length > 0) {
                    const minPrice = Math.min(...foundPrices);
                    event.priceAmount = minPrice;
                    event.price = minPrice === 0 ? 'Free' : `$${minPrice}`;
                    event.isFree = minPrice === 0;
                    priceUpdateCount++;
                    console.log(`  💰 Extracted price from description for "${event.title.substring(0, 40)}": ${event.price}`);
                }
            }

            // Set sold-out status for filtering
            // CRITICAL: Only mark as sold out if COMPLETELY sold out (not gender-specific)
            // Events with tickets for at least one gender should still show
            if (enrichment.isSoldOut !== undefined) {
                event.isSoldOut = enrichment.isSoldOut;
                if (enrichment.isSoldOut) {
                    console.log(`  🚫 Completely sold out: ${event.title.substring(0, 40)}`);
                }
            }
            
            // Set gender-specific sold out status (for frontend filtering)
            if (enrichment.genderSoldOut !== undefined) {
                event.genderSoldOut = enrichment.genderSoldOut;
                if (enrichment.genderSoldOut !== 'none') {
                    console.log(`  ⚠️ Gender-specific sold out (${enrichment.genderSoldOut}): ${event.title.substring(0, 40)}`);
                }
            }
            
            // Only cancel if completely sold out (both genders or no gender-specific info)
            if (enrichment.salesEnded && (!enrichment.genderSoldOut || enrichment.genderSoldOut === 'both')) {
                event.status = 'CANCELLED';
                event.isSoldOut = true; // Also mark as sold out
                console.log(`  ⚠ Sales ended: ${event.title.substring(0, 40)}`);
            }

            // Mark as multi-day/recurring - these should SHOW under multi-day filter, not be hidden
            if (enrichment.isRecurring && !event.categories.includes('Multi-Day')) {
                event.categories = [...new Set([...event.categories, 'Multi-Day'])];
                if (!event.endDate && enrichment.endTime) {
                    const normalizedEnd = normalizeDate(enrichment.endTime);
                    if (normalizedEnd) {
                        event.endDate = normalizedEnd;
                    } else {
                        event.endDate = event.date; // Fallback to same date
                    }
                }
                console.log(`  ℹ Marked as Multi-Day: ${event.title.substring(0, 40)}`);
            }
            
            // Also check if event has multiple dates from endTime (even if not marked recurring)
            if (enrichment.endTime && !enrichment.isRecurring) {
                const normalizedEnd = normalizeDate(enrichment.endTime);
                if (normalizedEnd) {
                    const startDate = new Date(event.date);
                    const endDate = new Date(normalizedEnd);
                    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    // If event spans multiple days (but less than 30), mark as multi-day
                    if (diffDays > 1 && diffDays <= 30) {
                        event.categories = [...new Set([...event.categories, 'Multi-Day'])];
                        event.endDate = normalizedEnd;
                        console.log(`  ℹ Marked as Multi-Day (${diffDays} days): ${event.title.substring(0, 40)}`);
                    }
                }
            }

            // CRITICAL: Re-check expensive events after price enrichment
            // Import shouldIncludeEvent to filter out expensive events that were enriched
            const { shouldIncludeEvent } = require('../quality/score');
            if (!shouldIncludeEvent(event)) {
                console.log(`  ❌ Removing expensive event after enrichment: "${event.title.substring(0, 40)}" ($${event.priceAmount})`);
                // Mark for removal instead of removing immediately (to avoid index issues)
                event.status = 'CANCELLED';
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Remove expensive events that were marked during enrichment
        const beforeFilter = uniqueEvents.length;
        const filteredEvents = uniqueEvents.filter(e => {
            if (e.status === 'CANCELLED' && e.priceAmount !== undefined && e.priceAmount > 150) {
                return false; // Remove expensive events
            }
            return true;
        });
        const removedCount = beforeFilter - filteredEvents.length;
        // Update uniqueEvents reference
        uniqueEvents.length = 0;
        uniqueEvents.push(...filteredEvents);
        if (removedCount > 0) {
            console.log(`✓ Removed ${removedCount} expensive events after price enrichment`);
        }
        
        console.log(`✓ Enriched ${successCount}/${uniqueEvents.length} events with details`);
        console.log(`✓ Updated prices for ${priceUpdateCount} events from detail pages`);
        if (puppeteerUsedCount > 0) {
            console.log(`✓ Used Puppeteer for ${puppeteerUsedCount} events with dynamic content`);
        }
        if (dateExtractionFailures > 0) {
            console.log(`⚠️ ${dateExtractionFailures} events had date extraction failures (may need Puppeteer)`);
        }

        return {
            events: uniqueEvents,
            errors
        };
    }
}

