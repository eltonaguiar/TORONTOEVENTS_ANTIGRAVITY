import { AllEventsScraper } from '../src/lib/scraper/source-allevents';
import { shouldIncludeEvent } from '../src/lib/quality/score';

async function test() {
    const scraper = new AllEventsScraper();
    const result = await scraper.scrape();
    console.log(`Scraper returned ${result.events.length} events`);

    let included = 0;
    for (const e of result.events) {
        console.log(`Checking: ${e.title} | Raw Date: ${e.date}`);
        if (shouldIncludeEvent(e)) {
            included++;
        } else {
            // ...
        }
    }
    console.log(`Final included: ${included}`);
}

test().catch(console.error);
