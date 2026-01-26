import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class TorontoDatingHubScraper implements ScraperSource {
    name = 'Toronto Dating Hub';
    private baseUrl = 'https://www.torontodatinghub.com/events';

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];

        try {
            console.log(`Scraping Toronto Dating Hub from: ${this.baseUrl}...`);
            const response = await axios.get(this.baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                }
            });

            const $ = cheerio.load(response.data);

            // Try to find event cards/items
            $('.event-item, .event-card, article, .wix-event, .tribe-events-list-event-row').each((_, el) => {
                try {
                    const card = $(el);

                    // Extract title
                    const title = cleanText(
                        card.find('h1, h2, h3, h4, .event-title, .tribe-events-list-event-title').first().text()
                    );

                    if (!title) return;

                    // Extract link
                    let link = card.find('a').first().attr('href');
                    if (!link) return;

                    const fullUrl = link.startsWith('http') ? link : `https://www.torontodatinghub.com${link.startsWith('/') ? link : '/' + link}`;

                    // Extract date
                    const dateText = cleanText(
                        card.find('.event-date, .tribe-event-date-start, time').first().text()
                    );
                    const date = normalizeDate(dateText) || new Date().toISOString();

                    // Extract location
                    const location = cleanText(
                        card.find('.event-location, .tribe-events-venue-details, .location').first().text()
                    ) || 'Toronto, ON';

                    // Extract description
                    const description = cleanText(
                        card.find('.event-description, .tribe-events-list-event-description, p').first().text()
                    );

                    // Extract image
                    const image = card.find('img').first().attr('src');
                    const fullImage = image && !image.startsWith('http') ? `https://www.torontodatinghub.com${image}` : image;

                    const event: Event = {
                        id: generateEventId(fullUrl),
                        title: title,
                        date: date,
                        location: location,
                        source: 'Toronto Dating Hub',
                        host: 'Toronto Dating Hub',
                        url: fullUrl,
                        image: fullImage,
                        price: 'See Event', // Pricing varies
                        isFree: false,
                        description: description,
                        categories: [...new Set([...categorizeEvent(title, description), 'Dating', 'Speed Dating'])],
                        status: 'UPCOMING',
                        lastUpdated: new Date().toISOString()
                    };
                    events.push(event);
                } catch (e) {
                    console.error(`Error parsing Toronto Dating Hub item:`, e);
                }
            });

        } catch (e: any) {
            errors.push(`Toronto Dating Hub error: ${e.message}`);
        }

        return { events, errors };
    }
}
