/**
 * Comprehensive date audit - checks for all potential date issues
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

function getTorontoDateParts(date: Date): string {
    const torontoDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    const year = torontoDate.getFullYear();
    const month = String(torontoDate.getMonth() + 1).padStart(2, '0');
    const day = String(torontoDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDayOfWeek(date: Date): string {
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        timeZone: 'America/Toronto' 
    });
}

function main() {
    console.log('🔍 Comprehensive Date Audit\n');
    
    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));
    
    const now = new Date();
    const todayStr = getTorontoDateParts(now);
    const todayDayOfWeek = getDayOfWeek(now);
    
    console.log(`📅 Current Date (Toronto): ${todayStr} (${todayDayOfWeek})\n`);
    
    const issues: Array<{
        event: Event;
        issue: string;
        details: string;
    }> = [];
    
    const todayEvents: Event[] = [];
    
    for (const event of events) {
        if (!event.date) {
            issues.push({
                event,
                issue: 'Missing date',
                details: 'Event has no date field'
            });
            continue;
        }
        
        try {
            const eventDate = new Date(event.date);
            if (isNaN(eventDate.getTime())) {
                issues.push({
                    event,
                    issue: 'Invalid date',
                    details: `Cannot parse date string: ${event.date}`
                });
                continue;
            }
            
            const eventDateStr = getTorontoDateParts(eventDate);
            const eventDayOfWeek = getDayOfWeek(eventDate);
            
            // Check if event is showing as today
            if (eventDateStr === todayStr) {
                todayEvents.push(event);
                
                // Check for potential issues
                // 1. Is it a Thursday event but today is not Thursday?
                if ((event.source === 'Thursday' || 
                     event.url?.includes('getthursday.com') ||
                     event.title.toLowerCase().includes('thursday')) &&
                    todayDayOfWeek !== 'Thursday') {
                    issues.push({
                        event,
                        issue: 'Thursday event showing as today (wrong day)',
                        details: `Event is Thursday-related but showing on ${todayDayOfWeek}. Date: ${event.date}, Parsed as: ${eventDateStr} (${eventDayOfWeek})`
                    });
                }
                
                // 2. Check if the parsed day of week matches today
                if (eventDayOfWeek !== todayDayOfWeek) {
                    issues.push({
                        event,
                        issue: 'Day of week mismatch',
                        details: `Date string parses to ${eventDayOfWeek} but today is ${todayDayOfWeek}. Date: ${event.date}`
                    });
                }
            }
            
            // Check for past events that shouldn't be in the database
            if (eventDate < now && (now.getTime() - eventDate.getTime()) > 24 * 60 * 60 * 1000) {
                // Only flag if it's more than 1 day old
                issues.push({
                    event,
                    issue: 'Past event (>1 day old)',
                    details: `Event date ${eventDateStr} (${eventDayOfWeek}) is in the past`
                });
            }
            
            // Check for events with dates far in the future (potential parsing errors)
            const oneYearFromNow = new Date(now);
            oneYearFromNow.setFullYear(now.getFullYear() + 1);
            if (eventDate > oneYearFromNow) {
                issues.push({
                    event,
                    issue: 'Date far in future (possible parsing error)',
                    details: `Event date ${eventDateStr} is more than 1 year away`
                });
            }
            
        } catch (error: any) {
            issues.push({
                event,
                issue: 'Date parsing error',
                details: `Error: ${error.message}, Date string: ${event.date}`
            });
        }
    }
    
    console.log('📊 SUMMARY:\n');
    console.log(`Total events: ${events.length}`);
    console.log(`Events showing as today: ${todayEvents.length}`);
    console.log(`Issues found: ${issues.length}\n`);
    
    // Group issues by type
    const issuesByType: { [key: string]: number } = {};
    issues.forEach(i => {
        issuesByType[i.issue] = (issuesByType[i.issue] || 0) + 1;
    });
    
    if (Object.keys(issuesByType).length > 0) {
        console.log('📋 Issues by Type:\n');
        Object.entries(issuesByType).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });
        console.log('');
    }
    
    // Show critical issues (Thursday events showing as today when it's not Thursday)
    const criticalIssues = issues.filter(i => 
        i.issue === 'Thursday event showing as today (wrong day)'
    );
    
    if (criticalIssues.length > 0) {
        console.log('🚨 CRITICAL: Thursday Events Showing as Today (when it\'s not Thursday):\n');
        criticalIssues.forEach((item, i) => {
            const e = item.event;
            console.log(`${i + 1}. ${e.title.substring(0, 60)}...`);
            console.log(`   ${item.details}`);
            console.log(`   Source: ${e.source}`);
            console.log(`   URL: ${e.url}\n`);
        });
    }
    
    // Show all today's events with details
    if (todayEvents.length > 0) {
        console.log(`\n📅 All Events Showing as Today (${todayEvents.length}):\n`);
        todayEvents.forEach((e, i) => {
            const eventDate = new Date(e.date);
            const eventDayOfWeek = getDayOfWeek(eventDate);
            const isThursdayEvent = e.source === 'Thursday' || 
                                    e.url?.includes('getthursday.com') ||
                                    e.title.toLowerCase().includes('thursday');
            
            console.log(`${i + 1}. ${e.title.substring(0, 50)}...`);
            console.log(`   Source: ${e.source}`);
            console.log(`   Date: ${e.date}`);
            console.log(`   Parsed as: ${getTorontoDateParts(eventDate)} (${eventDayOfWeek})`);
            if (isThursdayEvent) {
                console.log(`   ⚠️  THURSDAY EVENT`);
                if (todayDayOfWeek !== 'Thursday') {
                    console.log(`   ❌ ERROR: Today is ${todayDayOfWeek}, not Thursday!`);
                }
            }
            console.log('');
        });
    }
    
    // Show other issues
    const otherIssues = issues.filter(i => 
        i.issue !== 'Thursday event showing as today (wrong day)'
    );
    
    if (otherIssues.length > 0) {
        console.log(`\n⚠️  Other Issues (first 20):\n`);
        otherIssues.slice(0, 20).forEach((item, i) => {
            const e = item.event;
            console.log(`${i + 1}. ${e.title.substring(0, 50)}...`);
            console.log(`   Issue: ${item.issue}`);
            console.log(`   ${item.details}`);
            console.log(`   Source: ${e.source}\n`);
        });
    }
    
    console.log('\n✅ Audit complete!');
}

main();
