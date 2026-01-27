/**
 * Test enhanced date parsing with various formats
 */

import { normalizeDate } from '../src/lib/scraper/utils';
import { safeParseDate } from '../src/lib/utils/dateHelpers';

const testCases = [
    // ISO formats
    '2026-01-27T17:00:00-05:00',
    '2026-01-27T17:00:00Z',
    
    // US formats
    '01/27/2026 5:00 PM',
    '1/27/2026',
    
    // Day-first formats
    '27/01/2026 17:00',
    '27/01/2026',
    
    // Text formats
    'January 27, 2026',
    'Jan 27, 2026',
    'Jan 27, 2026 at 5:00 PM',
    
    // Day-first text formats
    '27 Jan 2026',
    '27 January 2026',
    '27 Jan 2026 at 5:00 PM',
    
    // Weekday formats
    'Tue, Jan 27, 2026 at 5:00 PM',
    'Tuesday, January 27, 2026 at 5:00 PM',
    
    // Bullet formats
    'Jan 27 | 11:00 PM',
    
    // Relative dates
    'Tomorrow at 7pm',
    'Today at 3pm',
    
    // Edge cases
    'Jan 27',
    '2026-01-27',
];

console.log('🧪 Testing Enhanced Date Parsing\n');
console.log('='.repeat(80));

let successCount = 0;
let failCount = 0;
const failures: Array<{ input: string; scraper: string | null; frontend: boolean }> = [];

for (const testCase of testCases) {
    const scraperResult = normalizeDate(testCase);
    const frontendResult = safeParseDate(testCase);
    
    const scraperValid = scraperResult !== null;
    const frontendValid = frontendResult.isValid;
    
    if (scraperValid && frontendValid) {
        successCount++;
        console.log(`✅ "${testCase}"`);
        console.log(`   Scraper: ${scraperResult}`);
        console.log(`   Frontend: ${frontendResult.date?.toISOString()}`);
    } else {
        failCount++;
        failures.push({ input: testCase, scraper: scraperResult, frontend: frontendValid });
        console.log(`❌ "${testCase}"`);
        if (!scraperValid) console.log(`   Scraper: FAILED`);
        if (!frontendValid) console.log(`   Frontend: FAILED - ${frontendResult.error}`);
    }
    console.log('');
}

console.log('='.repeat(80));
console.log(`\n📊 Results: ${successCount} passed, ${failCount} failed out of ${testCases.length}`);
console.log(`Success rate: ${((successCount / testCases.length) * 100).toFixed(1)}%`);

if (failures.length > 0) {
    console.log('\n❌ Failures:');
    failures.forEach(f => {
        console.log(`  - "${f.input}" (scraper: ${f.scraper ? 'OK' : 'FAIL'}, frontend: ${f.frontend ? 'OK' : 'FAIL'})`);
    });
}
