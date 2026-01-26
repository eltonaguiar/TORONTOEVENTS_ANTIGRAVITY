import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent, isEnglish } from './utils';
import { EventbriteDetailScraper } from './detail-scraper';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class EventbriteScraper implements ScraperSource {
    name = 'Eventbrite';
    private baseUrl = 'https://www.eventbrite.ca';

    private searchUrls: string[] = [];

    constructor() { // Generate URLs dynamically
        // 1. CRITICAL: Aggressively target "Today" to ensure high volume
        // The user specifically complained about low "Today" counts.
        this.searchUrls.push('/d/canada--toronto/events--today/');
        for (let i = 2; i <= 5; i++) {
            this.searchUrls.push(`/d/canada--toronto/events--today/?page=${i}`);
        }

        const baseCategories = [
            'events--this-week',
            'food-and-drink--events',
            'arts--events',
            'music--events',
            'community--events',
            'classes--events',
            'hobbies--events',
            'health--events',
            'business--events',
            'charity-and-causes--events',
            'film-and-media--events',
            'fashion--events',
            'sports-and-fitness--events',
            'travel-and-outdoor--events',
            'science-and-tech--events',
            'performing-arts',
            'free--events', // Very important for volume
            'dating--events',
            'singles--events'
        ];

        // Deep paging for massive volume (Pages 1-8)
        // This is aggressive but necessary for "200 events/day"
        for (const cat of baseCategories) {
            this.searchUrls.push(`/d/canada--toronto/${cat}/`);
            for (let i = 2; i <= 8; i++) {
                this.searchUrls.push(`/d/canada--toronto/${cat}/?page=${i}`);
            }
        }

        // Specific targeted searches for "Toronto Dating Hub" as requested
        const hubQueries = [
            'd/canada--toronto/toronto-dating-hub/',
            'd/canada--toronto/dating-hub/',
            'o/toronto-dating-hub-31627918491/',
            'o/mohan-matchmaking-63764588373/'
        ];
        for (const query of hubQueries) {
            this.searchUrls.push(`/${query}`);
            for (let i = 2; i <= 5; i++) {
                this.searchUrls.push(`/${query}?page=${i}`);
            }
        }
    }

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
                                    const eventItem = sub.item;
                                    const type = eventItem?.['@type'];
                                    if (eventItem && typeof type === 'string' && type.includes('Event')) {
                                        const title = eventItem.name;
                                        const url = eventItem.url;
                                        if (!title || !url) continue;

                                        if (!isEnglish(title)) {
                                            console.log(`Skipping non-English event: ${title}`);
                                            continue;
                                        }

                                        const eventId = generateEventId(url);
                                        const date = normalizeDate(eventItem.startDate) || new Date().toISOString();
                                        const endDate = normalizeDate(eventItem.endDate) || undefined;

                                        let location = 'Toronto, ON';
                                        let latitude: number | undefined;
                                        let longitude: number | undefined;

                                        if (eventItem.location) {
                                            if (typeof eventItem.location === 'string') location = eventItem.location;
                                            else if (eventItem.location.name) location = eventItem.location.name;
                                            else if (eventItem.location.address?.addressLocality) location = eventItem.location.address.addressLocality;

                                            if (eventItem.location.geo) {
                                                latitude = parseFloat(eventItem.location.geo.latitude);
                                                longitude = parseFloat(eventItem.location.geo.longitude);
                                            }
                                        }

                                        // Extract categories from keywords if available
                                        let categories = ['General'];
                                        if (eventItem.keywords) {
                                            if (typeof eventItem.keywords === 'string') {
                                                categories = eventItem.keywords.split(',').map((k: string) => cleanText(k));
                                            } else if (Array.isArray(eventItem.keywords)) {
                                                categories = eventItem.keywords.map((k: string) => cleanText(k));
                                            }
                                        }

                                        let priceAmount: number | undefined;
                                        let isFree = eventItem.isAccessibleForFree || eventItem.offers?.price === 0 || eventItem.offers?.price === '0';

                                        if (isFree) {
                                            priceAmount = 0;
                                        } else if (eventItem.offers?.price) {
                                            priceAmount = parseFloat(eventItem.offers.price);
                                        }

                                        let isRecurring = eventItem['@type'] === 'EventSeries' ||
                                            title.toLowerCase().includes('multiple dates') ||
                                            (eventItem.description || '').toLowerCase().includes('multiple dates');

                                        const event: Event = {
                                            id: eventId,
                                            title: cleanText(title),
                                            date,
                                            endDate: isRecurring ? (endDate || date) : endDate,
                                            location: cleanText(location),
                                            source: 'Eventbrite',
                                            host: eventItem.organizer?.name || 'Various Organizers',
                                            url,
                                            image: eventItem.image,
                                            price: priceAmount === 0 ? 'Free' : (priceAmount ? `$${priceAmount}` : 'See tickets'),
                                            priceAmount,
                                            isFree,
                                            description: cleanText(eventItem.description || ''),
                                            latitude,
                                            longitude,
                                            categories: isRecurring
                                                ? [...new Set([...categorizeEvent(title, eventItem.description || ''), 'Multi-Day'])]
                                                : categorizeEvent(title, eventItem.description || ''),
                                            status: 'UPCOMING',
                                            lastUpdated: new Date().toISOString()
                                        };
                                        events.push(event);
                                    }
                                }
                            }

                            const itemType = item['@type'];
                            if (typeof itemType === 'string' && itemType.includes('Event')) {
                                // Extract fields
                                const title = item.name;
                                const url = item.url;
                                if (!title || !url) continue;

                                if (!isEnglish(title)) {
                                    console.log(`Skipping non-English event: ${title}`);
                                    continue;
                                }

                                const eventId = generateEventId(url);
                                const date = item.startDate ? normalizeDate(item.startDate) : new Date().toISOString();
                                const endDate = item.endDate ? (normalizeDate(item.endDate) || undefined) : undefined;

                                let location = 'Toronto, ON';
                                let latitude: number | undefined;
                                let longitude: number | undefined;

                                if (item.location) {
                                    if (typeof item.location === 'string') location = item.location;
                                    else if (item.location.name) location = item.location.name;
                                    else if (item.location.address?.addressLocality) location = item.location.address.addressLocality;

                                    if (item.location.geo) {
                                        latitude = parseFloat(item.location.geo.latitude);
                                        longitude = parseFloat(item.location.geo.longitude);
                                    }
                                }

                                let priceAmount: number | undefined;
                                let isFree = false;
                                if (item.offers) {
                                    const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                                    if (offer.price === '0' || offer.price === 0) {
                                        isFree = true;
                                        priceAmount = 0;
                                    } else if (offer.price) {
                                        priceAmount = parseFloat(offer.price);
                                    }
                                }

                                let isRecurring = item['@type'] === 'EventSeries' ||
                                    title.toLowerCase().includes('multiple dates') ||
                                    (item.description || '').toLowerCase().includes('multiple dates');

                                const event: Event = {
                                    id: eventId,
                                    title: cleanText(title),
                                    date: date || new Date().toISOString(),
                                    endDate: isRecurring ? (endDate || date || new Date().toISOString()) : endDate,
                                    location: cleanText(location),
                                    source: 'Eventbrite',
                                    host: item.organizer?.name || 'Various Organizers',
                                    url,
                                    image: item.image,
                                    price: priceAmount === 0 ? 'Free' : (priceAmount ? `$${priceAmount}` : 'See tickets'),
                                    priceAmount,
                                    isFree,
                                    description: cleanText(item.description || ''),
                                    latitude,
                                    longitude,
                                    categories: isRecurring
                                        ? [...new Set([...categorizeEvent(title, item.description || ''), 'Multi-Day'])]
                                        : categorizeEvent(title, item.description || ''),
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

        // CRITICAL: Enrich with REAL times from individual event pages
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const eventsToEnrich = uniqueEvents.filter(e => {
            const eventDate = new Date(e.date);
            return eventDate >= today && eventDate <= nextWeek;
        });
        console.log(`Enriching ${eventsToEnrich.length} today/tomorrow events with real times...`);
        let successCount = 0;
        for (const event of eventsToEnrich) {
            const enrichment = await EventbriteDetailScraper.enrichEvent(event.url);

            if (enrichment.realTime) {
                const normalized = normalizeDate(enrichment.realTime);
                if (normalized) {
                    event.date = normalized;
                    successCount++;
                }
            }

            if (enrichment.fullDescription) {
                if (enrichment.fullDescription.length > (event.description?.length || 0)) {
                    event.description = enrichment.fullDescription;
                }

                // Double check language on full description if it wasn't caught by title
                if (!isEnglish(event.description)) {
                    event.status = 'CANCELLED'; // Or separate status, but CANCELLED hides it currently
                    console.log(`  ⚠ Non-English description detected: ${event.title.substring(0, 40)}`);
                }
            }

            if (enrichment.salesEnded) {
                event.status = 'CANCELLED';
                console.log(`  ⚠ Sales ended: ${event.title.substring(0, 40)}`);
            }

            if (enrichment.isRecurring && !event.categories.includes('Multi-Day')) {
                event.categories = [...new Set([...event.categories, 'Multi-Day'])];
                if (!event.endDate) event.endDate = event.date;
                console.log(`  ℹ Marked as Multi-Day: ${event.title.substring(0, 40)}`);
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log(`✓ Enriched ${successCount}/${eventsToEnrich.length} events with details`);

        return {
            events: uniqueEvents,
            errors
        };
    }
}

