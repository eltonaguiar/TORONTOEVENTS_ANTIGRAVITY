import { CitySwoonScraper } from '../src/lib/scraper/source-cityswoon';
import { TwentyFiveDatesScraper } from '../src/lib/scraper/source-25dates';

async function debug() {
    const citySwoon = new CitySwoonScraper();
    console.log('--- CitySwoon ---');
    const citySwoonResult = await citySwoon.scrape();
    console.log(`Found ${citySwoonResult.events.length} events`);
    citySwoonResult.events.slice(0, 3).forEach(e => {
        console.log(`- ${e.title} (${e.date})`);
    });
    if (citySwoonResult.errors.length > 0) {
        console.error('Errors:', citySwoonResult.errors);
    }

    const twentyFiveDates = new TwentyFiveDatesScraper();
    console.log('\n--- 25dates.com ---');
    const twentyFiveResult = await twentyFiveDates.scrape();
    console.log(`Found ${twentyFiveResult.events.length} events`);
    twentyFiveResult.events.slice(0, 3).forEach(e => {
        console.log(`- ${e.title} (${e.date})`);
    });
    if (twentyFiveResult.errors.length > 0) {
        console.error('Errors:', twentyFiveResult.errors);
    }
}

debug().catch(console.error);
