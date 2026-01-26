import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class CitySwoonScraper implements ScraperSource {
    name = 'CitySwoon';

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];
        const url = 'https://cityswoon.com/ca/speed-dating-toronto.jsp';

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

            // Extract prices from script tags if possible
            const prices: Record<string, number> = {};
            $('script').each((_, script) => {
                const content = $(script).html() || '';
                if (content.includes('item_id') && content.includes('price')) {
                    // Primitive regex to find item_id and price
                    const matches = content.matchAll(/item_id:\s*"(\d+)",\s*item_name:.*,\s*price:\s*(\d+)/g);
                    for (const match of matches) {
                        prices[match[1]] = parseInt(match[2]);
                    }
                }
            });

            $('.specificEvent').each((_, el) => {
                try {
                    const card = $(el);
                    const title = cleanText(card.find('h4').first().text());
                    const href = card.attr('href');
                    if (!title || !href) return;

                    const fullUrl = href.startsWith('http') ? href : `https://cityswoon.com/ca/${href.startsWith('/') ? href.substring(1) : href}`;

                    // Extract event ID from URL for price lookup
                    const eventMatch = href.match(/(\d+)$/);
                    const eventId = eventMatch ? eventMatch[1] : '';
                    const priceAmount = prices[eventId] || 69; // Default to 69 if not found
                    const price = `$${priceAmount}`;

                    const dateText = cleanText(card.find('.date span').text());
                    // Date format: "Wednesday, 28th Jan - 7:30 pm"
                    const [dayPart, timePart] = dateText.split(' - ');
                    const cleanedDayPart = dayPart.replace(/(\d+)(st|nd|rd|th)/, '$1');

                    // Create a cleaner date string: "28 Jan 2026 7:30 pm"
                    const year = new Date().getFullYear();
                    // Extract just "28 Jan"
                    const dateMatch = cleanedDayPart.match(/\d+\s+[a-z]{3}/i);
                    const formattedDateStr = dateMatch ? `${dateMatch[0]} ${year} ${timePart || ''}` : `${cleanedDayPart} ${year}`;

                    const date = normalizeDate(formattedDateStr);

                    if (!date) {
                        console.log(`CitySwoon: Could not parse date "${dateText}" for event "${title}"`);
                        return;
                    }

                    const description = cleanText(card.find('p').first().text());
                    const ages = cleanText(card.find('span:contains("Ages:")').text());
                    const fullDescription = `${description} ${ages}`.trim();

                    const image = card.find('img[id^="tessing"]').attr('src');
                    const fullImage = image && !image.startsWith('http') ? `https://cityswoon.com${image.startsWith('/') ? '' : '/'}${image}` : image;

                    const event: Event = {
                        id: generateEventId(fullUrl),
                        title,
                        date,
                        location: 'Toronto, ON', // Most are in King West, Fashion District etc.
                        source: 'CitySwoon',
                        url: fullUrl,
                        image: fullImage,
                        price,
                        priceAmount,
                        isFree: false,
                        description: fullDescription,
                        categories: categorizeEvent(title, fullDescription, ['Dating', 'Speed Dating']),
                        status: 'UPCOMING',
                        lastUpdated: new Date().toISOString()
                    };

                    events.push(event);
                } catch (e) {
                    console.error(`Error parsing CitySwoon item:`, e);
                }
            });

        } catch (e: any) {
            errors.push(`CitySwoon error: ${e.message}`);
        }

        return { events, errors };
    }
}
