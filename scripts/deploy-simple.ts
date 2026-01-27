import * as ftp from 'basic-ftp';
import path from 'path';
import fs from 'fs';

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
    console.log('Starting deployment of 2nd row event overlay fixes...');
    const client = new ftp.Client();
    // client.ftp.verbose = true;

    try {
        await client.access({
            host: config.host,
            user: config.user,
            password: config.password,
            secure: true,
            secureOptions: { rejectUnauthorized: false }
        });

        console.log('✅ Connected to SFTP server');

        // Navigate to remote directory
        await client.ensureDir(config.remotePath);
        await client.cd(config.remotePath);
        console.log(`📁 Working in: ${config.remotePath}`);

        const buildDir = path.join(process.cwd(), 'build');
        
        // Upload index.html as index3.html (main target)
        const indexHtml = path.join(buildDir, 'index.html');
        if (fs.existsSync(indexHtml)) {
            await uploadFile(client, indexHtml, 'index3.html');
        }

        // Upload other critical files
        const criticalFiles = [
            'favicon.ico',
            'ads.txt',
            '404.html'
        ];

        for (const file of criticalFiles) {
            const localFile = path.join(buildDir, file);
            if (fs.existsSync(localFile)) {
                await uploadFile(client, localFile, file);
            }
        }

        // Upload _next directory recursively
        const nextDir = path.join(buildDir, '_next');
        if (fs.existsSync(nextDir)) {
            console.log('📦 Uploading _next directory...');
            await client.uploadFromDir(nextDir, '_next');
            console.log('✅ _next directory uploaded');
        }

        // Upload _not-found directory
        const notFoundDir = path.join(buildDir, '_not-found');
        if (fs.existsSync(notFoundDir)) {
            console.log('📦 Uploading _not-found directory...');
            await client.uploadFromDir(notFoundDir, '_not-found');
            console.log('✅ _not-found directory uploaded');
        }

        // Upload 404 directory
        const dir404 = path.join(buildDir, '404');
        if (fs.existsSync(dir404)) {
            console.log('📦 Uploading 404 directory...');
            await client.uploadFromDir(dir404, '404');
            console.log('✅ 404 directory uploaded');
        }

        console.log('\n🎉 Deployment complete!');
        console.log(`📍 Main page: ${config.remotePath}/index3.html`);
    } catch (err) {
        console.error('❌ Deployment failed:', err);
        process.exit(1);
    } finally {
        client.close();
    }
}

main();
