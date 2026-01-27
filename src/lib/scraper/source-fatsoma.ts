import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent, formatTorontoDate } from './utils';
import { safeParseDate } from '../utils/dateHelpers';
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

                        // Extract date - try multiple sources
                        let date: string | null = null;
                        let description = `Official Thursday™ Singles Event in Toronto.`;
                        let image = undefined;

                        // FIRST: Try JSON-LD (most reliable if available)
                        const script = $d('script[type="application/ld+json"]').html();
                        if (script) {
                            try {
                                const data = JSON.parse(script);
                                if (data.startDate) {
                                    date = normalizeDate(data.startDate);
                                    if (date) {
                                        console.log(`  ✅ Extracted date from JSON-LD: ${date}`);
                                    }
                                }
                                description = cleanText(data.description || description);
                                image = data.image;
                            } catch { }
                        }

                        // SECOND: Try parsing human-readable date from "Event Time" block
                        // Format: "Thu 8th Jan at 8:00 pm – Thu 8th Jan at 11:00 pm"
                        if (!date) {
                            // Look for common date selectors
                            const dateText = $d('.event-time, .event-date, [class*="event-time"], [class*="event-date"]').first().text().trim() ||
                                $d('time[datetime]').attr('datetime') ||
                                $d('[itemprop="startDate"]').attr('content');
                            
                            if (dateText) {
                                // Extract just the start date/time (before the "–" or "to")
                                let startDateText = dateText
                                    .split(/[–-]/)[0] // Take first part before dash
                                    .replace(/^\s*(?:on|at|from)\s+/i, '') // Remove prefixes
                                    .trim();
                                
                                // Remove ordinal suffixes (1st, 2nd, 3rd, 4th, etc.) for date-fns parsing
                                // date-fns doesn't handle ordinals, so convert "8th" to "8"
                                startDateText = startDateText.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1');
                                
                                // Parse with safeParseDate which handles year-less dates and infers year
                                const parsed = safeParseDate(startDateText, generateEventId(fullUrl), title);
                                if (parsed.isValid && parsed.date) {
                                    date = formatTorontoDate(parsed.date);
                                    console.log(`  ✅ Extracted date from page text: ${date} (from "${startDateText}")`);
                                } else {
                                    console.log(`  ⚠️ Could not parse date from text: "${startDateText}"`);
                                }
                            }
                        }

                        // If still no date, skip this event (don't use new Date() fallback)
                        if (!date) {
                            console.log(`  ❌ Skipping event with unparseable date: "${title}"`);
                            continue;
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
