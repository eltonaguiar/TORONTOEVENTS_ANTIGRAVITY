import axios from 'axios';

async function main() {
    try {
        const url = 'https://allevents.in/toronto';
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        });
        console.log('Response received.');
        console.log('Status:', response.status);
        console.log('Preview:', response.data.substring(0, 2000));
    } catch (e: any) {
        console.error('Error:', e.message);
        if (e.response) {
            console.log('Response Status:', e.response.status);
        }
    }
}

main();
