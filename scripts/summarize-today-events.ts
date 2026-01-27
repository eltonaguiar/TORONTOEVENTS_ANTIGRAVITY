/**
 * Summarize today's events
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

function getTorontoDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        timeZone: 'America/Toronto',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function main() {
    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const today = new Date();
    const todayStr = getTorontoDate(today);

    const todayEvents = events.filter(e => {
        try {
            const d = new Date(e.date);
            return getTorontoDate(d) === todayStr;
        } catch {
            return false;
        }
    });

    console.log("Today's Events Summary:");
    console.log(`Total: ${todayEvents.length}\n`);

    const withTime = todayEvents.filter(e => {
        const d = new Date(e.date);
        return d.getHours() !== 0 || d.getMinutes() !== 0;
    });
    console.log(`Events with specific times (not midnight): ${withTime.length}`);

    const withLocation = todayEvents.filter(e => 
        e.location && !e.location.match(/^Toronto, ON$/i)
    );
    console.log(`Events with specific locations: ${withLocation.length}\n`);

    if (withLocation.length > 0) {
        console.log('Events with specific venues:');
        withLocation.forEach(e => {
            const d = new Date(e.date);
            console.log(`  - ${e.title.substring(0, 50)}`);
            console.log(`    Time: ${d.toLocaleTimeString('en-US', {timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit'})}`);
            console.log(`    Location: ${e.location}`);
            console.log(`    Source: ${e.source}`);
            console.log('');
        });
    }
}

main();
