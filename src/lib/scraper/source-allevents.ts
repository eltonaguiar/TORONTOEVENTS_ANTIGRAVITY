import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent, cleanDescription } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class AllEventsScraper implements ScraperSource {
    name = 'AllEvents.in';

    /**
     * Fetch event detail page for enhanced data extraction
     */
    private async fetchEventDetails(url: string): Promise<{ description?: string; price?: string; priceAmount?: number }> {
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

            return { description, price, priceAmount };
        } catch (e) {
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

                        // Date
                        let dateStr = card.find('[itemprop="startDate"]').attr('content') ||
                            card.find('.date, .time, .start-time').first().text();

                        // Parse and validate date - REJECT if unparseable
                        let date = normalizeDate(dateStr);
                        if (!date) {
                            console.log(`Skipping event with unparseable date: "${title}" - dateStr: "${dateStr}"`);
                            continue; // Skip this event entirely
                        }

                        const location = cleanText(card.find('.subtitle, .venue, [itemprop="location"]').text()) || 'Toronto, ON';

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

                        // Always fetch detail page for better price and description data
                        // This ensures we get accurate pricing (especially for events with multiple ticket tiers)
                        const details = await this.fetchEventDetails(fullUrl);
                        if (details.description && (!description || description.length < details.description.length)) {
                            description = details.description;
                        }
                        // Use detail page price if:
                        // 1. We don't have a price yet, OR
                        // 2. The detail page price is lower (to avoid showing premium tier prices)
                        if (details.price && details.priceAmount) {
                            if (!priceAmount || price === 'See Tickets') {
                                price = details.price;
                                priceAmount = details.priceAmount;
                            } else if (details.priceAmount < priceAmount) {
                                // Use lower price if detail page has a better (lower) price
                                price = details.price;
                                priceAmount = details.priceAmount;
                            }
                        }

                        // Extract tags if any
                        const tags: string[] = [];
                        card.find('.tags a, .categories a, .event-tags span').each((_, tagEl) => {
                            const t = cleanText($(tagEl).text());
                            if (t && !tags.includes(t)) tags.push(t);
                        });

                        const event: Event = {
                            id: generateEventId(fullUrl),
                            title,
                            date,
                            location,
                            source: 'AllEvents.in',
                            host: location.split(',')[0], // Usually the venue/organizer
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
                        console.log(`Successfully scraped AllEvents item: ${title}`);
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
