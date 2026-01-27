import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText, normalizeDate, categorizeEvent, cleanDescription, formatTorontoDate, inferSoldOutStatus } from './utils';
import { safeParseDate } from '../utils/dateHelpers';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Flare Events Scraper
 * 
 * Scrapes speed dating events from flareevents.ca/toronto
 * 
 * Requirements:
 * - Only include events if not fully sold out (gender-specific sold out is OK)
 * - Filter out higher age ranges by default (42+, 50+) using exclusion words
 * - Extract dates, times, prices, and age ranges accurately
 */
export class FlareEventsScraper implements ScraperSource {
    name = 'Flare Events';
    private baseUrl = 'https://flareevents.ca/toronto/#events';

    /**
     * Extract age range from event text
     * Returns { min: number, max: number } or null
     */
    private extractAgeRange(text: string): { min: number; max: number } | null {
        // Patterns: "Ages 34-43", "Ages 27-36", "Ages 42-57"
        const agePattern = /ages?\s+(\d+)[-\s]+(\d+)/i;
        const match = text.match(agePattern);
        if (match) {
            const min = parseInt(match[1], 10);
            const max = parseInt(match[2], 10);
            if (!isNaN(min) && !isNaN(max) && min > 0 && max > 0) {
                return { min, max };
            }
        }
        return null;
    }

    /**
     * Check if event should be excluded based on age range
     * Higher age ranges (42+, 50+) should be filtered by default
     */
    private shouldExcludeByAge(ageRange: { min: number; max: number } | null): boolean {
        if (!ageRange) return false;
        
        // Exclude events with minimum age 42+ or maximum age 50+
        // These are considered "higher age ranges" for default filtering
        // Examples: "Ages 42-57", "Ages 34-50", "Ages 50-65" should all be excluded
        if (ageRange.min >= 42 || ageRange.max >= 50) {
            return true;
        }
        return false;
    }

    /**
     * Extract sold out status from event text
     * Returns gender-specific sold out info
     */
    private extractSoldOutStatus(text: string): { isSoldOut: boolean; genderSoldOut: 'male' | 'female' | 'both' | 'none' } {
        return inferSoldOutStatus(text);
    }

