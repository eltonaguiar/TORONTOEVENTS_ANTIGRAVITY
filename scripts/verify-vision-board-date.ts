/**
 * Verify Vision Board event date after scraper run
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

const eventsPath = join(process.cwd(), 'data', 'events.json');
const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

const vision = events.find(e => 
    e.url && (
        e.url.includes('vision-board') || 
        (e.title && e.title.toLowerCase().includes('vision board'))
    )
);

if (vision) {
    const d = new Date(vision.date);
    const expected = new Date('2026-01-31T18:00:00-05:00');
    
    console.log('🔍 Vision Board Event Verification:');
    console.log(`  Title: ${vision.title}`);
    console.log(`  URL: ${vision.url}`);
    console.log(`  Stored date: ${vision.date}`);
    console.log(`  Display: ${d.toLocaleString('en-US', {timeZone: 'America/Toronto', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'})}`);
    console.log(`  Expected: January 31, 2026 at 6:00 PM EST`);
    
    const isCorrect = d.getTime() === expected.getTime();
    const sameDay = d.toDateString() === expected.toDateString();
    const sameHour = d.getHours() === expected.getHours();
    
    if (isCorrect) {
        console.log('\n✅ Date is CORRECT: January 31, 2026 at 6:00 PM EST');
    } else if (sameDay && sameHour) {
        console.log('\n✅ Date is CORRECT (same day and hour)');
    } else if (sameDay) {
        console.log(`\n⚠️  Date is same day but wrong time. Expected 6pm, got ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`);
    } else {
        console.log(`\n❌ Date is WRONG. Expected Jan 31, got ${d.toLocaleDateString()}`);
    }
} else {
    console.log('❌ Vision Board event not found in database');
    console.log('   The scraper may still be running or the event URL may have changed.');
}
