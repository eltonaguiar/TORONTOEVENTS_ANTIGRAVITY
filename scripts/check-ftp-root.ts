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
        await client.cd('/findtorontoevents.ca');
        console.log('Downloading root index.html');
        await client.downloadTo('root_remote_index.html', 'index.html');
        console.log('Downloaded root_remote_index.html');

    } catch (err) {
        console.error('FTP Error:', err);
    } finally {
        client.close();
    }
}

main();
