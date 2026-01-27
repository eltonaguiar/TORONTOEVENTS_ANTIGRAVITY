import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent, cleanDescription, formatTorontoDate, isTBDDate } from './utils';
import { EventbriteDetailScraper } from './detail-scraper';
import { safeParseDate } from '../utils/dateHelpers';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Extract date from AllEvents .event-time-label (authoritative).
 * Uses data-stime (Unix) first, then human-readable label text.
 * Never treat as TBD when these exist.
 * Selector supports "event-time-label" and "event-time-label " (trailing space).
 */
function extractDateFromEventTimeLabel($: cheerio.CheerioAPI): string | null {
    const el = $('.event-time-label, [class*="event-time-label"]').first();
    if (!el.length) return null;

    const stime = el.attr('data-stime');
    if (stime) {
        const startMs = parseInt(stime, 10) * 1000;
        if (!isNaN(startMs)) {
            const date = new Date(startMs);
            return formatTorontoDate(date);
        }
    }

    // Human-readable fallback: use only the datetime part, not nested tooltips (e.g. DST warning)
    let labelText = el.text().trim();
    if (!labelText) return null;
    const cleaned = labelText
        .replace(/to\s+.*$/i, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\s*\.\s*The\s+event\s+timings.*$/i, '')
        .replace(/\s*We\s+recommend.*$/i, '')
        .split(/[\n.]/)[0]
        .trim();
    if (!cleaned) return null;
    const parsed = safeParseDate(cleaned);
    if (parsed.isValid && parsed.date) {
        return formatTorontoDate(parsed.date);
    }
    return normalizeDate(cleaned);
}

export class AllEventsScraper implements ScraperSource {
    name = 'AllEvents.in';

