import * as ftp from 'basic-ftp';
import path from 'path';
import fs from 'fs';

const config = {
    host: 'ftps2.50webs.com',
    user: 'ejaguiar1',
    password: 'CxH1Uh*#0QkIVg@KxgMZXn7Hp',
    remotePath: '/findtorontoevents.ca',
};

async function main() {
    console.log('Starting deployment of FIXED_BLUR branch...');
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        await client.access({
            host: config.host,
            user: config.user,
            password: config.password,
            secure: true,
            secureOptions: { rejectUnauthorized: false }
        });

        console.log('Connected to SFTP server');

        // Ensure remote directory exists
        await client.ensureDir(config.remotePath);
        console.log(`Ensured directory exists: ${config.remotePath}`);

        // Upload the entire build directory
        const localDir = path.join(process.cwd(), 'build');
        console.log(`Uploading ${localDir} to ${config.remotePath}`);

        // Upload all files from build directory
        await client.uploadFromDir(localDir, config.remotePath);
        
        // Also copy index.html to index2.html on the server
        const indexHtmlPath = path.join(localDir, 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
            console.log('Uploading index.html as index2.html...');
            await client.uploadFrom(indexHtmlPath, path.join(config.remotePath, 'index2.html'));
        }

        console.log('✅ Deployment complete!');
        console.log(`Files uploaded to: ${config.remotePath}`);
        console.log('Main page available at: /findtorontoevents.ca/index.html');
        console.log('Backup page available at: /findtorontoevents.ca/index2.html');
    } catch (err) {
        console.error('❌ Deployment failed:', err);
        process.exit(1);
    } finally {
        client.close();
    }
}

main();
