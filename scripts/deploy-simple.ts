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
        // Upload index.html as both index.html (primary) and index3.html (legacy/test)
        const indexHtml = path.join(buildDir, 'index.html');
        if (fs.existsSync(indexHtml)) {
            console.log('🚀 Deploying main application index...');
            await uploadFile(client, indexHtml, 'index.html');
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

        // Upload events.json and metadata.json (Source of truth is data/ folder)
        // CRITICAL: Upload to BOTH root AND basePath to ensure it's accessible from any URL
        const dataFiles = ['events.json', 'metadata.json'];
        const dataDir = path.join(process.cwd(), 'data');
        
        // CRITICAL FIX: Create basePath directory first if it doesn't exist
        try {
            await client.ensureDir('TORONTOEVENTS_ANTIGRAVITY');
            console.log('✅ Created/verified TORONTOEVENTS_ANTIGRAVITY directory');
        } catch (dirErr) {
            console.warn(`⚠️  Could not create basePath directory: ${dirErr}`);
        }
        
        for (const file of dataFiles) {
            const localFile = path.join(dataDir, file);
            if (fs.existsSync(localFile)) {
                // Upload to root (primary location)
                await uploadFile(client, localFile, file);
                console.log(`✅ Uploaded ${file} to remote root`);
                
                // CRITICAL FIX: Also upload to basePath to prevent 404 errors
                // Some users might access the site via /TORONTOEVENTS_ANTIGRAVITY/ path
                try {
                    // Ensure we're in the right directory
                    await client.cd(config.remotePath);
                    await client.ensureDir('TORONTOEVENTS_ANTIGRAVITY');
                    const basePathFile = `TORONTOEVENTS_ANTIGRAVITY/${file}`;
                    await uploadFile(client, localFile, basePathFile);
                    console.log(`✅ Uploaded ${file} to TORONTOEVENTS_ANTIGRAVITY/ (basePath)`);
                } catch (basePathErr: any) {
                    console.warn(`⚠️  Could not upload ${file} to basePath: ${basePathErr.message}`);
                    console.warn(`   Root upload succeeded, so site will still work from root path`);
                }
            }
        }

        // Upload any other static assets from public folder that might be missing
        const publicDir = path.join(process.cwd(), 'public');
        if (fs.existsSync(publicDir)) {
            try {
                console.log('📦 Syncing public assets...');
                await client.uploadFromDir(publicDir); // Upload to remote root
                console.log('✅ Public assets synced');
            } catch (err) {
                console.log('⚠️ Public assets sync failed, uploading critical files individually...');
                // Upload critical files individually
                const criticalPublicFiles = ['2xkoframedata.html'];
                for (const file of criticalPublicFiles) {
                    const localFile = path.join(publicDir, file);
                    if (fs.existsSync(localFile)) {
                        try {
                            await uploadFile(client, localFile, file);
                        } catch (uploadErr) {
                            console.log(`⚠️ Failed to upload ${file}, but continuing...`);
                        }
                    }
                }
                // Reconnect if connection was lost
                try {
                    await client.access({
                        host: config.host,
                        user: config.user,
                        password: config.password,
                        secure: true,
                        secureOptions: { rejectUnauthorized: false }
                    });
                    await client.cd(config.remotePath);
                } catch (reconnectErr) {
                    console.log('⚠️ Could not reconnect, but critical files are already uploaded');
                }
            }
        }

        // Upload _next directory recursively
        const nextDir = path.join(buildDir, '_next');
        if (fs.existsSync(nextDir)) {
            console.log('📦 Uploading application build chunks (_next)...');
            await client.uploadFromDir(nextDir, '_next');
            console.log('✅ _next directory uploaded');
        }

        // Upload 2xko page
        const twoXkoDir = path.join(buildDir, '2xko');
        if (fs.existsSync(twoXkoDir)) {
            console.log('📦 Uploading 2XKO page...');
            await client.uploadFromDir(twoXkoDir, '2xko');
            console.log('✅ 2XKO page uploaded');
        }

        // Upload error pages
        const notFoundDir = path.join(buildDir, '_not-found');
        if (fs.existsSync(notFoundDir)) {
            await client.uploadFromDir(notFoundDir, '_not-found');
        }

        const dir404 = path.join(buildDir, '404');
        if (fs.existsSync(dir404)) {
            await client.uploadFromDir(dir404, '404');
        }

        // Upload WINDOWSFIXER page with VirusTotal badges
        const windowFixerDir = path.join(process.cwd(), 'WINDOWSFIXER');
        if (fs.existsSync(windowFixerDir)) {
            console.log('📦 Uploading WINDOWSFIXER page with VirusTotal badges...');
            await client.uploadFromDir(windowFixerDir, 'WINDOWSFIXER');
            console.log('✅ WINDOWSFIXER page uploaded');
        }

        console.log('\n🎉 Deployment complete!');
        console.log(`📍 Main page: ${config.remotePath}/index3.html`);
        console.log(`📍 WINDOWSFIXER page: ${config.remotePath}/WINDOWSFIXER/index.html`);
    } catch (err) {
        console.error('❌ Deployment failed:', err);
        process.exit(1);
    } finally {
        client.close();
    }
}

main();
