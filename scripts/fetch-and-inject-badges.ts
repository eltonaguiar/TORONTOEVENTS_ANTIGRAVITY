/**
 * Fetch WINDOWSFIXER page from live site and inject badges
 * 
 * This script downloads the page from the live site, injects badges, and saves it.
 * Useful if the page is deployed separately and you want to update it.
 * 
 * Usage:
 *   npx tsx scripts/fetch-and-inject-badges.ts
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const WINDOWSFIXER_URL = 'https://findtorontoevents.ca/WINDOWSFIXER/';
const OUTPUT_PATH = path.join(process.cwd(), 'WINDOWSFIXER', 'index.html');

// VirusTotal badge HTML for GitHub Version
const GITHUB_BADGE = `
<!-- VirusTotal Scan Badge for GitHub Version -->
<div class="virustotal-scan" style="margin-top: 0.75rem; margin-bottom: 0.75rem;">
  <a 
    href="https://www.virustotal.com/gui/file/adbaf70e74b4357a21bb93cce5f53f77c647799eb38e216abd444c0e040bdf0d" 
    target="_blank" 
    rel="noopener noreferrer"
    style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #4caf50; color: white; border-radius: 6px; text-decoration: none; font-size: 0.875rem; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: transform 0.2s, box-shadow 0.2s;"
    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)';"
    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)';"
  >
    <span style="font-size: 1.1rem;">🛡️</span>
    <span>VirusTotal: Clean</span>
    <span style="font-size: 0.75rem;">↗</span>
  </a>
  <p style="margin-top: 0.5rem; font-size: 0.8125rem; color: #666; line-height: 1.4;">
    Scanned by <strong>70</strong> antivirus engines • 
    <a href="https://www.virustotal.com/gui/file/adbaf70e74b4357a21bb93cce5f53f77c647799eb38e216abd444c0e040bdf0d" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">View full report</a>
  </p>
</div>
`;

// VirusTotal badge HTML for Cursor Version
const CURSOR_BADGE = `
<!-- VirusTotal Scan Badge for Cursor Version -->
<div class="virustotal-scan" style="margin-top: 0.75rem; margin-bottom: 0.75rem;">
  <a 
    href="https://www.virustotal.com/gui/file/023a7067946215bfb186040ead2aa9fbb44ce2dcb230d0d0b02de789c4ab8746" 
    target="_blank" 
    rel="noopener noreferrer"
    style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #4caf50; color: white; border-radius: 6px; text-decoration: none; font-size: 0.875rem; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: transform 0.2s, box-shadow 0.2s;"
    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)';"
    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)';"
  >
    <span style="font-size: 1.1rem;">🛡️</span>
    <span>VirusTotal: Clean</span>
    <span style="font-size: 0.75rem;">↗</span>
  </a>
  <p style="margin-top: 0.5rem; font-size: 0.8125rem; color: #666; line-height: 1.4;">
    Scanned by <strong>70</strong> antivirus engines • 
    <a href="https://www.virustotal.com/gui/file/023a7067946215bfb186040ead2aa9fbb44ce2dcb230d0d0b02de789c4ab8746" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">View full report</a>
  </p>
</div>
`;

function findInjectionPoints(html: string): { githubIndex: number | null; cursorIndex: number | null } {
  const githubPatterns = [/GitHub Version/i, /github.*version/i, /1\.5\s*MB/i];
  const cursorPatterns = [/Cursor Version/i, /cursor.*version/i, /4\.3\s*MB/i];

  let githubIndex: number | null = null;
  let cursorIndex: number | null = null;

  for (const pattern of githubPatterns) {
    const match = html.match(pattern);
    if (match && match.index !== undefined) {
      const afterMatch = html.indexOf('</a>', match.index);
      if (afterMatch !== -1) {
        githubIndex = afterMatch + 4;
        break;
      }
    }
  }

  for (const pattern of cursorPatterns) {
    const match = html.match(pattern);
    if (match && match.index !== undefined) {
      const afterMatch = html.indexOf('</a>', match.index);
      if (afterMatch !== -1) {
        cursorIndex = afterMatch + 4;
        break;
      }
    }
  }

  return { githubIndex, cursorIndex };
}

function injectBadges(html: string): string {
  if (html.includes('virustotal-scan') || html.includes('VirusTotal: Clean')) {
    console.log('⚠️  Badges appear to already be in the HTML. Skipping injection.');
    return html;
  }

  const { githubIndex, cursorIndex } = findInjectionPoints(html);
  let result = html;
  let offset = 0;

  if (cursorIndex !== null) {
    result = result.slice(0, cursorIndex + offset) + CURSOR_BADGE + result.slice(cursorIndex + offset);
    offset += CURSOR_BADGE.length;
    console.log('✅ Injected Cursor Version badge');
  } else {
    console.log('⚠️  Could not find Cursor Version download section');
  }

  if (githubIndex !== null) {
    result = result.slice(0, githubIndex + offset) + GITHUB_BADGE + result.slice(githubIndex + offset);
    console.log('✅ Injected GitHub Version badge');
  } else {
    console.log('⚠️  Could not find GitHub Version download section');
  }

  return result;
}

async function main() {
  console.log('🌐 Fetching WINDOWSFIXER page...');
  console.log(`   URL: ${WINDOWSFIXER_URL}\n`);

  try {
    const response = await axios.get(WINDOWSFIXER_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    console.log(`✅ Fetched ${response.data.length} bytes\n`);

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created directory: ${outputDir}\n`);
    }

    // Inject badges
    console.log('🔍 Injecting VirusTotal badges...');
    const updatedHtml = injectBadges(response.data);

    // Save
    fs.writeFileSync(OUTPUT_PATH, updatedHtml);
    console.log(`✅ Saved updated page to: ${OUTPUT_PATH}\n`);

    console.log('🎉 Done! You can now:');
    console.log('   1. Review the updated file');
    console.log('   2. Upload it to your server');
    console.log('   3. Or use your deployment script\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
    process.exit(1);
  }
}

main();
