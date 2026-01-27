/**
 * Complete refresh and deployment script
 * 1. Runs scraper to refresh events database
 * 2. Commits and pushes to GitHub
 * 3. Builds and deploys to FTP site
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function runCommand(command: string, description: string): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 ${description}`);
    console.log(`${'='.repeat(60)}\n`);
    try {
        execSync(command, { stdio: 'inherit', cwd: process.cwd() });
        console.log(`\n✅ ${description} - SUCCESS\n`);
    } catch (error: any) {
        console.error(`\n❌ ${description} - FAILED`);
        console.error(`Error: ${error.message}\n`);
        throw error;
    }
}

function checkGitStatus(): { hasChanges: boolean; message: string } {
    try {
        const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
        const hasChanges = status.length > 0;
        
        if (!hasChanges) {
            return { hasChanges: false, message: 'No changes to commit' };
        }
        
        // Check if events.json or metadata.json changed
        const eventsChanged = status.includes('data/events.json');
        const metadataChanged = status.includes('data/metadata.json');
        
        if (eventsChanged || metadataChanged) {
            return { 
                hasChanges: true, 
                message: `Changes detected: ${eventsChanged ? 'events.json' : ''} ${metadataChanged ? 'metadata.json' : ''}`.trim()
            };
        }
        
        return { hasChanges: true, message: 'Other changes detected' };
    } catch (error) {
        return { hasChanges: false, message: 'Could not check git status' };
    }
}

async function main() {
    console.log('\n🚀 Starting Complete Refresh and Deployment Process\n');
    console.log('This will:');
    console.log('  1. Run scraper to refresh events database');
    console.log('  2. Commit and push changes to GitHub');
    console.log('  3. Build Next.js app');
    console.log('  4. Deploy to FTP site\n');

    try {
        // Step 1: Run Scraper
        runCommand('npm run scrape', 'Running Event Scraper');

        // Step 2: Check for changes and commit to GitHub
        console.log(`\n${'='.repeat(60)}`);
        console.log('📝 Checking Git Status');
        console.log(`${'='.repeat(60)}\n`);

        const gitStatus = checkGitStatus();
        console.log(`Status: ${gitStatus.message}\n`);

        if (gitStatus.hasChanges) {
            // Configure git if needed
            try {
                execSync('git config user.name || git config --global user.name "Event Bot"', { stdio: 'pipe' });
                execSync('git config user.email || git config --global user.email "bot@torontoevents.ca"', { stdio: 'pipe' });
            } catch (e) {
                // Ignore if already configured
            }

            // Add changed files
            runCommand('git add data/events.json data/metadata.json', 'Staging events data');

            // Commit
            const timestamp = new Date().toISOString();
            const commitMessage = `chore: refresh events database - ${timestamp}`;
            runCommand(`git commit -m "${commitMessage}"`, 'Committing changes to Git');

            // Push to GitHub
            runCommand('git push', 'Pushing to GitHub');
        } else {
            console.log('⏭️  Skipping Git commit/push - no changes detected\n');
        }

        // Step 3: Build Next.js app
        runCommand('npm run build:sftp', 'Building Next.js App for FTP Deployment');

        // Step 4: Deploy to FTP
        runCommand('tsx scripts/deploy-simple.ts', 'Deploying to FTP Site');

        console.log(`\n${'='.repeat(60)}`);
        console.log('🎉 COMPLETE REFRESH AND DEPLOYMENT SUCCESSFUL!');
        console.log(`${'='.repeat(60)}\n`);
        console.log('✅ Events database refreshed');
        console.log('✅ Changes synced to GitHub');
        console.log('✅ App deployed to FTP site\n');

    } catch (error: any) {
        console.error(`\n${'='.repeat(60)}`);
        console.error('❌ DEPLOYMENT FAILED');
        console.error(`${'='.repeat(60)}\n`);
        console.error(`Error: ${error.message}\n`);
        process.exit(1);
    }
}

main();
