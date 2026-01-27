/**
 * Check all Thursday events to ensure they have correct dates
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

function getNextThursday(): Date {
    const now = new Date();
    const torontoNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    const dayOfWeek = torontoNow.getDay(); // 0 = Sunday, 4 = Thursday
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7; // Next Thursday (or today if it's Thursday)
    
    const nextThursday = new Date(torontoNow);
    nextThursday.setDate(torontoNow.getDate() + daysUntilThursday);
    nextThursday.setHours(19, 0, 0, 0); // 7 PM Toronto time
    
    return nextThursday;
}

function main() {
    console.log('🔍 Checking All Thursday Events\n');
    
    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));
    
    const now = new Date();
    const todayStr = getTorontoDateParts(now);
    const todayDayOfWeek = getDayOfWeek(now);
    const nextThursday = getNextThursday();
    const nextThursdayStr = getTorontoDateParts(nextThursday);
    
    console.log(`📅 Current Date (Toronto): ${todayStr} (${todayDayOfWeek})`);
    console.log(`📅 Next Thursday: ${nextThursdayStr} (${getDayOfWeek(nextThursday)})\n`);
    
    // Find all Thursday-related events
    const thursdayEvents: Event[] = events.filter(e => 
        e.source === 'Thursday' || 
        (e.url && e.url.includes('getthursday.com')) ||
        (e.title && e.title.toLowerCase().includes('thursday'))
    );
    
    console.log(`📊 Total Thursday-related events: ${thursdayEvents.length}\n`);
    
    const incorrectDates: Array<{ event: Event; issue: string; currentDate: string; dayOfWeek: string }> = [];
    const correctDates: Event[] = [];
    
    for (const event of thursdayEvents) {
        if (!event.date) {
            incorrectDates.push({ 
                event, 
                issue: 'Missing date', 
                currentDate: 'N/A', 
                dayOfWeek: 'N/A' 
            });
            continue;
        }
        
        try {
            const eventDate = new Date(event.date);
            if (isNaN(eventDate.getTime())) {
                incorrectDates.push({ 
                    event, 
                    issue: 'Invalid date format', 
                    currentDate: event.date, 
                    dayOfWeek: 'N/A' 
                });
                continue;
            }
            
            const eventDateStr = getTorontoDateParts(eventDate);
            const eventDayOfWeek = getDayOfWeek(eventDate);
            
            // Check if date is today (and it's not actually Thursday)
            if (eventDateStr === todayStr && todayDayOfWeek !== 'Thursday') {
                incorrectDates.push({ 
                    event, 
                    issue: `Showing as today (${todayDayOfWeek}) but should be Thursday`, 
                    currentDate: eventDateStr, 
                    dayOfWeek: eventDayOfWeek 
                });
            }
            // Check if date is in the past
            else if (eventDate < now) {
                incorrectDates.push({ 
                    event, 
                    issue: 'Date is in the past', 
                    currentDate: eventDateStr, 
                    dayOfWeek: eventDayOfWeek 
                });
            }
            // Check if date is not a Thursday
            else if (eventDayOfWeek !== 'Thursday') {
                incorrectDates.push({ 
                    event, 
                    issue: `Date is ${eventDayOfWeek}, not Thursday`, 
                    currentDate: eventDateStr, 
                    dayOfWeek: eventDayOfWeek 
                });
            }
            else {
                correctDates.push(event);
            }
        } catch (error) {
            incorrectDates.push({ 
                event, 
                issue: `Error parsing date: ${error}`, 
                currentDate: event.date, 
                dayOfWeek: 'N/A' 
            });
        }
    }
    
    console.log('📋 RESULTS:\n');
    console.log(`✅ Correct Thursday dates: ${correctDates.length}`);
    console.log(`❌ Incorrect dates: ${incorrectDates.length}\n`);
    
    if (incorrectDates.length > 0) {
        console.log('🚨 EVENTS WITH INCORRECT DATES:\n');
        incorrectDates.forEach((item, i) => {
            const e = item.event;
            console.log(`${i + 1}. ${e.title.substring(0, 60)}...`);
            console.log(`   Issue: ${item.issue}`);
            console.log(`   Source: ${e.source}`);
            console.log(`   Current Date: ${item.currentDate} (${item.dayOfWeek})`);
            console.log(`   Raw Date String: ${e.date}`);
            console.log(`   URL: ${e.url}`);
            console.log(`   Should be: ${nextThursdayStr} (Thursday)\n`);
        });
    }
    
    if (correctDates.length > 0) {
        console.log(`\n✅ Events with correct Thursday dates (first 10):\n`);
        correctDates.slice(0, 10).forEach((e, i) => {
            const eventDate = new Date(e.date);
            const eventDateStr = getTorontoDateParts(eventDate);
            const eventDayOfWeek = getDayOfWeek(eventDate);
            console.log(`${i + 1}. ${e.title.substring(0, 50)}...`);
            console.log(`   Date: ${eventDateStr} (${eventDayOfWeek})`);
            console.log(`   Source: ${e.source}\n`);
        });
    }
    
    // Also check for any events that might be incorrectly showing as today
    console.log('\n🔍 Checking for any events incorrectly showing as today:\n');
    const todayEvents = events.filter(e => {
        if (!e.date) return false;
        try {
            const eventDate = new Date(e.date);
            if (isNaN(eventDate.getTime())) return false;
            const eventDateStr = getTorontoDateParts(eventDate);
            return eventDateStr === todayStr;
        } catch {
            return false;
        }
    });
    
    console.log(`Total events showing as today: ${todayEvents.length}`);
    
    // Check if any of today's events should actually be Thursday events
    const suspiciousTodayEvents = todayEvents.filter(e => {
        const eventDayOfWeek = getDayOfWeek(new Date(e.date));
        return eventDayOfWeek !== todayDayOfWeek || 
               e.title.toLowerCase().includes('thursday') ||
               e.source === 'Thursday' ||
               (e.url && e.url.includes('getthursday.com'));
    });
    
    if (suspiciousTodayEvents.length > 0) {
        console.log(`\n⚠️  Suspicious events showing as today:\n`);
        suspiciousTodayEvents.forEach((e, i) => {
            const eventDate = new Date(e.date);
            const eventDayOfWeek = getDayOfWeek(eventDate);
            console.log(`${i + 1}. ${e.title.substring(0, 60)}...`);
            console.log(`   Source: ${e.source}`);
            console.log(`   Date: ${e.date}`);
            console.log(`   Day of week: ${eventDayOfWeek}`);
            console.log(`   Today is: ${todayDayOfWeek}`);
            if (eventDayOfWeek !== todayDayOfWeek) {
                console.log(`   ⚠️  MISMATCH!`);
            }
            console.log('');
        });
    }
    
    console.log('\n✅ Check complete!');
}

main();
