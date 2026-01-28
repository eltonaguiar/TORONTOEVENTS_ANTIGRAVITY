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

        console.log('Current WorkDir:', await client.pwd());
        console.log('Listing root:');
        const list = await client.list();
        console.log(list.map(f => `${f.name} (${f.type})`).join('\n'));

    } catch (err) {
        console.error('FTP Error:', err);
    } finally {
        client.close();
    }
}

main();
