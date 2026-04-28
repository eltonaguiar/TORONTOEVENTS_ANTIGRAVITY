// Emergency: re-upload build/_next + build/index.html to FTP root.
// Triggered when deploy-simple.ts left the production root referencing
// SFTP-build chunks that never landed (deploy script overwrote build/
// with the basePath build before phase 1 completed cleanly).
//
// Reads creds from env: FTP_HOST, FTP_USER, FTP_PASS, FTP_REMOTE_PATH
import * as ftp from 'basic-ftp';
import path from 'path';
import fs from 'fs';

const config = {
  host: process.env.FTP_HOST || 'ftps2.50webs.com',
  user: process.env.FTP_USER,
  password: process.env.FTP_PASS,
  remotePath: process.env.FTP_REMOTE_PATH || '/findtorontoevents.ca',
};
if (!config.user || !config.password) {
  console.error('FATAL: FTP_USER and FTP_PASS env vars are required');
  process.exit(2);
}

const buildDir = path.join(process.cwd(), 'build');
const indexHtml = path.join(buildDir, 'index.html');
const nextDir = path.join(buildDir, '_next');
if (!fs.existsSync(indexHtml)) { console.error('Missing', indexHtml); process.exit(2); }
if (!fs.existsSync(nextDir)) { console.error('Missing', nextDir); process.exit(2); }
const grepBasePath = fs.readFileSync(indexHtml, 'utf8').includes('/TORONTOEVENTS_ANTIGRAVITY/');
if (grepBasePath) {
  console.error('REFUSING: build/index.html contains /TORONTOEVENTS_ANTIGRAVITY/ — this is a basePath build. Run DEPLOY_TARGET=sftp npm run build first.');
  process.exit(2);
}
console.log('build/index.html is clean (no basePath). Proceeding.');

const client = new ftp.Client(120000); // 2-min timeout per op
client.ftp.verbose = false;

async function withRetry(fn, label, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try { return await fn(); }
    catch (e) {
      console.warn(`[${label}] attempt ${i}/${attempts} failed: ${e.message}`);
      if (i === attempts) throw e;
      try { await client.close(); } catch (_) {}
      await new Promise(r => setTimeout(r, 2000));
      await client.access({ host: config.host, user: config.user, password: config.password, secure: true, secureOptions: { rejectUnauthorized: false } });
      await client.cd(config.remotePath);
    }
  }
}

(async () => {
  try {
    console.log(`Connecting to ${config.host}...`);
    await client.access({ host: config.host, user: config.user, password: config.password, secure: true, secureOptions: { rejectUnauthorized: false } });
    console.log('Connected. Working dir:', config.remotePath);
    await client.cd(config.remotePath);

    console.log('\n[1/2] Uploading build/_next -> _next (recursive)...');
    await withRetry(async () => {
      await client.uploadFromDir(nextDir, '_next');
    }, 'next-upload');
    console.log('OK _next uploaded');

    console.log('\n[2/2] Uploading build/index.html -> index.html (root)...');
    await withRetry(async () => {
      await client.cd(config.remotePath);
      await client.uploadFrom(indexHtml, 'index.html');
    }, 'index.html');
    console.log('OK index.html uploaded');

    console.log('\nDONE.');
  } catch (err) {
    console.error('FATAL:', err);
    process.exit(1);
  } finally {
    client.close();
  }
})();
