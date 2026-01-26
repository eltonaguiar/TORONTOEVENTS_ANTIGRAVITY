import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class AllEventsScraper implements ScraperSource {
    name = 'AllEvents.in';

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];
        const url = 'https://allevents.in/toronto';

        try {
            console.log(`Scraping ${url}...`);
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Referer': 'https://www.google.com/',
                }
            });
            console.log(`Response status: ${response.status}, length: ${response.data.length}`);

            const $ = cheerio.load(response.data);

            const elements = $('.event-card, .event-item, [data-event-id], li[itemscope]');
            console.log(`Found ${elements.length} elements matching selectors.`);

            // Select event cards
            elements.each((i, el) => {
                try {
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

                    if (!title || !urlRaw) return;

                    // Fix URL
                    const fullUrl = urlRaw.startsWith('http') ? urlRaw : `https://allevents.in${urlRaw}`;

                    // Date
                    let dateStr = card.find('[itemprop="startDate"]').attr('content') ||
                        card.find('.date, .time, .start-time').first().text();

                    // Parse and validate date - REJECT if unparseable
                    let date = normalizeDate(dateStr);
                    if (!date) {
                        console.log(`Skipping event with unparseable date: "${title}" - dateStr: "${dateStr}"`);
                        return; // Skip this event entirely
                    }

                    const location = cleanText(card.find('.subtitle, .venue, [itemprop="location"]').text()) || 'Toronto, ON';

                    const event: Event = {
                        id: generateEventId(fullUrl),
                        title,
                        date,
                        location,
                        source: 'AllEvents.in',
                        url: fullUrl,
                        price: 'TBD',
                        isFree: false,
                        description: '',
                        categories: categorizeEvent(title, ''),
                        status: 'UPCOMING',
                        lastUpdated: new Date().toISOString()
                    };
                    events.push(event);

                } catch (e) {
                    // ignore
                }
            });

        } catch (e: any) {
            errors.push(`AllEvents error: ${e.message}`);
        }

        return { events, errors };
    }
}
