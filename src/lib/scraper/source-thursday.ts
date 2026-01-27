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

                    const event: Event = {
                        id: generateEventId(link),
                        title: title,
                        date: date,
                        location: location,
                        source: 'Thursday',
                        host: 'Thursday App',
                        url: link,
                        image: image,
                        price: 'See App', // Usually requires app for tickets
                        isFree: false,
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
