/**
 * Generate VirusTotal scan badges HTML for WINDOWSFIXER page
 * 
 * This script generates HTML code for VirusTotal scan badges that can be added
 * to the download sections on the WINDOWSFIXER page.
 * 
 * Usage:
 *   1. Scan your ZIP files on VirusTotal (manually or via API)
 *   2. Update the scanResults array below with the permalink URLs
 *   3. Run: npx tsx scripts/generate-virustotal-badges.ts
 *   4. Copy the generated HTML and add it to your WINDOWSFIXER page
 */

interface ScanResult {
  name: string;
  size: string;
  virustotalUrl: string; // Permalink from VirusTotal scan
  positives?: number; // Number of detections (0 = clean)
  total?: number; // Total number of engines
  isClean?: boolean; // Whether the file is clean
}

// Update these with your actual VirusTotal scan results
// To get these URLs:
// 1. Go to https://www.virustotal.com
// 2. Upload or search for your ZIP file
// 3. Copy the permalink URL from the scan results page
const scanResults: ScanResult[] = [
  {
    name: 'GitHub Version',
    size: '1.5 MB',
    virustotalUrl: 'https://www.virustotal.com/gui/file/REPLACE_WITH_ACTUAL_HASH_OR_URL', // Replace with actual URL
    isClean: true, // Update based on scan results
    positives: 0,
    total: 70
  },
  {
    name: 'Cursor Version',
    size: '4.3 MB',
    virustotalUrl: 'https://www.virustotal.com/gui/file/REPLACE_WITH_ACTUAL_HASH_OR_URL', // Replace with actual URL
    isClean: true, // Update based on scan results
    positives: 0,
    total: 70
  }
];

/**
 * Generate HTML badge for a VirusTotal scan result
 */
function generateBadge(result: ScanResult): string {
  const badgeColor = result.isClean ? '#4caf50' : result.positives && result.positives < 3 ? '#ff9800' : '#f44336';
  const badgeText = result.isClean 
    ? 'Clean' 
    : result.positives !== undefined && result.total !== undefined
    ? `${result.positives}/${result.total} detections`
    : 'View Report';

  return `
    <!-- VirusTotal Scan Badge for ${result.name} (${result.size}) -->
    <div class="virustotal-scan" style="margin-top: 0.75rem; margin-bottom: 0.75rem;">
      <a 
        href="${result.virustotalUrl}" 
        target="_blank" 
        rel="noopener noreferrer"
        style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: ${badgeColor}; color: white; border-radius: 6px; text-decoration: none; font-size: 0.875rem; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: transform 0.2s, box-shadow 0.2s;"
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)';"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)';"
      >
        <span style="font-size: 1.1rem;">🛡️</span>
        <span>VirusTotal: ${badgeText}</span>
        <span style="font-size: 0.75rem;">↗</span>
      </a>
      ${result.total ? `
      <p style="margin-top: 0.5rem; font-size: 0.8125rem; color: #666; line-height: 1.4;">
        Scanned by <strong>${result.total}</strong> antivirus engines • 
        <a href="${result.virustotalUrl}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">View full report</a>
      </p>
      ` : `
      <p style="margin-top: 0.5rem; font-size: 0.8125rem; color: #666; line-height: 1.4;">
        <a href="${result.virustotalUrl}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">View scan report on VirusTotal</a>
      </p>
      `}
    </div>
  `;
}

/**
 * Generate compact badge (for smaller spaces)
 */
function generateCompactBadge(result: ScanResult): string {
  const badgeColor = result.isClean ? '#4caf50' : result.positives && result.positives < 3 ? '#ff9800' : '#f44336';
  const badgeText = result.isClean ? '✓ Clean' : '⚠ Report';

  return `
    <!-- Compact VirusTotal Badge for ${result.name} -->
    <a 
      href="${result.virustotalUrl}" 
      target="_blank" 
      rel="noopener noreferrer"
      title="View VirusTotal scan report"
      style="display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; background: ${badgeColor}; color: white; border-radius: 4px; text-decoration: none; font-size: 0.75rem; font-weight: 500;"
    >
      <span>🛡️</span>
      <span>${badgeText}</span>
    </a>
  `;
}

function main() {
  console.log('🛡️  VirusTotal Badge HTML Generator');
  console.log('=====================================\n');
  console.log('📝 Full Badges (for download sections):\n');
  console.log('----------------------------------------\n');
  
  scanResults.forEach((result, index) => {
    console.log(`<!-- ${result.name} (${result.size}) -->`);
    console.log(generateBadge(result));
    if (index < scanResults.length - 1) {
      console.log('\n');
    }
  });

  console.log('\n\n📝 Compact Badges (for smaller spaces):\n');
  console.log('----------------------------------------\n');
  
  scanResults.forEach((result, index) => {
    console.log(`<!-- ${result.name} - Compact -->`);
    console.log(generateCompactBadge(result));
    if (index < scanResults.length - 1) {
      console.log('\n');
    }
  });

  console.log('\n\n📋 Instructions:');
  console.log('=====================================\n');
  console.log('1. Scan your ZIP files on VirusTotal:');
  console.log('   - Go to https://www.virustotal.com');
  console.log('   - Upload each ZIP file or search by URL/hash');
  console.log('   - Wait for the scan to complete');
  console.log('   - Copy the permalink URL from the results page\n');
  console.log('2. Update the scanResults array in this script with:');
  console.log('   - The VirusTotal permalink URLs');
  console.log('   - The scan results (positives, total, isClean)\n');
  console.log('3. Run this script again to generate updated HTML\n');
  console.log('4. Add the generated HTML to your WINDOWSFIXER page:');
  console.log('   - Find the download section for each version');
  console.log('   - Add the badge HTML right after the download button/link\n');
}

main();
