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

// Patterns that indicate a move is a normal
function isNormalMove(move: Move): boolean {
  const name = move.name.toLowerCase();
  
  // Explicit normal patterns
  if (name.match(/^[0-9]+[lmh]$/i) || 
      name.match(/^j\.[0-9]?[lmh]$/i) ||
      name.match(/^[0-9]+[lmh]\s/i) ||
      name.includes('normal') ||
      name.includes('standing') ||
      name.includes('crouching') ||
      name.includes('jumping')) {
    return true;
  }
  
  // If name is just a number (damage value), check if it looks like a normal
  // Normals typically have:
  // - Lower damage values (30-120 range)
  // - Guard "LHA" or "L" or "H" or "A"
  // - Faster startup (usually < 20 frames)
  if (/^\d+(\s*[+\-]\s*\d+)*$/.test(move.name.trim())) {
    const damageNum = parseInt(move.name.trim());
    const guard = (move.guard || '').toUpperCase();
    const startup = typeof move.startup === 'number' ? move.startup : 
                   (typeof move.startup === 'string' ? parseInt(move.startup.split('~')[0]) : 999);
    
    // Normals typically have:
    // - Damage in 30-120 range (most normals)
    // - Guard includes L, H, or A (Low, High, Air)
    // - Startup < 25 frames (normals are usually faster)
    if (damageNum >= 30 && damageNum <= 120 && 
        (guard.includes('L') || guard.includes('H') || guard.includes('A')) &&
        startup < 25) {
      return true;
    }
  }
  
  return false;
}

// Infer normal move name from damage and context
function inferNormalName(move: Move, index: number, allMoves: Move[]): string {
  // If it already has a proper name, keep it
  if (move.name.match(/^[0-9]+[lmh]/i) || move.name.match(/^j\.[0-9]?[lmh]/i)) {
    return move.name;
  }
  
  // Try to infer from damage value and position
  // Typical normal patterns:
  // - Standing: 5L (low damage ~30-50), 5M (medium ~60-80), 5H (high ~90-120)
  // - Crouching: 2L, 2M, 2H (similar damage ranges)
  // - Jumping: j.L, j.M, j.H
  
  const damage = typeof move.damage === 'number' ? move.damage : 
                 (typeof move.damage === 'string' ? parseInt(move.damage.split('+')[0]) : 0);
  
  // Group moves by damage ranges to infer type
  if (damage >= 30 && damage <= 50) {
    // Likely Light attacks
    const lightCount = allMoves.filter(m => 
      isNormalMove(m) && 
      (typeof m.damage === 'number' ? m.damage : parseInt(String(m.damage || '0'))) >= 30 && 
      (typeof m.damage === 'number' ? m.damage : parseInt(String(m.damage || '0'))) <= 50
    ).length;
    
    if (lightCount < 3) return '5L';
    if (lightCount < 6) return '2L';
    return 'j.L';
  } else if (damage >= 60 && damage <= 80) {
    // Likely Medium attacks
    const mediumCount = allMoves.filter(m => 
      isNormalMove(m) && 
      (typeof m.damage === 'number' ? m.damage : parseInt(String(m.damage || '0'))) >= 60 && 
      (typeof m.damage === 'number' ? m.damage : parseInt(String(m.damage || '0'))) <= 80
    ).length;
    
    if (mediumCount < 3) return '5M';
    if (mediumCount < 6) return '2M';
    return 'j.M';
  } else if (damage >= 90 && damage <= 120) {
    // Likely Heavy attacks
    const heavyCount = allMoves.filter(m => 
      isNormalMove(m) && 
      (typeof m.damage === 'number' ? m.damage : parseInt(String(m.damage || '0'))) >= 90 && 
      (typeof m.damage === 'number' ? m.damage : parseInt(String(m.damage || '0'))) <= 120
    ).length;
    
    if (heavyCount < 3) return '5H';
    if (heavyCount < 6) return '2H';
    return 'j.H';
  }
  
  // Default: keep original name but mark as needing manual review
  return move.name;
}

function fixChampionMoves(champion: Champion): Champion {
  const fixedMoves = champion.moves.map((move, index, allMoves) => {
    // Check if this should be a normal
    if (isNormalMove(move) && move.type !== 'normal') {
      const inferredName = inferNormalName(move, index, allMoves);
      return {
        ...move,
        type: 'normal',
        name: inferredName !== move.name ? inferredName : move.name
      };
    }
    
    return move;
  });
  
  return {
    ...champion,
    moves: fixedMoves
  };
}

async function main() {
  const filePath = path.join(process.cwd(), 'frame-data.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  console.log('🔧 Fixing normal move categorization...\n');
  
  let totalFixed = 0;
  data.champions = data.champions.map((champion: Champion) => {
    const beforeNormals = champion.moves.filter(m => m.type === 'normal').length;
    const fixed = fixChampionMoves(champion);
    const afterNormals = fixed.moves.filter(m => m.type === 'normal').length;
    const fixedCount = afterNormals - beforeNormals;
    
    if (fixedCount > 0) {
      console.log(`  ✅ ${champion.name}: Fixed ${fixedCount} normals (${beforeNormals} → ${afterNormals})`);
      totalFixed += fixedCount;
    } else if (afterNormals === 0) {
      console.log(`  ⚠️  ${champion.name}: Still has 0 normals (${champion.moves.length} total moves)`);
    }
    
    return fixed;
  });
  
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ Fixed ${totalFixed} moves to be categorized as normals`);
  console.log(`📊 Total champions: ${data.champions.length}`);
}

main().catch(console.error);
