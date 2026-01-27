/**
 * Audit event data for invalid dates, prices, and missing descriptions
 * Identifies problematic events for manual review and fixing
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import { safeParseDate } from '../src/lib/utils/dateHelpers';
import { safeParsePrice } from '../src/lib/utils/priceHelpers';
import { isValidDescription } from '../src/lib/utils/descriptionHelpers';
import { getParsingErrorStats } from '../src/lib/utils/errorLogger';

interface AuditResult {
    eventId: string;
    title: string;
    url: string;
    issues: {
        invalidDate: boolean;
        invalidPrice: boolean;
        missingDescription: boolean;
        dateError?: string;
        priceError?: string;
    };
}

function auditEvents(): void {
    console.log('🔍 Auditing event data for issues...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const results: AuditResult[] = [];
    let totalIssues = 0;

    for (const event of events) {
        const issues: AuditResult['issues'] = {
            invalidDate: false,
            invalidPrice: false,
            missingDescription: false
        };

        // Check date
        const dateResult = safeParseDate(event.date, event.id, event.title);
        if (!dateResult.isValid) {
            issues.invalidDate = true;
            issues.dateError = dateResult.error;
        }

        // Check price
        const priceResult = safeParsePrice(event.price, event.priceAmount, event.id, event.title);
        if (!priceResult.isValid || priceResult.price === 'See tickets') {
            issues.invalidPrice = true;
            issues.priceError = priceResult.error || 'Price not available';
        }

        // Check description
        if (!isValidDescription(event.description)) {
            issues.missingDescription = true;
        }

        // Only include events with issues
        if (issues.invalidDate || issues.invalidPrice || issues.missingDescription) {
            results.push({
                eventId: event.id,
                title: event.title,
                url: event.url,
                issues
            });
            totalIssues++;
        }
    }

    // Generate report
    console.log('📊 AUDIT RESULTS\n');
    console.log(`Total Events: ${events.length}`);
    console.log(`Events with Issues: ${results.length} (${(results.length / events.length * 100).toFixed(1)}%)\n`);

    const invalidDates = results.filter(r => r.issues.invalidDate).length;
    const invalidPrices = results.filter(r => r.issues.invalidPrice).length;
    const missingDescriptions = results.filter(r => r.issues.missingDescription).length;

    console.log('Issue Breakdown:');
    console.log(`  ❌ Invalid Dates: ${invalidDates}`);
    console.log(`  ❌ Invalid/Missing Prices: ${invalidPrices}`);
    console.log(`  ❌ Missing Descriptions: ${missingDescriptions}\n`);

    // Show sample problematic events
    console.log('📋 Sample Problematic Events (first 20):\n');
    results.slice(0, 20).forEach((result, i) => {
        console.log(`${i + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        if (result.issues.invalidDate) {
            console.log(`   ⚠️  Invalid Date: ${result.issues.dateError}`);
        }
        if (result.issues.invalidPrice) {
            console.log(`   ⚠️  Invalid Price: ${result.issues.priceError}`);
        }
        if (result.issues.missingDescription) {
            console.log(`   ⚠️  Missing Description`);
        }
        console.log('');
    });

    // Save detailed report
    const reportPath = join(process.cwd(), 'event-audit-report.json');
    writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalEvents: events.length,
        eventsWithIssues: results.length,
        statistics: {
            invalidDates,
            invalidPrices,
            missingDescriptions
        },
        events: results
    }, null, 2));

    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    // Get error stats from logger
    const errorStats = getParsingErrorStats();
    if (errorStats.total > 0) {
        console.log('\n📊 Error Log Statistics:');
        console.log(`  Total Errors Logged: ${errorStats.total}`);
        console.log(`  By Type:`, errorStats.byType);
    }
}

auditEvents();
