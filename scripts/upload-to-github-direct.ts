import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const GITHUB_REPO = 'eltonaguiar/2XKOFRAMEDATA';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

async function uploadFile(filePath: string, content: string, message: string) {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN is required');
    console.log('\nTo set it:');
    console.log('  Windows PowerShell: $env:GITHUB_TOKEN="your_token_here"');
    console.log('  Windows CMD: set GITHUB_TOKEN=your_token_here');
    console.log('  Linux/Mac: export GITHUB_TOKEN=your_token_here');
    return false;
  }

  const base64Content = Buffer.from(content).toString('base64');
  
  try {
    // Check if file exists
    let sha: string | null = null;
    try {
      const checkResponse = await axios.get(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      sha = checkResponse.data.sha;
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
    }

    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
    const data: any = {
      message,
      content: base64Content,
      branch: 'main'
    };

    if (sha) {
      data.sha = sha;
    }

    const response = await axios.put(url, data, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ ${filePath} ${sha ? 'updated' : 'created'}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to upload ${filePath}:`, error.response?.data?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('📤 Uploading files to GitHub repository...\n');

  const baseDir = process.cwd();

  // 1. Upload frame-data.json
  const frameDataPath = path.join(baseDir, 'frame-data.json');
  if (fs.existsSync(frameDataPath)) {
    const frameData = fs.readFileSync(frameDataPath, 'utf-8');
    const data = JSON.parse(frameData);
    console.log(`📊 Frame data: ${data.champions?.length || 0} champions, ${data.champions?.reduce((sum: number, c: any) => sum + (c.moves?.length || 0), 0) || 0} moves`);
    await uploadFile(
      'frame-data.json',
      frameData,
      `Add complete frame data - ${data.champions?.length || 0} champions, ${data.champions?.reduce((sum: number, c: any) => sum + (c.moves?.length || 0), 0) || 0} moves`
    );
  } else {
    console.error('❌ frame-data.json not found');
  }

  // 2. Upload README.md
  const readmePath = path.join(baseDir, '2XKOFRAMEDATA_README.md');
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, 'utf-8');
    await uploadFile('README.md', readme, 'Add comprehensive README documentation');
  } else {
    console.error('❌ 2XKOFRAMEDATA_README.md not found');
  }

  // 3. Upload index.html
  const indexPath = path.join(baseDir, 'github-pages-index.html');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    await uploadFile('index.html', indexContent, 'Add GitHub Pages index page');
  } else {
    console.error('❌ github-pages-index.html not found');
  }

  console.log('\n🎉 Upload complete!');
  console.log(`🔗 Repository: https://github.com/${GITHUB_REPO}`);
  console.log(`🔗 GitHub Pages: https://eltonaguiar.github.io/2XKOFRAMEDATA/`);
  console.log(`🔗 Raw JSON: https://raw.githubusercontent.com/${GITHUB_REPO}/main/frame-data.json`);
}

main().catch(console.error);
