/**
 * Verification script to test events loading
 * Simulates what the browser does when loading events
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

async function verifyEventsLoading() {
    console.log('🔍 VERIFICATION: Events Loading Test\n');
    console.log('='.repeat(80));

    // 1. Verify local data files
    console.log('\n📁 Step 1: Local Data Files');
    try {
        const eventsPath = join(process.cwd(), 'data', 'events.json');
        const metadataPath = join(process.cwd(), 'data', 'metadata.json');
        
        const events = JSON.parse(readFileSync(eventsPath, 'utf-8'));
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
        
        console.log(`  ✅ events.json: ${events.length} events`);
        console.log(`  ✅ metadata.json: ${metadata.totalEvents} events`);
        console.log(`  ✅ Match: ${events.length === metadata.totalEvents ? 'YES' : 'NO'}`);
        console.log(`  ✅ Is array: ${Array.isArray(events) ? 'YES' : 'NO'}`);
        console.log(`  ✅ Last updated: ${metadata.lastUpdated}`);
    } catch (e: any) {
        console.log(`  ❌ Error: ${e.message}`);
        return;
    }

    // 2. Verify GitHub data
    console.log('\n🌐 Step 2: GitHub Data Source');
    try {
        const githubUrl = 'https://raw.githubusercontent.com/eltonaguiar/TORONTOEVENTS_ANTIGRAVITY/main/data/events.json';
        const response = await axios.get(githubUrl + '?t=' + Date.now(), {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
            },
            timeout: 10000
        });
        
        const events = response.data;
        console.log(`  ✅ Status: ${response.status} ${response.statusText}`);
        console.log(`  ✅ Content-Type: ${response.headers['content-type']}`);
        console.log(`  ✅ Events loaded: ${Array.isArray(events) ? events.length : 'NOT AN ARRAY'}`);
        console.log(`  ✅ Is array: ${Array.isArray(events) ? 'YES' : 'NO'}`);
        if (Array.isArray(events) && events.length > 0) {
            console.log(`  ✅ First event: ${events[0].title?.substring(0, 50)}`);
        }
    } catch (e: any) {
        console.log(`  ❌ Error: ${e.message}`);
        if (e.response) {
            console.log(`  ❌ Status: ${e.response.status}`);
        }
    }

    // 3. Verify FTP fallback
    console.log('\n📡 Step 3: FTP Fallback (if GitHub fails)');
    try {
        const ftpUrl = 'https://findtorontoevents.ca/events.json';
        const response = await axios.get(ftpUrl + '?t=' + Date.now(), {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
            },
            timeout: 10000
        });
        
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
            const events = response.data;
            console.log(`  ✅ Status: ${response.status} ${response.statusText}`);
            console.log(`  ✅ Content-Type: ${contentType}`);
            console.log(`  ✅ Events loaded: ${Array.isArray(events) ? events.length : 'NOT AN ARRAY'}`);
            console.log(`  ✅ Is array: ${Array.isArray(events) ? 'YES' : 'NO'}`);
        } else {
            console.log(`  ⚠️  Content-Type is not JSON: ${contentType}`);
            console.log(`  ⚠️  This is expected if GitHub works (fallback not needed)`);
        }
    } catch (e: any) {
        console.log(`  ⚠️  FTP fallback test: ${e.message}`);
        console.log(`  ℹ️  This is OK if GitHub is working`);
    }

    // 4. Event statistics
    console.log('\n📊 Step 4: Event Statistics');
    try {
        const eventsPath = join(process.cwd(), 'data', 'events.json');
        const events = JSON.parse(readFileSync(eventsPath, 'utf-8'));
        
        const now = new Date();
        const futureEvents = events.filter((e: any) => {
            try {
                return new Date(e.date) >= now;
            } catch {
                return false;
            }
        });
        
        const todayEvents = events.filter((e: any) => {
            try {
                const d = new Date(e.date);
                const today = new Date();
                return d.toDateString() === today.toDateString();
            } catch {
                return false;
            }
        });
        
        const eventsWithPrices = events.filter((e: any) => e.priceAmount !== undefined);
        const freeEvents = events.filter((e: any) => e.isFree === true);
        
        const sources: { [key: string]: number } = {};
        events.forEach((e: any) => {
            sources[e.source] = (sources[e.source] || 0) + 1;
        });
        
        console.log(`  Total events: ${events.length}`);
        console.log(`  Future events: ${futureEvents.length}`);
        console.log(`  Today events: ${todayEvents.length}`);
        console.log(`  Events with prices: ${eventsWithPrices.length}`);
        console.log(`  Free events: ${freeEvents.length}`);
        console.log(`  Sources: ${Object.keys(sources).length}`);
        console.log(`  Top sources:`);
        Object.entries(sources)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([source, count]) => {
                console.log(`    - ${source}: ${count}`);
            });
    } catch (e: any) {
        console.log(`  ❌ Error: ${e.message}`);
    }

    // 5. Vision Board event check
    console.log('\n🎯 Step 5: Vision Board Event Verification');
    try {
        const eventsPath = join(process.cwd(), 'data', 'events.json');
        const events = JSON.parse(readFileSync(eventsPath, 'utf-8'));
        
        const visionBoard = events.filter((e: any) => 
            e.title && e.title.toLowerCase().includes('vision board')
        );
        
        console.log(`  Found ${visionBoard.length} Vision Board event(s):`);
        visionBoard.forEach((e: any) => {
            console.log(`    - ${e.title}`);
            console.log(`      Date: ${e.date}`);
            console.log(`      Source: ${e.source}`);
            console.log(`      Price: ${e.price || 'N/A'}`);
        });
    } catch (e: any) {
        console.log(`  ❌ Error: ${e.message}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(80));
    console.log('\n💡 Next Steps:');
    console.log('  1. Open http://localhost:3000 in your browser');
    console.log('  2. Open browser console (F12)');
    console.log('  3. Look for [Data Source] and [EventFeed] logs');
    console.log('  4. Verify events are displaying in the UI');
    console.log('  5. Check header shows "1088 events"');
}

verifyEventsLoading().catch(console.error);
