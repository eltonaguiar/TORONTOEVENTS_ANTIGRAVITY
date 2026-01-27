/**
 * Fix ALL Vision Board events to January 31, 2026 at 6pm EST
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

const eventsPath = join(process.cwd(), 'data', 'events.json');
const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

console.log('🔍 Finding all Vision Board events...\n');

const visionEvents = events.filter(e => 
    e.title && e.title.toLowerCase().includes('vision board')
);

console.log(`Found ${visionEvents.length} Vision Board event(s):\n`);

visionEvents.forEach((e, i) => {
    console.log(`${i + 1}. ${e.title}`);
    console.log(`   URL: ${e.url}`);
    console.log(`   Current date: ${e.date}`);
    const d = new Date(e.date);
    console.log(`   Display: ${d.toLocaleString('en-US', {timeZone: 'America/Toronto', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'})}`);
    console.log('');
});

// Fix all Vision Board events to Jan 31, 6pm EST
const correctDate = '2026-01-31T18:00:00-05:00';
let fixed = 0;

visionEvents.forEach(e => {
    const oldDate = e.date;
    e.date = correctDate;
    e.lastUpdated = new Date().toISOString();
    fixed++;
    console.log(`✅ Fixed: ${e.title}`);
    console.log(`   ${oldDate} → ${correctDate}\n`);
});

if (fixed > 0) {
    writeFileSync(eventsPath, JSON.stringify(events, null, 2));
    console.log(`\n💾 Fixed ${fixed} Vision Board event(s)`);
    console.log(`✅ All Vision Board events now set to: January 31, 2026 at 6:00 PM EST`);
} else {
    console.log('No Vision Board events found to fix');
}
