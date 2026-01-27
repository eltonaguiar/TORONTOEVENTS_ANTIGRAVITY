/**
 * Test script to simulate browser fetch behavior
 * Tests both GitHub and FTP fallbacks
 */

import axios from 'axios';

const GITHUB_URL = 'https://raw.githubusercontent.com/eltonaguiar/TORONTOEVENTS_ANTIGRAVITY/main/data/events.json';
const FTP_URLS = [
    'https://findtorontoevents.ca/events.json',
    'https://findtorontoevents.ca/TORONTOEVENTS_ANTIGRAVITY/events.json',
];

async function testFetch(url: string, name: string) {
    try {
        console.log(`\n🔍 Testing ${name}: ${url}`);
        const response = await axios.get(url + '?t=' + Date.now(), {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
            },
            timeout: 10000
        });
        
        const contentType = response.headers['content-type'] || '';
        console.log(`  Status: ${response.status}`);
        console.log(`  Content-Type: ${contentType}`);
        
        let events;
        if (typeof response.data === 'string') {
            events = JSON.parse(response.data);
        } else {
            events = response.data;
        }
        
        const eventCount = Array.isArray(events) ? events.length : 0;
        console.log(`  ✅ Events: ${eventCount}`);
        console.log(`  ✅ Is array: ${Array.isArray(events)}`);
        
        if (eventCount > 0) {
            console.log(`  ✅ First event: ${events[0].title?.substring(0, 50)}`);
            return { success: true, count: eventCount };
        } else {
            console.log(`  ⚠️  Warning: 0 events returned`);
            return { success: false, count: 0, error: '0 events' };
        }
    } catch (e: any) {
        console.log(`  ❌ Error: ${e.message}`);
        if (e.response) {
            console.log(`  Status: ${e.response.status}`);
        }
        return { success: false, error: e.message };
    }
}

async function main() {
    console.log('🧪 BROWSER FETCH SIMULATION TEST');
    console.log('='.repeat(80));
    
    const results = {
        github: await testFetch(GITHUB_URL, 'GitHub'),
        ftp1: await testFetch(FTP_URLS[0], 'FTP Root'),
        ftp2: await testFetch(FTP_URLS[1], 'FTP BasePath'),
    };
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log(`GitHub: ${results.github.success ? '✅' : '❌'} ${results.github.count || 0} events`);
    console.log(`FTP Root: ${results.ftp1.success ? '✅' : '❌'} ${results.ftp1.count || 0} events`);
    console.log(`FTP BasePath: ${results.ftp2.success ? '✅' : '❌'} ${results.ftp2.count || 0} events`);
    
    const anyWorking = results.github.success || results.ftp1.success || results.ftp2.success;
    
    if (anyWorking) {
        console.log('\n✅ At least one source is working - events should load');
    } else {
        console.log('\n❌ CRITICAL: All sources failed! This explains 0 events.');
        console.log('   Check:');
        console.log('   1. Network connectivity');
        console.log('   2. CORS settings');
        console.log('   3. File accessibility');
    }
}

main().catch(console.error);
