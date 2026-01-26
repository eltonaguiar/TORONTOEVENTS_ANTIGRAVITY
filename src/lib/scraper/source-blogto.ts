import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class BlogTOScraper implements ScraperSource {
    name = 'blogTO';
    private baseUrl = 'https://www.blogto.com/events/';

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];

        try {
            console.log(`Scraping blogTO from: ${this.baseUrl}...`);
            const response = await axios.get(this.baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                }
            });

            const $ = cheerio.load(response.data);

            // BlogTO typically uses article tags or event cards
            $('article, .event-item, .listing-item, .post').each((_, el) => {
                try {
                    const card = $(el);

                    // Extract title
                    const titleEl = card.find('h1, h2, h3, h4, .title, .event-title').first();
                    const title = cleanText(titleEl.text());

                    if (!title) return;

                    // Extract link
                    let link = titleEl.find('a').attr('href') || card.find('a').first().attr('href');
                    if (!link) return;

                    const fullUrl = link.startsWith('http') ? link : `https://www.blogto.com${link.startsWith('/') ? link : '/' + link}`;

                    // Extract date
                    const dateText = cleanText(
                        card.find('.date, .event-date, time, .published').first().text()
                    );
                    const date = normalizeDate(dateText);

                    if (!date) return; // Skip if no valid date

                    // Extract location
                    const location = cleanText(
                        card.find('.location, .venue, .event-location').first().text()
                    ) || 'Toronto, ON';

                    // Extract description
                    const description = cleanText(
                        card.find('.description, .excerpt, .summary, p').first().text()
                    );

                    // Extract image
                    const image = card.find('img').first().attr('src') || card.find('img').first().attr('data-src');
                    const fullImage = image && !image.startsWith('http') && !image.startsWith('//')
                        ? `https://www.blogto.com${image}`
                        : (image?.startsWith('//') ? `https:${image}` : image);

                    const event: Event = {
                        id: generateEventId(fullUrl),
                        title: title,
                        date: date,
                        location: location,
                        source: 'blogTO',
                        host: 'blogTO',
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
                    console.error(`Error parsing blogTO item:`, e);
                }
            });

        } catch (e: any) {
            errors.push(`blogTO error: ${e.message}`);
        }

        return { events, errors };
    }
}
