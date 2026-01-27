/**
 * Fix malformed timezone dates in events.json
 * Fixes dates like "2026-01-27T17:00:0005:00" → "2026-01-27T17:00:00-05:00"
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';

function fixMalformedTimezone(dateStr: string): string | null {
    // Pattern: 2026-01-27T17:00:0005:00 or 2026-01-27T17:00:0004:00
    const malformedPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})0{3,4}([+-]?\d{1,2}):(\d{2})$/;
    const match = dateStr.match(malformedPattern);
    
    if (match) {
        const [, base, offsetHours, offsetMins] = match;
        // Determine sign - if offsetHours is negative, preserve it
        const sign = offsetHours.startsWith('-') ? '-' : (offsetHours.startsWith('+') ? '+' : '-');
        const hours = Math.abs(parseInt(offsetHours.replace(/[+-]/, '')));
        const mins = parseInt(offsetMins);
        
        // Format as proper ISO offset: +/-HH:MM
        const fixedOffset = `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        return `${base}${fixedOffset}`;
    }
    
    // Also check for patterns like "2026-01-27T17:00:00-5:00" (missing leading zero)
    const missingZeroPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})([+-])(\d{1}):(\d{2})$/;
    const match2 = dateStr.match(missingZeroPattern);
    
    if (match2) {
        const [, base, sign, hours, mins] = match2;
        const fixedOffset = `${sign}${String(parseInt(hours)).padStart(2, '0')}:${mins}`;
        return `${base}${fixedOffset}`;
    }
    
    return null;
}

function main() {
    console.log('🔧 FIXING MALFORMED TIMEZONE DATES\n');
    console.log('='.repeat(80));

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    let events: Event[];
    
    try {
        const data = readFileSync(eventsPath, 'utf-8');
        events = JSON.parse(data);
        console.log(`✅ Loaded ${events.length} events from events.json\n`);
    } catch (e: any) {
        console.error(`❌ Failed to load events.json: ${e.message}`);
        process.exit(1);
    }

    let fixed = 0;
    const fixedEvents: Event[] = [];

    for (const event of events) {
        const originalDate = event.date;
        const fixedDate = fixMalformedTimezone(originalDate);
        
        if (fixedDate) {
            event.date = fixedDate;
            fixed++;
            console.log(`✅ Fixed: "${event.title.substring(0, 50)}"`);
            console.log(`   ${originalDate} → ${fixedDate}`);
            fixedEvents.push(event);
        } else {
            // Check if date is parseable
            try {
                const testDate = new Date(originalDate);
                if (isNaN(testDate.getTime())) {
                    console.log(`⚠️  Unparseable (not timezone issue): "${event.title.substring(0, 50)}" - ${originalDate}`);
                }
            } catch {}
            fixedEvents.push(event);
        }
    }

    // Save fixed events
    writeFileSync(eventsPath, JSON.stringify(fixedEvents, null, 2));
    console.log(`\n✅ Fixed ${fixed} malformed timezone dates`);
    console.log(`📊 Final count: ${fixedEvents.length} events`);

    // Update metadata
    const metadataPath = join(process.cwd(), 'data', 'metadata.json');
    try {
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
        metadata.totalEvents = fixedEvents.length;
        metadata.lastUpdated = new Date().toISOString();
        writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        console.log(`✅ Updated metadata.json`);
    } catch (e: any) {
        console.warn(`⚠️  Could not update metadata: ${e.message}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ MALFORMED TIMEZONE FIX COMPLETE');
    console.log('='.repeat(80));
}

main().catch(console.error);
