import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class WaterworksScraper implements ScraperSource {
    name = 'Waterworks Food Hall';
    private baseUrl = 'https://www.waterworksfoodhall.com/whats-on';

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];

        try {
            console.log(`Scraping Waterworks Food Hall from: ${this.baseUrl}...`);
            const response = await axios.get(this.baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                }
            });

            const $ = cheerio.load(response.data);

            // Try to find event items - appears to be React-based with program-item classes
            $('.program-item, .event-item, article').each((_, el) => {
                try {
                    const card = $(el);

                    // Extract title
                    const title = cleanText(
                        card.find('.program-item-title, h1, h2, h3, h4, .event-title').first().text()
                    );

                    if (!title) return;

                    // Extract link
                    let link = card.find('a').first().attr('href');
                    if (!link) {
                        // If no link, create a unique URL based on title
                        link = `/event/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                    }

                    const fullUrl = link.startsWith('http') ? link : `https://www.waterworksfoodhall.com${link.startsWith('/') ? link : '/' + link}`;

                    // Extract date
                    const dateText = cleanText(
                        card.find('.program-item-date, .event-date, time, .date').first().text()
                    );
                    const date = normalizeDate(dateText);

                    if (!date) return; // Skip if no valid date

                    // Extract description
                    const description = cleanText(
                        card.find('.program-item-description, .event-description, p').first().text()
                    );

                    // Extract image
                    const image = card.find('img').first().attr('src');
                    const fullImage = image && !image.startsWith('http') ? `https://www.waterworksfoodhall.com${image}` : image;

                    const event: Event = {
                        id: generateEventId(fullUrl),
                        title: title,
                        date: date,
                        location: 'Waterworks Food Hall, Toronto, ON',
                        source: 'Waterworks Food Hall',
                        host: 'Waterworks Food Hall',
                        url: fullUrl,
                        image: fullImage,
                        price: 'See Event',
                        isFree: false,
                        description: description,
                        categories: categorizeEvent(title, description),
                        status: 'UPCOMING',
                        lastUpdated: new Date().toISOString()
                    };
                    events.push(event);
                } catch (e) {
                    console.error(`Error parsing Waterworks item:`, e);
                }
            });

        } catch (e: any) {
            errors.push(`Waterworks error: ${e.message}`);
        }

        return { events, errors };
    }
}
