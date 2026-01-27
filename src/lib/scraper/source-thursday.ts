import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent, cleanDescription } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class ThursdayScraper implements ScraperSource {
    name = 'Thursday';
    private baseUrl = 'https://events.getthursday.com/toronto/';

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];

        try {
            console.log(`Scraping Thursday events from: ${this.baseUrl}...`);
            const response = await axios.get(this.baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const eventLinks: string[] = [];

            // Find all event links
            // Structure from read_url_content: ### [Title](link)
            $('h3 a').each((_, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('/event/')) {
                    eventLinks.push(href);
                }
            });

            // Also check for other patterns if any
            $('.trip-card a, .event-card a').each((_, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('/event/')) {
                    eventLinks.push(href);
                }
            });

            const uniqueLinks = Array.from(new Set(eventLinks));
            console.log(`Found ${uniqueLinks.length} Thursday event links.`);

            for (const link of uniqueLinks) {
                try {
                    console.log(`  - Fetching details for Thursday event: ${link}`);
                    const detailResponse = await axios.get(link, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        },
                        timeout: 10000
                    });
                    const $d = cheerio.load(detailResponse.data);

                    // Thursday pages usually have JSON-LD
                    const ldScript = $d('script[type="application/ld+json"]').html();
                    let date = new Date().toISOString();
                    let title = cleanText($d('h1').text() || $d('.event-title').text());
                    let description = cleanDescription($d('.event-description').text() || $d('.entry-content').text());
                    let image = $d('.event-image img').attr('src') || $d('.wp-post-image').attr('src');
                    let location = 'Toronto, ON';
                    let latitude: number | undefined;
                    let longitude: number | undefined;

                    if (ldScript) {
                        try {
                            const data = JSON.parse(ldScript);
                            const items = Array.isArray(data) ? data : [data];
                            const eventData = items.find(i => i['@type'] === 'Event' || (Array.isArray(i['@type']) && i['@type'].includes('Event')));

                            if (eventData) {
                                title = cleanText(eventData.name || title);
                                date = normalizeDate(eventData.startDate) || date;
                                description = cleanDescription(eventData.description || description);
                                if (eventData.image) {
                                    image = Array.isArray(eventData.image) ? eventData.image[0] : (typeof eventData.image === 'object' ? eventData.image.url : eventData.image);
                                }
                                if (eventData.location) {
                                    if (typeof eventData.location === 'string') location = eventData.location;
                                    else if (eventData.location.name) location = eventData.location.name;

                                    if (eventData.location.geo) {
                                        latitude = parseFloat(eventData.location.geo.latitude);
                                        longitude = parseFloat(eventData.location.geo.longitude);
                                    }
                                }
                            }
                        } catch (e) { }
                    }

                    if (!title) continue;

                    // Extract price from page
                    let price = 'See App';
                    let priceAmount: number | undefined;
                    let minPrice: number | undefined;
                    let maxPrice: number | undefined;
                    let isFree = false;

                    // Look for prices in the page text
                    const bodyText = $d('body').text();
                    const pricePatterns = [
                        // Match "Early Bird $X" and "General Admission $Y"
                        /(?:early bird|general admission|ticket)\s*(?:is|for|:)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/gi,
                        // Match dollar amounts
                        /\$\s*(\d+(?:\.\d{2})?)/g,
                        // Match prices in text
                        /(?:price|cost|ticket)\s*(?:is|of|for|:)?\s*(?:CA\$|CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/gi
                    ];

                    const prices: number[] = [];
                    for (const pattern of pricePatterns) {
                        const matches = [...bodyText.matchAll(pattern)];
                        for (const match of matches) {
                            const p = parseFloat(match[1]);
                            // Filter reasonable prices (between $0 and $200 for Thursday events)
                            if (!isNaN(p) && p >= 0 && p <= 200) {
                                // Filter out common false positives (years, ages, etc.)
                                if (p !== 2024 && p !== 2025 && p !== 2026 && p !== 19 && p !== 21) {
                                    prices.push(p);
                                }
                            }
                        }
                    }

                    // Remove duplicates and sort
                    const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);

                    if (uniquePrices.length > 0) {
                        minPrice = uniquePrices[0];
                        maxPrice = uniquePrices[uniquePrices.length - 1];
                        priceAmount = minPrice;
                        price = maxPrice > minPrice ? `$${minPrice} - $${maxPrice}` : `$${minPrice}`;
                        isFree = minPrice === 0;
                    }

                    // Check JSON-LD for offers/prices
                    if (ldScript && !priceAmount) {
                        try {
                            const data = JSON.parse(ldScript);
                            const items = Array.isArray(data) ? data : [data];
                            const eventData = items.find(i => i['@type'] === 'Event' || (Array.isArray(i['@type']) && i['@type'].includes('Event')));
                            
                            if (eventData?.offers) {
                                const offers = Array.isArray(eventData.offers) ? eventData.offers : [eventData.offers];
                                const offerPrices = offers
                                    .map((o: any) => {
                                        if (typeof o.price === 'number') return o.price;
                                        if (typeof o.price === 'string') {
                                            const match = o.price.match(/(\d+(?:\.\d{2})?)/);
                                            return match ? parseFloat(match[1]) : null;
                                        }
                                        return null;
                                    })
                                    .filter((p: any) => p !== null && p >= 0 && p <= 200) as number[];

                                if (offerPrices.length > 0) {
                                    minPrice = Math.min(...offerPrices);
                                    maxPrice = Math.max(...offerPrices);
                                    priceAmount = minPrice;
                                    price = maxPrice > minPrice ? `$${minPrice} - $${maxPrice}` : `$${minPrice}`;
                                    isFree = minPrice === 0;
                                }
                            }
                        } catch (e) { }
                    }

                    const event: Event = {
                        id: generateEventId(link),
                        title: title,
                        date: date,
                        location: location,
                        source: 'Thursday',
                        host: 'Thursday App',
                        url: link,
                        image: image,
                        price: price,
                        priceAmount: priceAmount,
                        minPrice: minPrice,
                        maxPrice: maxPrice,
                        isFree: isFree,
                        description: description,
                        latitude,
                        longitude,
                        categories: [...new Set([...categorizeEvent(title, description), 'Dating', 'Thursday'])],
                        status: 'UPCOMING',
                        lastUpdated: new Date().toISOString()
                    };
                    events.push(event);
                } catch (e: any) {
                    console.error(`    Failed to fetch details for ${link}: ${e.message}`);
                }
            }

        } catch (e: any) {
            errors.push(`Thursday scraper error: ${e.message}`);
        }

        return { events, errors };
    }
}
