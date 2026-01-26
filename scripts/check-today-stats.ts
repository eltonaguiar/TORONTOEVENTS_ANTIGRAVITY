import { getEvents } from '../src/lib/data';

const events = getEvents();
console.log(`Total Events: ${events.length}`);

// 7-Day Forecast
console.log('\n📅 Next 7 Days Forecast:');
const forecast: { [key: string]: number } = {};

for (let i = 0; i < 7; i++) {
    const d = new Date('2026-01-26T12:00:00-05:00'); // Anchor to user's "Today"
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    const count = events.filter(e => e.date.startsWith(dateStr)).length;
    console.log(`   ${dateStr}: ${count} events`);
}

const todayEvents = events.filter(e => e.date.startsWith('2026-01-26'));

console.log(`\n🔥 TODAY (2026-01-26) Detailed Stats:`);
console.log(`   Count: ${todayEvents.length}`);

// Time distribution
const hours: Record<string, number> = {};
todayEvents.forEach(e => {
    const d = new Date(e.date);
    const h = d.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: 'America/Toronto' });
    const slot = parseInt(h);
    const label = slot < 12 ? 'Morning' : slot < 17 ? 'Afternoon' : 'Evening';
    hours[label] = (hours[label] || 0) + 1;
});
console.log('   Time Distribution:', hours);

// Breakdown by category
const cats: Record<string, number> = {};
let maxPrice = 0;
todayEvents.forEach(e => {
    e.categories.forEach(c => {
        cats[c] = (cats[c] || 0) + 1;
    });
    if (e.priceAmount && e.priceAmount > maxPrice) maxPrice = e.priceAmount;
});
console.log('   Category Breakdown:', cats);
console.log('   Max Price seen:', maxPrice);
