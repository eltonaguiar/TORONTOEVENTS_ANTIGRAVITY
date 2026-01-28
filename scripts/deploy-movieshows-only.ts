/**
 * Upload only MovieShows app to FTP (findtorontoevents.ca/MOVIESHOWS).
 * Run from repo root. Requires movieshows/out to exist (run: cd movieshows && npm run build).
 */
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
    if (!fs.existsSync(localPath)) return;
    await client.uploadFrom(localPath, remotePath);
    console.log('  Uploaded:', remotePath);
}

async function main() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: config.host,
            user: config.user,
            password: config.password,
            secure: true,
            secureOptions: { rejectUnauthorized: false }
        });
        console.log('Connected to FTP');

        const base = config.remotePath.replace(/\/$/, '');
        const movieshowsOut = path.join(process.cwd(), 'movieshows', 'out');
        if (!fs.existsSync(movieshowsOut)) {
            console.error('movieshows/out not found. Run: cd movieshows && npm run build');
            process.exit(1);
        }

        const remoteMOVIESHOWS = `${base}/MOVIESHOWS`;
        await client.ensureDir(remoteMOVIESHOWS);
        console.log('Uploading MovieShows to', remoteMOVIESHOWS, '...');
        await client.uploadFromDir(movieshowsOut, remoteMOVIESHOWS);
        console.log('MovieShows upload complete.');

        const redirectsDir = path.join(process.cwd(), 'movieshows-redirects');
        const folders = ['MOVIES', 'SHOWS', 'TV', 'TVFINDER'];
        if (fs.existsSync(redirectsDir)) {
            for (const folder of folders) {
                const htaccess = path.join(redirectsDir, folder, '.htaccess');
                if (fs.existsSync(htaccess)) {
                    await client.ensureDir(`${base}/${folder}`);
                    await uploadFile(client, htaccess, `${base}/${folder}/.htaccess`);
                }
            }
            console.log('Redirects uploaded.');
        }

        console.log('Done. https://findtorontoevents.ca/MOVIESHOWS/');
    } catch (err) {
        console.error('Deploy failed:', err);
        process.exit(1);
    } finally {
        client.close();
    }
}

main();
