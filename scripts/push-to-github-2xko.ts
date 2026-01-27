import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const repoPath = path.join(process.cwd(), '..', '2XKOFRAMEDATA');
const sourcePath = process.cwd();

async function main() {
  console.log('📤 Pushing files to GitHub repository...\n');

  // Ensure we're in the right directory
  if (!fs.existsSync(repoPath)) {
    console.error(`❌ Repository not found at: ${repoPath}`);
    console.log('Please clone it first or check the path');
    process.exit(1);
  }

  // Copy files
  console.log('📋 Copying files...');
  const files = [
    { src: 'frame-data.json', dest: 'frame-data.json' },
    { src: '2XKOFRAMEDATA_README.md', dest: 'README.md' },
    { src: 'github-pages-index.html', dest: 'index.html' }
  ];

  files.forEach(({ src, dest }) => {
    const srcPath = path.join(sourcePath, src);
    const destPath = path.join(repoPath, dest);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✅ Copied ${src} → ${dest}`);
    } else {
      console.error(`  ❌ Source file not found: ${src}`);
    }
  });

  // Git operations
  console.log('\n📝 Committing changes...');
  try {
    execSync('git add -A', { cwd: repoPath, stdio: 'inherit' });
    execSync('git commit -m "Add frame data, README, and GitHub Pages index - 4 champions, 32 moves"', { 
      cwd: repoPath, 
      stdio: 'inherit' 
    });
    console.log('\n🚀 Pushing to GitHub...');
    execSync('git push origin main', { cwd: repoPath, stdio: 'inherit' });
    console.log('\n✅ Successfully pushed to GitHub!');
    console.log(`🔗 Repository: https://github.com/eltonaguiar/2XKOFRAMEDATA`);
  } catch (error: any) {
    console.error('\n❌ Git operation failed:', error.message);
    console.log('\nYou may need to:');
    console.log('1. Configure git credentials');
    console.log('2. Use a personal access token');
    console.log('3. Or push manually from the repository folder');
    process.exit(1);
  }
}

main().catch(console.error);
