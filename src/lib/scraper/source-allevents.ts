import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class AllEventsScraper implements ScraperSource {
    name = 'AllEvents.in';

    /**
     * Fetch event detail page for enhanced data extraction
     */
    private async fetchEventDetails(url: string): Promise<{ description?: string; price?: string; priceAmount?: number }> {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Encoding': 'identity',
                }
            });

            const html = Buffer.from(response.data).toString('utf8');
            const $ = cheerio.load(html);

            // Extract description from "About the event" section
            // Try multiple selectors based on AllEvents.in structure
            let description = '';
            
            // Method 1: Direct description selectors
            description = cleanText(
                $('.event-description, #event-description, [itemprop="description"]').text() ||
                $('.about-event, .event-details, .event-about').text()
            );
            
            // Method 2: Find "About the event" heading and get following content
            if (!description || description.length < 50) {
                const aboutHeading = $('h2:contains("About"), h3:contains("About"), h4:contains("About")').filter((i, el) => {
                    return $(el).text().toLowerCase().includes('about');
                });
                if (aboutHeading.length > 0) {
                    const aboutSection = aboutHeading.first().parent().find('p, div').text();
                    if (aboutSection && aboutSection.length > description.length) {
                        description = cleanText(aboutSection);
                    }
                }
            }
            
            // Method 3: Get all paragraph text from main content area
            if (!description || description.length < 50) {
                const mainContent = $('main, .main-content, .event-content, article').find('p').text();
                if (mainContent && mainContent.length > description.length) {
                    description = cleanText(mainContent);
                }
            }

            // Extract price from detail page - try multiple methods
            let price: string | undefined;
            let priceAmount: number | undefined;
            
            // Method 1: Look for "Starting at CAD X" or "Tickets from CAD X"
            let priceText = $('*:contains("Starting at"), *:contains("Tickets from")').first().text();
            
            // Method 2: Check ticket table (common format: "General Admission | 62 CAD")
            if (!priceText || priceText.length < 10) {
                const ticketTable = $('table').filter((i, el) => {
                    return $(el).text().toLowerCase().includes('ticket');
                });
                if (ticketTable.length > 0) {
                    priceText = ticketTable.first().text();
                }
            }
            
            // Method 3: Direct price selectors
            if (!priceText || priceText.length < 10) {
                priceText = $('.ticket-price, .price, [itemprop="price"], .event-price').text();
            }
            
            // Method 4: Look for price in any text containing CAD or $
            if (!priceText || priceText.length < 10) {
                const allText = $('body').text();
                const priceMatch = allText.match(/(?:starting at|tickets from|from)\s*(?:CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i);
                if (priceMatch) {
                    priceText = priceMatch[0];
                }
            }

            if (priceText) {
                // Try CAD first (most common for Toronto)
                const cadMatch = priceText.match(/(?:CAD|C\$)\s*(\d+(?:\.\d{2})?)/i);
                if (cadMatch) {
                    priceAmount = parseFloat(cadMatch[1]);
                    price = `$${priceAmount}`;
                } else {
                    // Try USD format
                    const usdMatch = priceText.match(/\$\s?(\d+(?:\.\d{2})?)/);
                    if (usdMatch) {
                        priceAmount = parseFloat(usdMatch[1]);
                        price = `$${priceAmount}`;
                    } else {
                        // Try just numbers (might be in table format like "62 CAD")
                        const numberMatch = priceText.match(/(\d+(?:\.\d{2})?)\s*(?:CAD|C\$)/i);
                        if (numberMatch) {
                            priceAmount = parseFloat(numberMatch[1]);
                            price = `$${priceAmount}`;
                        }
                    }
                }
            }

            return { description, price, priceAmount };
        } catch (e) {
            // Silently fail - return empty object
            return {};
        }
    }

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

                // Select event cards - use for loop to support async operations
                for (let i = 0; i < elements.length; i++) {
                    try {
                        const el = elements[i];
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
                            continue;
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
                            continue; // Skip this event entirely
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

                        // Enhanced description extraction - try multiple selectors
                        let description = cleanText(
                            card.find('.description, .detail, .event-description, .summary, p').first().text() ||
                            card.find('[itemprop="description"]').text()
                        );
                        
                        const combinedText = `${title} ${description} ${card.text()}`;

                        let price = 'See Tickets';
                        let priceAmount: number | undefined;
                        let isFree = false;

                        // Enhanced price extraction - support CAD, USD, and other currencies
                        // Try CAD first (common for Toronto events)
                        const cadMatch = combinedText.match(/(?:CAD|C\$)\s*(\d+(?:\.\d{2})?)/i);
                        if (cadMatch) {
                            priceAmount = parseFloat(cadMatch[1]);
                            price = `$${priceAmount}`; // Display as $ for consistency
                        } else {
                            // Try USD format
                            const usdMatch = combinedText.match(/\$\s?(\d+(?:\.\d{2})?)/);
                            if (usdMatch) {
                                priceAmount = parseFloat(usdMatch[1]);
                                price = `$${priceAmount}`;
                            } else {
                                // Try "Starting at" or "Tickets from" patterns
                                const startingAtMatch = combinedText.match(/(?:starting at|tickets from|from)\s*(?:CAD|C\$|\$)?\s*(\d+(?:\.\d{2})?)/i);
                                if (startingAtMatch) {
                                    priceAmount = parseFloat(startingAtMatch[1]);
                                    price = `$${priceAmount}`;
                                } else if (combinedText.toLowerCase().includes('free')) {
                                    isFree = true;
                                    price = 'Free';
                                    priceAmount = 0;
                                }
                            }
                        }

                        // If description is missing/short or price wasn't found, fetch detail page
                        if ((!description || description.length < 50) || (!priceAmount && price === 'See Tickets')) {
                            const details = await this.fetchEventDetails(fullUrl);
                            if (details.description && (!description || description.length < details.description.length)) {
                                description = details.description;
                            }
                            if (details.price && details.priceAmount && (!priceAmount || price === 'See Tickets')) {
                                price = details.price;
                                priceAmount = details.priceAmount;
                            }
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
                }

            } catch (e: any) {
                errors.push(`AllEvents error: ${e.message}`);
            }
        }

        return { events, errors };
    }
}