    /**
     * Find Eventbrite link in AllEvents.in page
     * Returns the Eventbrite URL if found, null otherwise
     * ENHANCED: More aggressive link detection
     */
    private findEventbriteLink($: cheerio.CheerioAPI): string | null {
        // Look for Eventbrite links in various places - expanded selectors
        const eventbriteSelectors = [
            'a[href*="eventbrite.com"]',
            'a[href*="eventbrite.ca"]',
            '.ticket-link[href*="eventbrite"]',
            '.buy-tickets[href*="eventbrite"]',
            '[data-ticket-url*="eventbrite"]',
            '.event-ticket-link[href*="eventbrite"]',
            'a[href*="/tickets"]', // Common pattern
            '[class*="ticket"][href*="eventbrite"]',
            '[class*="buy"][href*="eventbrite"]'
        ];

        for (const selector of eventbriteSelectors) {
            const links = $(selector);
            for (let i = 0; i < links.length; i++) {
                const link = $(links[i]).attr('href');
                if (link && (link.includes('eventbrite.com') || link.includes('eventbrite.ca'))) {
                    // Clean and normalize the URL
                    let cleanUrl = link.trim();
                    // Remove query parameters that might break the URL
                    if (cleanUrl.includes('?')) {
                        cleanUrl = cleanUrl.split('?')[0];
                    }
                    // Make absolute if relative
                    if (cleanUrl.startsWith('http')) {
                        return cleanUrl;
                    } else if (cleanUrl.startsWith('//')) {
                        return `https:${cleanUrl}`;
                    } else {
                        return `https://www.eventbrite.ca${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
                    }
                }
            }
        }

        // Also check in text content for Eventbrite URLs - more patterns
        const pageText = $.text();
        const pageHtml = $.html();
        
        // Try multiple URL patterns
        const urlPatterns = [
            /https?:\/\/(?:www\.)?eventbrite\.(?:com|ca)\/e\/[^\s<>"']+/i,
            /https?:\/\/(?:www\.)?eventbrite\.(?:com|ca)\/[^\s<>"']+/i,
            /eventbrite\.(?:com|ca)\/e\/[^\s<>"']+/i
        ];
        
        for (const pattern of urlPatterns) {
            const match = pageText.match(pattern) || pageHtml.match(pattern);
            if (match) {
                let url = match[0];
                if (!url.startsWith('http')) {
                    url = `https://${url}`;
                }
                // Clean URL
                if (url.includes('?')) {
                    url = url.split('?')[0];
                }
                return url;
            }
        }

        // Check JSON-LD for Eventbrite URLs
        const scriptData = $('script[type="application/ld+json"]');
        for (let i = 0; i < scriptData.length; i++) {
            try {
                const json = JSON.parse($(scriptData[i]).html() || '{}');
                const items = Array.isArray(json) ? json : [json];
                
                for (const item of items) {
                    if (item.url && typeof item.url === 'string' && item.url.includes('eventbrite')) {
                        return item.url;
                    }
                    if (item.offers && Array.isArray(item.offers)) {
                        for (const offer of item.offers) {
                            if (offer.url && offer.url.includes('eventbrite')) {
                                return offer.url;
                            }
                        }
                    }
                    // Check nested structures
                    if (item['@graph'] && Array.isArray(item['@graph'])) {
                        for (const graphItem of item['@graph']) {
                            if (graphItem.url && graphItem.url.includes('eventbrite')) {
                                return graphItem.url;
                            }
                        }
                    }
                }
            } catch { }
        }

        return null;
    }

    /**
     * Fetch event detail page for enhanced data extraction
     * Tries to follow Eventbrite links to get accurate prices from the original source
     */
    private async fetchEventDetails(url: string): Promise<{ description?: string; price?: string; priceAmount?: number; minPrice?: number; maxPrice?: number; ticketTypes?: any[]; date?: string; location?: string }> {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Encoding': 'identity',
                }
            });

            const html = Buffer.from(response.data).toString('utf8');
            const $ = cheerio.load(html);

            // FIRST: Try to find Eventbrite link and extract from original source
            const eventbriteUrl = this.findEventbriteLink($);
            if (eventbriteUrl) {
                console.log(`  🔗 Found Eventbrite link: ${eventbriteUrl} - extracting from original source...`);
                try {
                    // Add small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const enrichment = await EventbriteDetailScraper.enrichEvent(eventbriteUrl);
                    
                    // Use Eventbrite data if available
                    if (enrichment.priceAmount !== undefined || enrichment.minPrice !== undefined) {
                        const priceDisplay = enrichment.minPrice !== undefined 
                            ? `$${enrichment.minPrice}${enrichment.maxPrice ? ` - $${enrichment.maxPrice}` : ''}`
                            : enrichment.price || 'See tickets';
                        console.log(`  ✅ Extracted price from Eventbrite: ${priceDisplay}`);
                        return {
                            description: enrichment.fullDescription,
                            price: enrichment.price,
                            priceAmount: enrichment.priceAmount,
                            minPrice: enrichment.minPrice,
                            maxPrice: enrichment.maxPrice,
                            ticketTypes: enrichment.ticketTypes
                        };
                    } else {
                        console.log(`  ⚠️ Eventbrite link found but no price extracted, falling back to AllEvents.in`);
                    }
                } catch (e: any) {
                    console.log(`  ⚠️ Failed to extract from Eventbrite (${e.message}), falling back to AllEvents.in`);
                    // Fall through to AllEvents.in extraction
                }
            }

            // Extract description with paragraph preservation
            let description = '';

            // Try specific HTML description selectors
            const descEl = $('.event-description, #event-description, .about-event, .event-details-description').first();
            if (descEl.length) {
                let descHtml = descEl.html() || '';
                // Transform common tags to newlines before cleaning
                descHtml = descHtml
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/p>/gi, '\n\n')
                    .replace(/<[^>]+>/g, '');
                description = cleanDescription(descHtml);
            }

            if (!description || description.length < 50) {
                const mainContent = $('main, .main-content, .event-content, article').find('p').text();
                if (mainContent && mainContent.length > description.length) {
                    description = cleanDescription(mainContent);
                }
            }

            // Extract price from detail page - try multiple methods
            let price: string | undefined;
            let priceAmount: number | undefined;

            // Check for structured data offers - get minimum price from all offers
            const scriptData = $('script[type="application/ld+json"]');
            const prices: number[] = [];
            scriptData.each((_, el) => {
                try {
                    const json = JSON.parse($(el).html() || '{}');
                    if (json.offers) {
                        const offers = Array.isArray(json.offers) ? json.offers : [json.offers];
                        for (const offer of offers) {
                            if (offer.price !== undefined) {
                                const p = parseFloat(offer.price);
                                if (!isNaN(p) && p >= 0) prices.push(p);
                            }
                            if (offer.lowPrice !== undefined) {
                                const lp = parseFloat(offer.lowPrice);
                                if (!isNaN(lp) && lp >= 0) prices.push(lp);
                            }
                        }
                    }
                } catch { }
            });
            if (prices.length > 0) {
                priceAmount = Math.min(...prices);
                price = `$${priceAmount}`;
            }

            if (!price) {
                // Method 1: Extract minimum price from ticket tables
                const ticketTables = $('table').filter((i, el) => {
                    return $(el).text().toLowerCase().includes('ticket') || 
                           $(el).text().toLowerCase().includes('price') ||
                           $(el).find('th, td').text().toLowerCase().includes('price');
                });
                
                if (ticketTables.length > 0) {
                    const tablePrices: number[] = [];
                    ticketTables.find('tr').each((_, row) => {
                        const rowText = $(row).text();
                        // Look for all price patterns in table rows
                        const priceMatches = [...rowText.matchAll(/(?:CAD|C\$|\$)\s*(\d+(?:\.\d{2})?)/gi)];
                        for (const match of priceMatches) {
                            const p = parseFloat(match[1]);
                            if (!isNaN(p) && p >= 0 && p < 10000) { // Reasonable price cap
                                tablePrices.push(p);
                            }
                        }
                    });
                    if (tablePrices.length > 0) {
                        priceAmount = Math.min(...tablePrices);
                        price = `$${priceAmount}`;
                    }
                }
                
                // Method 2: Look for price strings in other elements
                if (!price) {
                    const priceText = $('.ticket-price, .price, [itemprop="price"], .event-price, .display-price').first().text();
                    const match = priceText.match(/(?:CAD|C\$|\$)\s*(\d+(?:\.\d{2})?)/i) || priceText.match(/(\d+(?:\.\d{2})?)\s*(?:CAD|C\$)/i);
                    if (match) {
                        const p = parseFloat(match[1]);
                        if (!isNaN(p) && p >= 0 && p < 10000) {
                            priceAmount = p;
                            price = `$${priceAmount}`;
                        }
                    } else if (priceText.toLowerCase().includes('free')) {
                        price = 'Free';
                        priceAmount = 0;
                    }
                }
            }

            // Extract date and location from JSON-LD if available
            let extractedDate: string | undefined;
            let extractedLocation: string | undefined;
            
            scriptData.each((_, el) => {
                try {
                    const json = JSON.parse($(el).html() || '{}');
                    const items = Array.isArray(json) ? json : [json];
                    for (const item of items) {
                        if (item['@type'] === 'Event' || (Array.isArray(item['@type']) && item['@type'].includes('Event'))) {
                            if (item.startDate && !extractedDate) {
                                extractedDate = normalizeDate(item.startDate) || undefined;
                            }
                            if (item.location && !extractedLocation) {
                                if (typeof item.location === 'string') {
                                    extractedLocation = item.location;
                                } else if (item.location.name) {
                                    extractedLocation = item.location.name;
                                    if (item.location.address) {
                                        const addr = typeof item.location.address === 'string' 
                                            ? item.location.address 
                                            : item.location.address.streetAddress || '';
                                        if (addr) {
                                            extractedLocation = `${extractedLocation}, ${addr}`;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch { }
            });
            
            // Fallback: Try HTML selectors for location
            if (!extractedLocation) {
                const locationText = $('.venue').text() ||
                    $('.event-location').text() ||
                    $('[itemprop="location"]').text() ||
                    $('.location').text();
                if (locationText && locationText.trim().length > 5) {
                    extractedLocation = locationText.trim();
                }
            }

            return { 
                description, 
                price, 
                priceAmount,
                date: extractedDate,
                location: extractedLocation
            };
        } catch (e) {
            console.log(`  ⚠️ Error fetching AllEvents.in details: ${e}`);
            return {};
        }
    }

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];
        const paths: string[] = [];
        const categories = [
            'toronto', // General
            'toronto/dating',
            'toronto/singles',
            'toronto/food-drinks',
            'toronto/music',
            'toronto/arts',
            'toronto/workshops',
            'toronto/business',
            'toronto/sports',
            'toronto/comedy',
            'toronto/parties',
            'toronto/health-wellness'
        ];

        // Pagination for volume
        for (const cat of categories) {
            paths.push(`/${cat}`);
            for (let i = 2; i <= 6; i++) {
                paths.push(`/${cat}?page=${i}`);
            }
        }

        for (const path of paths) {
            const url = `https://allevents.in${path}`;
            try {
                console.log(`Scraping ${url}...`);
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Encoding': 'identity',
                    }
                });

                const html = Buffer.from(response.data).toString('utf8');
                console.log(`Response status: ${response.status}, length: ${html.length}`);

                const $ = cheerio.load(html);

                const elements = $('.event-card, .event-item, [data-event-id], li[itemscope]');
                console.log(`Found ${elements.length} elements matching selectors.`);

                // Select event cards - use for loop to support async operations
                for (let i = 0; i < elements.length; i++) {
                    try {
                        const el = elements[i];
                        const card = $(el);

                        // Debug first few items
                        const title = cleanText(card.find('h3, .title, [itemprop="name"]').first().text());
                        // Try multiple ways to find the URL
                        let urlRaw = card.find('a[href*="/event/"]').attr('href') ||
                            card.find('a.event-item-link').attr('href') ||
                            card.find('a').attr('href') ||
                            card.attr('href'); // If the card itself is the link

                        if (i < 3) {
                            console.log(`Debug Item ${i}: Title="${title}", URL="${urlRaw}"`);
                        }

                        if (!title || !urlRaw || urlRaw === '#' || urlRaw.startsWith('javascript:')) {
                            console.log(`Skipping event with missing/invalid URL: "${title}"`);
                            continue;
                        }

                        // Fix URL - ensure it is absolute
                        let fullUrl = urlRaw;
                        if (!fullUrl.startsWith('http')) {
                            // Prepend domain if relative
                            const domain = 'https://allevents.in';
                            fullUrl = fullUrl.startsWith('/') ? `${domain}${fullUrl}` : `${domain}/${fullUrl}`;
                        }

                        // CRITICAL: Always fetch detail page for AllEvents to get authoritative data-stime
                        // The listing page date might be incomplete or missing, but detail page has .event-time-label with data-stime
                        // This ensures we get the correct date even if listing shows a partial date
                        // Priority: data-stime/data-etime attributes > JSON-LD startDate > HTML text
                        // Never mark as TBD if data-stime or JSON-LD startDate exist
                        let date: string | null = null;
                        try {
                            console.log(`  📅 Fetching detail page for accurate date: ${fullUrl}`);
                            const detailResponse = await axios.get(fullUrl, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                                },
                                timeout: 10000
                            });
                            const $detail = cheerio.load(detailResponse.data);
                            
                            // FIRST: Try .event-time-label with data-stime (most authoritative)
                            // This has concrete timestamps and should never be marked TBD
                            const fromLabel = extractDateFromEventTimeLabel($detail);
                            if (fromLabel) {
                                date = fromLabel;
                                console.log(`  ✅ Extracted date from .event-time-label (data-stime): ${date}`);
                            }
                            
                            // SECOND: Try JSON-LD startDate (structured data)
                            if (!date) {
                                const ldScript = $detail('script[type="application/ld+json"]').html();
                                if (ldScript) {
                                    try {
                                        const data = JSON.parse(ldScript);
                                        const items = Array.isArray(data) ? data : [data];
                                        const eventData = items.find((i: any) => 
                                            i['@type'] === 'Event' || 
                                            (Array.isArray(i['@type']) && i['@type'].includes('Event'))
                                        );
                                        if (eventData?.startDate) {
                                            // Only check TBD on the actual date string, not the full page
                                            const startDateStr = String(eventData.startDate).trim();
                                            if (startDateStr && !isTBDDate(startDateStr)) {
                                                date = normalizeDate(startDateStr);
                                                if (date) {
                                                    console.log(`  ✅ Extracted date from JSON-LD: ${date}`);
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        // JSON parsing failed
                                    }
                                }
                            }
                            
                            // THIRD: Try HTML text selectors (least reliable, may contain DST warnings)
                            if (!date) {
                                const detailDateStr = $detail('[itemprop="startDate"]').attr('content') ||
                                    $detail('.event-date').text() ||
                                    $detail('.date-time').text() ||
                                    $detail('time[datetime]').attr('datetime') ||
                                    $detail('.event-time-label, [class*="event-time-label"]').first().text().trim();
                                if (detailDateStr) {
                                    // Clean the text to remove DST warnings and other noise
                                    const cleaned = detailDateStr
                                        .replace(/to\s+.*$/i, '') // Remove end time
                                        .replace(/\([^)]*\)/g, '') // Remove parentheses (DST warnings)
                                        .replace(/\s*\.\s*The\s+event\s+timings.*$/i, '') // Remove trailing warnings
                                        .replace(/\s*We\s+recommend.*$/i, '') // Remove recommendations
                                        .split(/[\n.]/)[0] // Take first sentence
                                        .trim();
                                    // Only check TBD on the cleaned date string, not the full page
                                    if (cleaned && !isTBDDate(cleaned)) {
                                        date = normalizeDate(cleaned);
                                        if (date) {
                                            console.log(`  ✅ Extracted date from detail page HTML: ${date}`);
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // Detail page fetch failed, try listing page as fallback
                            console.log(`  ⚠️ Detail page fetch failed, trying listing page: ${e}`);
                            const dateStr = card.find('[itemprop="startDate"]').attr('content') ||
                                card.find('[data-date]').attr('data-date') ||
                                card.find('.date, .time, .start-time').first().text();
                            if (dateStr && !isTBDDate(dateStr)) {
                                date = normalizeDate(dateStr);
                            }
                        }
                        
                        if (!date) {
                            const originalDateStr = card.find('[itemprop="startDate"]').attr('content') ||
                                card.find('[data-date]').attr('data-date') ||
                                card.find('.date, .time, .start-time').first().text() || 'none';
                            console.log(`Skipping event with unparseable date: "${title}" - original dateStr: "${originalDateStr}"`);
                            continue; // Skip this event entirely
                        }

                        // Enhanced location extraction - also try from detail page if generic
                        let location = cleanText(card.find('.subtitle, .venue, [itemprop="location"]').text()) || 'Toronto, ON';
                        
                        // If location is generic and we fetched detail page, try to get better location
                        if ((location === 'Toronto, ON' || location.length < 10) && date) {
                            // Location extraction from detail page happens in fetchEventDetails
                            // We'll update it there if available
                        }

                        // Improved image extraction: try data-src (lazy load) then src
                        let image = card.find('img').first().attr('data-src') ||
                            card.find('img').first().attr('src') ||
                            card.find('[itemprop="image"]').attr('content');

                        // If relative URL, make absolute
                        if (image && !image.startsWith('http')) {
                            image = `https://allevents.in${image.startsWith('/') ? '' : '/'}${image}`;
                        }

                        // Enhanced description extraction - try multiple selectors
                        let description = cleanDescription(
                            card.find('.description, .detail, .event-description, .summary, p').first().text() ||
                            card.find('[itemprop="description"]').text()
                        );

                        const combinedText = `${title} ${description} ${card.text()}`;

                        let price = 'See Tickets';
                        let priceAmount: number | undefined;
                        let isFree = false;

                        // Enhanced price extraction - support CAD, USD, and other currencies
                        // Try CAD first (common for Toronto events)
                        const cadMatch = combinedText.match(/(?:CAD|C\$)\s*(\d+(?:\.\d{2})?)/i);
                        if (cadMatch) {
                            priceAmount = parseFloat(cadMatch[1]);
                            price = `$${priceAmount}`; // Display as $ for consistency
                        } else {
                            // Try USD format
                            const usdMatch = combinedText.match(/\$\s?(\d+(?:\.\d{2})?)/);
                            if (usdMatch) {
                                priceAmount = parseFloat(usdMatch[1]);
                                price = `$${priceAmount}`;
                            } else {
                                // Try "Starting at" or "Tickets from" patterns
                                const startingAtMatch = combinedText.match(/(?:starting at|tickets from|from)\s*(?:CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i);
                                if (startingAtMatch) {
                                    priceAmount = parseFloat(startingAtMatch[1]);
                                    price = `$${priceAmount}`;
                                } else if (combinedText.toLowerCase().includes('free')) {
                                    isFree = true;
                                    price = 'Free';
                                    priceAmount = 0;
                                }
                            }
                        }

                        // CRITICAL: Always fetch detail page for accurate date, time, location, price, and description
                        // This ensures we get the most accurate data from the source page
                        const details = await this.fetchEventDetails(fullUrl);
                        
                        // Update date if detail page has more accurate date/time
                        if (details.date && details.date !== date) {
                            const detailDate = new Date(details.date);
                            const currentDate = new Date(date);
                            // Only update if the time component is different (more accurate)
                            if (detailDate.getHours() !== currentDate.getHours() || 
                                detailDate.getMinutes() !== currentDate.getMinutes()) {
                                date = details.date;
                                console.log(`  ✅ Updated date from detail page: ${date}`);
                            }
                        }
                        
                        // Update location if detail page has specific venue
                        if (details.location && 
                            details.location !== location &&
                            details.location.length > location.length &&
                            !details.location.match(/^Toronto, ON$/i)) {
                            location = details.location;
                            console.log(`  ✅ Updated location from detail page: ${location}`);
                        }
                        
                        // Update description if detail page has better one
                        if (details.description && (!description || description.length < details.description.length)) {
                            description = details.description;
                        }
                        
                        // Use detail page price if available (prefer Eventbrite prices from original source)
                        if (details.price && details.priceAmount !== undefined) {
                            if (!priceAmount || price === 'See Tickets') {
                                price = details.price;
                                priceAmount = details.priceAmount;
                                // Update isFree if price is 0
                                if (details.priceAmount === 0) {
                                    isFree = true;
                                }
                            } else if (details.priceAmount < priceAmount) {
                                // Use lower price if detail page has a better (lower) price
                                price = details.price;
                                priceAmount = details.priceAmount;
                                if (details.priceAmount === 0) {
                                    isFree = true;
                                }
                            }
                        }
                        
                        // Extract tags if any
                        const tags: string[] = [];
                        card.find('.tags a, .categories a, .event-tags span').each((_, tagEl) => {
                            const t = cleanText($(tagEl).text());
                            if (t && !tags.includes(t)) tags.push(t);
                        });

                        // Also capture min/max prices and ticket types if available from Eventbrite
                        const eventData: any = {
                            id: generateEventId(fullUrl),
                            title,
                            date,
                            location,
                            source: 'AllEvents.in',
                            host: location.split(',')[0],
                            url: fullUrl,
                            image,
                            price,
                            priceAmount,
                            isFree,
                            description,
                            categories: categorizeEvent(title, description),
                            tags,
                            status: 'UPCOMING',
                            lastUpdated: new Date().toISOString()
                        };
                        
                        // Add comprehensive data if extracted from Eventbrite
                        if (details.minPrice !== undefined) {
                            eventData.minPrice = details.minPrice;
                        }
                        if (details.maxPrice !== undefined) {
                            eventData.maxPrice = details.maxPrice;
                        }
                        if (details.ticketTypes && details.ticketTypes.length > 0) {
                            eventData.ticketTypes = details.ticketTypes;
                        }

                        const event: Event = eventData;
                        const priceInfo = details.minPrice !== undefined 
                            ? ` (Price from Eventbrite: $${details.minPrice}${details.maxPrice ? ` - $${details.maxPrice}` : ''})`
                            : details.priceAmount !== undefined && details.priceAmount > 0
                            ? ` (Price: $${details.priceAmount})`
                            : '';
                        console.log(`Successfully scraped AllEvents item: ${title}${priceInfo}`);
                        events.push(event);

                    } catch (e) {
                        // ignore
                    }
                }

            } catch (e: any) {
                errors.push(`AllEvents error: ${e.message}`);
            }
        }

        return { events, errors };
    }
}
