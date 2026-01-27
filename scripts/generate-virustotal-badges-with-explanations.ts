/**
 * Generate VirusTotal scan badges with false positive explanations
 * 
 * This enhanced version includes explanations for any detections,
 * helping users understand why boot repair tools may trigger false positives.
 */

interface ScanResult {
  name: string;
  size: string;
  virustotalUrl: string;
  positives?: number; // Number of detections
  total?: number; // Total number of engines
  isClean?: boolean;
  detectionNames?: string[]; // Names of detections (e.g., "Heur.Suspicious", "RiskTool")
}

// VirusTotal scan results
// File 1 (GitHub Version): adbaf70e74b4357a21bb93cce5f53f77c647799eb38e216abd444c0e040bdf0d
// File 2 (Cursor Version): 023a7067946215bfb186040ead2aa9fbb44ce2dcb230d0d0b02de789c4ab8746
// 
// IMPORTANT: Please check the VirusTotal pages and update:
// - positives: Number of engines that detected something
// - total: Total number of engines scanned
// - detectionNames: Array of detection names (if any)
// - isClean: Set to true if positives === 0

const scanResults: ScanResult[] = [
  {
    name: 'GitHub Version',
    size: '1.5 MB',
    virustotalUrl: 'https://www.virustotal.com/gui/file/adbaf70e74b4357a21bb93cce5f53f77c647799eb38e216abd444c0e040bdf0d',
    isClean: true, // UPDATE: Check VirusTotal page - set to false if any detections
    positives: 0, // UPDATE: Check VirusTotal page for detection count
    total: 70, // UPDATE: Check VirusTotal page for total engines (usually 70-75)
    detectionNames: [] // UPDATE: List detection names from VirusTotal (e.g., ["Heur.Suspicious", "RiskTool"])
  },
  {
    name: 'Cursor Version',
    size: '4.3 MB',
    virustotalUrl: 'https://www.virustotal.com/gui/file/023a7067946215bfb186040ead2aa9fbb44ce2dcb230d0d0b02de789c4ab8746',
    isClean: true, // UPDATE: Check VirusTotal page - set to false if any detections
    positives: 0, // UPDATE: Check VirusTotal page for detection count
    total: 70, // UPDATE: Check VirusTotal page for total engines (usually 70-75)
    detectionNames: [] // UPDATE: List detection names from VirusTotal (e.g., ["Heur.Suspicious", "RiskTool"])
  }
];

/**
 * Get explanation for detection type
 */
function getDetectionExplanation(detectionName: string): string {
  const lower = detectionName.toLowerCase();
  
  if (lower.includes('heur') || lower.includes('suspicious')) {
    return 'Heuristic detection - flagged because boot repair operations match patterns also used by malware. This is a false positive.';
  }
  
  if (lower.includes('risktool') || lower.includes('hacktool')) {
    return 'RiskTool detection - flagged because the tool modifies system files (required for boot repair). This is expected behavior for recovery tools.';
  }
  
  if (lower.includes('pua') || lower.includes('potentially unwanted')) {
    return 'PUA detection - flagged as potentially unwanted because it performs system modifications. This is normal for boot repair tools.';
  }
  
  if (lower.includes('behavior')) {
    return 'Behavioral detection - flagged based on system modification patterns. Boot repair requires these operations to function.';
  }
  
  if (lower.includes('trojan') || lower.includes('generic')) {
    return 'Generic detection - flagged by generic heuristics, not a specific malware signature. This is a false positive.';
  }
  
  return 'Detection flagged due to system modification operations required for boot repair. This is expected for recovery tools.';
}

/**
 * Generate explanation section for detections
 */
function generateExplanationSection(result: ScanResult): string {
  if (result.isClean || !result.positives || result.positives === 0) {
    return '';
  }

  const explanations = result.detectionNames?.map(name => {
    const explanation = getDetectionExplanation(name);
    return `        <li><strong>${name}:</strong> ${explanation}</li>`;
  }).join('\n') || '';

  return `
    <div class="virustotal-explanation" style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
      <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #856404;">
        ℹ️ About the Detections (${result.positives}/${result.total} engines)
      </p>
      <p style="margin: 0 0 0.75rem 0; font-size: 0.875rem; color: #856404; line-height: 1.5;">
        Boot repair tools commonly trigger false positives because they perform legitimate system repairs that require deep system access. These same operations are also used by malware, causing some antivirus engines to flag them.
      </p>
      ${explanations ? `
      <details style="margin-top: 0.5rem;">
        <summary style="cursor: pointer; font-weight: 600; color: #856404; font-size: 0.875rem;">View Detection Details</summary>
        <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem; font-size: 0.8125rem; color: #856404; line-height: 1.6;">
${explanations}
        </ul>
      </details>
      ` : ''}
      <p style="margin: 0.75rem 0 0 0; font-size: 0.8125rem; color: #856404; line-height: 1.5;">
        <strong>Why we're confident it's safe:</strong> Our tool is open-source, uses only Microsoft's official recovery utilities, and performs no malicious operations. <a href="FALSE_POSITIVE_EXPLANATIONS.md" target="_blank" style="color: #0066cc; text-decoration: underline;">Learn more about false positives</a>.
      </p>
    </div>
  `;
}

/**
 * Generate HTML badge with explanations
 */
function generateBadgeWithExplanation(result: ScanResult): string {
  const badgeColor = result.isClean 
    ? '#4caf50' 
    : result.positives && result.positives < 3 
    ? '#ff9800' 
    : '#f44336';
  
  const badgeText = result.isClean 
    ? 'Clean' 
    : result.positives !== undefined && result.total !== undefined
    ? `${result.positives}/${result.total} detections`
    : 'View Report';

  const explanationSection = generateExplanationSection(result);

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
      ${explanationSection}
    </div>
  `;
}

function main() {
  console.log('🛡️  VirusTotal Badge Generator (with Explanations)');
  console.log('==================================================\n');
  console.log('📝 Badges with False Positive Explanations:\n');
  console.log('-------------------------------------------\n');
  
  scanResults.forEach((result, index) => {
    console.log(`<!-- ${result.name} (${result.size}) -->`);
    console.log(generateBadgeWithExplanation(result));
    if (index < scanResults.length - 1) {
      console.log('\n');
    }
  });

  console.log('\n\n📋 Instructions:');
  console.log('=====================================\n');
  console.log('1. Scan your ZIP files on VirusTotal');
  console.log('2. Update the scanResults array with:');
  console.log('   - VirusTotal permalink URLs');
  console.log('   - Number of positives and total engines');
  console.log('   - Detection names (if any)');
  console.log('3. Run this script to generate HTML');
  console.log('4. Add to your WINDOWSFIXER page\n');
  console.log('💡 If you see detections, they\'re likely false positives.');
  console.log('   See FALSE_POSITIVE_EXPLANATIONS.md for details.\n');
}

main();
