import * as ftp from 'basic-ftp';
import fs from 'fs';

async function main() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: 'ftps2.50webs.com',
            user: 'ejaguiar1',
            password: 'CxH1Uh*#0QkIVg@KxgMZXn7Hp',
            secure: true,
            secureOptions: { rejectUnauthorized: false }
        });

        console.log('Connected to FTP');
        await client.cd('/findtorontoevents.ca/TORONTOEVENTS_ANTIGRAVITY');
        console.log('Downloading index.html from TORONTOEVENTS_ANTIGRAVITY/');
        await client.downloadTo('remote_index.html', 'index.html');
        console.log('Downloaded remote_index.html');

        console.log('Listing files in TORONTOEVENTS_ANTIGRAVITY/');
        const files = await client.list();
        console.log(files.map(f => `${f.name} (${f.size})`).join('\n'));

    } catch (err) {
        console.error('FTP Error:', err);
    } finally {
        client.close();
    }
}

main();
