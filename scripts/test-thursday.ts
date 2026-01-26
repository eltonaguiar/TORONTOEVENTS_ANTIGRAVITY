import axios from 'axios';

async function test() {
    try {
        const response = await axios.get('https://events.getthursday.com/event/thursday-mademoiselle-2-events-in-1-toronto-7/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log(response.data);
    } catch (e) {
        console.error(e);
    }
}

test();
