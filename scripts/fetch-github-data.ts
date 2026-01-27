/**
 * Script to fetch latest events.json and metadata.json from GitHub
 * and optionally upload to FTP as fallback
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const GITHUB_REPO = 'eltonaguiar/TORONTOEVENTS_ANTIGRAVITY';
const GITHUB_BRANCH = 'main'; // Change to your default branch if different
const EVENTS_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/data/events.json`;
const METADATA_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/data/metadata.json`;

async function fetchFromGitHub(url: string): Promise<any> {
    try {
        console.log(`Fetching from GitHub: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        return response.data;
    } catch (error: any) {
        console.error(`Failed to fetch from GitHub: ${error.message}`);
        throw error;
    }
}

async function main() {
    const outputDir = path.join(process.cwd(), 'build');
    
    // Ensure build directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        // Fetch events.json
        console.log('📥 Fetching events.json from GitHub...');
        const events = await fetchFromGitHub(EVENTS_URL);
        const eventsPath = path.join(outputDir, 'events.json');
        fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));
        console.log(`✅ Saved events.json (${events.length} events)`);

        // Fetch metadata.json
        console.log('📥 Fetching metadata.json from GitHub...');
        const metadata = await fetchFromGitHub(METADATA_URL);
        const metadataPath = path.join(outputDir, 'metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        console.log(`✅ Saved metadata.json`);

        console.log('\n🎉 Successfully fetched latest data from GitHub!');
        console.log(`📍 Files saved to: ${outputDir}`);
    } catch (error) {
        console.error('❌ Failed to fetch from GitHub:', error);
        process.exit(1);
    }
}

main();
