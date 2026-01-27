/**
 * Puppeteer-based scraper for JavaScript-rendered content
 * Use this for sites that load prices/dates via JavaScript
 * 
 * NOTE: This is slower but can access dynamic content
 * Only use when static scraping fails
 * 
 * OPTIONAL: Install with `npm install puppeteer` if needed
 */

// Dynamic import to handle optional dependency
let puppeteer: any = null;
try {
    puppeteer = require('puppeteer');
} catch {
    // Puppeteer not installed - functions will return errors
}

export interface PuppeteerScrapeOptions {
    url: string;
    waitForSelector?: string;
    waitForTime?: number;
    timeout?: number;
}

/**
 * Scrape a page using Puppeteer to access JavaScript-rendered content
 */
export async function scrapeWithPuppeteer(options: PuppeteerScrapeOptions): Promise<string> {
    if (!puppeteer) {
        throw new Error('Puppeteer is not installed. Run: npm install puppeteer');
    }

    const {
        url,
        waitForSelector,
        waitForTime = 2000,
        timeout = 30000
    } = options;

    let browser: any = null;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate to page
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout
        });

        // Wait for specific selector if provided
        if (waitForSelector) {
            await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {
                // Continue if selector doesn't appear
            });
        }

        // Wait for additional time to let JavaScript render
        if (waitForTime > 0) {
            await page.waitForTimeout(waitForTime);
        }

        // Get page HTML
        const html = await page.content();
        return html;
    } catch (error: any) {
        console.error(`Puppeteer scrape failed for ${url}:`, error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Extract price from page using Puppeteer
 * Waits for price elements to render
 */
export async function extractPriceWithPuppeteer(eventUrl: string): Promise<{
    price?: string;
    priceAmount?: number;
    minPrice?: number;
    maxPrice?: number;
    ticketTypes?: Array<{ name: string; price?: number }>;
}> {
    try {
        const html = await scrapeWithPuppeteer({
            url: eventUrl,
            waitForSelector: '[data-testid="price"], .event-price, .ticket-price',
            waitForTime: 3000
        });

        // Use cheerio to parse the rendered HTML
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);

        // Extract prices from rendered content
        const prices: number[] = [];
        const priceSelectors = [
            '[data-testid="price"]',
            '.event-price',
            '.ticket-price',
            '.price-display',
            '[itemprop="price"]'
        ];

        for (const selector of priceSelectors) {
            const priceEl = $(selector);
            if (priceEl.length > 0) {
                const priceText = priceEl.text().trim();
                const match = priceText.match(/(?:CA\$|CAD|C\$|\$)\s*(\d+(?:\.\d{2})?)/i);
                if (match) {
                    const p = parseFloat(match[1]);
                    if (!isNaN(p) && p >= 0 && p < 100000) {
                        prices.push(p);
                    }
                }
            }
        }

        if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            return {
                price: maxPrice > minPrice ? `$${minPrice} - $${maxPrice}` : `$${minPrice}`,
                priceAmount: minPrice,
                minPrice,
                maxPrice: maxPrice > minPrice ? maxPrice : undefined
            };
        }

        return {};
    } catch (error: any) {
        console.error(`Failed to extract price with Puppeteer for ${eventUrl}:`, error.message);
        return {};
    }
}

/**
 * Check if Puppeteer is available
 */
export function isPuppeteerAvailable(): boolean {
    return puppeteer !== null;
}
