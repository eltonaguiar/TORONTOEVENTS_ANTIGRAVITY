/**
 * Analyze Eventbrite HTML structure to find price elements
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';

async function analyzeEventbritePage(url: string) {
    console.log(`\n🔍 Analyzing: ${url}`);
    
    const response = await axios.get(url, {
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    const $ = cheerio.load(response.data);
    
    // Find all elements that might contain prices
    const priceCandidates: Array<{ selector: string; text: string; html: string }> = [];
    
    // Check various selectors
    const selectors = [
        '[class*="price"]',
        '[class*="Price"]',
        '[class*="ticket"]',
        '[class*="Ticket"]',
        '[class*="cost"]',
        '[class*="Cost"]',
        '[data-testid*="price"]',
        '[data-testid*="ticket"]',
        '[id*="price"]',
        '[id*="ticket"]',
        '[itemprop="price"]',
        '[itemprop="offers"]'
    ];

    for (const selector of selectors) {
        const elements = $(selector);
        elements.each((_, el) => {
            const $el = $(el);
            const text = $el.text().trim();
            const html = $el.html() || '';
            
            // Check if it contains a price-like pattern
            if (text.match(/\$|CAD|CA\$|C\$|\d+\.\d{2}/)) {
                priceCandidates.push({
                    selector: selector,
                    text: text.substring(0, 200),
                    html: html.substring(0, 500)
                });
            }
        });
    }

    // Also search for price patterns in all text
    const allText = $('body').text();
    const priceMatches = allText.match(/(?:CA\$|CAD|C\$|\$)\s*\d+(?:\.\d{2})?/gi);
    
    console.log(`\n📊 Found ${priceCandidates.length} price candidate elements`);
    console.log(`📊 Found ${priceMatches?.length || 0} price patterns in text`);
    
    // Check JSON-LD
    const scripts = $('script[type="application/ld+json"]');
    console.log(`📊 Found ${scripts.length} JSON-LD scripts`);
    
    const jsonLdData: any[] = [];
    scripts.each((_, el) => {
        try {
            const json = JSON.parse($(el).html() || '{}');
            jsonLdData.push(json);
        } catch {}
    });

    // Look for offers in JSON-LD
    let offersFound = 0;
    for (const data of jsonLdData) {
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
            if (item.offers) {
                offersFound += Array.isArray(item.offers) ? item.offers.length : 1;
            }
        }
    }
    console.log(`📊 Found ${offersFound} offers in JSON-LD`);

    // Save detailed analysis
    const analysis = {
        url,
        priceCandidates: priceCandidates.slice(0, 20), // Limit to first 20
        pricePatterns: priceMatches?.slice(0, 20) || [],
        jsonLdOffers: offersFound,
        sampleHtml: response.data.substring(0, 50000) // First 50KB
    };

    writeFileSync('eventbrite-html-analysis.json', JSON.stringify(analysis, null, 2));
    
    console.log('\n✅ Analysis saved to eventbrite-html-analysis.json');
    console.log('\n📋 Price Candidates:');
    priceCandidates.slice(0, 10).forEach((candidate, i) => {
        console.log(`\n  ${i + 1}. Selector: ${candidate.selector}`);
        console.log(`     Text: ${candidate.text}`);
    });

    if (priceMatches && priceMatches.length > 0) {
        console.log('\n💰 Price Patterns Found in Text:');
        priceMatches.slice(0, 10).forEach((match, i) => {
            console.log(`  ${i + 1}. ${match}`);
        });
    }
}

// Test with a few events
const testUrls = [
    'https://www.eventbrite.ca/e/amazon-advertising-strategies-1-day-workshop-in-toronto-tickets-1974309988322',
    'https://www.eventbrite.ca/e/cpo-approved-working-at-height-training-8-hrs-training-early-bird-140-tickets-1979534446818'
];

(async () => {
    for (const url of testUrls) {
        await analyzeEventbritePage(url);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
})().catch(console.error);
