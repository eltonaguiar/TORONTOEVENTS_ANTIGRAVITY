/**
 * Helper script to find GitHub download URLs for ZIP files
 * 
 * This script helps identify the correct download URLs for the ZIP files
 * that need to be scanned on VirusTotal.
 */

const GITHUB_REPOS = [
  {
    name: 'GitHub Version',
    repo: 'eltonaguiar/BOOTFIXPREMIUM_GITHUB',
    branch: 'main',
    size: '1.5 MB'
  },
  {
    name: 'Cursor Version',
    repo: 'eltonaguiar/BOOTFIXPREMIUM_CURSOR',
    branch: 'main',
    size: '4.3 MB'
  }
];

console.log('🔍 GitHub Download URL Finder');
console.log('=====================================\n');

console.log('Possible download URLs for ZIP files:\n');

GITHUB_REPOS.forEach((repo, index) => {
  console.log(`${index + 1}. ${repo.name} (${repo.size})`);
  console.log(`   Repository: ${repo.repo}`);
  console.log(`   Branch: ${repo.branch}\n`);
  
  console.log('   Option A - Archive Download (entire repo as ZIP):');
  console.log(`   https://github.com/${repo.repo}/archive/refs/heads/${repo.branch}.zip\n`);
  
  console.log('   Option B - Release Download (if releases exist):');
  console.log(`   https://github.com/${repo.repo}/releases/latest/download/[filename].zip\n`);
  console.log('   (Check https://github.com/' + repo.repo + '/releases for actual filenames)\n');
  
  console.log('   Option C - Direct File Download (if ZIP is in repo):');
  console.log(`   https://raw.githubusercontent.com/${repo.repo}/${repo.branch}/[filename].zip\n`);
  
  console.log('   To scan on VirusTotal:');
  console.log(`   1. Go to https://www.virustotal.com`);
  console.log(`   2. Use the "URL" tab and paste one of the URLs above`);
  console.log(`   3. Or download the file first and upload it directly\n`);
  
  if (index < GITHUB_REPOS.length - 1) {
    console.log('   ---\n');
  }
});

console.log('\n💡 Tips:');
console.log('   - Archive downloads (.zip) are usually the easiest to scan');
console.log('   - If releases exist, those are preferred (they\'re versioned)');
console.log('   - You can also download the file locally and upload to VirusTotal');
console.log('   - Once scanned, copy the permalink URL for the badge generator\n');
