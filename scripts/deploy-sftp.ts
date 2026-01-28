import * as ftp from 'basic-ftp';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const config = {
    host: process.env.FTP_SERVER,
    user: process.env.FTP_USERNAME,
    password: process.env.FTP_PASSWORD,
    remotePath: process.env.FTP_PATH1_EVENTS || '/findtorontoevents.ca',
};

async function uploadFile(client: ftp.Client, localPath: string, remotePath: string) {
    if (!fs.existsSync(localPath)) return;
    await client.uploadFrom(localPath, remotePath);
    console.log(`  Uploaded ${remotePath}`);
}

async function main() {
    console.log('Starting deployment...');
    const client = new ftp.Client();

    try {
        await client.access({
            host: config.host,
            user: config.user,
            password: config.password,
            secure: true,
            secureOptions: { rejectUnauthorized: false }
        });

        console.log('Connected');

        const base = config.remotePath!.replace(/\/$/, '');

        // Ensure remote directory exists and upload main build
        await client.ensureDir(base);
        const localDir = path.join(process.cwd(), 'build');
        if (fs.existsSync(localDir)) {
            console.log(`Uploading build/ to ${base}`);
            await client.uploadFromDir(localDir, base);
            console.log('Main build upload complete');
        }

        // Build and upload MovieShows (findtorontoevents.ca/MOVIESHOWS)
        const movieshowsDir = path.join(process.cwd(), 'movieshows');
        const movieshowsOutDir = path.join(movieshowsDir, 'out');
        if (fs.existsSync(movieshowsDir)) {
            if (!fs.existsSync(movieshowsOutDir)) {
                console.log('Building MovieShows...');
                execSync('npm run build', { stdio: 'inherit', cwd: movieshowsDir });
            }
            if (fs.existsSync(movieshowsOutDir)) {
                const movieshowsRemote = `${base}/MOVIESHOWS`;
                await client.ensureDir(movieshowsRemote);
                console.log('Uploading MovieShows to MOVIESHOWS/');
                await client.uploadFromDir(movieshowsOutDir, movieshowsRemote);
                console.log('MovieShows upload complete');
            }
            // Redirects: MOVIES, SHOWS, TV, TVFINDER -> MOVIESHOWS
            const redirectsDir = path.join(process.cwd(), 'movieshows-redirects');
            const redirectFolders = ['MOVIES', 'SHOWS', 'TV', 'TVFINDER'];
            if (fs.existsSync(redirectsDir)) {
                for (const folder of redirectFolders) {
                    const htaccessPath = path.join(redirectsDir, folder, '.htaccess');
                    if (fs.existsSync(htaccessPath)) {
                        await client.ensureDir(`${base}/${folder}`);
                        await uploadFile(client, htaccessPath, `${base}/${folder}/.htaccess`);
                    }
                }
                console.log('Redirects (MOVIES, SHOWS, TV, TVFINDER -> MOVIESHOWS) uploaded');
            }
        }

        console.log('Deployment complete');
        console.log(`  MOVIESHOWS: ${base}/MOVIESHOWS/`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        client.close();
    }
}

main();
