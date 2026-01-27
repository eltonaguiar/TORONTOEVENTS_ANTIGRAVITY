/**
 * Proof of Concept: Test date extraction on sample events
 * Iteratively fix until all dates are correctly extracted
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { normalizeDate, extractDateFromPage } from '../src/lib/scraper/utils';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

interface TestResult {
    eventId: string;
    title: string;
    url: string;
    source: string;
    currentDate: string;
    extractedDate: string | null;
    isTBD: boolean;
    status: 'pass' | 'fail' | 'tbd';
    error?: string;
    extractionMethod?: string;
}

async function testDateExtraction(event: Event): Promise<TestResult> {
    const result: TestResult = {
        eventId: event.id,
        title: event.title,
        url: event.url,
        source: event.source,
        currentDate: event.date,
        extractedDate: null,
        isTBD: false,
        status: 'fail'
    };

    try {
        console.log(`\n🔍 Testing: ${event.title.substring(0, 50)}`);
        console.log(`   URL: ${event.url}`);
        console.log(`   Current date: ${event.date}`);

        const response = await axios.get(event.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);

        // Method 1: Use extractDateFromPage (our enhanced function)
        const dateResult = await extractDateFromPage($, true);
        
        if (dateResult.isTBD) {
            result.isTBD = true;
            result.status = 'tbd';
            console.log(`   ⚠️  TBD detected`);
            return result;
        }

        if (dateResult.date) {
            result.extractedDate = dateResult.date;
            result.extractionMethod = 'extractDateFromPage';
            
            // Compare with current date
            const current = new Date(event.date);
            const extracted = new Date(dateResult.date);
            
            // Check if dates match (within 1 hour tolerance for time differences)
            const timeDiff = Math.abs(extracted.getTime() - current.getTime());
            const dateMatch = extracted.toDateString() === current.toDateString();
            
            if (dateMatch && timeDiff < 60 * 60 * 1000) {
                result.status = 'pass';
                console.log(`   ✅ PASS - Dates match`);
            } else {
                result.status = 'fail';
                console.log(`   ❌ FAIL - Date mismatch:`);
                console.log(`      Current: ${current.toLocaleString('en-US', {timeZone: 'America/Toronto'})}`);
                console.log(`      Extracted: ${extracted.toLocaleString('en-US', {timeZone: 'America/Toronto'})}`);
            }
            return result;
        }

        // Method 2: Try JSON-LD directly
        const ldScript = $('script[type="application/ld+json"]').html();
        if (ldScript) {
            try {
                const data = JSON.parse(ldScript);
                const items = Array.isArray(data) ? data : [data];
                const eventData = items.find((i: any) => 
                    i['@type'] === 'Event' || 
                    (Array.isArray(i['@type']) && i['@type'].includes('Event'))
                );
                
                if (eventData?.startDate) {
                    const date = normalizeDate(eventData.startDate);
                    if (date) {
                        result.extractedDate = date;
                        result.extractionMethod = 'JSON-LD direct';
                        
                        const current = new Date(event.date);
                        const extracted = new Date(date);
                        const dateMatch = extracted.toDateString() === current.toDateString();
                        
                        if (dateMatch) {
                            result.status = 'pass';
                            console.log(`   ✅ PASS - JSON-LD match`);
                        } else {
                            result.status = 'fail';
                            console.log(`   ❌ FAIL - JSON-LD date mismatch`);
                        }
                        return result;
                    }
                }
            } catch (e) {
                // JSON parsing failed
            }
        }

        // Method 3: Try HTML selectors
        const htmlDateStr = $('[itemprop="startDate"]').attr('content') ||
            $('time[datetime]').attr('datetime') ||
            $('.highlights').text().match(/[A-Za-z]{3},\s+\d+\s+[A-Za-z]{3},\s+\d{4}\s+at\s+\d{2}:\d{2}\s+pm/i)?.[0] ||
            $('.event-date').text() ||
            $('.date-time').text();

        if (htmlDateStr) {
            const date = normalizeDate(htmlDateStr);
            if (date) {
                result.extractedDate = date;
                result.extractionMethod = 'HTML selectors';
                
                const current = new Date(event.date);
                const extracted = new Date(date);
                const dateMatch = extracted.toDateString() === current.toDateString();
                
                if (dateMatch) {
                    result.status = 'pass';
                    console.log(`   ✅ PASS - HTML selector match`);
                } else {
                    result.status = 'fail';
                    console.log(`   ❌ FAIL - HTML date mismatch`);
                }
                return result;
            }
        }

        // No date found
        result.error = 'No date could be extracted from page';
        console.log(`   ❌ FAIL - No date found on page`);
        return result;

    } catch (error: any) {
        result.error = error.message;
        console.log(`   ❌ ERROR: ${error.message}`);
        return result;
    }
}

async function runPOC(): Promise<void> {
    console.log('🧪 DATE EXTRACTION PROOF OF CONCEPT TEST\n');
    console.log('Testing date extraction on sample events...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    // Sample events from different sources
    const sampleEvents: Event[] = [];
    
    // Get samples from each source
    const sources = ['AllEvents.in', 'Eventbrite', 'CitySwoon', 'Fatsoma', 'Thursday', 'Showpass'];
    for (const source of sources) {
        const sourceEvents = events.filter(e => e.source === source || e.source?.includes(source));
        if (sourceEvents.length > 0) {
            // Take first 2-3 events from each source
            sampleEvents.push(...sourceEvents.slice(0, 3));
        }
    }

    // Add specific problematic events
    const problematic = events.filter(e => 
        e.url?.includes('vision-board') ||
        e.url?.includes('tuesday-night-yoga') ||
        e.title?.toLowerCase().includes('thursday')
    );
    sampleEvents.push(...problematic.slice(0, 5));

    // Remove duplicates
    const uniqueSamples = Array.from(new Map(sampleEvents.map(e => [e.id, e])).values());
    
    console.log(`Testing ${uniqueSamples.length} sample events...\n`);

    const results: TestResult[] = [];
    let passCount = 0;
    let failCount = 0;
    let tbdCount = 0;

    for (let i = 0; i < uniqueSamples.length; i++) {
        const event = uniqueSamples[i];
        console.log(`\n[${i + 1}/${uniqueSamples.length}] ${event.source}`);
        
        const result = await testDateExtraction(event);
        results.push(result);

        if (result.status === 'pass') passCount++;
        else if (result.status === 'tbd') tbdCount++;
        else failCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n\n📊 TEST RESULTS:`);
    console.log(`  Total tested: ${uniqueSamples.length}`);
    console.log(`  ✅ Pass: ${passCount}`);
    console.log(`  ❌ Fail: ${failCount}`);
    console.log(`  ⚠️  TBD: ${tbdCount}`);

    // Show failures
    const failures = results.filter(r => r.status === 'fail');
    if (failures.length > 0) {
        console.log(`\n\n❌ FAILED EVENTS (${failures.length}):`);
        failures.forEach(f => {
            console.log(`\n  - ${f.title.substring(0, 50)}`);
            console.log(`    Source: ${f.source}`);
            console.log(`    Current: ${new Date(f.currentDate).toLocaleString('en-US', {timeZone: 'America/Toronto'})}`);
            if (f.extractedDate) {
                console.log(`    Extracted: ${new Date(f.extractedDate).toLocaleString('en-US', {timeZone: 'America/Toronto'})}`);
            }
            console.log(`    Method: ${f.extractionMethod || 'none'}`);
            if (f.error) console.log(`    Error: ${f.error}`);
        });
    }

    // Save results
    const reportPath = join(process.cwd(), 'date-extraction-test-results.json');
    const fs = require('fs');
    fs.writeFileSync(reportPath, JSON.stringify({
        summary: {
            total: uniqueSamples.length,
            pass: passCount,
            fail: failCount,
            tbd: tbdCount
        },
        results: results
    }, null, 2));
    console.log(`\n📄 Results saved to: ${reportPath}`);
}

runPOC().catch(console.error);
