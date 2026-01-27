import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const GITHUB_REPO = 'eltonaguiar/2XKOFRAMEDATA';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

interface GitHubFile {
  path: string;
  mode: '100644' | '100755' | '040000';
  type: 'blob' | 'tree';
  sha?: string;
  content?: string;
}

async function getFileSha(filePath: string): Promise<string | null> {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    return response.data.sha;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null; // File doesn't exist
    }
    throw error;
  }
}

async function updateGitHubFile(filePath: string, content: string, message: string) {
  const sha = await getFileSha(filePath);
  const base64Content = Buffer.from(content).toString('base64');

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
  const data: any = {
    message,
    content: base64Content,
    branch: 'main'
  };

  if (sha) {
    data.sha = sha; // Update existing file
  }

  try {
    const response = await axios.put(url, data, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ ${filePath} ${sha ? 'updated' : 'created'} successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Failed to update ${filePath}:`, error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    console.log('Set it with: export GITHUB_TOKEN=your_token_here');
    process.exit(1);
  }

  const frameDataPath = path.join(process.cwd(), 'frame-data.json');
  
  if (!fs.existsSync(frameDataPath)) {
    console.error(`❌ Frame data file not found: ${frameDataPath}`);
    console.log('Run the scraper first: npm run scrape:2xko');
    process.exit(1);
  }

  const frameData = fs.readFileSync(frameDataPath, 'utf-8');
  const data = JSON.parse(frameData);

  console.log('📤 Updating GitHub repository...');
  console.log(`📊 Champions: ${data.champions?.length || 0}`);
  console.log(`📊 Total moves: ${data.champions?.reduce((sum: number, c: any) => sum + (c.moves?.length || 0), 0) || 0}\n`);

  // Update frame-data.json
  await updateGitHubFile(
    'frame-data.json',
    frameData,
    `Update frame data - ${new Date().toISOString().split('T')[0]}`
  );

  // Also update README if we have the template
  const readmePath = path.join(process.cwd(), '2XKOFRAMEDATA_README.md');
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, 'utf-8');
    await updateGitHubFile(
      'README.md',
      readme,
      'Update README with frame data documentation'
    );
  }

  console.log('\n🎉 GitHub repository updated successfully!');
  console.log(`🔗 View at: https://github.com/${GITHUB_REPO}`);
  console.log(`🔗 Raw data: https://raw.githubusercontent.com/${GITHUB_REPO}/main/frame-data.json`);
}

main().catch(console.error);
