/**
 * Check how many events are showing for tomorrow
 * 
 * Usage:
 *   npx tsx scripts/check-tomorrow-events.ts
 */

import fs from 'fs';
import path from 'path';
import { Event } from '../src/lib/types';

const eventsFile = path.join(process.cwd(), 'data', 'events.json');

function getTorontoDateParts(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Toronto',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const map: { [key: string]: string } = {};
    parts.forEach(p => map[p.type] = p.value);
    return `${map.year}-${map.month}-${map.day}`;
}

function main() {
    if (!fs.existsSync(eventsFile)) {
        console.error('❌ events.json not found');
        process.exit(1);
    }

    const events: Event[] = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = getTorontoDateParts(now);
    const tomorrowStr = getTorontoDateParts(tomorrow);
    
    console.log('📅 Date Check\n');
    console.log(`Today (Toronto): ${todayStr}`);
    console.log(`Tomorrow (Toronto): ${tomorrowStr}\n`);
    
    // Filter events for tomorrow
    const tomorrowEvents = events.filter(e => {
        if (e.status === 'CANCELLED' || e.status === 'MOVED') return false;
        
        try {
            const eventDate = new Date(e.date);
            if (isNaN(eventDate.getTime())) return false;
            const eventDateStr = getTorontoDateParts(eventDate);
            return eventDateStr === tomorrowStr;
        } catch {
            return false;
        }
    });
    
    console.log(`📊 Tomorrow's Events: ${tomorrowEvents.length}\n`);
    
    if (tomorrowEvents.length > 0) {
        console.log('Sample events for tomorrow:');
        tomorrowEvents.slice(0, 10).forEach((e, i) => {
            console.log(`  ${i + 1}. ${e.title.substring(0, 50)}...`);
            console.log(`     Source: ${e.source} | Price: ${e.price} | Time: ${new Date(e.date).toLocaleTimeString('en-US', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit' })}`);
        });
    }
    
    // Breakdown by source
    const bySource: { [key: string]: number } = {};
    tomorrowEvents.forEach(e => {
        bySource[e.source] = (bySource[e.source] || 0) + 1;
    });
    
    console.log('\n📊 Breakdown by Source:');
    Object.entries(bySource).forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`);
    });
    
    console.log('');
}

main();
