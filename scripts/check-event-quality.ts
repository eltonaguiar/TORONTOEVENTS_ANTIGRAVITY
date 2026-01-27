/**
 * Check event quality - calculate % with valid dates
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import { safeParseDate } from '../src/lib/utils/dateHelpers';

function main() {
    console.log('📊 EVENT QUALITY CHECK\n');
    console.log('='.repeat(80));

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    let validDates = 0;
    let invalidDates = 0;
    const invalidEvents: Array<{ title: string; date: string; source: string }> = [];

    for (const event of events) {
        const result = safeParseDate(event.date, event.id, event.title);
        if (result.isValid) {
            validDates++;
        } else {
            invalidDates++;
            invalidEvents.push({
                title: event.title.substring(0, 60),
                date: event.date || 'null',
                source: event.source
            });
        }
    }

    const total = events.length;
    const validPercent = ((validDates / total) * 100).toFixed(1);
    const invalidPercent = ((invalidDates / total) * 100).toFixed(1);

    console.log(`\n📈 Date Quality:`);
    console.log(`  Total events: ${total}`);
    console.log(`  ✅ Valid dates: ${validDates} (${validPercent}%)`);
    console.log(`  ❌ Invalid dates: ${invalidDates} (${invalidPercent}%)`);

    // Group by source
    const bySource = new Map<string, { valid: number; invalid: number }>();
    for (const event of events) {
        const result = safeParseDate(event.date, event.id, event.title);
        const source = event.source || 'Unknown';
        if (!bySource.has(source)) {
            bySource.set(source, { valid: 0, invalid: 0 });
        }
        const stats = bySource.get(source)!;
        if (result.isValid) {
            stats.valid++;
        } else {
            stats.invalid++;
        }
    }

    console.log(`\n📊 By Source:`);
    for (const [source, stats] of Array.from(bySource.entries()).sort((a, b) => (b[1].valid + b[1].invalid) - (a[1].valid + a[1].invalid))) {
        const total = stats.valid + stats.invalid;
        const percent = total > 0 ? ((stats.valid / total) * 100).toFixed(1) : '0.0';
        console.log(`  ${source}: ${stats.valid}/${total} valid (${percent}%)`);
    }

    if (invalidEvents.length > 0 && invalidEvents.length <= 20) {
        console.log(`\n❌ Sample Invalid Dates (first ${Math.min(20, invalidEvents.length)}):`);
        invalidEvents.slice(0, 20).forEach(e => {
            console.log(`  - [${e.source}] ${e.title}`);
            console.log(`    Date: ${e.date}`);
        });
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Quality check complete: ${validPercent}% valid dates`);
    console.log('='.repeat(80));
}

if (require.main === module) {
    main().catch(console.error);
}
