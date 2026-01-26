import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent } from './utils';
import axios from 'axios';

export class ShowpassScraper implements ScraperSource {
    name = 'Showpass';
    private organizations = ['flare-events', 'single-in-the-city', '25datescom'];

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];

        for (const org of this.organizations) {
            try {
                console.log(`Scraping Showpass org: ${org}...`);
                const response = await axios.get(`https://www.showpass.com/api/public/events/?venue__slug=${org}`);
                const data = response.data;

                if (data.results && Array.isArray(data.results)) {
                    for (const item of data.results) {
                        const title = item.name;
                        const url = `https://www.showpass.com/${item.slug}/`;
                        const date = normalizeDate(item.starts_at) || new Date().toISOString();
                        const endDate = normalizeDate(item.ends_at) || undefined;

                        const price = item.ticket_types && item.ticket_types.length > 0
                            ? `$${Math.min(...item.ticket_types.map((t: any) => parseFloat(t.price)))}`
                            : 'See Tickets';

                        const priceAmount = item.ticket_types && item.ticket_types.length > 0
                            ? Math.min(...item.ticket_types.map((t: any) => parseFloat(t.price)))
                            : undefined;

                        const event: Event = {
                            id: generateEventId(url),
                            title: cleanText(title),
                            date,
                            endDate,
                            location: item.location?.name || 'Toronto, ON',
                            source: 'Showpass',
                            url,
                            image: item.image || item.thumbnail,
                            price,
                            priceAmount,
                            isFree: priceAmount === 0,
                            description: cleanText(item.description || ''),
                            categories: categorizeEvent(title, item.description || ''),
                            status: 'UPCOMING',
                            lastUpdated: new Date().toISOString()
                        };
                        events.push(event);
                    }
                }
            } catch (e: any) {
                errors.push(`Showpass error (${org}): ${e.message}`);
            }
        }

        return { events, errors };
    }
}
