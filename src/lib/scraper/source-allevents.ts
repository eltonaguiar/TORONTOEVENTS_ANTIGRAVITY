import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class AllEventsScraper implements ScraperSource {
    name = 'AllEvents.in';

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];
        const paths: string[] = [];
        const categories = [
            'toronto', // General
            'toronto/dating',
            'toronto/singles',
            'toronto/food-drinks',
            'toronto/music',
            'toronto/arts',
            'toronto/workshops',
            'toronto/business',
            'toronto/sports',
            'toronto/comedy',
            'toronto/parties',
            'toronto/health-wellness'
        ];

        // Pagination for volume
        for (const cat of categories) {
            paths.push(`/${cat}`);
            for (let i = 2; i <= 6; i++) {
                paths.push(`/${cat}?page=${i}`);
            }
        }

        for (const path of paths) {
            const url = `https://allevents.in${path}`;
            try {
                console.log(`Scraping ${url}...`);
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Encoding': 'identity',
                    }
                });

                const html = Buffer.from(response.data).toString('utf8');
                console.log(`Response status: ${response.status}, length: ${html.length}`);

                const $ = cheerio.load(html);

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

                        if (!title || !urlRaw || urlRaw === '#' || urlRaw.startsWith('javascript:')) {
                            console.log(`Skipping event with missing/invalid URL: "${title}"`);
                            return;
                        }

                        // Fix URL - ensure it is absolute
                        let fullUrl = urlRaw;
                        if (!fullUrl.startsWith('http')) {
                            // Prepend domain if relative
                            const domain = 'https://allevents.in';
                            fullUrl = fullUrl.startsWith('/') ? `${domain}${fullUrl}` : `${domain}/${fullUrl}`;
                        }

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

                        // Improved image extraction: try data-src (lazy load) then src
                        let image = card.find('img').first().attr('data-src') ||
                            card.find('img').first().attr('src') ||
                            card.find('[itemprop="image"]').attr('content');

                        // If relative URL, make absolute
                        if (image && !image.startsWith('http')) {
                            image = `https://allevents.in${image.startsWith('/') ? '' : '/'}${image}`;
                        }

                        const description = cleanText(card.find('.description, .detail').text());
                        const combinedText = `${title} ${description} ${card.text()}`;

                        let price = 'See Tickets';
                        let priceAmount: number | undefined;
                        let isFree = false;

                        const priceMatch = combinedText.match(/\$\s?(\d+(?:\.\d{2})?)/);
                        if (priceMatch) {
                            priceAmount = parseFloat(priceMatch[1]);
                            price = `$${priceAmount}`;
                        } else if (combinedText.toLowerCase().includes('free')) {
                            isFree = true;
                            price = 'Free';
                            priceAmount = 0;
                        }

                        const event: Event = {
                            id: generateEventId(fullUrl),
                            title,
                            date,
                            location,
                            source: 'AllEvents.in',
                            host: location.split(',')[0], // Usually the venue/organizer
                            url: fullUrl,
                            image,
                            price,
                            priceAmount,
                            isFree,
                            description,
                            categories: categorizeEvent(title, description),
                            status: 'UPCOMING',
                            lastUpdated: new Date().toISOString()
                        };
                        console.log(`Successfully scraped AllEvents item: ${title}`);
                        events.push(event);

                    } catch (e) {
                        // ignore
                    }
                });

            } catch (e: any) {
                errors.push(`AllEvents error: ${e.message}`);
            }
        }

        return { events, errors };
    }
}
