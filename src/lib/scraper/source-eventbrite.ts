import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class EventbriteScraper implements ScraperSource {
    name = 'Eventbrite';
    private baseUrl = 'https://www.eventbrite.ca';

    private searchUrls = [
        '/d/canada--toronto/events--today/',
        '/d/canada--toronto/music--events/',
        '/d/canada--toronto/business--events/',
        '/d/canada--toronto/food-and-drink--events/',
    ];

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];

        // Hardcoded robust headers
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"'
        };

        for (const path of this.searchUrls) {
            try {
                console.log(`Scraping ${path}...`);
                const url = `${this.baseUrl}${path}`;
                const response = await axios.get(url, { headers });
                console.log(`Response status: ${response.status}, length: ${response.data.length}`);

                const $ = cheerio.load(response.data);

                // Strategy 1: JSON-LD (Most reliable)
                const scripts = $('script[type="application/ld+json"]');
                console.log(`Found ${scripts.length} JSON-LD scripts.`);

                scripts.each((_, script) => {
                    try {
                        const jsonText = $(script).html() || '{}';
                        const data = JSON.parse(jsonText);
                        const items = Array.isArray(data) ? data : [data];
                        console.log(`JSON-LD contains ${items.length} items.`);

                        for (const item of items) {
                            if (item['@type'] === 'ItemList' && item.itemListElement) {
                                const subItems = item.itemListElement;
                                console.log(`Found ItemList with ${subItems.length} elements`);

                                for (const sub of subItems) {
                                    const eventItem = sub.item; // Often structured as { position: 1, item: { @type: 'Event'... } }
                                    if (eventItem && (eventItem['@type'] === 'Event' || eventItem['@type'] === 'EventSeries')) {
                                        const title = eventItem.name;
                                        const url = eventItem.url;
                                        if (!title || !url) continue;

                                        const eventId = generateEventId(url);
                                        const date = eventItem.startDate ? normalizeDate(eventItem.startDate) : new Date().toISOString();
                                        const endDate = eventItem.endDate ? (normalizeDate(eventItem.endDate) || undefined) : undefined;

                                        let location = 'Toronto, ON';
                                        if (eventItem.location) {
                                            if (typeof eventItem.location === 'string') location = eventItem.location;
                                            else if (eventItem.location.name) location = eventItem.location.name;
                                            else if (eventItem.location.address?.addressLocality) location = eventItem.location.address.addressLocality;
                                        }

                                        const event: Event = {
                                            id: eventId,
                                            title: cleanText(title),
                                            date: date || new Date().toISOString(),
                                            endDate,
                                            location: cleanText(location),
                                            source: 'Eventbrite',
                                            url,
                                            image: eventItem.image,
                                            price: 'TBD',
                                            isFree: false,
                                            description: cleanText(eventItem.description || ''),
                                            categories: ['General'],
                                            status: 'UPCOMING',
                                            lastUpdated: new Date().toISOString()
                                        };
                                        events.push(event);
                                    }
                                }
                            }

                            if (item['@type'] === 'Event' || item['@type'] === 'EventSeries') {
                                // Extract fields
                                const title = item.name;
                                const url = item.url;
                                if (!title || !url) continue;

                                const eventId = generateEventId(url);
                                const date = item.startDate ? normalizeDate(item.startDate) : new Date().toISOString();
                                const endDate = item.endDate ? (normalizeDate(item.endDate) || undefined) : undefined;

                                let location = 'Toronto, ON';
                                if (item.location) {
                                    if (typeof item.location === 'string') location = item.location;
                                    else if (item.location.name) location = item.location.name;
                                    else if (item.location.address?.addressLocality) location = item.location.address.addressLocality;
                                }

                                let price = 'TBD';
                                let isFree = false;
                                if (item.offers) {
                                    const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                                    if (offer.price === '0' || offer.price === 0) { isFree = true; price = 'Free'; }
                                    else if (offer.price) { price = `$${offer.price}`; }
                                }

                                const event: Event = {
                                    id: eventId,
                                    title: cleanText(title),
                                    date: date || new Date().toISOString(),
                                    endDate,
                                    location: cleanText(location),
                                    source: 'Eventbrite',
                                    url,
                                    image: item.image,
                                    price,
                                    isFree,
                                    description: cleanText(item.description || ''),
                                    categories: ['General'],
                                    status: 'UPCOMING',
                                    lastUpdated: new Date().toISOString()
                                };
                                events.push(event);
                            }
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                });

            } catch (error: any) {
                errors.push(`Error fetching ${path}: ${error.message}`);
            }
        }

        // Deduplicate
        const uniqueEvents = Array.from(new Map(events.map(item => [item.id, item])).values());

        return {
            events: uniqueEvents,
            errors
        };
    }
}
