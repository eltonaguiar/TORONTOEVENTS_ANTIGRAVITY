/**
 * Log all events with failed date/price parsing for manual review
 * Helps identify patterns in parsing failures
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import { safeParseDate } from '../src/lib/utils/dateHelpers';
import { safeParsePrice } from '../src/lib/utils/priceHelpers';
import { isValidDescription } from '../src/lib/utils/descriptionHelpers';

interface FailedParsingEvent {
    eventId: string;
    title: string;
    url: string;
    source: string;
    rawDate?: string;
    rawPrice?: string;
    rawPriceAmount?: number;
    rawDescription?: string;
    dateError?: string;
    priceError?: string;
    descriptionIssue?: string;
}

function logFailedParsing(): void {
    console.log('📋 Logging events with failed parsing...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const failedEvents: FailedParsingEvent[] = [];

    for (const event of events) {
        const failures: FailedParsingEvent = {
            eventId: event.id,
            title: event.title,
            url: event.url,
            source: event.source,
            rawDate: event.date,
            rawPrice: event.price,
            rawPriceAmount: event.priceAmount,
            rawDescription: event.description?.substring(0, 200) // First 200 chars
        };

        let hasIssues = false;

        // Check date
        const dateResult = safeParseDate(event.date, event.id, event.title);
        if (!dateResult.isValid) {
            failures.dateError = dateResult.error || 'Unknown date parsing error';
            hasIssues = true;
        }

        // Check price
        const priceResult = safeParsePrice(event.price, event.priceAmount, event.id, event.title);
        if (!priceResult.isValid || priceResult.price === 'See tickets') {
            failures.priceError = priceResult.error || 'Price not available';
            hasIssues = true;
        }

        // Check description
        if (!isValidDescription(event.description)) {
            failures.descriptionIssue = 'Description is missing or invalid';
            hasIssues = true;
        }

        if (hasIssues) {
            failedEvents.push(failures);
        }
    }

    // Generate detailed log
    const logPath = join(process.cwd(), 'parsing-failures-log.json');
    writeFileSync(logPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalEvents: events.length,
        failedEvents: failedEvents.length,
        percentage: ((failedEvents.length / events.length) * 100).toFixed(1),
        events: failedEvents
    }, null, 2));

    console.log('📊 PARSING FAILURE SUMMARY\n');
    console.log(`Total Events: ${events.length}`);
    console.log(`Events with Parsing Issues: ${failedEvents.length} (${((failedEvents.length / events.length) * 100).toFixed(1)}%)\n`);

    const dateFailures = failedEvents.filter(e => e.dateError).length;
    const priceFailures = failedEvents.filter(e => e.priceError).length;
    const descFailures = failedEvents.filter(e => e.descriptionIssue).length;

    console.log('Failure Breakdown:');
    console.log(`  ❌ Date Parsing Failures: ${dateFailures}`);
    console.log(`  ❌ Price Parsing Failures: ${priceFailures}`);
    console.log(`  ❌ Description Issues: ${descFailures}\n`);

    // Group by source
    const bySource: Record<string, number> = {};
    failedEvents.forEach(e => {
        bySource[e.source] = (bySource[e.source] || 0) + 1;
    });

    console.log('Failures by Source:');
    Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
        console.log(`  ${source}: ${count}`);
    });

    // Show sample failures with raw data
    console.log('\n📋 Sample Failures (first 10):\n');
    failedEvents.slice(0, 10).forEach((failure, i) => {
        console.log(`${i + 1}. ${failure.title}`);
        console.log(`   Source: ${failure.source}`);
        console.log(`   URL: ${failure.url}`);
        if (failure.dateError) {
            console.log(`   ❌ Date Error: ${failure.dateError}`);
            console.log(`      Raw Date: "${failure.rawDate}"`);
        }
        if (failure.priceError) {
            console.log(`   ❌ Price Error: ${failure.priceError}`);
            console.log(`      Raw Price: "${failure.rawPrice}"`);
            console.log(`      Raw Price Amount: ${failure.rawPriceAmount}`);
        }
        if (failure.descriptionIssue) {
            console.log(`   ❌ Description: ${failure.descriptionIssue}`);
            console.log(`      Raw Description: "${failure.rawDescription?.substring(0, 100)}..."`);
        }
        console.log('');
    });

    console.log(`\n💾 Detailed log saved to: ${logPath}`);
    console.log('\n💡 Use this log to:');
    console.log('   1. Identify patterns in failed parsing');
    console.log('   2. Update date/price patterns based on raw data');
    console.log('   3. Manually review and fix critical events');
}

logFailedParsing();
