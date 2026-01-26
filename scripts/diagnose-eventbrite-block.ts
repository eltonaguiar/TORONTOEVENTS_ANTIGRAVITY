import axios from 'axios';

async function diagnose() {
    const testUrl = 'https://www.eventbrite.ca/d/canada--toronto/events--today/';

    console.log('=== Eventbrite Block Diagnosis ===\n');

    // Test 1: Basic request with our current headers
    console.log('Test 1: Current scraper headers...');
    try {
        const response = await axios.get(testUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 10000
        });
        console.log(`✅ SUCCESS - Status: ${response.status}, Length: ${response.data.length}`);
    } catch (error: any) {
        console.log(`❌ FAILED - Status: ${error.response?.status}, Message: ${error.message}`);
    }

    // Test 2: Minimal request
    console.log('\nTest 2: Minimal request (no custom headers)...');
    try {
        const response = await axios.get(testUrl, { timeout: 10000 });
        console.log(`✅ SUCCESS - Status: ${response.status}, Length: ${response.data.length}`);
    } catch (error: any) {
        console.log(`❌ FAILED - Status: ${error.response?.status}, Message: ${error.message}`);
    }

    // Test 3: Different User-Agent
    console.log('\nTest 3: Different User-Agent (curl)...');
    try {
        const response = await axios.get(testUrl, {
            headers: { 'User-Agent': 'curl/7.68.0' },
            timeout: 10000
        });
        console.log(`✅ SUCCESS - Status: ${response.status}, Length: ${response.data.length}`);
    } catch (error: any) {
        console.log(`❌ FAILED - Status: ${error.response?.status}, Message: ${error.message}`);
    }

    // Test 4: Check if it's a redirect issue
    console.log('\nTest 4: Following redirects...');
    try {
        const response = await axios.get(testUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            maxRedirects: 5,
            timeout: 10000
        });
        console.log(`✅ SUCCESS - Status: ${response.status}, Final URL: ${response.request.res.responseUrl || testUrl}`);
    } catch (error: any) {
        console.log(`❌ FAILED - Status: ${error.response?.status}, Message: ${error.message}`);
    }

    console.log('\n=== Diagnosis Complete ===');
}

diagnose();
