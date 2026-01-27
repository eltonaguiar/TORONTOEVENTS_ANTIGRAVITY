/**
 * Analyze TBD dates by provider
 * Shows count of TBD vs valid dates for each source
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Event } from '../src/lib/types';
import { safeParseDate } from '../src/lib/utils/dateHelpers';
import { isTBDDate } from '../src/lib/scraper/utils';

interface ProviderStats {
    provider: string;
    total: number;
    validDates: number;
    tbdDates: number;
    invalidDates: number;
    tbdInTitle: number;
    tbdInDescription: number;
    tbdInDateField: number;
}

function main() {
    console.log('📊 TBD DATE ANALYSIS BY PROVIDER\n');
    console.log('='.repeat(80));

    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const events: Event[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

    const providerStats = new Map<string, ProviderStats>();

    for (const event of events) {
        const provider = event.source || 'Unknown';
        
        if (!providerStats.has(provider)) {
            providerStats.set(provider, {
                provider,
                total: 0,
                validDates: 0,
                tbdDates: 0,
                invalidDates: 0,
                tbdInTitle: 0,
                tbdInDescription: 0,
                tbdInDateField: 0
            });
        }

        const stats = providerStats.get(provider)!;
        stats.total++;

        // Check if TBD appears in title or description
        const titleHasTBD = isTBDDate(event.title);
        const descHasTBD = event.description ? isTBDDate(event.description) : false;
        const dateFieldHasTBD = event.date ? isTBDDate(event.date) : true;

        if (titleHasTBD) stats.tbdInTitle++;
        if (descHasTBD) stats.tbdInDescription++;
        if (dateFieldHasTBD) stats.tbdInDateField++;

        // Check date validity
        if (!event.date) {
            stats.tbdDates++;
        } else {
            const parseResult = safeParseDate(event.date, event.id, event.title);
            if (parseResult.isValid) {
                stats.validDates++;
            } else {
                // Check if it's actually TBD or just invalid
                if (isTBDDate(event.date)) {
                    stats.tbdDates++;
                } else {
                    stats.invalidDates++;
                }
            }
        }
    }

    // Sort by total events (descending)
    const sortedStats = Array.from(providerStats.values())
        .sort((a, b) => b.total - a.total);

    console.log('\n📈 SUMMARY BY PROVIDER:\n');
    console.log('Provider'.padEnd(25) + 'Total'.padStart(8) + 'Valid'.padStart(8) + 'TBD'.padStart(8) + 'Invalid'.padStart(10) + 'TBD in Title'.padStart(15));
    console.log('-'.repeat(80));

    for (const stats of sortedStats) {
        const validPct = ((stats.validDates / stats.total) * 100).toFixed(1);
        const tbdPct = ((stats.tbdDates / stats.total) * 100).toFixed(1);
        const invalidPct = ((stats.invalidDates / stats.total) * 100).toFixed(1);
        
        console.log(
            stats.provider.substring(0, 24).padEnd(25) +
            stats.total.toString().padStart(8) +
            `${stats.validDates} (${validPct}%)`.padStart(8) +
            `${stats.tbdDates} (${tbdPct}%)`.padStart(8) +
            `${stats.invalidDates} (${invalidPct}%)`.padStart(10) +
            stats.tbdInTitle.toString().padStart(15)
        );
    }

    // Find events with TBD in title but valid dates
    console.log('\n\n🔍 EVENTS WITH "TBD" IN TITLE BUT VALID DATES:\n');
    const tbdTitleValidDate = events.filter(e => {
        const titleHasTBD = isTBDDate(e.title);
        if (!titleHasTBD) return false;
        if (!e.date) return false;
        const parseResult = safeParseDate(e.date, e.id, e.title);
        return parseResult.isValid;
    });

    console.log(`Found ${tbdTitleValidDate.length} events with TBD in title but valid dates:\n`);
    tbdTitleValidDate.slice(0, 20).forEach(e => {
        const parseResult = safeParseDate(e.date!, e.id, e.title);
        console.log(`  [${e.source}] ${e.title.substring(0, 60)}`);
        console.log(`    Date: ${e.date} → ${parseResult.isValid ? 'VALID' : 'INVALID'}`);
        console.log(`    URL: ${e.url}`);
        console.log('');
    });

    // Find events with valid data-stime but marked TBD
    console.log('\n\n🔍 EVENTS WITH NULL/INVALID DATES (should have data-stime):\n');
    const invalidDates = events.filter(e => {
        if (!e.date) return true;
        const parseResult = safeParseDate(e.date, e.id, e.title);
        return !parseResult.isValid;
    });

    console.log(`Found ${invalidDates.length} events with invalid/null dates:\n`);
    const alleventsInvalid = invalidDates.filter(e => e.source === 'AllEvents.in').slice(0, 10);
    alleventsInvalid.forEach(e => {
        console.log(`  [${e.source}] ${e.title.substring(0, 60)}`);
        console.log(`    Date: ${e.date || 'NULL'}`);
        console.log(`    URL: ${e.url}`);
        console.log('');
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis complete');
    console.log('='.repeat(80));
}

if (require.main === module) {
    main().catch(console.error);
}
