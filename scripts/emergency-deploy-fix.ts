import * as ftp from 'basic-ftp';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const config = {
    host: 'ftps2.50webs.com',
    user: 'ejaguiar1',
    password: 'CxH1Uh*#0QkIVg@KxgMZXn7Hp',
    remotePath: '/findtorontoevents.ca',
};

async function main() {
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

        console.log('✅ Connected to SFTP server');

        // 1. CLEAN UP NESTED MISTAKE
        const subPath = '/findtorontoevents.ca/TORONTOEVENTS_ANTIGRAVITY';
        await client.cd(subPath);
        const list = await client.list();
        if (list.find(f => f.name === 'TORONTOEVENTS_ANTIGRAVITY' && f.isDirectory)) {
            console.log('🧹 Removing nested duplicate folder...');
            // We need to enter and delete contents first because removeDir might fail if not empty
            await client.cd('TORONTOEVENTS_ANTIGRAVITY');
            const nestedList = await client.list();
            for (const item of nestedList) {
                if (item.isDirectory) await client.removeDir(item.name);
                else await client.remove(item.name);
            }
            await client.cd('..');
            await client.removeDir('TORONTOEVENTS_ANTIGRAVITY');
            console.log('✅ Removed nested duplicate folder');
        }

        // 2. BUILD SFTP VERSION (Root)
        console.log('📦 Building root version...');
        execSync('npm run build', { stdio: 'inherit' });
        const buildDir = path.join(process.cwd(), 'build');

        // 3. DEPLOY TO ROOT
        await client.cd(config.remotePath);
        console.log('🚀 Deploying to root...');
        await client.uploadFrom(path.join(buildDir, 'index.html'), 'index.html');
        // Upload other critical root files
        await client.uploadFromDir(path.join(buildDir, '_next'), '_next');

        // 4. BUILD GITHUB VERSION (Subdirectory)
        console.log('\n📦 Building subdirectory version (basePath)...');
        execSync('npx cross-env DEPLOY_TARGET=github npm run build', { stdio: 'inherit' });
        const githubBuildDir = path.join(process.cwd(), 'build');

        // 5. DEPLOY TO SUBDIRECTORY
        console.log('🚀 Deploying to /TORONTOEVENTS_ANTIGRAVITY...');
        await client.cd(subPath);
        // Explicitly upload into the CURRENT directory (which is subPath)
        await client.uploadFrom(path.join(githubBuildDir, 'index.html'), 'index.html');
        await client.uploadFromDir(path.join(githubBuildDir, '_next'), '_next');

        // Also upload Mental Health Resources and other pages to both
        const mhrDir = path.join(githubBuildDir, 'mentalhealthresources');
        if (fs.existsSync(mhrDir)) {
            await client.uploadFromDir(mhrDir, 'MENTALHEALTHRESOURCES');
            console.log('✅ Mental Health Resources uploaded to subdirectory');
        }

        console.log('\n🌟 SUCCESS! Subdirectory index.html should now be updated.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        client.close();
    }
}

main();
