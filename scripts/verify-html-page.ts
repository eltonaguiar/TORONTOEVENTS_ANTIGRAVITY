import * as fs from 'fs';
import * as path from 'path';

async function verifyHTMLPage() {
  console.log('🔍 Verifying HTML page for errors...\n');
  
  const htmlPath = path.join(process.cwd(), 'public', '2xkoframedata.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for common issues
  console.log('1. Checking for broken links...');
  const linkMatches = html.matchAll(/href=["']([^"']+)["']/g);
  for (const match of linkMatches) {
    const link = match[1];
    if (link.startsWith('http') && !link.includes('github.com') && !link.includes('2xko.wiki') && !link.includes('play2xko.com')) {
      warnings.push(`External link: ${link}`);
    }
  }
  
  console.log('2. Checking for script errors...');
  const scriptTags = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scriptTags) {
    const scriptContent = match[1];
    // Check for common JS errors
    if (scriptContent.includes('undefined') && scriptContent.includes('.')) {
      const lines = scriptContent.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('undefined') && line.includes('.')) {
          warnings.push(`Potential undefined reference in script (line ${idx + 1}): ${line.trim().substring(0, 50)}`);
        }
      });
    }
  }
  
  console.log('3. Checking for missing resources...');
  const imgMatches = html.matchAll(/src=["']([^"']+)["']/g);
  for (const match of imgMatches) {
    const src = match[1];
    if (!src.startsWith('http') && !src.startsWith('data:')) {
      const imgPath = path.join(process.cwd(), 'public', src);
      if (!fs.existsSync(imgPath)) {
        errors.push(`Missing image: ${src}`);
      }
    }
  }
  
  console.log('4. Checking JSON data structure...');
  const jsonPath = path.join(process.cwd(), 'frame-data.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (!jsonData.champions || !Array.isArray(jsonData.champions)) {
        errors.push('Invalid JSON structure: missing champions array');
      } else {
        console.log(`   ✅ Found ${jsonData.champions.length} champions`);
        jsonData.champions.forEach((champ: any) => {
          if (!champ.name) {
            errors.push(`Champion missing name: ${JSON.stringify(champ).substring(0, 50)}`);
          }
          if (!champ.moves || !Array.isArray(champ.moves)) {
            errors.push(`Champion ${champ.name} missing moves array`);
          }
        });
      }
    } catch (e: any) {
      errors.push(`JSON parse error: ${e.message}`);
    }
  } else {
    errors.push('frame-data.json not found');
  }
  
  console.log('5. Checking for console errors...');
  if (html.includes('console.error') || html.includes('console.warn')) {
    warnings.push('Page contains console.error or console.warn calls');
  }
  
  // Report results
  console.log('\n📊 Verification Results:\n');
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ No errors or warnings found!');
  } else {
    if (errors.length > 0) {
      console.log(`❌ Errors (${errors.length}):`);
      errors.forEach(err => console.log(`   - ${err}`));
    }
    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${warnings.length}):`);
      warnings.slice(0, 10).forEach(warn => console.log(`   - ${warn}`));
      if (warnings.length > 10) {
        console.log(`   ... and ${warnings.length - 10} more warnings`);
      }
    }
  }
  
  return { errors, warnings };
}

verifyHTMLPage().catch(console.error);