    async scrape(): Promise<ScraperResult> {
        const events: Event[] = [];
        const errors: string[] = [];

        try {
            console.log(`Scraping Flare Events from: ${this.baseUrl}...`);
            const response = await axios.get(this.baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);

            // Flare Events structure: Events are listed in sections with dates
            // Look for event blocks - they typically have dates, titles, ages, prices
            // Structure from the page: Each event has a date heading, then event details
            
            // Try multiple selectors to find event containers
            const eventSelectors = [
                'article',
                '.event',
                '.event-item',
                '[class*="event"]',
                'section > div', // Events might be in sections
            ];

            let eventElements: cheerio.Cheerio<cheerio.Element> = $();
            for (const selector of eventSelectors) {
                const found = $(selector);
                if (found.length > 0) {
                    eventElements = found;
                    console.log(`Found ${found.length} elements with selector: ${selector}`);
                    break;
                }
            }

            // Flare Events page structure: Events are listed with date headings
            // Look for headings (h2, h3, h4) that contain dates, then parse following content
            const dateHeadings = $('h2, h3, h4, h5, [class*="date"], [class*="event-date"]').filter((_, el) => {
                const text = $(el).text();
                return /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/i.test(text);
            });
            
            if (dateHeadings.length > 0) {
                console.log(`Found ${dateHeadings.length} date headings`);
                dateHeadings.each((_, headingEl) => {
                    try {
                        const $heading = $(headingEl);
                        const headingText = $heading.text();
                        
                        // Extract date from heading
                        const dateMatch = headingText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i);
                        if (!dateMatch) return;
                        
                        const monthName = dateMatch[1];
                        const day = parseInt(dateMatch[2], 10);
                        const currentYear = new Date().getFullYear();
                        
                        // Try to parse the full date
                        const dateStr = `${monthName} ${day}, ${currentYear}`;
                        const parsed = safeParseDate(dateStr);
                        let eventDate: string;
                        
                        if (!parsed.isValid || !parsed.date) {
                            // Try next year if date is in the past
                            const nextYearDateStr = `${monthName} ${day}, ${currentYear + 1}`;
                            const nextYearParsed = safeParseDate(nextYearDateStr);
                            if (!nextYearParsed.isValid || !nextYearParsed.date) return;
                            eventDate = formatTorontoDate(nextYearParsed.date);
                        } else {
                            // Check if date is in the past - if so, try next year
                            const parsedDate = parsed.date;
                            const now = new Date();
                            if (parsedDate < now) {
                                const nextYearDateStr = `${monthName} ${day}, ${currentYear + 1}`;
                                const nextYearParsed = safeParseDate(nextYearDateStr);
                                if (nextYearParsed.isValid && nextYearParsed.date) {
                                    eventDate = formatTorontoDate(nextYearParsed.date);
                                } else {
                                    return; // Skip past events
                                }
                            } else {
                                eventDate = formatTorontoDate(parsedDate);
                            }
                        }
                        
                        // Get all content after this heading until the next date heading
                        // Look for the next sibling elements that contain event details
                        let eventContent = '';
                        let current = $heading.next();
                        let iterations = 0;
                        const maxIterations = 20; // Limit to avoid infinite loops
                        
                        while (current.length > 0 && iterations < maxIterations) {
                            iterations++;
                            const tagName = current.prop('tagName');
                            
                            // Stop at next date heading
                            if (tagName && ['H2', 'H3', 'H4', 'H5'].includes(tagName)) {
                                const nextHeadingText = current.text();
                                if (/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/i.test(nextHeadingText)) {
                                    break;
                                }
                            }
                            
                            const currentText = current.text().trim();
                            if (currentText.length > 5) {
                                eventContent += ' ' + currentText;
                            }
                            
                            current = current.next();
                        }
                        
                        // Also check parent container for event details
                        const parent = $heading.parent();
                        if (parent.length > 0) {
                            const parentText = parent.text();
                            // Only use parent text if it's not too long (might include other events)
                            if (parentText.length < 500 && parentText.length > eventContent.length) {
                                eventContent = parentText;
                            }
                        }
                        
                        if (eventContent.length > 20) {
                            this.parseEventBlock(eventContent, eventDate, events, errors);
                        }
                    } catch (e: any) {
                        console.error(`Error parsing Flare date heading: ${e.message}`);
                    }
                });
            } else if (eventElements.length === 0) {
                // Fallback: Parse the entire page content and look for event patterns
                const pageText = $('body').text();
                
                // Look for date patterns followed by event details
                // Pattern: "February 4" followed by event title, age range, venue, time, price
                const eventBlocks = pageText.split(/(?=February|March|April|May|June|July|August|September|October|November|December|January)/i);
                
                for (const block of eventBlocks) {
                    if (block.length < 50) continue; // Skip very short blocks
                    
                    // Extract date from block
                    const dateMatch = block.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i);
                    if (!dateMatch) continue;
                    
                    const monthName = dateMatch[1];
                    const day = parseInt(dateMatch[2], 10);
                    const currentYear = new Date().getFullYear();
                    
                    // Try to parse the full date
                    const dateStr = `${monthName} ${day}, ${currentYear}`;
                    const parsed = safeParseDate(dateStr);
                    if (!parsed.isValid || !parsed.date) {
                        // Try next year if date is in the past
                        const nextYearDateStr = `${monthName} ${day}, ${currentYear + 1}`;
                        const nextYearParsed = safeParseDate(nextYearDateStr);
                        if (nextYearParsed.isValid && nextYearParsed.date) {
                            const eventDate = formatTorontoDate(nextYearParsed.date);
                            this.parseEventBlock(block, eventDate, events, errors);
                        }
                        continue;
                    }
                    
                    const eventDate = formatTorontoDate(parsed.date);
                    this.parseEventBlock(block, eventDate, events, errors);
                }
            } else {
                // Parse structured event elements
                eventElements.each((_, el) => {
                    try {
                        const $el = $(el);
                        const text = $el.text();
                        
                        // Extract date
                        const dateMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i);
                        if (!dateMatch) return;
                        
                        const monthName = dateMatch[1];
                        const day = parseInt(dateMatch[2], 10);
                        const currentYear = new Date().getFullYear();
                        const dateStr = `${monthName} ${day}, ${currentYear}`;
                        const parsed = safeParseDate(dateStr);
                        
                        if (!parsed.isValid || !parsed.date) {
                            const nextYearDateStr = `${monthName} ${day}, ${currentYear + 1}`;
                            const nextYearParsed = safeParseDate(nextYearDateStr);
                            if (!nextYearParsed.isValid || !nextYearParsed.date) return;
                            const eventDate = formatTorontoDate(nextYearParsed.date);
                            this.parseEventFromElement($el, eventDate, events, errors);
                        } else {
                            const eventDate = formatTorontoDate(parsed.date);
                            this.parseEventFromElement($el, eventDate, events, errors);
                        }
                    } catch (e: any) {
                        console.error(`Error parsing Flare event element: ${e.message}`);
                    }
                });
            }

        } catch (e: any) {
            errors.push(`Flare Events error: ${e.message}`);
        }

        return { events, errors };
    }

    /**
     * Parse an event block (text-based parsing)
     */
    private parseEventBlock(block: string, eventDate: string, events: Event[], errors: string[]): void {
        try {
            // Extract title (usually "Straight Speed Dating")
            const titleMatch = block.match(/(Straight\s+Speed\s+Dating|Speed\s+Dating|LGBTQ\+\s+Speed\s+Dating)/i);
            if (!titleMatch) return;
            
            const baseTitle = titleMatch[0];
            
            // Extract age range
            const ageRange = this.extractAgeRange(block);
            
            // Check if should exclude by age (higher age ranges)
            if (this.shouldExcludeByAge(ageRange)) {
                console.log(`  ⚠️ Excluding higher age range event: ${baseTitle} (Ages ${ageRange?.min}-${ageRange?.max})`);
                return; // Skip higher age range events
            }
            
            // Build full title with age range
            const title = ageRange 
                ? `${baseTitle} (Ages ${ageRange.min}-${ageRange.max})`
                : baseTitle;
            
            // Extract sold out status
            const soldOutInfo = this.extractSoldOutStatus(block);
            
            // Only include if not completely sold out
            if (soldOutInfo.isSoldOut && soldOutInfo.genderSoldOut === 'both') {
                console.log(`  🚫 Event completely sold out - skipping: "${title}"`);
                return;
            }
            
            // Extract venue - look for venue names followed by address or pipe
            // Pattern: "Mossop's Social House – 56 Yonge St." or "Steam Whistle Brewing – 255 Bremner Blvd"
            const venueMatch = block.match(/([A-Z][a-zA-Z\s&'\.\-]+(?:Brewing|House|Co\.|Social|Pub|Restaurant|Cafe|Bar|Theatre|Venue|Brewing Co)[^|–\n]*?)(?:\s*[–-]\s*[^|]*(?:\s*\||\s*7:00PM|\s*\$\d+))?/i) ||
                            block.match(/([A-Z][a-zA-Z\s&'\.\-]+(?:Brewing|House|Co\.|Social|Pub|Restaurant|Cafe|Bar|Theatre|Venue)[^|–\n]*)/i);
            const venue = venueMatch ? cleanText(venueMatch[1].trim().replace(/\s*[–-]\s*$/, '')) : 'Toronto, ON';
            
            // Extract time (default to 7:00 PM if not found)
            // Pattern: "7:00PM" or "7:00 PM" or "7 PM"
            const timeMatch = block.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i) ||
                              block.match(/(\d{1,2}):?(\d{2})?PM/i);
            let time = '7:00 PM'; // Default
            if (timeMatch) {
                const hour = parseInt(timeMatch[1], 10);
                const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
                const period = timeMatch[3] ? timeMatch[3].toUpperCase() : 'PM';
                time = `${hour}:${String(minute).padStart(2, '0')} ${period}`;
            }
            
            // Parse full date with time
            const dateTimeStr = `${eventDate.split('T')[0]} ${time}`;
            const dateTimeParsed = safeParseDate(dateTimeStr);
            if (!dateTimeParsed.isValid || !dateTimeParsed.date) {
                console.log(`  ⚠️ Could not parse date/time: "${dateTimeStr}"`);
                return;
            }
            const fullDate = formatTorontoDate(dateTimeParsed.date);
            
            // Extract price
            const priceMatch = block.match(/(?:Early\s+Bird\s+Admission|Regular\s+Admission)\s*\|\s*\$(\d+)/i) || 
                              block.match(/\$\s*(\d+)/);
            const priceAmount = priceMatch ? parseFloat(priceMatch[1]) : undefined;
            const price = priceAmount !== undefined ? `$${priceAmount}` : 'See Tickets';
            
            // Build event
            const event: Event = {
                id: generateEventId(`https://flareevents.ca/toronto/${title}-${fullDate}`),
                title: cleanText(title),
                date: fullDate,
                location: venue.includes('Toronto') ? venue : `${venue}, Toronto, ON`,
                source: 'Flare Events',
                host: 'Flare Events',
                url: this.baseUrl,
                price,
                priceAmount,
                isFree: priceAmount === 0,
                description: cleanDescription(`Speed dating event hosted by Flare Events. ${ageRange ? `Ages ${ageRange.min}-${ageRange.max}.` : ''} ${soldOutInfo.genderSoldOut !== 'none' ? `Note: ${soldOutInfo.genderSoldOut === 'male' ? 'Male tickets sold out' : soldOutInfo.genderSoldOut === 'female' ? 'Women tickets sold out' : 'Some tickets sold out'}.` : ''}`),
                categories: [...new Set([...categorizeEvent(title, ''), 'Dating', 'Speed Dating'])],
                status: 'UPCOMING',
                isSoldOut: soldOutInfo.isSoldOut && soldOutInfo.genderSoldOut === 'both',
                genderSoldOut: soldOutInfo.genderSoldOut,
                lastUpdated: new Date().toISOString()
            };
            
            events.push(event);
            console.log(`  ✅ Added Flare event: ${title} on ${fullDate}`);
            
        } catch (e: any) {
            errors.push(`Error parsing Flare event block: ${e.message}`);
        }
    }

    /**
     * Parse an event from a structured HTML element
     */
    private parseEventFromElement($el: cheerio.Cheerio<cheerio.Element>, eventDate: string, events: Event[], errors: string[]): void {
        try {
            const text = $el.text();
            this.parseEventBlock(text, eventDate, events, errors);
        } catch (e: any) {
            errors.push(`Error parsing Flare event element: ${e.message}`);
        }
    }
}
