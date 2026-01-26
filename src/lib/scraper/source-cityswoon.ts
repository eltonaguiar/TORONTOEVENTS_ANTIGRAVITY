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

            const prices: Record<string, number> = {};
            $('script').each((_, script) => {
                const content = $(script).html() || '';
                if (content.includes('item_id') && content.includes('price')) {
                    const matches = content.matchAll(/item_id:\s*"(\d+)",\s*item_name:.*,\s*price:\s*(\d+)/g);
                    for (const match of matches) {
                        prices[match[1]] = parseInt(match[2]);
                    }
                }
            });

            const processedUrls = new Set<string>();

            $('.upcoming_event_box').each((_, el) => {
                const card = $(el);

                // Content is inside this div, so valid HTML structure usually preserved here.
                const title = cleanText(card.find('h4').text());
                if (!title) return;

                // Try to get URL from buttons inside
                let href = card.find('.moreInfo a').attr('href') ||
                    card.find('.date a').attr('href') ||
                    card.find('a.specificEvent').attr('href'); // Adjusted to find specificEvent within the card if it exists

                if (!href) return;

                const fullUrl = href.startsWith('http') ? href : `https://cityswoon.com/ca/${href.startsWith('/') ? href.substring(1) : href}`;

                if (processedUrls.has(fullUrl)) return;
                processedUrls.add(fullUrl);

                const eventMatch = href.match(/(\d+)$/);
                const eventId = eventMatch ? eventMatch[1] : '';
                const priceAmount = prices[eventId] || 69;
                const price = `$${priceAmount}`;

                const dateElement = card.find('.date');
                const dateText = cleanText(dateElement.text());

                if (!dateText) return;

                const [dayPart, timePart] = dateText.split(' - ');
                const cleanedDayPart = (dayPart || '').replace(/(\d+)(st|nd|rd|th)/, '$1');
                const year = new Date().getFullYear();
                const dateMatch = cleanedDayPart.match(/\d+\s+[a-z]{3}/i);
                const formattedDateStr = dateMatch ? `${dateMatch[0]} ${year} ${timePart || ''}` : `${cleanedDayPart} ${year}`;

                const date = normalizeDate(formattedDateStr);
                if (!date) return;

                const desc = cleanText(card.find('p').first().text());
                const ages = cleanText(card.find('span:contains("Ages:")').text() || card.find('.upcoming_content_middle span').text());
                const fullDescription = `${desc || ''} ${ages || ''}`.trim();

                const img = card.find('img').first().attr('src');
                const fullImage = img && !img.startsWith('http') ? `https://cityswoon.com${img.startsWith('/') ? '' : '/'}${img}` : img;

                events.push({
                    id: generateEventId(fullUrl),
                    title: title,
                    date,
                    location: 'Toronto, ON',
                    source: 'CitySwoon',
                    url: fullUrl,
                    image: fullImage,
                    price: price,
                    priceAmount,
                    isFree: false,
                    description: fullDescription,
                    categories: categorizeEvent(title, fullDescription, ['Dating', 'Speed Dating']),
                    status: 'UPCOMING',
                    lastUpdated: new Date().toISOString()
                });
            });

        } catch (e: any) {
            errors.push(`CitySwoon error: ${e.message}`);
        }

        return { events, errors };
    }
}
