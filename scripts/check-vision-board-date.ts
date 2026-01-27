/**
 * Check Vision Board event date from page
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

(async () => {
    const url = 'https://allevents.in/toronto/vision-board-and-health-check-in-event/100001980221561998';
    const res = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(res.data);
    
    console.log('=== Vision Board Event Date Check ===\n');
    
    // Check JSON-LD
    const ld = $('script[type="application/ld+json"]').html();
    if (ld) {
        const data = JSON.parse(ld);
        const items = Array.isArray(data) ? data : [data];
        const event = items.find((i: any) => i['@type'] === 'Event');
        if (event) {
            console.log('JSON-LD startDate:', event.startDate);
        }
    }
    
    // Check highlights
    const highlights = $('.highlights').text();
    console.log('\nHighlights text:', highlights);
    
    // Check date & location section
    const dateLocation = $('.date-location, [class*="date"]').text();
    console.log('\nDate & Location section:', dateLocation.substring(0, 500));
    
    // Check all text for "31" or "January 31"
    const bodyText = $('body').text();
    const jan31Matches = bodyText.match(/january\s+31|jan\s+31|31\s+jan/i);
    const jan27Matches = bodyText.match(/january\s+27|jan\s+27|27\s+jan/i);
    console.log('\nJan 31 mentions:', jan31Matches?.length || 0);
    console.log('Jan 27 mentions:', jan27Matches?.length || 0);
    
    if (jan31Matches) {
        console.log('\n✅ Found Jan 31 in page text');
        jan31Matches.slice(0, 3).forEach((m, i) => {
            const idx = bodyText.indexOf(m);
            console.log(`  Match ${i + 1}: "${bodyText.substring(Math.max(0, idx - 50), idx + 100)}"`);
        });
    }
})();
