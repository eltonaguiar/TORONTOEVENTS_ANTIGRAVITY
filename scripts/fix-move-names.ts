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

// Infer proper FGC notation name from damage, guard, and startup
function inferMoveName(move: Move, index: number, allMoves: Move[]): string {
  // If already has proper FGC notation, keep it
  if (move.name.match(/^[0-9]+[lmh]/i) || move.name.match(/^j\.[0-9]?[lmh]/i)) {
    return move.name;
  }
  
  // If name is just a number (damage value), infer from context
  if (!/^\d+(\s*[+\-]\s*\d+)*$/.test(move.name.trim())) {
    return move.name; // Not a damage value, keep original
  }
  
  const damage = typeof move.damage === 'number' ? move.damage : 
                 (typeof move.damage === 'string' ? parseInt(move.damage.split('+')[0].split(',')[0]) : 0);
  const guard = (move.guard || '').toUpperCase();
  const startup = typeof move.startup === 'number' ? move.startup : 
                  (typeof move.startup === 'string' ? parseInt(move.startup.split('~')[0]) : 999);
  
  // Get all normals to see what we've already assigned
  const existingNormals = allMoves.filter(m => m.type === 'normal' && m.name.match(/^[0-9]+[lmh]/i));
  const existingNames = new Set(existingNormals.map(m => m.name));
  
  // Group by damage ranges and guard to infer move type
  // Typical patterns:
  // - Standing Light (5L): 30-50 damage, fast startup (5-9f), guard LHA
  // - Crouching Light (2L): 30-50 damage, fast startup (6-10f), guard L
  // - Standing Medium (5M): 60-80 damage, medium startup (10-14f), guard LHA
  // - Crouching Medium (2M): 60-80 damage, medium startup (11-15f), guard L
  // - Standing Heavy (5H): 90-120 damage, slow startup (13-20f), guard LHA
  // - Crouching Heavy (2H): 90-120 damage, slow startup (15-25f), guard L
  // - Jumping Light (j.L): 30-50 damage, fast startup, guard A
  // - Jumping Medium (j.M): 60-80 damage, medium startup, guard A
  // - Jumping Heavy (j.H): 90-120 damage, slow startup, guard A
  
  // Light attacks (30-50 damage)
  if (damage >= 30 && damage <= 55) {
    if (guard.includes('A') && !guard.includes('L') && !guard.includes('H')) {
      // Air-only = jumping
      if (!existingNames.has('j.L')) return 'j.L';
      if (!existingNames.has('j.M')) return 'j.M';
      return 'j.L';
    } else if (guard.includes('L') && !guard.includes('H') && !guard.includes('A')) {
      // Low-only = crouching
      if (!existingNames.has('2L')) return '2L';
      return '2L';
    } else {
      // LHA or similar = standing
      if (!existingNames.has('5L')) return '5L';
      if (startup > 8 && !existingNames.has('5M')) return '5M'; // Might be medium if slower
      return '5L';
    }
  }
  
  // Medium attacks (60-80 damage)
  if (damage >= 56 && damage <= 85) {
    if (guard.includes('A') && !guard.includes('L') && !guard.includes('H')) {
      // Air-only = jumping
      if (!existingNames.has('j.M')) return 'j.M';
      return 'j.M';
    } else if (guard.includes('L') && !guard.includes('H') && !guard.includes('A')) {
      // Low-only = crouching
      if (!existingNames.has('2M')) return '2M';
      return '2M';
    } else {
      // LHA or similar = standing
      if (!existingNames.has('5M')) return '5M';
      if (startup > 12 && !existingNames.has('5H')) return '5H'; // Might be heavy if slower
      return '5M';
    }
  }
  
  // Heavy attacks (90-120 damage)
  if (damage >= 86 && damage <= 130) {
    if (guard.includes('A') && !guard.includes('L') && !guard.includes('H')) {
      // Air-only = jumping
      if (!existingNames.has('j.H')) return 'j.H';
      if (!existingNames.has('j.2H')) return 'j.2H';
      return 'j.H';
    } else if (guard.includes('L') && !guard.includes('H') && !guard.includes('A')) {
      // Low-only = crouching
      if (!existingNames.has('2H')) return '2H';
      return '2H';
    } else {
      // LHA or similar = standing
      if (!existingNames.has('5H')) return '5H';
      return '5H';
    }
  }
  
  // Default: keep original name
  return move.name;
}

function fixChampionMoveNames(champion: Champion): Champion {
  // First, get all normals
  const normals = champion.moves.filter(m => m.type === 'normal');
  const specials = champion.moves.filter(m => m.type !== 'normal');
  
  // Fix normal move names
  const fixedNormals = normals.map((move, index, allNormals) => {
    const newName = inferMoveName(move, index, allNormals);
    return {
      ...move,
      name: newName,
      // Update input if name changed
      input: newName.match(/^[0-9]+[lmh]/i) || newName.match(/^j\.[0-9]?[lmh]/i) ? newName : move.input
    };
  });
  
  return {
    ...champion,
    moves: [...fixedNormals, ...specials]
  };
}

async function main() {
  const filePath = path.join(process.cwd(), 'frame-data.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  console.log('🔧 Fixing normal move names...\n');
  
  data.champions = data.champions.map((champion: Champion) => {
    const before = champion.moves.filter(m => m.type === 'normal').map(m => m.name);
    const fixed = fixChampionMoveNames(champion);
    const after = fixed.moves.filter(m => m.type === 'normal').map(m => m.name);
    
    const renamed = before.filter((name, i) => name !== after[i]);
    if (renamed.length > 0) {
      console.log(`  ✅ ${champion.name}: Renamed ${renamed.length} normals`);
      renamed.forEach((oldName, i) => {
        if (oldName !== after[before.indexOf(oldName)]) {
          console.log(`     "${oldName}" → "${after[before.indexOf(oldName)]}"`);
        }
      });
    }
    
    return fixed;
  });
  
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ Fixed move names for all champions`);
}

main().catch(console.error);
