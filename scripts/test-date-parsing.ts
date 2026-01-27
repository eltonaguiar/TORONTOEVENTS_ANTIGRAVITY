/**
 * Test date parsing for specific events
 */

import { safeParseDate } from '../src/lib/utils/dateHelpers';

const testDates = [
    '2026-01-27T19:00:00-05:00',
    '2026-01-27T18:00:00-05:00',
    '2026-01-29T00:00:00-05:00', // Ofenbach midnight
    '2026-01-27T19:00:00.000Z',
    '2026-01-27T23:00:00.000Z',
];

console.log('🧪 Testing Date Parsing\n');
console.log('='.repeat(80));

for (const dateStr of testDates) {
    const result = safeParseDate(dateStr);
    console.log(`\nInput: ${dateStr}`);
    console.log(`  Valid: ${result.isValid}`);
    if (result.isValid && result.date) {
        console.log(`  Parsed: ${result.date.toISOString()}`);
        console.log(`  Toronto: ${result.date.toLocaleString('en-US', { timeZone: 'America/Toronto' })}`);
    } else {
        console.log(`  Error: ${result.error}`);
    }
}

console.log('\n' + '='.repeat(80));
