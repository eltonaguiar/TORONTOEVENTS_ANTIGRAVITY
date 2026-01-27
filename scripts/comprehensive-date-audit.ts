/**
 * Comprehensive Date/Time/Location Audit
 * Checks all events for accuracy in dates, times, and locations
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

interface AuditIssue {
    eventId: string;
    title: string;
    issue: string;
    severity: 'error' | 'warning' | 'info';
    currentValue: string;
    suggestedFix?: string;
}

interface AuditReport {
    summary: {
        totalEvents: number;
        todayEvents: number;
        pastEvents: number;
        futureEvents: number;
        issuesFound: number;
        errors: number;
        warnings: number;
        info: number;
    };
    todayEvents: Event[];
    issues: AuditIssue[];
    dateIssues: {
        invalidDates: AuditIssue[];
        pastEvents: AuditIssue[];
        farFutureEvents: AuditIssue[];
        timezoneIssues: AuditIssue[];
    };
    locationIssues: {
        missingLocation: AuditIssue[];
        genericLocation: AuditIssue[];
        invalidLocation: AuditIssue[];
    };
}

function getTorontoDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        timeZone: 'America/Toronto',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function getTorontoDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
        timeZone: 'America/Toronto',
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function auditEvents(): AuditReport {
    console.log('🔍 Starting comprehensive date/time/location audit...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const now = new Date();
    const todayStr = getTorontoDate(now);
    const issues: AuditIssue[] = [];
    const todayEvents: Event[] = [];
    let pastEvents = 0;
    let futureEvents = 0;

    const dateIssues = {
        invalidDates: [] as AuditIssue[],
        pastEvents: [] as AuditIssue[],
        farFutureEvents: [] as AuditIssue[],
        timezoneIssues: [] as AuditIssue[]
    };

    const locationIssues = {
        missingLocation: [] as AuditIssue[],
        genericLocation: [] as AuditIssue[],
        invalidLocation: [] as AuditIssue[]
    };

    for (const event of events) {
        // Date/Time Checks
        try {
            const eventDate = new Date(event.date);
            
            if (isNaN(eventDate.getTime())) {
                dateIssues.invalidDates.push({
                    eventId: event.id,
                    title: event.title,
                    issue: 'Invalid date - cannot be parsed',
                    severity: 'error',
                    currentValue: event.date,
                    suggestedFix: 'Check source and re-scrape'
                });
                continue;
            }

            const eventDateStr = getTorontoDate(eventDate);
            const eventDateTime = getTorontoDateTime(eventDate);
            const daysDiff = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // Check if event is today
            if (eventDateStr === todayStr) {
                todayEvents.push(event);
            }

            // Check if event is in the past
            if (eventDate < now) {
                pastEvents++;
                if (daysDiff < -1) {
                    dateIssues.pastEvents.push({
                        eventId: event.id,
                        title: event.title,
                        issue: `Event is ${Math.abs(daysDiff)} days in the past`,
                        severity: 'error',
                        currentValue: eventDateTime,
                        suggestedFix: 'Remove or mark as CANCELLED'
                    });
                }
            } else {
                futureEvents++;
            }

            // Check for far future events (more than 1 year)
            if (daysDiff > 365) {
                dateIssues.farFutureEvents.push({
                    eventId: event.id,
                    title: event.title,
                    issue: `Event is ${daysDiff} days in the future (more than 1 year)`,
                    severity: 'warning',
                    currentValue: eventDateTime,
                    suggestedFix: 'Verify date is correct'
                });
            }

            // Check for timezone issues (events showing wrong day)
            const dayOfWeek = eventDate.toLocaleDateString('en-US', {
                timeZone: 'America/Toronto',
                weekday: 'long'
            });
            
            // If event title contains a day name, verify it matches
            const titleLower = event.title.toLowerCase();
            const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const titleDay = dayNames.find(day => titleLower.includes(day));
            
            if (titleDay) {
                const expectedDay = titleDay.charAt(0).toUpperCase() + titleDay.slice(1);
                if (dayOfWeek !== expectedDay) {
                    dateIssues.timezoneIssues.push({
                        eventId: event.id,
                        title: event.title,
                        issue: `Title mentions "${expectedDay}" but date shows "${dayOfWeek}"`,
                        severity: 'error',
                        currentValue: eventDateTime,
                        suggestedFix: `Adjust date to match ${expectedDay}`
                    });
                }
            }

            // Check for events with no time (midnight)
            const eventHour = eventDate.getHours();
            if (eventHour === 0 && eventDate.getMinutes() === 0) {
                issues.push({
                    eventId: event.id,
                    title: event.title,
                    issue: 'Event time is midnight (00:00) - likely missing time information',
                    severity: 'warning',
                    currentValue: eventDateTime,
                    suggestedFix: 'Extract actual event time from source'
                });
            }

        } catch (error: any) {
            dateIssues.invalidDates.push({
                eventId: event.id,
                title: event.title,
                issue: `Date parsing error: ${error.message}`,
                severity: 'error',
                currentValue: event.date,
                suggestedFix: 'Check date format'
            });
        }

        // Location Checks
        if (!event.location || event.location.trim() === '') {
            locationIssues.missingLocation.push({
                eventId: event.id,
                title: event.title,
                issue: 'Missing location information',
                severity: 'error',
                currentValue: 'N/A',
                suggestedFix: 'Extract location from source'
            });
        } else {
            const location = event.location.toLowerCase();
            
            // Check for generic locations
            const genericLocations = ['toronto', 'toronto, on', 'toronto, ontario', 'toronto on canada'];
            if (genericLocations.some(gen => location === gen || location === gen + ', canada')) {
                locationIssues.genericLocation.push({
                    eventId: event.id,
                    title: event.title,
                    issue: 'Location is too generic (just "Toronto")',
                    severity: 'warning',
                    currentValue: event.location,
                    suggestedFix: 'Extract specific venue/address from source'
                });
            }

            // Check for invalid location patterns
            if (location.length < 5 || location.match(/^(n\/a|tba|tbd|to be announced)$/i)) {
                locationIssues.invalidLocation.push({
                    eventId: event.id,
                    title: event.title,
                    issue: 'Location appears to be placeholder text',
                    severity: 'error',
                    currentValue: event.location,
                    suggestedFix: 'Extract actual location from source'
                });
            }
        }
    }

    // Combine all issues
    issues.push(...dateIssues.invalidDates);
    issues.push(...dateIssues.pastEvents);
    issues.push(...dateIssues.farFutureEvents);
    issues.push(...dateIssues.timezoneIssues);
    issues.push(...locationIssues.missingLocation);
    issues.push(...locationIssues.genericLocation);
    issues.push(...locationIssues.invalidLocation);

    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const info = issues.filter(i => i.severity === 'info').length;

    const report: AuditReport = {
        summary: {
            totalEvents: events.length,
            todayEvents: todayEvents.length,
            pastEvents,
            futureEvents,
            issuesFound: issues.length,
            errors,
            warnings,
            info
        },
        todayEvents,
        issues,
        dateIssues,
        locationIssues
    };

    return report;
}

function main() {
    const report = auditEvents();

    console.log('\n📊 AUDIT SUMMARY:');
    console.log(`  Total events: ${report.summary.totalEvents}`);
    console.log(`  Events today: ${report.summary.todayEvents}`);
    console.log(`  Past events: ${report.summary.pastEvents}`);
    console.log(`  Future events: ${report.summary.futureEvents}`);
    console.log(`\n  Issues found: ${report.summary.issuesFound}`);
    console.log(`    Errors: ${report.summary.errors}`);
    console.log(`    Warnings: ${report.summary.warnings}`);
    console.log(`    Info: ${report.summary.info}`);

    console.log('\n📅 TODAY\'S EVENTS:');
    if (report.todayEvents.length === 0) {
        console.log('  No events scheduled for today');
    } else {
        report.todayEvents.forEach(e => {
            const d = new Date(e.date);
            console.log(`  - ${e.title}`);
            console.log(`    Time: ${d.toLocaleTimeString('en-US', {timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit'})}`);
            console.log(`    Location: ${e.location || 'N/A'}`);
            console.log(`    Source: ${e.source}`);
            console.log('');
        });
    }

    console.log('\n❌ CRITICAL ISSUES (Errors):');
    const errors = report.issues.filter(i => i.severity === 'error');
    if (errors.length === 0) {
        console.log('  No critical errors found! ✅');
    } else {
        errors.slice(0, 20).forEach(issue => {
            console.log(`  - ${issue.title.substring(0, 60)}`);
            console.log(`    Issue: ${issue.issue}`);
            console.log(`    Current: ${issue.currentValue}`);
            if (issue.suggestedFix) {
                console.log(`    Fix: ${issue.suggestedFix}`);
            }
            console.log('');
        });
        if (errors.length > 20) {
            console.log(`  ... and ${errors.length - 20} more errors`);
        }
    }

    console.log('\n⚠️  WARNINGS:');
    const warnings = report.issues.filter(i => i.severity === 'warning');
    if (warnings.length === 0) {
        console.log('  No warnings found! ✅');
    } else {
        console.log(`  Found ${warnings.length} warnings`);
        warnings.slice(0, 10).forEach(issue => {
            console.log(`  - ${issue.title.substring(0, 60)}: ${issue.issue}`);
        });
        if (warnings.length > 10) {
            console.log(`  ... and ${warnings.length - 10} more warnings`);
        }
    }

    // Save detailed report
    const reportPath = join(process.cwd(), 'comprehensive-audit-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    // Save today's events
    if (report.todayEvents.length > 0) {
        const todayPath = join(process.cwd(), 'today-events.json');
        writeFileSync(todayPath, JSON.stringify(report.todayEvents, null, 2));
        console.log(`📅 Today's events saved to: ${todayPath}`);
    }
}

main();
