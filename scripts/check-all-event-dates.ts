/**
 * Comprehensive date check for all events
 * Identifies events with incorrect dates, especially Thursday events showing as today
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
    console.log('🔍 Comprehensive Event Date Check\n');
    
    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));
    
    const now = new Date();
    const todayStr = getTorontoDateParts(now);
    const todayDayOfWeek = getDayOfWeek(now);
    
    console.log(`📅 Current Date (Toronto): ${todayStr} (${todayDayOfWeek})`);
    console.log(`📊 Total Events: ${events.length}\n`);
    
    // Find events that are showing as today
    const todayEvents: Event[] = [];
    const invalidDates: Event[] = [];
    const thursdayEvents: Event[] = [];
    const pastEvents: Event[] = [];
    
    for (const event of events) {
        if (!event.date) {
            invalidDates.push(event);
            continue;
        }
        
        try {
            const eventDate = new Date(event.date);
            if (isNaN(eventDate.getTime())) {
                invalidDates.push(event);
                continue;
            }
            
            const eventDateStr = getTorontoDateParts(eventDate);
            const eventDayOfWeek = getDayOfWeek(eventDate);
            
            // Check if event is showing as today
            if (eventDateStr === todayStr) {
                todayEvents.push(event);
                
                // Check if it's a Thursday event
                if (event.source === 'Thursday' || 
                    (event.url && event.url.includes('getthursday.com')) ||
                    (event.title && event.title.toLowerCase().includes('thursday'))) {
                    thursdayEvents.push(event);
                }
            }
            
            // Check for past events (more than 1 day old)
            if (eventDate < now && (now.getTime() - eventDate.getTime()) > 24 * 60 * 60 * 1000) {
                pastEvents.push(event);
            }
        } catch (error) {
            invalidDates.push(event);
        }
    }
    
    console.log('📋 RESULTS:\n');
    console.log(`✅ Events showing as TODAY: ${todayEvents.length}`);
    console.log(`⚠️  Thursday events showing as today: ${thursdayEvents.length}`);
    console.log(`❌ Events with invalid dates: ${invalidDates.length}`);
    console.log(`📅 Past events (>1 day old): ${pastEvents.length}\n`);
    
    // Show Thursday events that are incorrectly showing as today
    if (thursdayEvents.length > 0) {
        console.log('🚨 THURSDAY EVENTS INCORRECTLY SHOWING AS TODAY:\n');
        thursdayEvents.forEach((e, i) => {
            const eventDate = new Date(e.date);
            const eventDayOfWeek = getDayOfWeek(eventDate);
            console.log(`${i + 1}. ${e.title.substring(0, 60)}...`);
            console.log(`   Source: ${e.source}`);
            console.log(`   Date: ${e.date}`);
            console.log(`   Parsed as: ${eventDayOfWeek}`);
            console.log(`   URL: ${e.url}\n`);
        });
    }
    
    // Show sample of today's events
    if (todayEvents.length > 0) {
        console.log(`\n📅 Sample of events showing as TODAY (first 20):\n`);
        todayEvents.slice(0, 20).forEach((e, i) => {
            const eventDate = new Date(e.date);
            const eventDayOfWeek = getDayOfWeek(eventDate);
            console.log(`${i + 1}. ${e.title.substring(0, 50)}...`);
            console.log(`   Source: ${e.source} | Date: ${e.date}`);
            console.log(`   Day of week: ${eventDayOfWeek}`);
            if (e.source === 'Thursday' || e.url?.includes('getthursday.com')) {
                console.log(`   ⚠️  THURSDAY EVENT - Should not be today!`);
            }
            console.log('');
        });
    }
    
    // Show breakdown by source for today's events
    if (todayEvents.length > 0) {
        const bySource: { [key: string]: number } = {};
        todayEvents.forEach(e => {
            bySource[e.source] = (bySource[e.source] || 0) + 1;
        });
        
        console.log('\n📊 Today\'s Events by Source:');
        Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
            console.log(`   ${source}: ${count}`);
        });
    }
    
    // Show invalid dates
    if (invalidDates.length > 0) {
        console.log(`\n❌ Events with invalid dates (first 10):\n`);
        invalidDates.slice(0, 10).forEach((e, i) => {
            console.log(`${i + 1}. ${e.title.substring(0, 50)}...`);
            console.log(`   Source: ${e.source} | Date: ${e.date || 'MISSING'}\n`);
        });
    }
    
    console.log('\n✅ Date check complete!');
}

main();
