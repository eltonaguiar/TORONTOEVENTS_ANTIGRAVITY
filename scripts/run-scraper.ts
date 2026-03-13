import { runScraper } from '../src/lib/scraper';

runScraper().catch(err => { console.error(err); process.exit(1); });
