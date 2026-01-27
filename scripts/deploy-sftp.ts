import * as ftp from 'basic-ftp';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const config = {
    host: process.env.FTP_SERVER,
    user: process.env.FTP_USERNAME,
    password: process.env.FTP_PASSWORD,
    remotePath: process.env.FTP_PATH1_EVENTS, // Target for Events Site
};

async function main() {
    console.log('Starting deployment...');
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

        console.log('Connected');

        // Ensure remote directory exists
        await client.ensureDir(config.remotePath);

        // Upload the entire build directory content to the remote path
        const localDir = path.join(process.cwd(), 'build');
        console.log(`Uploading ${localDir} to ${config.remotePath}`);

        await client.uploadFromDir(localDir, config.remotePath);
        console.log('Upload complete');
    } catch (err) {
        console.log(err);
    }
    client.close();
}

main();
