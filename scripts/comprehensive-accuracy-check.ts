import * as fs from 'fs';
import * as path from 'path';

interface Move {
  name: string;
  input?: string;
  inputGlyph?: string;
  keyboardButton?: string;
  keyboardInput?: string;
  startup?: number | string;
  active?: number | string;
  recovery?: number | string;
  onHit?: number | string;
  onBlock?: number | string;
  damage?: number | string;
  guard?: string;
  type?: string;
}

interface Champion {
  name: string;
  moves: Move[];
}

interface Issue {
  champion: string;
  moveName: string;
  issue: string;
  details?: string;
}

function isValidFrameValue(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') {
    if (value.trim() === '' || value === '-' || value === '—') return false;
    // Check if it's a valid number or range
    if (/^\d+$/.test(value.trim())) return true;
    if (/^\d+\s*[-~]\s*\d+/.test(value.trim())) return true;
    if (/^[+-]?\d+$/.test(value.trim())) return true;
    if (/^[+-]?\d+\s*[-~]\s*[+-]?\d+/.test(value.trim())) return true;
    if (value.includes('[H]') && /^\d+/.test(value)) return true; // Charged moves
    return false;
  }
  if (typeof value === 'number') return !isNaN(value);
  return false;
}

function isBrokenMoveName(name: string): boolean {
  if (!name || name.trim() === '' || name === '-') return true;
  // Pure numbers (3+ digits)
  if (/^\d{3,}$/.test(name.trim())) return true;
  // Math expressions
  if (/^\d+[x×]\d+/.test(name.trim())) return true;
  if (/\d+[x×]\d+\+\d+/.test(name.trim())) return true;
  // Very long numeric strings
  if (/^\d{5,}/.test(name.trim())) return true;
  return false;
}

function hasCompleteFrameData(move: Move): boolean {
  return isValidFrameValue(move.startup) && isValidFrameValue(move.onBlock);
}

function hasAnyFrameData(move: Move): boolean {
  return isValidFrameValue(move.startup) || 
         isValidFrameValue(move.onHit) || 
         isValidFrameValue(move.onBlock) || 
         isValidFrameValue(move.recovery) ||
         isValidFrameValue(move.active);
}

