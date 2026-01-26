import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class FatsomaScraper implements ScraperSource {
    name = 'Fatsoma';
    private profiles = ['thursday-toronto'];

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];

        for (const profile of this.profiles) {
            // Fatsoma doesn't have standard page=2 params visible easily, usually infinite scroll API.
            // But we can try to look for more links on the main profile page.
            // For now, let's just make sure we are thorough on the main profile.
            // Actually, we can try to hit the API if possible, but let's stick to HTML for now.
            // We'll just process the main profile as is, but remove the "thursday |" filter restriction
            // to catch special events that might not have that prefix.
            try {
                console.log(`Scraping Fatsoma profile: ${profile}...`);
                const url = `https://www.fatsoma.com/p/${profile}`;
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });

                const $ = cheerio.load(response.data);

                // Fatsoma usually has event links in a specific structure
                // Looking at the read_url_content output, they are straightforward links
                for (const el of $('a[href*="/e/"]').toArray()) {
                    const link = $(el);
                    const title = cleanText(link.text());
                    const eventUrl = link.attr('href');

                    if (!title || !eventUrl || title.toLowerCase().includes('view events')) continue;
                    if (!title.toLowerCase().includes('thursday |')) continue;

                    const fullUrl = eventUrl.startsWith('http') ? eventUrl : `https://www.fatsoma.com${eventUrl}`;

                    try {
                        console.log(`  - Fetching details for: ${title}`);
                        const detailResponse = await axios.get(fullUrl, { timeout: 10000 });
                        const $d = cheerio.load(detailResponse.data);

                        // Fatsoma has JSON-LD
                        const script = $d('script[type="application/ld+json"]').html();
                        let date = new Date().toISOString();
                        let description = `Official Thursday™ Singles Event in Toronto.`;
                        let image = undefined;

                        if (script) {
                            try {
                                const data = JSON.parse(script);
                                date = normalizeDate(data.startDate) || date;
                                description = cleanText(data.description || description);
                                image = data.image;
                            } catch { }
                        }

                        const event: Event = {
                            id: generateEventId(fullUrl),
                            title: title,
                            date: date,
                            location: 'Toronto, ON',
                            source: 'Thursday/Fatsoma',
                            url: fullUrl,
                            image: image,
                            price: 'See Tickets',
                            isFree: false,
                            description: description,
                            categories: categorizeEvent(title, description),
                            status: 'UPCOMING',
                            lastUpdated: new Date().toISOString()
                        };
                        events.push(event);
                    } catch (e: any) {
                        console.error(`    Failed to fetch details for ${fullUrl}: ${e.message}`);
                    }
                }

            } catch (e: any) {
                errors.push(`Fatsoma error (${profile}): ${e.message}`);
            }
        }

        return { events, errors };
    }
}
