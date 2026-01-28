import * as ftp from 'basic-ftp';

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
        const basePath = '/findtorontoevents.ca/TORONTOEVENTS_ANTIGRAVITY';
        await client.cd(basePath);

        console.log('Listing files in ' + basePath);
        const list = await client.list();

        // 1. Delete the nested mistake if it exists
        const nestedMistake = list.find(f => f.name === 'TORONTOEVENTS_ANTIGRAVITY' && f.isDirectory);
        if (nestedMistake) {
            console.log('Found nested mistake folder. Attempting to clear and remove it.');
            try {
                // In basic-ftp, to remove a non-empty dir we need to clear it first or recursive delete
                // Let's just try to go inside and delete everything
                await client.cd('TORONTOEVENTS_ANTIGRAVITY');
                const subList = await client.list();
                for (const file of subList) {
                    if (file.isDirectory) await client.removeDir(file.name);
                    else await client.remove(file.name);
                }
                await client.cd('..');
                await client.removeDir('TORONTOEVENTS_ANTIGRAVITY');
                console.log('Successfully removed nested mistake folder');
            } catch (e) {
                console.error('Failed to remove nested folder:', e.message);
            }
        }

        // 2. Try to delete the old index.html
        try {
            console.log('Attempting to delete old index.html...');
            await client.remove('index.html');
            console.log('Deleted old index.html');
        } catch (e) {
            console.log('Could not delete index.html directly:', e.message);
        }

    } catch (err) {
        console.error('FTP Error:', err);
    } finally {
        client.close();
    }
}

main();
