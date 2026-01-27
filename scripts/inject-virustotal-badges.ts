/**
 * Script to automatically inject VirusTotal badges into WINDOWSFIXER page HTML
 * 
 * Usage:
 *   npx tsx scripts/inject-virustotal-badges.ts [path-to-html-file]
 * 
 * If no path is provided, it will look for common WINDOWSFIXER page locations
 */

import fs from 'fs';
import path from 'path';

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

/**
 * Find markers in HTML to inject badges
 */
function findInjectionPoints(html: string): { githubIndex: number | null; cursorIndex: number | null } {
  // Look for common patterns that indicate download sections
  const githubPatterns = [
    /GitHub Version/i,
    /github.*version/i,
    /1\.5\s*MB/i,
    /Direct Download ZIP.*GitHub/i
  ];
  
  const cursorPatterns = [
    /Cursor Version/i,
    /cursor.*version/i,
    /4\.3\s*MB/i,
    /Direct Download ZIP.*Cursor/i
  ];

  let githubIndex: number | null = null;
  let cursorIndex: number | null = null;

  // Find GitHub version section
  for (const pattern of githubPatterns) {
    const match = html.match(pattern);
    if (match && match.index !== undefined) {
      // Find the end of the download link/button after this text
      const afterMatch = html.indexOf('</a>', match.index);
      if (afterMatch !== -1) {
        githubIndex = afterMatch + 4; // After </a>
        break;
      }
    }
  }

  // Find Cursor version section
  for (const pattern of cursorPatterns) {
    const match = html.match(pattern);
    if (match && match.index !== undefined) {
      const afterMatch = html.indexOf('</a>', match.index);
      if (afterMatch !== -1) {
        cursorIndex = afterMatch + 4; // After </a>
        break;
      }
    }
  }

  // Alternative: Look for download button patterns
  if (!githubIndex) {
    const githubDownloadMatch = html.match(/<a[^>]*>.*?GitHub.*?Version.*?<\/a>/is);
    if (githubDownloadMatch && githubDownloadMatch.index !== undefined) {
      githubIndex = githubDownloadMatch.index + githubDownloadMatch[0].length;
    }
  }

  if (!cursorIndex) {
    const cursorDownloadMatch = html.match(/<a[^>]*>.*?Cursor.*?Version.*?<\/a>/is);
    if (cursorDownloadMatch && cursorDownloadMatch.index !== undefined) {
      cursorIndex = cursorDownloadMatch.index + cursorDownloadMatch[0].length;
    }
  }

  return { githubIndex, cursorIndex };
}

/**
 * Inject badges into HTML
 */
export function injectBadges(html: string): string {
  // Check if badges are already injected
  if (html.includes('virustotal-scan') || html.includes('VirusTotal: Clean')) {
    console.log('⚠️  Badges appear to already be in the HTML. Skipping injection.');
    return html;
  }

  const { githubIndex, cursorIndex } = findInjectionPoints(html);

  let result = html;
  let offset = 0;

  // Inject Cursor badge first (if found later in file, it won't affect GitHub index)
  if (cursorIndex !== null) {
    result = result.slice(0, cursorIndex + offset) + CURSOR_BADGE + result.slice(cursorIndex + offset);
    offset += CURSOR_BADGE.length;
    console.log('✅ Injected Cursor Version badge');
  } else {
    console.log('⚠️  Could not find Cursor Version download section');
  }

  // Inject GitHub badge
  if (githubIndex !== null) {
    result = result.slice(0, githubIndex + offset) + GITHUB_BADGE + result.slice(githubIndex + offset);
    console.log('✅ Injected GitHub Version badge');
  } else {
    console.log('⚠️  Could not find GitHub Version download section');
  }

  return result;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  let htmlPath: string | null = null;

  if (args.length > 0) {
    htmlPath = args[0];
  } else {
    // Try common locations
    const commonPaths = [
      path.join(process.cwd(), 'WINDOWSFIXER', 'index.html'),
      path.join(process.cwd(), 'public', 'WINDOWSFIXER', 'index.html'),
      path.join(process.cwd(), 'WINDOWSFIXER.html'),
      path.join(process.cwd(), 'build', 'WINDOWSFIXER', 'index.html'),
    ];

    for (const testPath of commonPaths) {
      if (fs.existsSync(testPath)) {
        htmlPath = testPath;
        break;
      }
    }
  }

  if (!htmlPath) {
    console.error('❌ Could not find WINDOWSFIXER HTML file.');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/inject-virustotal-badges.ts [path-to-html-file]');
    console.log('\nOr place the HTML file in one of these locations:');
    console.log('  - WINDOWSFIXER/index.html');
    console.log('  - public/WINDOWSFIXER/index.html');
    console.log('  - WINDOWSFIXER.html');
    console.log('  - build/WINDOWSFIXER/index.html');
    process.exit(1);
  }

  if (!fs.existsSync(htmlPath)) {
    console.error(`❌ File not found: ${htmlPath}`);
    process.exit(1);
  }

  console.log(`📄 Reading: ${htmlPath}`);
  const html = fs.readFileSync(htmlPath, 'utf-8');

  console.log('🔍 Looking for injection points...');
  const updatedHtml = injectBadges(html);

  // Create backup
  const backupPath = htmlPath + '.backup';
  fs.writeFileSync(backupPath, html);
  console.log(`💾 Backup created: ${backupPath}`);

  // Write updated HTML
  fs.writeFileSync(htmlPath, updatedHtml);
  console.log(`✅ Badges injected into: ${htmlPath}`);
  console.log('\n🎉 Done! The badges have been embedded in your HTML file.');
}

main();
