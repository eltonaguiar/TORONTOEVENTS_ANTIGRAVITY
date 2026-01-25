import axios from 'axios';

async function main() {
    const url = 'https://secure.toronto.ca/cc_sr_v1/data/edc_eventcal_APR?limit=5';
    console.log(`Fetching ${url}...`);
    try {
        const response = await axios.get(url);
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

main();
