import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface EventEnrichment {
    realTime?: string;
    salesEnded: boolean;
    isRecurring: boolean;
    fullDescription?: string;
}

export class EventbriteDetailScraper {
    /**
     * Consolidates multiple checks into a single HTTP request to avoid rate limiting
     * and improve performance significantly.
     */
    static async enrichEvent(eventUrl: string): Promise<EventEnrichment> {
        const result: EventEnrichment = {
            salesEnded: false,
            isRecurring: false
        };

        try {
            const response = await axios.get(eventUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(response.data);
            const bodyText = $('body').text();

            // 1. Extract REAL time from JSON-LD
            const scripts = $('script[type="application/ld+json"]');
            for (let i = 0; i < scripts.length; i++) {
                try {
                    const jsonText = $(scripts[i]).html();
                    if (!jsonText) continue;
                    const data = JSON.parse(jsonText);
                    const type = data['@type'];
                    if (type && typeof type === 'string' && type.includes('Event') && data.startDate) {
                        result.realTime = data.startDate;
                        break;
                    }
                } catch { }
            }

            // Fallback for time
            if (!result.realTime) {
                result.realTime = $('time[datetime]').first().attr('datetime') || undefined;
            }

            // 2. Check Sales Status
            const statusText = $('.eds-text-weight--heavy, .eds-notification-bar, [data-testid="sales-status"]').text().toLowerCase();
            const directSalesEnded = statusText.includes('sales ended') ||
                statusText.includes('registration closed') ||
                statusText.includes('this event has passed');

            const hasTicketButton = $('button').text().toLowerCase().includes('ticket') ||
                $('button').text().toLowerCase().includes('register') ||
                $('a[href*="checkout"]').length > 0;

            result.salesEnded = directSalesEnded && !hasTicketButton;

            // 3. Check Recurring Status
            // 3. Check Recurring Status
            // 'Check availability' often appears for single day events with multiple ticket tiers, causing false positives. 
            // 'Multiple dates' is the gold standard for Eventbrite series.
            const recurringIndicators = [
                'Multiple Dates',
                'Event Series',
                'Select a date' // specific to series picker
            ];

            // Search in specific areas first to avoid footer matches
            const heroText = $('.eds-layout__body').text() || bodyText;
            result.isRecurring = recurringIndicators.some(indicator => heroText.includes(indicator));

            // 4. Extract Full Description
            // Try multiple selectors common on Eventbrite
            const descriptionSelectors = [
                '[data-automation="listing-event-description"]',
                '.event-description__content',
                '.eds-text--left.eds-text--html', // Common generic text block
                '#event-page-description'
            ];

            for (const selector of descriptionSelectors) {
                const descEl = $(selector);
                if (descEl.length > 0) {
                    // Get text with some whitespace preservation
                    result.fullDescription = cleanText(descEl.text());
                    if (result.fullDescription.length > 100) break; // Found a good one
                }
            }

            return result;
        } catch (e: any) {
            console.log(`Could not enrich event via ${eventUrl}: ${e.message}`);
            return result;
        }
    }
}
