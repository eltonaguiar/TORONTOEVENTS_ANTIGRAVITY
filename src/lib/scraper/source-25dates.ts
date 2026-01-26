import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class TwentyFiveDatesScraper implements ScraperSource {
    name = '25dates.com';

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];
        const url = 'https://www.25dates.com/events/search/male-female-1';

        try {
            console.log(`Scraping ${url}...`);
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                }
            });

            const html = response.data;
            const $ = cheerio.load(html);

            $('article.card').each((_, el) => {
                try {
                    const card = $(el);
                    const titleElement = card.find('.card-title');

                    // The title element contains the main title and a span with date info.
                    // We want only the text that is a direct child of .card-title.
                    const title = cleanText(titleElement.contents().filter((_, node) => node.type === 'text').text());

                    const link = card.find('a').first().attr('href');
                    if (!link) return;

                    const fullUrl = link.startsWith('http') ? link : `https://www.25dates.com/${link.startsWith('/') ? link.substring(1) : link}`;

                    const dateRaw = cleanText(card.find('.card-title span').text());
                    const dateMatch = dateRaw.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(.*)/i);
                    const dateStr = dateMatch ? dateMatch[1] : dateRaw.replace(/Speed Dating/i, '').trim();

                    const cleanedDateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
                    const date = normalizeDate(cleanedDateStr);

                    if (!date) {
                        return;
                    }

                    const location = cleanText(card.find('figcaption').text()).replace(/\n/g, ', ');
                    const image = card.find('img.cropped').attr('src');
                    const fullImage = image && !image.startsWith('http') ? `https://www.25dates.com/${image.startsWith('/') ? '' : image}` : image;

                    const description = cleanText(card.find('.card-content p').text());

                    const price = '$59';
                    const priceAmount = 59;

                    const event: Event = {
                        id: generateEventId(fullUrl),
                        title: title || 'Speed Dating Event',
                        date,
                        location: location || 'Toronto, ON',
                        source: '25dates.com',
                        host: '25dates.com',
                        url: fullUrl,
                        image: fullImage,
                        price,
                        priceAmount,
                        isFree: false,
                        description,
                        categories: categorizeEvent(title, description, ['Dating', 'Speed Dating']),
                        status: 'UPCOMING',
                        lastUpdated: new Date().toISOString()
                    };

                    events.push(event);
                } catch (e) {
                    console.error(`Error parsing 25dates item:`, e);
                }
            });

        } catch (e: any) {
            errors.push(`25dates error: ${e.message}`);
        }

        return { events, errors };
    }
}
