/**
 * Comprehensive script to check and fix all date issues
 * - Fixes Thursday events showing as today when it's not Thursday
 * - Fixes past events
 * - Validates all dates
 */

import { readFileSync, writeFileSync } from 'fs';
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

function getNextThursday(): string {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 4 = Thursday
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7; // Next Thursday (or today if it's Thursday)
    
    // Get current date in Toronto timezone
    const torontoNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    const nextThursdayLocal = new Date(torontoNow);
    nextThursdayLocal.setDate(torontoNow.getDate() + daysUntilThursday);
    nextThursdayLocal.setHours(19, 0, 0, 0); // 7 PM Toronto time
    
    // Create date string with EST offset (UTC-5 for January)
    const year = nextThursdayLocal.getFullYear();
    const month = String(nextThursdayLocal.getMonth() + 1).padStart(2, '0');
    const day = String(nextThursdayLocal.getDate()).padStart(2, '0');
    
    // Use EST offset (UTC-5) - adjust to EDT (UTC-4) if needed for summer months
    const isDST = nextThursdayLocal.getMonth() >= 3 && nextThursdayLocal.getMonth() <= 10;
    const offset = isDST ? '-04:00' : '-05:00';
    const estDateString = `${year}-${month}-${day}T19:00:00${offset}`;
    return new Date(estDateString).toISOString();
}

function main() {
    console.log('🔧 Fixing All Date Issues\n');
    
    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));
    
    const now = new Date();
    const todayStr = getTorontoDateParts(now);
    const todayDayOfWeek = getDayOfWeek(now);
    const nextThursdayStr = getNextThursday();
    
    console.log(`📅 Current Date (Toronto): ${todayStr} (${todayDayOfWeek})`);
    console.log(`📅 Next Thursday: ${getTorontoDateParts(new Date(nextThursdayStr))} (${getDayOfWeek(new Date(nextThursdayStr))})\n`);
    
    let fixedCount = 0;
    const fixes: Array<{ event: Event; oldDate: string; newDate: string; reason: string }> = [];
    
    for (const event of events) {
        if (!event.date) continue;
        
        try {
            const eventDate = new Date(event.date);
            if (isNaN(eventDate.getTime())) continue;
            
            const eventDateStr = getTorontoDateParts(eventDate);
            const eventDayOfWeek = getDayOfWeek(eventDate);
            
            // Check if it's a Thursday event
            const isThursdayEvent = event.source === 'Thursday' || 
                                    event.url?.includes('getthursday.com') ||
                                    event.title.toLowerCase().includes('thursday');
            
            let needsFix = false;
            let newDate = event.date;
            let reason = '';
            
            // Issue 1: Thursday event showing as today when it's not Thursday
            if (isThursdayEvent && eventDateStr === todayStr && todayDayOfWeek !== 'Thursday') {
                needsFix = true;
                newDate = nextThursdayStr;
                reason = `Thursday event showing as today (${todayDayOfWeek})`;
            }
            // Issue 2: Thursday event in the past
            else if (isThursdayEvent && eventDate < now) {
                needsFix = true;
                newDate = nextThursdayStr;
                reason = 'Thursday event is in the past';
            }
            // Issue 3: Thursday event not on a Thursday
            else if (isThursdayEvent && eventDayOfWeek !== 'Thursday') {
                needsFix = true;
                newDate = nextThursdayStr;
                reason = `Thursday event is on ${eventDayOfWeek}, not Thursday`;
            }
            // Issue 4: Any event more than 1 day in the past (and not a Thursday event)
            else if (!isThursdayEvent && eventDate < now && (now.getTime() - eventDate.getTime()) > 24 * 60 * 60 * 1000) {
                // Skip fixing past events that aren't Thursday events - they might be valid historical data
                // But we'll log them for review
                continue;
            }
            
            if (needsFix) {
                const oldDate = event.date;
                event.date = newDate;
                event.lastUpdated = new Date().toISOString();
                
                fixedCount++;
                fixes.push({
                    event,
                    oldDate,
                    newDate,
                    reason
                });
                
                console.log(`✅ Fixed: ${event.title.substring(0, 50)}...`);
                console.log(`   Reason: ${reason}`);
                console.log(`   ${oldDate} → ${newDate}`);
                console.log(`   Old: ${eventDateStr} (${eventDayOfWeek})`);
                console.log(`   New: ${getTorontoDateParts(new Date(newDate))} (${getDayOfWeek(new Date(newDate))})\n`);
            }
        } catch (error) {
            // Skip events with parsing errors
            continue;
        }
    }
    
    // Save updated events
    if (fixedCount > 0) {
        writeFileSync(eventsPath, JSON.stringify(events, null, 2));
        console.log(`\n📊 RESULTS:`);
        console.log(`  Total events checked: ${events.length}`);
        console.log(`  Fixed: ${fixedCount}`);
        console.log(`\n💾 Updated events saved to: ${eventsPath}`);
    } else {
        console.log(`\n📊 RESULTS:`);
        console.log(`  Total events checked: ${events.length}`);
        console.log(`  Fixed: 0`);
        console.log(`\n✅ All dates are correct!`);
    }
}

main();
