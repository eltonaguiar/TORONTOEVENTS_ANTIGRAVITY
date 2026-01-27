/**
 * Script to scan ZIP files on VirusTotal and generate scan badges/links
 * 
 * Usage:
 *   npx tsx scripts/scan-virustotal.ts
 * 
 * This script will:
 * 1. Scan ZIP files on VirusTotal (via URL or file upload)
 * 2. Generate HTML badges/links for the scan results
 * 3. Output the HTML code to add to the WINDOWSFIXER page
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// VirusTotal API configuration
// Note: You'll need a VirusTotal API key (free tier available)
// Get one at: https://www.virustotal.com/gui/join-us
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY || '';
const VIRUSTOTAL_API_URL = 'https://www.virustotal.com/vtapi/v2';

interface VirusTotalResponse {
  response_code: number;
  scan_id?: string;
  permalink?: string;
  resource?: string;
  verbose_msg?: string;
  scans?: Record<string, {
    detected: boolean;
    version: string;
    result: string | null;
    update: string;
  }>;
  positives?: number;
  total?: number;
}

/**
 * Scan a file URL on VirusTotal
 */
async function scanUrl(fileUrl: string): Promise<VirusTotalResponse | null> {
  if (!VIRUSTOTAL_API_KEY) {
    console.error('❌ VIRUSTOTAL_API_KEY environment variable is not set');
    console.log('💡 Get a free API key at: https://www.virustotal.com/gui/join-us');
    return null;
  }

  try {
    console.log(`\n🔍 Scanning URL: ${fileUrl}`);
    
    // First, submit the URL for scanning
    const submitResponse = await axios.post(
      `${VIRUSTOTAL_API_URL}/url/scan`,
      new URLSearchParams({
        apikey: VIRUSTOTAL_API_KEY,
        url: fileUrl
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (submitResponse.data.response_code === 1) {
      console.log('✅ URL submitted for scanning');
      const scanId = submitResponse.data.scan_id;
      
      // Wait a bit for the scan to complete
      console.log('⏳ Waiting for scan to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get the scan results
      const reportResponse = await axios.get(
        `${VIRUSTOTAL_API_URL}/url/report`,
        {
          params: {
            apikey: VIRUSTOTAL_API_KEY,
            resource: scanId
          }
        }
      );

      return reportResponse.data;
    } else {
      console.error('❌ Failed to submit URL for scanning');
      return null;
    }
  } catch (error: any) {
    console.error(`❌ Error scanning URL: ${error.message}`);
    return null;
  }
}

/**
 * Upload and scan a local file on VirusTotal
 * Note: This requires form-data package. For now, use URL scanning instead.
 */
async function scanFile(filePath: string): Promise<VirusTotalResponse | null> {
  console.log('⚠️  File upload scanning requires form-data package.');
  console.log('💡 For now, please use URL scanning or upload files manually to VirusTotal.');
  return null;
}

/**
 * Generate HTML badge/link for VirusTotal scan result
 */
function generateScanBadge(
  fileName: string,
  scanResult: VirusTotalResponse | null,
  fileUrl?: string
): string {
  if (!scanResult || scanResult.response_code !== 1) {
    return `
      <!-- VirusTotal Scan Badge for ${fileName} -->
      <div class="virustotal-scan" style="margin-top: 0.5rem;">
        <a 
          href="https://www.virustotal.com/gui/search/${encodeURIComponent(fileUrl || fileName)}" 
          target="_blank" 
          rel="noopener noreferrer"
          style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; text-decoration: none; color: #333; font-size: 0.875rem;"
        >
          <span>🔒</span>
          <span>Scan on VirusTotal</span>
          <span>↗</span>
        </a>
      </div>
    `;
  }

  const positives = scanResult.positives || 0;
  const total = scanResult.total || 0;
  const isClean = positives === 0;
  const permalink = scanResult.permalink || `https://www.virustotal.com/gui/search/${encodeURIComponent(fileUrl || fileName)}`;

  const badgeColor = isClean ? '#4caf50' : positives < 3 ? '#ff9800' : '#f44336';
  const badgeText = isClean ? 'Clean' : `${positives}/${total} detections`;

  return `
    <!-- VirusTotal Scan Badge for ${fileName} -->
    <div class="virustotal-scan" style="margin-top: 0.5rem;">
      <a 
        href="${permalink}" 
        target="_blank" 
        rel="noopener noreferrer"
        style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: ${badgeColor}; color: white; border-radius: 4px; text-decoration: none; font-size: 0.875rem; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
      >
        <span>🛡️</span>
        <span>VirusTotal: ${badgeText}</span>
        <span>↗</span>
      </a>
      <p style="margin-top: 0.25rem; font-size: 0.75rem; color: #666;">
        Scanned by ${total} antivirus engines • 
        <a href="${permalink}" target="_blank" rel="noopener noreferrer" style="color: #0066cc;">View full report</a>
      </p>
    </div>
  `;
}

/**
 * Main function
 */
async function main() {
  console.log('🛡️  VirusTotal Scan Badge Generator');
  console.log('=====================================\n');

  // ZIP file URLs from GitHub repositories
  // Based on the page content, these are the download links
  // Update these URLs to match the actual GitHub release/download URLs
  const zipFiles = [
    {
      name: 'GitHub Version',
      url: 'https://github.com/eltonaguiar/BOOTFIXPREMIUM_GITHUB/archive/refs/heads/main.zip',
      size: '1.5 MB',
      // Alternative: Use release download URL if available:
      // url: 'https://github.com/eltonaguiar/BOOTFIXPREMIUM_GITHUB/releases/download/v7.2.0/BOOTFIXPREMIUM_GITHUB.zip'
    },
    {
      name: 'Cursor Version',
      url: 'https://github.com/eltonaguiar/BOOTFIXPREMIUM_CURSOR/archive/refs/heads/main.zip',
      size: '4.3 MB',
      // Alternative: Use release download URL if available:
      // url: 'https://github.com/eltonaguiar/BOOTFIXPREMIUM_CURSOR/releases/download/v7.2.0/BOOTFIXPREMIUM_CURSOR.zip'
    }
  ];

  console.log('📦 Files to scan:');
  zipFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file.name} (${file.size})`);
    console.log(`      URL: ${file.url}`);
  });

  console.log('\n⚠️  Note: VirusTotal API requires an API key');
  console.log('   Set VIRUSTOTAL_API_KEY environment variable or get one at:');
  console.log('   https://www.virustotal.com/gui/join-us\n');

  const scanResults: Array<{ file: typeof zipFiles[0]; result: VirusTotalResponse | null }> = [];

  // Scan each file
  for (const file of zipFiles) {
    const result = await scanUrl(file.url);
    scanResults.push({ file, result });
    
    // Wait between scans to avoid rate limiting
    if (file !== zipFiles[zipFiles.length - 1]) {
      console.log('⏳ Waiting before next scan...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  // Generate HTML badges
  console.log('\n\n📝 Generated HTML Badges:');
  console.log('=====================================\n');

  scanResults.forEach(({ file, result }) => {
    console.log(`<!-- ${file.name} (${file.size}) -->`);
    console.log(generateScanBadge(file.name, result, file.url));
    console.log('\n');
  });

  // Also generate a summary
  console.log('\n\n📊 Summary:');
  console.log('=====================================\n');
  scanResults.forEach(({ file, result }) => {
    if (result && result.response_code === 1) {
      const positives = result.positives || 0;
      const total = result.total || 0;
      const status = positives === 0 ? '✅ Clean' : `⚠️  ${positives}/${total} detections`;
      console.log(`${file.name}: ${status}`);
      if (result.permalink) {
        console.log(`   Link: ${result.permalink}`);
      }
    } else {
      console.log(`${file.name}: ❌ Scan failed or not available`);
    }
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

/**
 * Alternative: Generate HTML for manual VirusTotal scan links
 * Use this if you've already scanned the files manually on VirusTotal
 */
function generateManualScanBadge(fileName: string, virustotalUrl: string, isClean: boolean = true): string {
  const badgeColor = isClean ? '#4caf50' : '#ff9800';
  const badgeText = isClean ? 'Clean' : 'View Report';

  return `
    <!-- VirusTotal Scan Badge for ${fileName} -->
    <div class="virustotal-scan" style="margin-top: 0.5rem;">
      <a 
        href="${virustotalUrl}" 
        target="_blank" 
        rel="noopener noreferrer"
        style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: ${badgeColor}; color: white; border-radius: 4px; text-decoration: none; font-size: 0.875rem; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
      >
        <span>🛡️</span>
        <span>VirusTotal: ${badgeText}</span>
        <span>↗</span>
      </a>
      <p style="margin-top: 0.25rem; font-size: 0.75rem; color: #666;">
        <a href="${virustotalUrl}" target="_blank" rel="noopener noreferrer" style="color: #0066cc;">View full scan report</a>
      </p>
    </div>
  `;
}

export { scanUrl, scanFile, generateScanBadge, generateManualScanBadge };
