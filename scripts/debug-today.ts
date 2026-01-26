
import * as fs from 'fs';
import * as path from 'path';

const EVENTS_FILE = path.join(process.cwd(), 'data', 'events.json');
const events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));

// Mock "Now" as 8:30 PM EST today
const now = new Date('2026-01-26T20:30:00-05:00');

console.log(`Debug Time: ${now.toISOString()}`);

const todayEvents = events.filter((e: any) => {
    // Simple "Starts on 2026-01-26" check (robust enough for this debug)
    return e.date.includes('2026-01-26');
});

console.log(`Total events with date 2026-01-26: ${todayEvents.length}`);

let finishedCount = 0;
let ongoingCount = 0;
let upcomingCount = 0;
let multiDayCount = 0;

todayEvents.forEach((e: any) => {
    const start = new Date(e.date);
    const end = e.endDate ? new Date(e.endDate) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
    const isMulti = e.categories.includes('Multi-Day');

    if (isMulti) {
        multiDayCount++;
        // console.log(`[Multi-Day] ${e.title}`);
        return;
    }

    if (end < now) {
        finishedCount++;
        // console.log(`[Finished] ${e.title} (${start.toLocaleTimeString()} - ${end.toLocaleTimeString()})`);
    } else if (start < now) {
        ongoingCount++;
        console.log(`[Ongoing] ${e.title} (${start.toLocaleTimeString()} - ${end.toLocaleTimeString()})`);
    } else {
        upcomingCount++;
        console.log(`[Upcoming] ${e.title} (${start.toLocaleTimeString()})`);
    }
});

console.log('\n--- Summary ---');
console.log(`Multi-Day: ${multiDayCount}`);
console.log(`Finished: ${finishedCount}`);
console.log(`Ongoing: ${ongoingCount}`);
console.log(`Upcoming: ${upcomingCount}`);
console.log(`Total Visible in "Hide Started" mode: ${upcomingCount}`);
console.log(`Total Visible in "Show Started" mode: ${upcomingCount + ongoingCount}`);
console.log(`Total Visible if we Show Finished: ${upcomingCount + ongoingCount + finishedCount}`);
