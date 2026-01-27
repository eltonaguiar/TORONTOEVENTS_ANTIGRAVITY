/**
 * Sanity check prices for 20 random events
 * Verify prices are extracted correctly
 * 
 * Usage:
 *   npx tsx scripts/sanity-check-prices.ts
 */

import fs from 'fs';
import path from 'path';
import { Event } from '../src/lib/types';

const eventsFile = path.join(process.cwd(), 'data', 'events.json');

function main() {
    if (!fs.existsSync(eventsFile)) {
        console.error('❌ events.json not found');
        process.exit(1);
    }

    const events: Event[] = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
    
    console.log('🔍 Price Sanity Check (20 Random Events)\n');
    console.log('='.repeat(80));
    
    // Filter to upcoming events
    const upcoming = events.filter(e => 
        e.status === 'UPCOMING' && 
        new Date(e.date) >= new Date()
    );
    
    // Random sample of 20
    const shuffled = [...upcoming].sort(() => 0.5 - Math.random());
    const sample = shuffled.slice(0, 20);
    
    console.log(`Checking ${sample.length} random upcoming events...\n`);
    
    let withPrice = 0;
    let withPriceAmount = 0;
    let seeTickets = 0;
    let free = 0;
    let tbd = 0;
    let other = 0;
    
    const results: Array<{
        title: string;
        source: string;
        price: string;
        priceAmount?: number;
        url: string;
        status: 'OK' | 'MISSING' | 'TBD' | 'SEE_TICKETS';
    }> = [];
    
    for (const event of sample) {
        let status: 'OK' | 'MISSING' | 'TBD' | 'SEE_TICKETS' = 'OK';
        
        if (event.priceAmount !== undefined) {
            withPriceAmount++;
            withPrice++;
        } else if (event.price === 'Free' || event.isFree) {
            free++;
            withPrice++;
        } else if (event.price === 'See tickets' || event.price === 'See Tickets' || event.price.toLowerCase().includes('see ticket')) {
            seeTickets++;
            status = 'SEE_TICKETS';
        } else if (event.price === 'TBD' || event.price === 'tbd' || event.price.toLowerCase().includes('tbd')) {
            tbd++;
            status = 'TBD';
        } else if (event.price && event.price.length > 0) {
            withPrice++;
        } else {
            other++;
            status = 'MISSING';
        }
        
        results.push({
            title: event.title,
            source: event.source,
            price: event.price,
            priceAmount: event.priceAmount,
            url: event.url,
            status
        });
    }
    
    // Display results
    results.forEach((r, i) => {
        const icon = r.status === 'OK' ? '✅' : r.status === 'SEE_TICKETS' ? '⚠️' : r.status === 'TBD' ? 'ℹ️' : '❌';
        console.log(`[${i + 1}/20] ${icon} ${r.title.substring(0, 45)}...`);
        console.log(`   Source: ${r.source}`);
        console.log(`   Price: ${r.price}${r.priceAmount !== undefined ? ` ($${r.priceAmount})` : ''}`);
        if (r.status !== 'OK') {
            console.log(`   Status: ${r.status}`);
        }
        console.log(`   URL: ${r.url.substring(0, 60)}...`);
        console.log('');
    });
    
    // Summary
    console.log('='.repeat(80));
    console.log('\n📊 Price Extraction Summary:\n');
    console.log(`   ✅ With Price: ${withPrice}/20 (${Math.round(withPrice/20*100)}%)`);
    console.log(`   ✅ With Price Amount: ${withPriceAmount}/20 (${Math.round(withPriceAmount/20*100)}%)`);
    console.log(`   ✅ Free Events: ${free}/20`);
    console.log(`   ⚠️  See Tickets: ${seeTickets}/20 (${Math.round(seeTickets/20*100)}%)`);
    console.log(`   ℹ️  TBD: ${tbd}/20`);
    console.log(`   ❌ Missing/Other: ${other}/20`);
    
    const successRate = (withPrice / 20) * 100;
    console.log(`\n   Overall Success Rate: ${Math.round(successRate)}%`);
    
    if (successRate >= 80) {
        console.log('\n✅ Price extraction is working well!');
    } else if (successRate >= 60) {
        console.log('\n⚠️  Price extraction needs improvement');
    } else {
        console.log('\n❌ Price extraction has issues');
    }
    
    console.log('');
}

main();
