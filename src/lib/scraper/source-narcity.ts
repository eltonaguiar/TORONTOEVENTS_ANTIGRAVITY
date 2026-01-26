import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class NarcityScraper implements ScraperSource {
    name = 'Narcity';
    private baseUrl = 'https://www.narcity.com/tag/toronto-events';

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];

        try {
            console.log(`Scraping Narcity from: ${this.baseUrl}...`);
            const response = await axios.get(this.baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                }
            });

            const $ = cheerio.load(response.data);

            // Narcity typically uses article tags
            $('article, .article-card, .post-card, .card').each((_, el) => {
                try {
                    const card = $(el);

                    // Extract title
                    const titleEl = card.find('h1, h2, h3, h4, .title, .article-title').first();
                    const title = cleanText(titleEl.text());

                    if (!title) return;

                    // Extract link
                    let link = titleEl.find('a').attr('href') || card.find('a').first().attr('href');
                    if (!link) return;

                    const fullUrl = link.startsWith('http') ? link : `https://www.narcity.com${link.startsWith('/') ? link : '/' + link}`;

                    // Extract date from article metadata or text
                    const dateText = cleanText(
                        card.find('.date, .published, time, .article-date').first().text()
                    );
                    const date = normalizeDate(dateText);

                    // For Narcity, articles might not have explicit event dates, so we'll be more lenient
                    // and use publication date if available, or skip if no date at all

                    // Extract description
                    const description = cleanText(
                        card.find('.description, .excerpt, .summary, p').first().text()
                    );

                    // Extract image
                    const image = card.find('img').first().attr('src') || card.find('img').first().attr('data-src');
                    const fullImage = image && !image.startsWith('http') && !image.startsWith('//')
                        ? `https://www.narcity.com${image}`
                        : (image?.startsWith('//') ? `https:${image}` : image);

                    // Only add if we have a valid date or if it's clearly an event article
                    const isEventArticle = title.toLowerCase().includes('event') ||
                        description.toLowerCase().includes('event') ||
                        title.toLowerCase().includes('happening') ||
                        title.toLowerCase().includes('festival');

                    if (!date && !isEventArticle) return;

                    const event: Event = {
                        id: generateEventId(fullUrl),
                        title: title,
                        date: date || new Date().toISOString(),
                        location: 'Toronto, ON',
                        source: 'Narcity',
                        host: 'Narcity',
                        url: fullUrl,
                        image: fullImage,
                        price: 'See Article',
                        isFree: false,
                        description: description,
                        categories: categorizeEvent(title, description),
                        status: 'UPCOMING',
                        lastUpdated: new Date().toISOString()
                    };
                    events.push(event);
                } catch (e) {
                    console.error(`Error parsing Narcity item:`, e);
                }
            });

        } catch (e: any) {
            errors.push(`Narcity error: ${e.message}`);
        }

        return { events, errors };
    }
}