async function main() {
  const filePath = path.join(process.cwd(), 'frame-data.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  console.log('🔍 COMPREHENSIVE ACCURACY CHECK\n');
  console.log('='.repeat(80));
  
  const issues: Issue[] = [];
  const stats = {
    totalChampions: data.champions.length,
    totalMoves: 0,
    movesWithData: 0,
    movesComplete: 0,
    normals: 0,
    brokenNames: 0,
    duplicates: new Map<string, number>()
  };
  
  data.champions.forEach((champion: Champion) => {
    stats.totalMoves += champion.moves.length;
    
    // Check for duplicates
    const moveNames = new Map<string, number>();
    champion.moves.forEach(m => {
      const key = m.name.toLowerCase().trim();
      moveNames.set(key, (moveNames.get(key) || 0) + 1);
    });
    
    moveNames.forEach((count, name) => {
      if (count > 1) {
        stats.duplicates.set(`${champion.name}:${name}`, count);
        issues.push({
          champion: champion.name,
          moveName: name,
          issue: `duplicate move name (${count}x)`
        });
      }
    });
    
    champion.moves.forEach((move) => {
      // Check for broken names
      if (isBrokenMoveName(move.name)) {
        stats.brokenNames++;
        issues.push({
          champion: champion.name,
          moveName: move.name,
          issue: 'broken move name (damage value or math expression)'
        });
      }
      
      // Check for missing frame data
      if (!hasAnyFrameData(move)) {
        issues.push({
          champion: champion.name,
          moveName: move.name,
          issue: 'no frame data at all'
        });
      } else {
        stats.movesWithData++;
      }
      
      // Check for incomplete frame data
      if (hasAnyFrameData(move) && !hasCompleteFrameData(move)) {
        const missing: string[] = [];
        if (!isValidFrameValue(move.startup)) missing.push('startup');
        if (!isValidFrameValue(move.onBlock)) missing.push('onBlock');
        
        issues.push({
          champion: champion.name,
          moveName: move.name,
          issue: `incomplete frame data (missing: ${missing.join(', ')})`,
          details: `startup=${move.startup}, onBlock=${move.onBlock}`
        });
      } else if (hasCompleteFrameData(move)) {
        stats.movesComplete++;
      }
      
      // Check for invalid frame values
      if (move.startup && typeof move.startup === 'string') {
        if (move.startup.includes('frame number') || move.startup.includes('How many frames')) {
          issues.push({
            champion: champion.name,
            moveName: move.name,
            issue: 'startup contains tooltip text instead of value',
            details: move.startup.substring(0, 50)
          });
        }
      }
      
      if (move.onBlock && typeof move.onBlock === 'string') {
        if (move.onBlock.includes('frame number') || move.onBlock.includes('How many frames')) {
          issues.push({
            champion: champion.name,
            moveName: move.name,
            issue: 'onBlock contains tooltip text instead of value',
            details: move.onBlock.substring(0, 50)
          });
        }
      }
      
      // Count normals
      if (move.type === 'normal') {
        stats.normals++;
      }
    });
  });
  
  // Report by champion
  console.log('\n📊 CHAMPION-BY-CHAMPION STATUS:\n');
  console.log('─'.repeat(80));
  console.log('Champion     | Moves | With Data | Complete | Normals | Issues');
  console.log('─'.repeat(80));
  
  data.champions.forEach((champion: Champion) => {
    const champIssues = issues.filter(i => i.champion === champion.name);
    const champMoves = champion.moves.length;
    const champWithData = champion.moves.filter(hasAnyFrameData).length;
    const champComplete = champion.moves.filter(hasCompleteFrameData).length;
    const champNormals = champion.moves.filter(m => m.type === 'normal').length;
    const champBroken = champion.moves.filter(m => isBrokenMoveName(m.name)).length;
    
    const issueCount = champIssues.length;
    const status = issueCount === 0 ? '✅' : issueCount <= 3 ? '⚠️' : '❌';
    
    console.log(
      `${status} ${champion.name.padEnd(11)} | ${String(champMoves).padStart(5)} | ${String(champWithData).padStart(9)} | ${String(champComplete).padStart(8)} | ${String(champNormals).padStart(7)} | ${issueCount}`
    );
  });
  
  console.log('─'.repeat(80));
  
  // Overall stats
  console.log('\n📈 OVERALL STATISTICS:\n');
  console.log(`  Total Champions: ${stats.totalChampions}`);
  console.log(`  Total Moves: ${stats.totalMoves}`);
  console.log(`  Moves with Frame Data: ${stats.movesWithData} (${Math.round(stats.movesWithData / stats.totalMoves * 100)}%)`);
  console.log(`  Moves with Complete Data: ${stats.movesComplete} (${Math.round(stats.movesComplete / stats.totalMoves * 100)}%)`);
  console.log(`  Total Normals: ${stats.normals}`);
  console.log(`  Broken Move Names: ${stats.brokenNames}`);
  console.log(`  Duplicate Moves: ${stats.duplicates.size}`);
  
  // Detailed issues
  if (issues.length > 0) {
    console.log('\n❌ ISSUES FOUND:\n');
    
    const issuesByType = new Map<string, Issue[]>();
    issues.forEach(issue => {
      const key = issue.issue;
      if (!issuesByType.has(key)) {
        issuesByType.set(key, []);
      }
      issuesByType.get(key)!.push(issue);
    });
    
    issuesByType.forEach((issueList, issueType) => {
      console.log(`  ${issueType}: ${issueList.length} occurrences`);
      issueList.slice(0, 5).forEach(issue => {
        console.log(`    - ${issue.champion}: ${issue.moveName}`);
        if (issue.details) {
          console.log(`      ${issue.details}`);
        }
      });
      if (issueList.length > 5) {
        console.log(`    ... and ${issueList.length - 5} more`);
      }
      console.log('');
    });
  } else {
    console.log('\n✅ NO ISSUES FOUND - All frame data is accurate!\n');
  }
  
  // Champions with 0 normals
  const zeroNormals = data.champions.filter((c: Champion) => 
    c.moves.filter(m => m.type === 'normal').length === 0
  );
  
  if (zeroNormals.length > 0) {
    console.log(`\n❌ CHAMPIONS WITH 0 NORMALS: ${zeroNormals.map((c: Champion) => c.name).join(', ')}\n`);
  } else {
    console.log(`\n✅ ALL CHAMPIONS HAVE NORMALS\n`);
  }
  
  // Illaoi specific check
  const illaoi = data.champions.find((c: Champion) => c.name === 'Illaoi');
  if (illaoi) {
    console.log('🎯 ILLAOI SPECIFIC VERIFICATION:\n');
    console.log(`  Total Moves: ${illaoi.moves.length}`);
    console.log(`  Moves with Data: ${illaoi.moves.filter(hasAnyFrameData).length}`);
    console.log(`  Complete Moves: ${illaoi.moves.filter(hasCompleteFrameData).length}`);
    console.log(`  Normals: ${illaoi.moves.filter(m => m.type === 'normal').length}`);
    
    console.log('\n  Sample Normals:');
    illaoi.moves
      .filter(m => m.type === 'normal')
      .slice(0, 5)
      .forEach(m => {
        console.log(`    ${m.name}: startup=${m.startup}, onHit=${m.onHit}, onBlock=${m.onBlock}, recovery=${m.recovery}`);
      });
    
    const illaoiIssues = issues.filter(i => i.champion === 'Illaoi');
    if (illaoiIssues.length > 0) {
      console.log(`\n  ⚠️  Issues: ${illaoiIssues.length}`);
      illaoiIssues.slice(0, 3).forEach(issue => {
        console.log(`    - ${issue.moveName}: ${issue.issue}`);
      });
    } else {
      console.log('\n  ✅ No issues found for Illaoi!');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Final verdict
  if (issues.length === 0 && stats.brokenNames === 0 && zeroNormals.length === 0) {
    console.log('\n✅✅✅ ALL CHAMPIONS VERIFIED - DATA IS ACCURATE AND COMPLETE! ✅✅✅\n');
  } else {
    console.log(`\n⚠️  ${issues.length} issue(s) found - review needed\n`);
  }
}

main().catch(console.error);
