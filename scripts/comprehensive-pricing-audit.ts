/**
 * Comprehensive Pricing Audit
 * Audits ALL events for pricing errors and generates correction report
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import { safeParsePrice } from '../src/lib/utils/priceHelpers';

interface PricingIssue {
    eventId: string;
    title: string;
    url: string;
    source: string;
    currentPrice: string;
    priceAmount?: number;
    issue: string;
    suggestedFix?: string;
}

interface AuditReport {
    audit_summary: {
        totaleventschecked: number;
        pricingerrorsfound: number;
        eventswithnoprice: number;
        eventswithseetickets: number;
        eventswithinvalidprice: number;
        status: 'complete' | 'partial';
    };
    flagged_event: {
        event_name: string;
        url: string;
        current_price: string;
        expected_price: string;
        correction_needed: string;
    };
    pricing_issues_by_source: {
        [source: string]: PricingIssue[];
    };
    common_issues: {
        'See tickets'?: number;
        'See App'?: number;
        'Invalid price'?: number;
        'Missing price'?: number;
    };
    next_steps: string[];
}

function auditAllEvents(): AuditReport {
    console.log('🔍 Starting comprehensive pricing audit...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const issues: PricingIssue[] = [];
    const issuesBySource: { [source: string]: PricingIssue[] } = {};

    let eventsWithNoPrice = 0;
    let eventsWithSeeTickets = 0;
    let eventsWithInvalidPrice = 0;

    for (const event of events) {
        const priceResult = safeParsePrice(event.price, event.priceAmount, event.id, event.title);
        
        let issue: string | null = null;
        let suggestedFix: string | undefined;

        // Check for common issues
        if (!event.price || event.price.trim() === '') {
            issue = 'Missing price';
            eventsWithNoPrice++;
        } else if (event.price === 'See tickets' || event.price === 'See Tickets') {
            issue = 'See tickets (price not extracted)';
            eventsWithSeeTickets++;
        } else if (event.price === 'See App') {
            issue = 'See App (price not extracted)';
            eventsWithSeeTickets++;
        } else if (!priceResult.isValid) {
            issue = 'Invalid price format';
            eventsWithInvalidPrice++;
        } else if (!event.priceAmount && priceResult.priceAmount === undefined) {
            issue = 'No numeric price amount';
        }

        // Special check for Thursday events
        if ((event.source === 'Thursday' || event.url?.includes('getthursday.com')) && 
            (event.price === 'See App' || !event.priceAmount)) {
            issue = 'Thursday event missing price';
            // Based on user feedback, Thursday events typically range $10-$15
            suggestedFix = '$10 - $15';
        }

        if (issue) {
            const pricingIssue: PricingIssue = {
                eventId: event.id,
                title: event.title,
                url: event.url,
                source: event.source,
                currentPrice: event.price || 'Missing',
                priceAmount: event.priceAmount,
                issue,
                suggestedFix
            };

            issues.push(pricingIssue);

            if (!issuesBySource[event.source]) {
                issuesBySource[event.source] = [];
            }
            issuesBySource[event.source].push(pricingIssue);
        }
    }

    // Find the flagged event
    const flaggedEvent = events.find(e => 
        e.url && e.url.includes('thursday-bangarang-lgbtq-toronto-2')
    );

    const report: AuditReport = {
        audit_summary: {
            totaleventschecked: events.length,
            pricingerrorsfound: issues.length,
            eventswithnoprice: eventsWithNoPrice,
            eventswithseetickets: eventsWithSeeTickets,
            eventswithinvalidprice: eventsWithInvalidPrice,
            status: 'complete'
        },
        flagged_event: flaggedEvent ? {
            event_name: flaggedEvent.title,
            url: flaggedEvent.url,
            current_price: flaggedEvent.price || 'See App',
            expected_price: '$10 - $15',
            correction_needed: flaggedEvent.price === '$10 - $15' 
                ? 'Already corrected' 
                : 'Update to $10 - $15 range'
        } : {
            event_name: 'Not found',
            url: 'https://events.getthursday.com/event/thursday-bangarang-lgbtq-toronto-2/',
            current_price: 'Unknown',
            expected_price: '$10 - $15',
            correction_needed: 'Event not found in database'
        },
        pricing_issues_by_source: issuesBySource,
        common_issues: {
            'See tickets': issues.filter(i => i.currentPrice === 'See tickets' || i.currentPrice === 'See Tickets').length,
            'See App': issues.filter(i => i.currentPrice === 'See App').length,
            'Invalid price': eventsWithInvalidPrice,
            'Missing price': eventsWithNoPrice
        },
        next_steps: [
            'Fix Thursday events with suggested prices',
            'Re-run scraper with enhanced price extraction',
            'Consider using Puppeteer for JavaScript-rendered prices',
            'Update scrapers to extract prices from booking pages'
        ]
    };

    return report;
}

function main() {
    const report = auditAllEvents();

    // Save report
    const reportPath = join(process.cwd(), 'comprehensive-pricing-audit-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    console.log('📊 COMPREHENSIVE PRICING AUDIT RESULTS\n');
    console.log(`Total Events Checked: ${report.audit_summary.totaleventschecked}`);
    console.log(`Pricing Errors Found: ${report.audit_summary.pricingerrorsfound}`);
    console.log(`\nBreakdown:`);
    console.log(`  - Events with no price: ${report.audit_summary.eventswithnoprice}`);
    console.log(`  - Events with "See tickets": ${report.audit_summary.eventswithseetickets}`);
    console.log(`  - Events with invalid price: ${report.audit_summary.eventswithinvalidprice}`);

    console.log(`\n📋 Issues by Source:`);
    for (const [source, sourceIssues] of Object.entries(report.pricing_issues_by_source)) {
        console.log(`  ${source}: ${sourceIssues.length} issues`);
    }

    console.log(`\n🎯 Flagged Event:`);
    console.log(`  Name: ${report.flagged_event.event_name}`);
    console.log(`  Current: ${report.flagged_event.current_price}`);
    console.log(`  Expected: ${report.flagged_event.expected_price}`);
    console.log(`  Status: ${report.flagged_event.correction_needed}`);

    console.log(`\n💾 Full report saved to: ${reportPath}`);
}

main();
