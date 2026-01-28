import * as fs from 'fs';
import * as path from 'path';

interface Move {
  name: string;
  startup?: number | string;
  onHit?: number | string;
  onBlock?: number | string;
  recovery?: number | string;
  active?: number | string;
  damage?: number | string;
  guard?: string;
  type?: string;
}

interface Champion {
  name: string;
  moves: Move[];
}

function hasFrameData(move: Move): boolean {
  // Check if move has at least one frame data value
  const hasStartup = move.startup !== undefined && move.startup !== null && move.startup !== '-' && move.startup !== '';
  const hasOnHit = move.onHit !== undefined && move.onHit !== null && move.onHit !== '-' && move.onHit !== '';
  const hasOnBlock = move.onBlock !== undefined && move.onBlock !== null && move.onBlock !== '-' && move.onBlock !== '';
  const hasRecovery = move.recovery !== undefined && move.recovery !== null && move.recovery !== '-' && move.recovery !== '';
  const hasActive = move.active !== undefined && move.active !== null && move.active !== '-' && move.active !== '';
  
  return hasStartup || hasOnHit || hasOnBlock || hasRecovery || hasActive;
}

function isCompleteFrameData(move: Move): boolean {
  // Check if move has all essential frame data
  const hasStartup = move.startup !== undefined && move.startup !== null && move.startup !== '-' && move.startup !== '';
  const hasOnBlock = move.onBlock !== undefined && move.onBlock !== null && move.onBlock !== '-' && move.onBlock !== '';
  
  return hasStartup && hasOnBlock;
}

async function main() {
  const filePath = path.join(process.cwd(), 'frame-data.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  console.log('🔍 Verifying all champions for frame data accuracy...\n');
  
  let totalIssues = 0;
  const issues: { champion: string; moves: Move[]; issue: string }[] = [];
  
  data.champions.forEach((champion: Champion) => {
    const movesWithoutFrameData = champion.moves.filter(m => !hasFrameData(m));
    const movesWithIncompleteData = champion.moves.filter(m => hasFrameData(m) && !isCompleteFrameData(m));
    const brokenMoves = champion.moves.filter(m => {
      const name = m.name || '';
      return /^\d{3,}$/.test(name.trim()) || 
             /^\d+[x×]\d+/.test(name.trim()) ||
             /\d+[x×]\d+\+\d+[x×]\d+/.test(name.trim());
    });
    
    if (movesWithoutFrameData.length > 0) {
      issues.push({
        champion: champion.name,
        moves: movesWithoutFrameData,
        issue: 'missing frame data'
      });
      totalIssues += movesWithoutFrameData.length;
    }
    
    if (movesWithIncompleteData.length > 0) {
      issues.push({
        champion: champion.name,
        moves: movesWithIncompleteData,
        issue: 'incomplete frame data'
      });
    }
    
    if (brokenMoves.length > 0) {
      issues.push({
        champion: champion.name,
        moves: brokenMoves,
        issue: 'broken move names'
      });
      totalIssues += brokenMoves.length;
    }
  });
  
  // Report findings
  if (issues.length === 0) {
    console.log('✅ All champions have complete frame data!');
  } else {
    console.log(`❌ Found issues in ${issues.length} champion(s):\n`);
    
    issues.forEach(({ champion, moves, issue }) => {
      console.log(`  ${champion} (${issue}): ${moves.length} moves`);
      moves.slice(0, 5).forEach(m => {
        console.log(`    - ${m.name}: startup=${m.startup}, onHit=${m.onHit}, onBlock=${m.onBlock}, recovery=${m.recovery}`);
      });
      if (moves.length > 5) {
        console.log(`    ... and ${moves.length - 5} more`);
      }
      console.log('');
    });
  }
  
  // Summary
  console.log('\n📊 Summary:');
  data.champions.forEach((champion: Champion) => {
    const totalMoves = champion.moves.length;
    const movesWithData = champion.moves.filter(hasFrameData).length;
    const movesComplete = champion.moves.filter(isCompleteFrameData).length;
    const normals = champion.moves.filter(m => m.type === 'normal').length;
    
    console.log(`  ${champion.name}: ${totalMoves} moves (${movesWithData} with data, ${movesComplete} complete, ${normals} normals)`);
  });
  
  console.log(`\n${totalIssues > 0 ? '❌' : '✅'} Total issues found: ${totalIssues}`);
}

main().catch(console.error);
