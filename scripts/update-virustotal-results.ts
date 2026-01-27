/**
 * Helper script to update VirusTotal scan results
 * 
 * This script helps you extract information from VirusTotal scan pages
 * and update the badge generator scripts.
 * 
 * Usage:
 *   1. Open each VirusTotal URL in your browser
 *   2. Note the detection counts and names
 *   3. Update the values in this script
 *   4. Run: npx tsx scripts/update-virustotal-results.ts
 *   5. Copy the output to update generate-virustotal-badges-with-explanations.ts
 */

interface ScanInfo {
  name: string;
  hash: string;
  positives: number;
  total: number;
  detectionNames: string[];
  isClean: boolean;
}

// UPDATE THESE VALUES FROM YOUR VIRUSTOTAL SCAN PAGES
const scanInfo: ScanInfo[] = [
  {
    name: 'GitHub Version',
    hash: 'adbaf70e74b4357a21bb93cce5f53f77c647799eb38e216abd444c0e040bdf0d',
    positives: 0, // UPDATE: Check VirusTotal page for "X engines detected this file"
    total: 70, // UPDATE: Usually 70-75, check VirusTotal page
    detectionNames: [], // UPDATE: List detection names from the "Detection" tab
    isClean: true // Will be auto-calculated
  },
  {
    name: 'Cursor Version',
    hash: '023a7067946215bfb186040ead2aa9fbb44ce2dcb230d0d0b02de789c4ab8746',
    positives: 0, // UPDATE: Check VirusTotal page for "X engines detected this file"
    total: 70, // UPDATE: Usually 70-75, check VirusTotal page
    detectionNames: [], // UPDATE: List detection names from the "Detection" tab
    isClean: true // Will be auto-calculated
  }
];

function main() {
  console.log('🛡️  VirusTotal Results Updater');
  console.log('=====================================\n');
  
  // Auto-calculate isClean
  scanInfo.forEach(scan => {
    scan.isClean = scan.positives === 0;
  });

  console.log('📋 Updated Scan Results:\n');
  console.log('const scanResults: ScanResult[] = [');
  
  scanInfo.forEach((scan, index) => {
    const virustotalUrl = `https://www.virustotal.com/gui/file/${scan.hash}`;
    
    console.log('  {');
    console.log(`    name: '${scan.name}',`);
    console.log(`    size: '${scan.name === 'GitHub Version' ? '1.5 MB' : '4.3 MB'}',`);
    console.log(`    virustotalUrl: '${virustotalUrl}',`);
    console.log(`    isClean: ${scan.isClean},`);
    console.log(`    positives: ${scan.positives},`);
    console.log(`    total: ${scan.total},`);
    console.log(`    detectionNames: [${scan.detectionNames.map(n => `'${n}'`).join(', ')}]`);
    console.log(index < scanInfo.length - 1 ? '  },' : '  }');
  });
  
  console.log('];\n');
  
  console.log('📊 Summary:');
  console.log('=====================================\n');
  
  scanInfo.forEach(scan => {
    const status = scan.isClean ? '✅ Clean' : `⚠️  ${scan.positives}/${scan.total} detections`;
    const virustotalUrl = `https://www.virustotal.com/gui/file/${scan.hash}`;
    
    console.log(`${scan.name}:`);
    console.log(`  Status: ${status}`);
    console.log(`  URL: ${virustotalUrl}`);
    if (scan.detectionNames.length > 0) {
      console.log(`  Detections: ${scan.detectionNames.join(', ')}`);
    }
    console.log('');
  });
  
  console.log('💡 Next Steps:');
  console.log('1. Copy the scanResults array above');
  console.log('2. Paste it into scripts/generate-virustotal-badges-with-explanations.ts');
  console.log('3. Run: npx tsx scripts/generate-virustotal-badges-with-explanations.ts');
  console.log('4. Copy the generated HTML to your WINDOWSFIXER page\n');
}

main();
