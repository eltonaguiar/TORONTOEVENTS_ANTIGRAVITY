/**
 * Sync to GitHub and Deploy to FTP
 * Use this after running the scraper separately
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
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
    console.log('\n🚀 Starting Sync and Deployment Process\n');
    console.log('This will:');
    console.log('  1. Check for changes in events database');
    console.log('  2. Commit and push changes to GitHub');
    console.log('  3. Build Next.js app');
    console.log('  4. Deploy to FTP site\n');

    // Verify data files exist
    const eventsPath = join(process.cwd(), 'data', 'events.json');
    const metadataPath = join(process.cwd(), 'data', 'metadata.json');
    
    if (!existsSync(eventsPath)) {
        console.error('❌ Error: data/events.json not found. Please run scraper first.');
        process.exit(1);
    }
    
    if (!existsSync(metadataPath)) {
        console.error('❌ Error: data/metadata.json not found. Please run scraper first.');
        process.exit(1);
    }

    try {
        // Step 1: Check for changes and commit to GitHub
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

            // Pull first to merge any remote changes
            try {
                console.log('📥 Pulling latest changes from GitHub...');
                execSync('git pull --no-edit', { stdio: 'inherit', cwd: process.cwd() });
                console.log('✅ Pulled latest changes\n');
            } catch (error: any) {
                console.log('⚠️  Pull failed, continuing with commit...\n');
            }

            // Commit
            const timestamp = new Date().toISOString();
            const commitMessage = `chore: refresh events database - ${timestamp}`;
            runCommand(`git commit -m "${commitMessage}"`, 'Committing changes to Git');

            // Push to GitHub
            runCommand('git push', 'Pushing to GitHub');
        } else {
            console.log('⏭️  Skipping Git commit/push - no changes detected\n');
        }

        // Step 2: Build Next.js app
        runCommand('npm run build:sftp', 'Building Next.js App for FTP Deployment');

        // Step 3: Deploy to FTP
        runCommand('tsx scripts/deploy-simple.ts', 'Deploying to FTP Site');

        console.log(`\n${'='.repeat(60)}`);
        console.log('🎉 SYNC AND DEPLOYMENT SUCCESSFUL!');
        console.log(`${'='.repeat(60)}\n`);
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
