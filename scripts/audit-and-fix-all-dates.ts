/**
 * Comprehensive audit and fix for ALL event dates
 * Rejects events with invalid dates unless explicitly TBD
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { normalizeDate, extractDateFromPage, isTBDDate } from '../src/lib/scraper/utils';

interface AuditResult {
    eventId: string;
    title: string;
    url: string;
    source: string;
    oldDate: string;
    newDate: string | null;
    status: 'valid' | 'fixed' | 'rejected' | 'tbd' | 'error';
    reason?: string;
}

async function auditAndFixAllDates(): Promise<void> {
    console.log('🔍 COMPREHENSIVE DATE AUDIT AND FIX\n');
    console.log('Rule: Invalid dates are NOT acceptable. Only TBD is allowed.\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const results: AuditResult[] = [];
    let validCount = 0;
    let fixedCount = 0;
    let rejectedCount = 0;
    let tbdCount = 0;
    let errorCount = 0;

    console.log(`Total events to audit: ${events.length}\n`);

    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)} (events ${i + 1}-${Math.min(i + batchSize, events.length)})...`);

        for (const event of batch) {
            try {
                // Skip if URL is invalid
                if (!event.url || event.url.includes('forms.gle') || event.url.includes('google.com/forms')) {
                    continue;
                }

                // Check if current date is valid
                const currentDate = new Date(event.date);
                const isValid = !isNaN(currentDate.getTime());

                if (isValid) {
                    // Date is valid - check if it's reasonable (not too far in past/future)
                    const now = new Date();
                    const eventTime = currentDate.getTime();
                    const oneYearAgo = now.getTime() - (365 * 24 * 60 * 60 * 1000);
                    const twoYearsFuture = now.getTime() + (2 * 365 * 24 * 60 * 60 * 1000);

                    if (eventTime < oneYearAgo) {
                        // Event is more than 1 year old - likely invalid
                        results.push({
                            eventId: event.id,
                            title: event.title,
                            url: event.url,
                            source: event.source,
                            oldDate: event.date,
                            newDate: null,
                            status: 'rejected',
                            reason: 'Event date is more than 1 year in the past'
                        });
                        rejectedCount++;
                        continue;
                    }

                    if (eventTime > twoYearsFuture) {
                        // Event is more than 2 years in future - likely invalid
                        results.push({
                            eventId: event.id,
                            title: event.title,
                            url: event.url,
                            source: event.source,
                            oldDate: event.date,
                            newDate: null,
                            status: 'rejected',
                            reason: 'Event date is more than 2 years in the future'
                        });
                        rejectedCount++;
                        continue;
                    }

                    // Date is valid and reasonable
                    validCount++;
                    results.push({
                        eventId: event.id,
                        title: event.title,
                        url: event.url,
                        source: event.source,
                        oldDate: event.date,
                        newDate: event.date,
                        status: 'valid'
                    });
                    continue;
                }

                // Date is invalid - try to fetch and fix
                console.log(`  ⚠️  Invalid date for: ${event.title.substring(0, 50)}`);
                console.log(`     Current date: ${event.date}`);
                console.log(`     Fetching detail page...`);

                try {
                    const response = await axios.get(event.url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        timeout: 10000
                    });

                    const $ = cheerio.load(response.data);
                    const dateResult = await extractDateFromPage($, true);

                    if (dateResult.isTBD) {
                        // Event has TBD date - reject it (user said invalid dates not acceptable)
                        console.log(`  ❌ TBD date - REJECTING: ${event.title.substring(0, 50)}`);
                        results.push({
                            eventId: event.id,
                            title: event.title,
                            url: event.url,
                            source: event.source,
                            oldDate: event.date,
                            newDate: null,
                            status: 'tbd',
                            reason: 'Event date is TBD'
                        });
                        tbdCount++;
                        continue;
                    }

                    if (dateResult.date) {
                        // Successfully extracted date
                        event.date = dateResult.date;
                        event.lastUpdated = new Date().toISOString();
                        fixedCount++;
                        console.log(`  ✅ FIXED: ${event.title.substring(0, 50)}`);
                        console.log(`     New date: ${dateResult.date}`);
                        results.push({
                            eventId: event.id,
                            title: event.title,
                            url: event.url,
                            source: event.source,
                            oldDate: event.date,
                            newDate: dateResult.date,
                            status: 'fixed'
                        });
                    } else {
                        // Could not extract date - REJECT
                        console.log(`  ❌ REJECTING: ${event.title.substring(0, 50)} - no valid date found`);
                        results.push({
                            eventId: event.id,
                            title: event.title,
                            url: event.url,
                            source: event.source,
                            oldDate: event.date,
                            newDate: null,
                            status: 'rejected',
                            reason: 'Could not extract valid date from source page'
                        });
                        rejectedCount++;
                    }
                } catch (e: any) {
                    // Error fetching page - REJECT
                    console.log(`  ❌ ERROR fetching page - REJECTING: ${event.title.substring(0, 50)}`);
                    results.push({
                        eventId: event.id,
                        title: event.title,
                        url: event.url,
                        source: event.source,
                        oldDate: event.date,
                        newDate: null,
                        status: 'error',
                        reason: `Error fetching page: ${e.message}`
                    });
                    errorCount++;
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error: any) {
                errorCount++;
                results.push({
                    eventId: event.id,
                    title: event.title,
                    url: event.url,
                    source: event.source,
                    oldDate: event.date,
                    newDate: null,
                    status: 'error',
                    reason: error.message
                });
            }
        }

        // Longer delay between batches
        if (i + batchSize < events.length) {
            console.log('  Waiting 2 seconds before next batch...\n');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Remove rejected events from array
    const rejectedIds = new Set(results.filter(r => r.status === 'rejected' || r.status === 'tbd' || r.status === 'error').map(r => r.eventId));
    const validEvents = events.filter(e => !rejectedIds.has(e.id));

    // Save updated events
    writeFileSync(eventsPath, JSON.stringify(validEvents, null, 2));

    console.log(`\n📊 AUDIT RESULTS:`);
    console.log(`  Total events: ${events.length}`);
    console.log(`  ✅ Valid dates: ${validCount}`);
    console.log(`  🔧 Fixed dates: ${fixedCount}`);
    console.log(`  ❌ Rejected (invalid): ${rejectedCount}`);
    console.log(`  ⚠️  Rejected (TBD): ${tbdCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📝 Final event count: ${validEvents.length}`);
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);

    // Save audit report
    const reportPath = join(process.cwd(), 'date-audit-report.json');
    writeFileSync(reportPath, JSON.stringify({
        summary: {
            total: events.length,
            valid: validCount,
            fixed: fixedCount,
            rejected: rejectedCount,
            tbd: tbdCount,
            errors: errorCount,
            finalCount: validEvents.length
        },
        results: results
    }, null, 2));
    console.log(`📄 Audit report saved to: ${reportPath}`);
}

auditAndFixAllDates().catch(console.error);
