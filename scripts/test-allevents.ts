import { AllEventsScraper } from '../src/lib/scraper/source-allevents';

async function test() {
    const scraper = new AllEventsScraper();
    const result = await scraper.scrape();
    console.log(`Scraped ${result.events.length} events from AllEvents`);
    result.events.forEach(e => console.log(`Date: ${e.date} | Title: ${e.title}`));
}

test().catch(console.error);
