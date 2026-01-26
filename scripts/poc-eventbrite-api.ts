
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;

// Hardcoded known Organization IDs for Toronto Dating
const ORG_IDS = [
    '31627918491', // Toronto Dating Hub (Old?)
    '60980456183', // Toronto Dating Hub (Newer?)
    '11281652610', // MyCheekyDate
];

async function testApi() {
    console.log('Testing Eventbrite API with Organization List...');

    if (!TOKEN) {
        console.error('No private token found');
        return;
    }

    // Try to find correct Organization ID for "Toronto Dating Hub" via search "hack"
    // Since we can't search organizations directly, we will try to list events for these IDs
    // and see if any work.

    for (const orgId of ORG_IDS) {
        try {
            console.log(`\nChecking Org ID: ${orgId}`);
            const url = `https://www.eventbriteapi.com/v3/organizations/${orgId}/events/`;
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${TOKEN}` },
                params: {
                    status: 'live',
                    page_size: 3 // Small POC
                }
            });

            console.log(`Success! Found ${res.data.events.length} events.`);
            res.data.events.forEach((e: any) => {
                console.log(`- [${e.start.local}] ${e.name.text}`);
            });

        } catch (e: any) {
            console.log(`Failed for ${orgId}: ${e.response?.status} - ${e.response?.data?.error_description || e.message}`);
        }
    }
}

testApi();
