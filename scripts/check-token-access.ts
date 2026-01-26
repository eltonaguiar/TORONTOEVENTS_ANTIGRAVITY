
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;

async function checkAccess() {
    try {
        console.log('Checking Token Access...');
        const me = await axios.get('https://www.eventbriteapi.com/v3/users/me/', {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        console.log(`User: ${me.data.name} (${me.data.emails[0].email})`);

        const orgs = await axios.get(`https://www.eventbriteapi.com/v3/users/${me.data.id}/organizations/`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        console.log(`\nLinked Organizations: ${orgs.data.organizations.length}`);
        orgs.data.organizations.forEach((o: any) => {
            console.log(`- ${o.name} (ID: ${o.id})`);
        });

        if (orgs.data.organizations.length === 0) {
            console.log('\nResult: This token has NO connected organizations. It cannot be used to pull generic events via the "Organization" endpoint.');
        }

    } catch (e: any) {
        console.error(e.response?.data || e.message);
    }
}

checkAccess();
