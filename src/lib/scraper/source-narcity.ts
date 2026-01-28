import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent, cleanDescription, formatTorontoDate } from './utils';
import { safeParseDate } from '../utils/dateHelpers';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Narcity Scraper
 * 
 * ⚠️ IMPORTANT: Narcity is a news/lifestyle site that publishes ARTICLES about events,
 * not actual event listings. Articles have publication dates, not event dates.
 * 
 * This scraper attempts to extract event information from articles, but:
 * - Articles may reference multiple events with different dates
 * - The date extracted is often the publication date, not the event date
 * - Many articles are rejected because they don't have parseable event dates
 * 
 * Consider disabling this scraper or rewriting it to:
 * 1. Fetch article detail pages
 * 2. Parse event dates mentioned in article text (e.g., "Event on Jan 30")
 * 3. Create separate events for each date mentioned in the article
 * 
 * For now, this scraper is kept for completeness but may return 0 events.
 */
export class NarcityScraper implements ScraperSource {
    name = 'Narcity';
    private baseUrl = 'https://www.narcity.com/tag/toronto-events';

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];

        try {
            console.log(`Scraping Narcity from: ${this.baseUrl}...`);
            const response = await axios.get(this.baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                }
            });

            const $ = cheerio.load(response.data);

            // Narcity typically uses article tags
            // Convert to array and use for loop to handle async operations
            const articleElements = $('article, .article-card, .post-card, .card').toArray();
            for (const el of articleElements) {
                try {
                    const card = $(el);

                    // Extract title
                    const titleEl = card.find('h1, h2, h3, h4, .title, .article-title').first();
                    const title = cleanText(titleEl.text());

                    if (!title) continue;

                    // Extract link
                    let link = titleEl.find('a').attr('href') || card.find('a').first().attr('href');
                    if (!link) continue;

                    const fullUrl = link.startsWith('http') ? link : `https://www.narcity.com${link.startsWith('/') ? link : '/' + link}`;

                    // Extract date from article metadata or text
                    // NOTE: This is likely the publication date, not the event date
                    // Articles about events don't have structured event dates
                    const dateText = cleanText(
                        card.find('.date, .published, time, .article-date').first().text()
                    );
                    let date = normalizeDate(dateText);

                    // For Narcity articles, we need to fetch the detail page to find actual event dates
                    // Articles may mention events like "Event on January 30" in the text
                    if (!date || dateText.toLowerCase().includes('published') || dateText.toLowerCase().includes('updated')) {
                        try {
                            console.log(`  📄 Fetching Narcity article detail page to find event dates: ${fullUrl}`);
                            const detailResponse = await axios.get(fullUrl, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                },
                                timeout: 10000
                            });
                            const $detail = cheerio.load(detailResponse.data);
                            
                            // Try to find event dates in article text
                            // Look for patterns like "Event on January 30" or "Happening Jan 30"
                            const articleText = $detail('article, .article-content, .post-content, main').text();
                            
                            // Look for date patterns that suggest actual event dates (not publication dates)
                            const eventDatePatterns = [
                                /(?:event|happening|taking place|occurs|starts?|begins?)\s+(?:on|at|from)?\s+([A-Za-z]+\s+\d{1,2}(?:,\s+\d{4})?)/i,
                                /(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(?:,\s+\d{4})?/i,
                            ];
                            
                            for (const pattern of eventDatePatterns) {
                                const match = articleText.match(pattern);
                                if (match) {
                                    const parsed = safeParseDate(match[1] || match[0], generateEventId(fullUrl), title);
                                    if (parsed.isValid && parsed.date) {
                                        const parsedDate = parsed.date;
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        
                                        // Only accept future dates (articles are about upcoming events)
                                        if (parsedDate >= today) {
                                            date = formatTorontoDate(parsedDate);
                                            console.log(`  ✅ Found event date in article text: ${date}`);
                                            break;
                                        }
                                    }
                                }
                            }
                        } catch (e: any) {
                            console.log(`  ⚠️ Failed to fetch detail page: ${e.message}`);
                        }
                    }

                    // Extract description
                    const description = cleanDescription(
                        card.find('.description, .excerpt, .summary, p').first().text()
                    );

                    // Extract image
                    const image = card.find('img').first().attr('src') || card.find('img').first().attr('data-src');
                    const fullImage = image && !image.startsWith('http') && !image.startsWith('//')
                        ? `https://www.narcity.com${image}`
                        : (image?.startsWith('//') ? `https:${image}` : image);

                    // REJECT events without valid dates - don't default to today
                    // Most Narcity articles will be rejected because they don't have structured event dates
                    if (!date) {
                        console.log(`  ❌ Rejecting Narcity article without valid event date (likely publication date only): ${title}`);
                        continue;
                    }

                    const event: Event = {
                        id: generateEventId(fullUrl),
                        title: title,
                        date: date,
                        location: 'Toronto, ON',
                        source: 'Narcity',
                        host: 'Narcity',
                        url: fullUrl,
                        image: fullImage,
                        price: 'See Article',
                        isFree: false,
                        description: description,
                        categories: categorizeEvent(title, description),
                        status: 'UPCOMING',
                        lastUpdated: new Date().toISOString()
                    };
                    events.push(event);
                } catch (e) {
                    console.error(`Error parsing Narcity item:`, e);
                }
            }

        } catch (e: any) {
            errors.push(`Narcity error: ${e.message}`);
        }

        return { events, errors };
    }
}
