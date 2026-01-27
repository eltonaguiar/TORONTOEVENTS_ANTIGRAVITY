/**
 * Fix day-of-week mismatches in event titles
 * Adjusts dates to match the day mentioned in the title
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

function getDayOfWeek(date: Date, timeZone: string = 'America/Toronto'): string {
    return date.toLocaleDateString('en-US', {
        timeZone,
        weekday: 'long'
    });
}

function getNextDayOfWeek(targetDay: string, currentDate: Date = new Date()): Date {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetIndex = dayNames.indexOf(targetDay.toLowerCase());
    
    if (targetIndex === -1) return currentDate;
    
    const currentDay = currentDate.getDay();
    let daysUntilTarget = (targetIndex - currentDay + 7) % 7;
    
    // If it's the same day, move to next week
    if (daysUntilTarget === 0) {
        daysUntilTarget = 7;
    }
    
    const targetDate = new Date(currentDate);
    targetDate.setDate(currentDate.getDate() + daysUntilTarget);
    targetDate.setHours(19, 0, 0, 0); // Default to 7 PM
    
    return targetDate;
}

function fixDayMismatches(): void {
    console.log('🔧 Fixing day-of-week mismatches...\n');

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let fixedCount = 0;

    for (const event of events) {
        try {
            const eventDate = new Date(event.date);
            if (isNaN(eventDate.getTime())) continue;

            const currentDay = getDayOfWeek(eventDate);
            const titleLower = event.title.toLowerCase();
            
            // Find day mentioned in title
            const titleDay = dayNames.find(day => titleLower.includes(day));
            
            if (titleDay) {
                const expectedDay = titleDay.charAt(0).toUpperCase() + titleDay.slice(1);
                
                if (currentDay !== expectedDay) {
                    // Get the next occurrence of the target day
                    const targetDate = getNextDayOfWeek(titleDay, eventDate);
                    const newDay = getDayOfWeek(targetDate);
                    
                    // Only fix if we can get the correct day
                    if (newDay === expectedDay) {
                        const oldDate = event.date;
                        event.date = targetDate.toISOString();
                        event.lastUpdated = new Date().toISOString();
                        
                        fixedCount++;
                        console.log(`✅ Fixed: ${event.title.substring(0, 50)}`);
                        console.log(`   ${currentDay} → ${newDay}`);
                        console.log(`   ${oldDate} → ${event.date}\n`);
                    }
                }
            }
        } catch (error) {
            // Skip events with parsing errors
            continue;
        }
    }

    // Save updated events
    writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    console.log(`\n📊 RESULTS:`);
    console.log(`  Total events checked: ${events.length}`);
    console.log(`  Fixed: ${fixedCount}`);
    console.log(`\n💾 Updated events saved to: ${eventsPath}`);
}

fixDayMismatches();
