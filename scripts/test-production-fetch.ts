/**
 * Test script to simulate what happens in production
 * Tests both GitHub fetch and FTP fallback
 */

import axios from 'axios';

const GITHUB_REPO = 'eltonaguiar/TORONTOEVENTS_ANTIGRAVITY';
const GITHUB_BRANCH = 'main';
const EVENTS_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/data/events.json`;
const FTP_URL = 'https://findtorontoevents.ca/events.json';
const FTP_BASEPATH_URL = 'https://findtorontoevents.ca/TORONTOEVENTS_ANTIGRAVITY/events.json';

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
        console.log(`  Status: ${response.status} ${response.statusText}`);
        console.log(`  Content-Type: ${contentType}`);
        
        if (contentType.includes('application/json') || contentType.includes('text/plain')) {
            const events = response.data;
            const eventCount = Array.isArray(events) ? events.length : 0;
            console.log(`  ✅ Events: ${eventCount}`);
            console.log(`  ✅ Is array: ${Array.isArray(events)}`);
            if (eventCount > 0) {
                console.log(`  ✅ First event: ${events[0].title?.substring(0, 50)}`);
            }
            return { success: true, count: eventCount };
        } else {
            console.log(`  ❌ Not JSON: ${contentType}`);
            return { success: false, error: 'Not JSON' };
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
    console.log('🧪 PRODUCTION FETCH TEST');
    console.log('='.repeat(80));
    
    const results = {
        github: await testFetch(EVENTS_URL, 'GitHub'),
        ftp: await testFetch(FTP_URL, 'FTP Root'),
        ftpBasePath: await testFetch(FTP_BASEPATH_URL, 'FTP BasePath'),
    };
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log(`GitHub: ${results.github.success ? '✅' : '❌'} ${results.github.count || 0} events`);
    console.log(`FTP Root: ${results.ftp.success ? '✅' : '❌'} ${results.ftp.count || 0} events`);
    console.log(`FTP BasePath: ${results.ftpBasePath.success ? '✅' : '❌'} ${results.ftpBasePath.count || 0} events`);
    
    console.log('\n💡 RECOMMENDATION:');
    if (results.github.success) {
        console.log('  ✅ GitHub is working - primary source OK');
    } else {
        console.log('  ❌ GitHub failed - need to investigate');
    }
    
    if (results.ftp.success) {
        console.log('  ✅ FTP root fallback available');
    }
    
    if (results.ftpBasePath.success) {
        console.log('  ✅ FTP basePath fallback available');
    } else if (!results.ftp.success) {
        console.log('  ⚠️  Both FTP fallbacks failed - check deployment');
    }
}

main().catch(console.error);
