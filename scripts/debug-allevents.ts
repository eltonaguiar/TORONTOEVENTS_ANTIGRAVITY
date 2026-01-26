import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('allevents.html', 'utf8');
const $ = cheerio.load(html);

console.log('Searching for event cards...');

const selectors = [
    '.event-card',
    '.event-item',
    '.res-event-card',
    'li[itemscope]',
    '[data-event-id]',
    '.event-box'
];

selectors.forEach(sel => {
    const count = $(sel).length;
    console.log(`Selector "${sel}": ${count} matches`);
});

// If we found some, show the first one's structure
const cards = $('.event-card');
if (cards.length > 0) {
    const first = cards.first();
    console.log('--- First .event-card structure ---');
    console.log('Title:', first.find('h3').text().trim() || first.find('.title').text().trim());
    console.log('URL:', first.find('a').attr('href'));
    console.log('Date:', first.find('.date').text().trim());
    console.log('Img src:', first.find('img').attr('src') || first.find('img').attr('data-src'));
    console.log('Img thumb:', first.find('.thumb').attr('src') || first.find('.thumb').attr('data-src'));
    console.log('Price/Tickets info:', first.find('.price').text().trim() || first.find('.tickets').text().trim() || first.find('.fee').text().trim());
    console.log('Book button text:', first.find('.book-button-left, .buy-tickets, .get-tickets').text().trim());
}

const itemscopes = $('li[itemscope]');
if (itemscopes.length > 0) {
    const first = itemscopes.first();
    console.log('--- First li[itemscope] structure ---');
    console.log('Title:', first.find('[itemprop="name"]').text().trim());
    console.log('URL:', first.find('a[itemprop="url"]').attr('href') || first.find('a').attr('href'));
    console.log('Date:', first.find('[itemprop="startDate"]').attr('content') || first.find('.date').text().trim());
}
