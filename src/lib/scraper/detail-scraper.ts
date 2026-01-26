import { ScraperSource, ScraperResult, Event } from '../types';
import { generateEventId, cleanText } from './utils';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class EventbriteDetailScraper {
    // Fetch the REAL start time from an individual event page
    static async fetchRealEventTime(eventUrl: string): Promise<string | null> {
        try {
            const response = await axios.get(eventUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(response.data);

            // Look for JSON-LD on the event page (has full timestamp)
            const scripts = $('script[type="application/ld+json"]');
            for (let i = 0; i < scripts.length; i++) {
                try {
                    const jsonText = $(scripts[i]).html();
                    if (!jsonText) continue;

                    const data = JSON.parse(jsonText);
                    if (data['@type'] === 'Event' && data.startDate) {
                        console.log(`Found real time for ${eventUrl.split('/').pop()}: ${data.startDate}`);
                        return data.startDate;
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }

            // Fallback: look for time in page text
            const timeText = $('time[datetime]').first().attr('datetime');
            if (timeText) {
                return timeText;
            }

            return null;
        } catch (e: any) {
            console.log(`Could not fetch detail page: ${e.message}`);
            return null;
        }
    }
    // Check if event sales have ended
    static async checkSalesStatus(eventUrl: string): Promise<boolean> {
        try {
            const response = await axios.get(eventUrl, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(response.data);

            // Check for specific sales-ended indicators
            // Look for the actual status message, not just mentions in text
            const statusText = $('.eds-text-weight--heavy, .eds-notification-bar, [data-testid="sales-status"]').text().toLowerCase();
            const salesEnded = statusText.includes('sales ended') ||
                statusText.includes('registration closed') ||
                statusText.includes('this event has passed');

            // Also check if there's no "Get tickets" or "Register" button
            const hasTicketButton = $('button').text().toLowerCase().includes('ticket') ||
                $('button').text().toLowerCase().includes('register') ||
                $('a[href*="checkout"]').length > 0;

            return salesEnded && !hasTicketButton;
        } catch (e) {
            return false; // If we can't check, assume it's available
        }
    }
}
