import * as ftp from 'basic-ftp';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const config = {
    host: process.env.FTP_HOST || 'ftps2.50webs.com',
    user: process.env.FTP_USER || 'ejaguiar1',
    password: process.env.FTP_PASS || 'CxH1Uh*#0QkIVg@KxgMZXn7Hp',
    remotePath: process.env.FTP_REMOTE_PATH || '/findtorontoevents.ca',
};

async function uploadFile(client: ftp.Client, localPath: string, remotePath: string) {
    try {
        // Check if file exists before attempting upload
        if (!fs.existsSync(localPath)) {
            console.log(`⚠️  File not found, skipping: ${path.basename(localPath)}`);
            return;
        }
        console.log(`Uploading ${path.basename(localPath)}...`);
        await client.uploadFrom(localPath, remotePath);
        console.log(`✅ Uploaded: ${remotePath}`);
    } catch (err) {
        console.error(`❌ Failed to upload ${localPath}:`, err);
        // Don't throw for missing files - just log and continue
        if (err instanceof Error && err.message.includes('No such file')) {
            console.log(`⚠️  File missing, continuing deployment...`);
            return;
        }
        throw err;
    }
}

async function main() {
    console.log('Starting deployment of 2nd row event overlay fixes...');

    // Ensure root (sftp) build exists before uploading findstocks / _next to root.
    // Without this, build/ might be from a prior "npm run build" (basePath) and findstocks would 404 on assets.
    const buildPath = path.join(process.cwd(), 'build');
    const findstocksIndexPath = path.join(buildPath, 'findstocks', 'index.html');
    const hasSftpFindstocks = fs.existsSync(findstocksIndexPath) && !fs.readFileSync(findstocksIndexPath, 'utf-8').includes('TORONTOEVENTS_ANTIGRAVITY');
    if (!hasSftpFindstocks) {
        console.log('📦 Running SFTP build first (root assets, no basePath)...');
        execSync('npm run build:sftp', { stdio: 'inherit', cwd: process.cwd() });
    }

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
            '404.html',
            'index2.html', // FTP test page
            'verify-mental-health.html' // Verification page
        ];

        for (const file of criticalFiles) {
            // Check buildDir first, then public folder
            const buildFile = path.join(buildDir, file);
            const publicFile = path.join(process.cwd(), 'public', file);
            const localFile = fs.existsSync(buildFile) ? buildFile : (fs.existsSync(publicFile) ? publicFile : null);
            if (localFile) {
                await uploadFile(client, localFile, file);
            } else {
                console.log(`⚠️  ${file} not found in build or public folder, skipping...`);
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

        // Upload findstocks page (to both /findstocks and /STOCKS)
        // Clean-upload: remove remote dirs first so no stale files; deploy:sftp runs stocks:generate first so build has picks
        const findstocksDir = path.join(buildDir, 'findstocks');
        if (fs.existsSync(findstocksDir)) {
            await client.cd(config.remotePath);
            try { await client.removeDir('findstocks'); } catch (_) { /* ignore if missing */ }
            try { await client.removeDir('STOCKS'); } catch (_) { /* ignore if missing */ }
            console.log('📦 Uploading Find Stocks page (with embedded picks)...');
            await client.uploadFromDir(findstocksDir, 'findstocks');
            console.log('✅ Find Stocks page uploaded to /findstocks');
            console.log('📦 Uploading Find Stocks page to /STOCKS...');
            await client.uploadFromDir(findstocksDir, 'STOCKS');
            console.log('✅ Find Stocks page uploaded to /STOCKS');
        }

        // Upload daily-stocks.json data file (if it exists)
        // Prefer build/data (from static export) so it matches findstocks page; else public/data or data/
        const dailyStocksBuild = path.join(buildDir, 'data', 'daily-stocks.json');
        const dailyStocksPublic = path.join(process.cwd(), 'public', 'data', 'daily-stocks.json');
        const dailyStocksData = path.join(process.cwd(), 'data', 'daily-stocks.json');
        const dailyStocksFile = fs.existsSync(dailyStocksBuild) ? dailyStocksBuild :
                               (fs.existsSync(dailyStocksPublic) ? dailyStocksPublic : 
                                (fs.existsSync(dailyStocksData) ? dailyStocksData : null));
        
        if (dailyStocksFile) {
            try {
                await client.cd(config.remotePath);
                await client.ensureDir('data');
                await uploadFile(client, dailyStocksFile, 'data/daily-stocks.json');
                console.log('✅ Daily stocks data uploaded');
            } catch (err) {
                console.log('⚠️  Could not upload daily-stocks.json, but continuing...');
            }
        } else {
            console.log('⚠️  daily-stocks.json not found, skipping...');
        }

        // Upload mentalhealthresources page (remote as MENTALHEALTHRESOURCES to match FTP/live URL)
        const mentalHealthDir = path.join(buildDir, 'mentalhealthresources');
        if (fs.existsSync(mentalHealthDir)) {
            console.log('📦 Uploading Mental Health Resources page...');
            await client.uploadFromDir(mentalHealthDir, 'MENTALHEALTHRESOURCES');
            console.log('✅ Mental Health Resources page uploaded');
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

        // Build and upload MovieShows app (Movies / TV / Now Playing Toronto finder)
        const movieshowsDir = path.join(process.cwd(), 'movieshows');
        const movieshowsOutDir = path.join(movieshowsDir, 'out');
        if (fs.existsSync(movieshowsDir)) {
            try {
                console.log('📦 Building MovieShows (static export)...');
                execSync('npm run build', { stdio: 'inherit', cwd: movieshowsDir });
                if (fs.existsSync(movieshowsOutDir)) {
                    await client.cd(config.remotePath);
                    try { await client.removeDir('MOVIESHOWS'); } catch (_) { /* ignore if missing */ }
                    await client.ensureDir('MOVIESHOWS');
                    await client.cd('MOVIESHOWS');
                    console.log('📦 Uploading MovieShows to /MOVIESHOWS...');
                    await client.uploadFromDir(movieshowsOutDir);
                    console.log('✅ MovieShows uploaded to /MOVIESHOWS');
                } else {
                    console.log('⚠️  movieshows/out not found after build, skipping MovieShows upload');
                }
            } catch (buildErr) {
                console.warn('⚠️  MovieShows build or upload failed:', buildErr);
            }
            // Upload redirect .htaccess so MOVIES, SHOWS, TV, TVFINDER → MOVIESHOWS
            const redirectsDir = path.join(process.cwd(), 'movieshows-redirects');
            const redirectFolders = ['MOVIES', 'SHOWS', 'TV', 'TVFINDER'];
            if (fs.existsSync(redirectsDir)) {
                await client.cd(config.remotePath);
                for (const folder of redirectFolders) {
                    const htaccessPath = path.join(redirectsDir, folder, '.htaccess');
                    if (fs.existsSync(htaccessPath)) {
                        await client.ensureDir(folder);
                        await uploadFile(client, htaccessPath, `${folder}/.htaccess`);
                        console.log(`✅ Redirect ${folder} → MOVIESHOWS`);
                    }
                }
            }
        }

        // Build a version with basePath for the subdirectory
        console.log('\n📦 Building version with basePath for TORONTOEVENTS_ANTIGRAVITY...');
        try {
            execSync('npx cross-env DEPLOY_TARGET=github npm run build', {
                stdio: 'inherit',
                cwd: process.cwd()
            });
            console.log('✅ Built version with basePath');
        } catch (buildErr) {
            console.warn('⚠️ Failed to build basePath version, deploying root version to subdirectory instead');
        }

        const githubBuildDir = path.join(process.cwd(), 'build');
        await client.cd(config.remotePath);
        await client.ensureDir('TORONTOEVENTS_ANTIGRAVITY');

        // Check for and clean recursive directory if it accidentally exists
        try {
            await client.cd('TORONTOEVENTS_ANTIGRAVITY');
            const list = await client.list();
            if (list.find(f => f.name === 'TORONTOEVENTS_ANTIGRAVITY' && f.isDirectory)) {
                console.log('🧹 Cleaning up recursive TORONTOEVENTS_ANTIGRAVITY folder...');
                await client.removeDir('TORONTOEVENTS_ANTIGRAVITY');
            }
            await client.cd('..');
        } catch (e) { /* ignore */ }

        // Upload index.html to basePath (use full path, don't cd into directory)
        const githubIndexHtml = path.join(githubBuildDir, 'index.html');
        if (fs.existsSync(githubIndexHtml)) {
            await uploadFile(client, githubIndexHtml, 'TORONTOEVENTS_ANTIGRAVITY/index.html');
            console.log('✅ Uploaded index.html to TORONTOEVENTS_ANTIGRAVITY/');
        } else if (fs.existsSync(indexHtml)) {
            // Fallback to sftp build if github build failed
            await uploadFile(client, indexHtml, 'TORONTOEVENTS_ANTIGRAVITY/index.html');
            console.log('✅ Uploaded index.html to TORONTOEVENTS_ANTIGRAVITY/ (using root build)');
        }

        // Upload _next to basePath (use full path)
        const githubNextDir = path.join(githubBuildDir, '_next');
        if (fs.existsSync(githubNextDir)) {
            console.log('📦 Uploading _next to TORONTOEVENTS_ANTIGRAVITY...');
            await client.uploadFromDir(githubNextDir, 'TORONTOEVENTS_ANTIGRAVITY/_next');
            console.log('✅ _next directory uploaded to TORONTOEVENTS_ANTIGRAVITY/');
        } else if (fs.existsSync(nextDir)) {
            await client.uploadFromDir(nextDir, 'TORONTOEVENTS_ANTIGRAVITY/_next');
            console.log('✅ _next directory uploaded to TORONTOEVENTS_ANTIGRAVITY/ (using root build)');
        }

        // Upload 2xko to basePath (use full path)
        const githubTwoXkoDir = path.join(githubBuildDir, '2xko');
        if (fs.existsSync(githubTwoXkoDir)) {
            console.log('📦 Uploading 2XKO page to TORONTOEVENTS_ANTIGRAVITY...');
            await client.uploadFromDir(githubTwoXkoDir, 'TORONTOEVENTS_ANTIGRAVITY/2xko');
            console.log('✅ 2XKO page uploaded to TORONTOEVENTS_ANTIGRAVITY/');
        } else if (fs.existsSync(twoXkoDir)) {
            await client.uploadFromDir(twoXkoDir, 'TORONTOEVENTS_ANTIGRAVITY/2xko');
            console.log('✅ 2XKO page uploaded to TORONTOEVENTS_ANTIGRAVITY/ (using root build)');
        }

        // Upload findstocks to basePath (both /findstocks and /STOCKS) - use full paths
        const githubFindstocksDir = path.join(githubBuildDir, 'findstocks');
        if (fs.existsSync(githubFindstocksDir)) {
            console.log('📦 Uploading Find Stocks page to TORONTOEVENTS_ANTIGRAVITY...');
            await client.uploadFromDir(githubFindstocksDir, 'TORONTOEVENTS_ANTIGRAVITY/findstocks');
            console.log('✅ Find Stocks page uploaded to TORONTOEVENTS_ANTIGRAVITY/findstocks');

            // Also upload to TORONTOEVENTS_ANTIGRAVITY/STOCKS
            await client.uploadFromDir(githubFindstocksDir, 'TORONTOEVENTS_ANTIGRAVITY/STOCKS');
            console.log('✅ Find Stocks page uploaded to TORONTOEVENTS_ANTIGRAVITY/STOCKS');
        } else if (fs.existsSync(findstocksDir)) {
            await client.uploadFromDir(findstocksDir, 'TORONTOEVENTS_ANTIGRAVITY/findstocks');
            console.log('✅ Find Stocks page uploaded to TORONTOEVENTS_ANTIGRAVITY/findstocks (using root build)');

            // Also upload to TORONTOEVENTS_ANTIGRAVITY/STOCKS
            await client.uploadFromDir(findstocksDir, 'TORONTOEVENTS_ANTIGRAVITY/STOCKS');
            console.log('✅ Find Stocks page uploaded to TORONTOEVENTS_ANTIGRAVITY/STOCKS (using root build)');
        }

        // Upload daily-stocks.json to basePath (if it exists) - reuse variables from above
        if (dailyStocksFile) {
            try {
                await client.ensureDir('TORONTOEVENTS_ANTIGRAVITY/data');
                await uploadFile(client, dailyStocksFile, 'TORONTOEVENTS_ANTIGRAVITY/data/daily-stocks.json');
                console.log('✅ Daily stocks data uploaded to TORONTOEVENTS_ANTIGRAVITY/data/');
            } catch (err) {
                console.log('⚠️  Could not upload daily-stocks.json to basePath, but continuing...');
            }
        } else {
            console.log('⚠️  daily-stocks.json not found for basePath, skipping...');
        }

        // Upload mentalhealthresources to basePath (use full path)
        const githubMentalHealthDir = path.join(githubBuildDir, 'mentalhealthresources');
        if (fs.existsSync(githubMentalHealthDir)) {
            console.log('📦 Uploading Mental Health Resources to TORONTOEVENTS_ANTIGRAVITY...');
            await client.uploadFromDir(githubMentalHealthDir, 'TORONTOEVENTS_ANTIGRAVITY/MENTALHEALTHRESOURCES');
            console.log('✅ Mental Health Resources uploaded to TORONTOEVENTS_ANTIGRAVITY/');
        } else if (fs.existsSync(mentalHealthDir)) {
            await client.uploadFromDir(mentalHealthDir, 'TORONTOEVENTS_ANTIGRAVITY/MENTALHEALTHRESOURCES');
            console.log('✅ Mental Health Resources uploaded to TORONTOEVENTS_ANTIGRAVITY/ (using root build)');
        }

        // Upload critical files to basePath (use full paths)
        for (const file of criticalFiles) {
            const githubFile = path.join(githubBuildDir, file);
            const publicFile = path.join(process.cwd(), 'public', file);
            const buildFile = path.join(buildDir, file);
            const fileToUpload = fs.existsSync(githubFile) ? githubFile : (fs.existsSync(publicFile) ? publicFile : (fs.existsSync(buildFile) ? buildFile : null));
            if (fileToUpload) {
                try {
                    await uploadFile(client, fileToUpload, `TORONTOEVENTS_ANTIGRAVITY/${file}`);
                } catch (err) {
                    console.log(`⚠️ Failed to upload ${file} to basePath, continuing...`);
                }
            }
        }

        console.log('\n🎉 Deployment complete!');
        console.log(`📍 Main page: ${config.remotePath}/index3.html`);
        console.log(`📍 WINDOWSFIXER page: ${config.remotePath}/WINDOWSFIXER/index.html`);
        console.log(`📍 Mental Health Resources: ${config.remotePath}/MENTALHEALTHRESOURCES/index.html`);
        console.log(`📍 Find Stocks: ${config.remotePath}/findstocks/index.html`);
        console.log(`📍 Find Stocks (STOCKS): ${config.remotePath}/STOCKS/index.html`);
        console.log(`📍 MovieShows (Movies/TV/Now Playing): ${config.remotePath}/MOVIESHOWS/index.html`);
    } catch (err) {
        console.error('❌ Deployment failed:', err);
        process.exit(1);
    } finally {
        client.close();
    }
}

main();
