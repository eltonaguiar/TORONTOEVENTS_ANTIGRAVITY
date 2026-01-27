/**
 * Verify date comparison logic matches what the frontend uses
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

// Replicate the frontend date comparison logic
function getTorontoDateParts(date: Date): string {
    if (isNaN(date.getTime())) return 'invalid-date';
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Toronto',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(date);
        const d: { [key: string]: string } = {};
        parts.forEach(p => d[p.type] = p.value);
        return `${d.year}-${d.month}-${d.day}`;
    } catch (e) {
        return 'invalid-date';
    }
}

function isToday(date: string): boolean {
    const eventDate = new Date(date);
    const today = new Date();
    return getTorontoDateParts(eventDate) === getTorontoDateParts(today);
}

function getDayOfWeek(date: Date): string {
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        timeZone: 'America/Toronto' 
    });
}

function main() {
    console.log('🔍 Verifying Date Logic (matching frontend)\n');
    
    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));
    
    const now = new Date();
    const todayStr = getTorontoDateParts(now);
    const todayDayOfWeek = getDayOfWeek(now);
    
    console.log(`📅 Current Date (Toronto): ${todayStr} (${todayDayOfWeek})\n`);
    
    // Find all events that would show as "today" using the frontend logic
    const todayEvents: Event[] = [];
    const issues: Array<{ event: Event; issue: string }> = [];
    
    for (const event of events) {
        if (!event.date) continue;
        
        try {
            // Use the same logic as the frontend
            if (isToday(event.date)) {
                todayEvents.push(event);
                
                const eventDate = new Date(event.date);
                const eventDayOfWeek = getDayOfWeek(eventDate);
                
                // Check for potential issues
                // 1. Thursday events showing as today when it's not Thursday
                const isThursdayEvent = event.source === 'Thursday' || 
                                       event.url?.includes('getthursday.com') ||
                                       event.title.toLowerCase().includes('thursday');
                
                if (isThursdayEvent && todayDayOfWeek !== 'Thursday') {
                    issues.push({
                        event,
                        issue: `Thursday event showing as today (${todayDayOfWeek})`
                    });
                }
                
                // 2. Day of week mismatch
                if (eventDayOfWeek !== todayDayOfWeek) {
                    issues.push({
                        event,
                        issue: `Day mismatch: Date parses to ${eventDayOfWeek} but today is ${todayDayOfWeek}`
                    });
                }
            }
        } catch (error: any) {
            issues.push({
                event,
                issue: `Error checking date: ${error.message}`
            });
        }
    }
    
    console.log('📊 RESULTS:\n');
    console.log(`Total events: ${events.length}`);
    console.log(`Events that would show as "today": ${todayEvents.length}`);
    console.log(`Issues found: ${issues.length}\n`);
    
    if (issues.length > 0) {
        console.log('🚨 ISSUES FOUND:\n');
        issues.forEach((item, i) => {
            const e = item.event;
            const eventDate = new Date(e.date);
            const eventDayOfWeek = getDayOfWeek(eventDate);
            console.log(`${i + 1}. ${e.title.substring(0, 60)}...`);
            console.log(`   Issue: ${item.issue}`);
            console.log(`   Source: ${e.source}`);
            console.log(`   Date: ${e.date}`);
            console.log(`   Parsed as: ${getTorontoDateParts(eventDate)} (${eventDayOfWeek})`);
            console.log(`   URL: ${e.url}\n`);
        });
    } else {
        console.log('✅ No issues found! All dates appear correct.\n');
    }
    
    // Show breakdown of today's events
    if (todayEvents.length > 0) {
        const bySource: { [key: string]: number } = {};
        todayEvents.forEach(e => {
            bySource[e.source] = (bySource[e.source] || 0) + 1;
        });
        
        console.log('📊 Today\'s Events by Source:');
        Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
            console.log(`   ${source}: ${count}`);
        });
    }
    
    console.log('\n✅ Verification complete!');
}

main();
