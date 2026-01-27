import * as ftp from 'basic-ftp';
import * as path from 'path';
import * as fs from 'fs';

const config = {
    host: 'ftps2.50webs.com',
    user: 'ejaguiar1',
    password: 'CxH1Uh*#0QkIVg@KxgMZXn7Hp',
    remotePath: '/findtorontoevents.ca',
};

async function uploadFile(client: ftp.Client, localPath: string, remotePath: string) {
    try {
        console.log(`Uploading ${path.basename(localPath)}...`);
        await client.uploadFrom(localPath, remotePath);
        console.log(`✅ Uploaded: ${remotePath}`);
    } catch (err) {
        console.error(`❌ Failed to upload ${localPath}:`, err);
        throw err;
    }
}

async function main() {
    console.log('Uploading 2xkoframedata.html...');
    const client = new ftp.Client();

    try {
        await client.access({
            host: config.host,
            user: config.user,
            password: config.password,
            secure: true,
            secureOptions: { rejectUnauthorized: false }
        });

        console.log('✅ Connected to SFTP server');
        await client.ensureDir(config.remotePath);
        await client.cd(config.remotePath);
        console.log(`📁 Working in: ${config.remotePath}`);

        const htmlFile = path.join(process.cwd(), 'public', '2xkoframedata.html');
        if (fs.existsSync(htmlFile)) {
            await uploadFile(client, htmlFile, '2xkoframedata.html');
            console.log('🎉 Upload complete!');
        } else {
            console.error('❌ File not found:', htmlFile);
        }
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        client.close();
    }
}

main().catch(console.error);
