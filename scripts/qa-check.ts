
import * as fs from 'fs';
import * as path from 'path';

// Types (simplified)
interface Event {
    id: string;
    title: string;
    date: string;
    source: string;
    url: string;
    location: string;
    price: string;
    description: string;
    categories: string[];
}

interface Metadata {
    lastUpdated: string;
    totalEvents: number;
    sources: string[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const METADATA_FILE = path.join(DATA_DIR, 'metadata.json');

function runQA() {
    console.log('🚀 Starting QA Routine...');

    if (!fs.existsSync(EVENTS_FILE)) {
        console.error('❌ CRITICAL: events.json not found!');
        process.exit(1);
    }

    const eventsRaw = fs.readFileSync(EVENTS_FILE, 'utf-8');
    const events: Event[] = JSON.parse(eventsRaw);

    if (!fs.existsSync(METADATA_FILE)) {
        console.warn('⚠️ WARNING: metadata.json not found.');
    } else {
        const metadata: Metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
        console.log(`ℹ️ Metadata Last Updated: ${metadata.lastUpdated}`);
    }

    console.log(`\n📊 Total Events: ${events.length}`);

    // 1. Source Breakdown
    const sourceCounts: Record<string, number> = {};
    events.forEach(e => {
        sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
    });

    console.log('\n📈 Events by Source:');
    Object.entries(sourceCounts).forEach(([source, count]) => {
        const status = count > 0 ? '✅' : '❌';
        console.log(`   ${status} ${source}: ${count}`);
    });

    // 2. Date Integrity
    console.log('\n📅 Date Integrity Check:');
    let pastEvents = 0;
    let invaidDates = 0;
    let farFutureEvents = 0;
    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    events.forEach(e => {
        const d = new Date(e.date);
        if (isNaN(d.getTime())) {
            invaidDates++;
            console.error(`   ❌ Invalid Date: "${e.date}" for event "${e.title}" (${e.source})`);
        } else {
            if (d < now) {
                // Check if it's just a few hours ago (acceptable) or days ago
                const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
                if (diffHours > 24) {
                    pastEvents++;
                    // console.warn(`   ⚠️ Past Event (>24h): ${e.title} (${e.date})`);
                }
            }
            if (d > oneYearFromNow) {
                farFutureEvents++;
                console.warn(`   ⚠️ Far Future: ${e.title} (${e.date})`);
            }
        }
    });

    if (invaidDates === 0) console.log('   ✅ No invalid dates found.');
    if (pastEvents > 0) console.warn(`   ⚠️ Found ${pastEvents} events more than 24h in the past.`);
    else console.log('   ✅ No significantly past events found.');

    // 3. Content Completeness
    console.log('\n📝 Content Completeness Check:');
    let missingLocation = 0;
    let missingImage = 0;
    let shortDescription = 0;

    events.forEach(e => {
        if (!e.location || e.location === 'Toronto, ON' || e.location.trim() === '') missingLocation++;
        if (!e.url) console.error(`   ❌ Critical: Missing URL for ${e.title}`);
        if (!e.description || e.description.length < 20) shortDescription++;
        // Check for placeholder or broken images could go here
    });

    console.log(`   Targeting specific quality metrics:`);
    console.log(`   - Generic 'Toronto, ON' locations: ${missingLocation} (${((missingLocation / events.length) * 100).toFixed(1)}%)`);
    console.log(`   - Short/Empty Descriptions: ${shortDescription} (${((shortDescription / events.length) * 100).toFixed(1)}%)`);

    // 4. CitySwoon & 25dates Specific Check
    console.log('\n🔍 New Scrapers Validation:');
    const citySwoonEvents = events.filter(e => e.source === 'CitySwoon');
    const tfDatesEvents = events.filter(e => e.source === '25dates.com');

    if (citySwoonEvents.length > 0) {
        console.log(`   ✅ CitySwoon: ${citySwoonEvents.length} events found.`);
        // Sample check
        console.log(`      Sample: ${citySwoonEvents[0].title} - ${citySwoonEvents[0].date}`);
    } else {
        console.error(`   ❌ CitySwoon: 0 events found!`);
    }

    if (tfDatesEvents.length > 0) {
        console.log(`   ✅ 25dates.com: ${tfDatesEvents.length} events found.`);
        console.log(`      Sample: ${tfDatesEvents[0].title} - ${tfDatesEvents[0].date}`);
    } else {
        console.error(`   ❌ 25dates.com: 0 events found!`);
    }

    console.log('\n🏁 QA Routine Complete.');
}

runQA();
