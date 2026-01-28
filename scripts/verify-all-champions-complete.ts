import * as fs from 'fs';
import * as path from 'path';

interface Move {
  name: string;
  startup?: number | string;
  onHit?: number | string;
  onBlock?: number | string;
  recovery?: number | string;
  active?: number | string;
  type?: string;
}

interface Champion {
  name: string;
  moves: Move[];
}

function hasFrameData(move: Move): boolean {
  const hasStartup = move.startup !== undefined && move.startup !== null && move.startup !== '-' && move.startup !== '';
  const hasOnHit = move.onHit !== undefined && move.onHit !== null && move.onHit !== '-' && move.onHit !== '';
  const hasOnBlock = move.onBlock !== undefined && move.onBlock !== null && move.onBlock !== '-' && move.onBlock !== '';
  const hasRecovery = move.recovery !== undefined && move.recovery !== null && move.recovery !== '-' && move.recovery !== '';
  const hasActive = move.active !== undefined && move.active !== null && move.active !== '-' && move.active !== '';
  
  return hasStartup || hasOnHit || hasOnBlock || hasRecovery || hasActive;
}

function isCompleteFrameData(move: Move): boolean {
  const hasStartup = move.startup !== undefined && move.startup !== null && move.startup !== '-' && move.startup !== '';
  const hasOnBlock = move.onBlock !== undefined && move.onBlock !== null && move.onBlock !== '-' && move.onBlock !== '';
  
  return hasStartup && hasOnBlock;
}

function isBrokenMoveName(name: string): boolean {
  if (!name || name.trim() === '' || name === '-') return true;
  if (/^\d{3,}$/.test(name.trim())) return true; // Just numbers like "150"
  if (/^\d+[x×]\d+/.test(name.trim())) return true; // Math expressions like "50420x3+74x6"
  if (/\d+[x×]\d+\+\d+[x×]\d+/.test(name.trim())) return true;
  return false;
}

async function main() {
  const filePath = path.join(process.cwd(), 'frame-data.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  console.log('🔍 Comprehensive accuracy check for all champions...\n');
  
  const issues: { champion: string; issue: string; count: number; examples: string[] }[] = [];
  
  data.champions.forEach((champion: Champion) => {
    const movesWithoutFrameData = champion.moves.filter(m => !hasFrameData(m));
    const movesWithIncompleteData = champion.moves.filter(m => hasFrameData(m) && !isCompleteFrameData(m));
    const brokenMoves = champion.moves.filter(m => isBrokenMoveName(m.name));
    const normals = champion.moves.filter(m => m.type === 'normal');
    const duplicates = new Map<string, number>();
    champion.moves.forEach(m => {
      const key = m.name.toLowerCase().trim();
      duplicates.set(key, (duplicates.get(key) || 0) + 1);
    });
    const duplicateMoves = Array.from(duplicates.entries()).filter(([_, count]) => count > 1);
    
    if (movesWithoutFrameData.length > 0) {
      issues.push({
        champion: champion.name,
        issue: 'missing frame data',
        count: movesWithoutFrameData.length,
        examples: movesWithoutFrameData.slice(0, 3).map(m => m.name)
      });
    }
    
    if (movesWithIncompleteData.length > 0) {
      issues.push({
        champion: champion.name,
        issue: 'incomplete frame data (missing startup or onBlock)',
        count: movesWithIncompleteData.length,
        examples: movesWithIncompleteData.slice(0, 3).map(m => `${m.name} (startup=${m.startup}, onBlock=${m.onBlock})`)
      });
    }
    
    if (brokenMoves.length > 0) {
      issues.push({
        champion: champion.name,
        issue: 'broken move names (damage values)',
        count: brokenMoves.length,
        examples: brokenMoves.slice(0, 3).map(m => m.name)
      });
    }
    
    if (duplicateMoves.length > 0) {
      issues.push({
        champion: champion.name,
        issue: 'duplicate move names',
        count: duplicateMoves.reduce((sum, [_, count]) => sum + count - 1, 0),
        examples: duplicateMoves.slice(0, 3).map(([name, count]) => `${name} (${count}x)`)
      });
    }
    
    if (normals.length === 0) {
      issues.push({
        champion: champion.name,
        issue: 'NO NORMALS',
        count: 0,
        examples: []
      });
    }
  });
  
  // Report
  if (issues.length === 0) {
    console.log('✅ All champions have complete, accurate frame data!\n');
  } else {
    console.log(`❌ Found issues in ${issues.length} champion(s):\n`);
    issues.forEach(({ champion, issue, count, examples }) => {
      console.log(`  ${champion}: ${issue} (${count} moves)`);
      if (examples.length > 0) {
        examples.forEach(ex => console.log(`    - ${ex}`));
      }
      console.log('');
    });
  }
  
  // Summary table
  console.log('\n📊 Champion Summary:');
  console.log('─'.repeat(80));
  console.log('Champion     | Moves | With Data | Complete | Normals | Status');
  console.log('─'.repeat(80));
  
  data.champions.forEach((champion: Champion) => {
    const totalMoves = champion.moves.length;
    const movesWithData = champion.moves.filter(hasFrameData).length;
    const movesComplete = champion.moves.filter(isCompleteFrameData).length;
    const normals = champion.moves.filter(m => m.type === 'normal').length;
    const broken = champion.moves.filter(m => isBrokenMoveName(m.name)).length;
    const hasIssues = movesWithData < totalMoves || movesComplete < movesWithData || normals === 0 || broken > 0;
    const status = hasIssues ? '⚠️' : '✅';
    
    console.log(`${champion.name.padEnd(12)} | ${String(totalMoves).padStart(5)} | ${String(movesWithData).padStart(9)} | ${String(movesComplete).padStart(8)} | ${String(normals).padStart(7)} | ${status}`);
  });
  
  console.log('─'.repeat(80));
  
  const totalMoves = data.champions.reduce((sum: number, c: Champion) => sum + c.moves.length, 0);
  const totalWithData = data.champions.reduce((sum: number, c: Champion) => sum + c.moves.filter(hasFrameData).length, 0);
  const totalComplete = data.champions.reduce((sum: number, c: Champion) => sum + c.moves.filter(isCompleteFrameData).length, 0);
  const totalNormals = data.champions.reduce((sum: number, c: Champion) => sum + c.moves.filter(m => m.type === 'normal').length, 0);
  const totalBroken = data.champions.reduce((sum: number, c: Champion) => sum + c.moves.filter(m => isBrokenMoveName(m.name)).length, 0);
  
  console.log(`\n📈 Overall: ${data.champions.length} champions, ${totalMoves} moves`);
  console.log(`   ${totalWithData} moves have frame data, ${totalComplete} are complete`);
  console.log(`   ${totalNormals} normals, ${totalBroken} broken move names`);
  
  if (issues.length === 0 && totalBroken === 0) {
    console.log('\n✅ ALL CHAMPIONS VERIFIED - Data is accurate and complete!');
  } else {
    console.log(`\n❌ ${issues.length} issue(s) found - needs fixing`);
  }
}

main().catch(console.error);
