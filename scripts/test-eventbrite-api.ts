
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;

if (!TOKEN) {
    console.error('Error: EVENTBRITE_PRIVATE_TOKEN not found in .env');
    process.exit(1);
}

const BASE_URL = 'https://www.eventbriteapi.com/v3';

async function testApi() {
    try {
        console.log('Testing Eventbrite API connection...');

        // 1. Get User/Self info to verify token
        const userRes = await axios.get(`${BASE_URL}/users/me/`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        console.log(`Authenticated as: ${userRes.data.name} (${userRes.data.emails[0].email})`);

        // 2. Search for "Toronto Dating Hub" organizer
        console.log('\nSearching for organizers "Toronto Dating Hub"...');
        // Note: Eventbrite API doesn't have a direct "Search Organizers" endpoint publically documented in v3 standard search,
        // usually you search *events* and expand organizer.
        // Let's search for events *by* Toronto Dating Hub keyword to find their ID.

        const searchRes = await axios.get(`${BASE_URL}/events/search/`, {
            headers: { Authorization: `Bearer ${TOKEN}` },
            params: {
                'q': 'Toronto Dating Hub',
                'location.address': 'Toronto',
                'expand': 'organizer'
            }
        });

        const events = searchRes.data.events;
        console.log(`Found ${events.length} events matching "Toronto Dating Hub"`);

        if (events.length > 0) {
            const orgs = new Set();
            events.forEach((e: any) => {
                if (e.organizer) {
                    orgs.add(`${e.organizer.name} (ID: ${e.organizer.id})`);
                }
            });

            console.log('Found Organizers:');
            orgs.forEach(o => console.log(o));
        }

        // 3. Search for "Dating" events in general to see quality
        console.log('\nScanning for general Dating events in Toronto...');
        const datingRes = await axios.get(`${BASE_URL}/events/search/`, {
            headers: { Authorization: `Bearer ${TOKEN}` },
            params: {
                'q': 'dating',
                'location.address': 'Toronto, ON',
                'sort_by': 'date',
                'location.within': '20km',
                'start_date.range_start': new Date().toISOString().split('.')[0] + 'Z' // UTC now
            }
        });

        console.log(`Found ${datingRes.data.pagination.object_count} total dating events.`);
        console.log(`First 3 events:`);
        datingRes.data.events.slice(0, 3).forEach((e: any) => {
            console.log(`- ${e.name.text} (${e.start.local})`);
        });

    } catch (e: any) {
        console.error('API Error:', e.response?.data || e.message);
    }
}

testApi();
