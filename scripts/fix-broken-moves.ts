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

// Check if a move name is broken (just numbers, math expressions, etc.)
function isBrokenMoveName(name: string): boolean {
  if (!name || name.trim() === '') return true;
  
  // Check if it's just a number (3+ digits is suspicious, 1-2 digits might be valid like "5L")
  if (/^\d{3,}$/.test(name.trim())) {
    return true; // Numbers like "150", "50420" are broken
  }
  
  // Check if it's a mathematical expression (damage calculation)
  if (/^\d+[x×]\d+/.test(name.trim()) || 
      /\d+[x×]\d+/.test(name.trim()) ||
      /\d+\+\d+/.test(name.trim()) ||
      /\d+[x×]\d+\+\d+[x×]\d+/.test(name.trim())) {
    return true; // Things like "50420x3+74x6", "59 (35x2)"
  }
  
  // Check if it's just a single digit (unless it's part of FGC notation)
  if (/^\d$/.test(name.trim()) && name.length === 1) {
    return true; // Just "1" is broken
  }
  
  return false;
}

// Remove duplicate moves (same name, but keep the one with most complete data)
function removeDuplicates(moves: Move[]): Move[] {
  const seen = new Map<string, Move>();
  
  for (const move of moves) {
    const key = move.name.toLowerCase().trim();
    
    if (!seen.has(key)) {
      seen.set(key, move);
    } else {
      // Compare with existing - keep the one with more complete data
      const existing = seen.get(key)!;
      const existingDataCount = [
        existing.input, existing.inputGlyph, existing.keyboardButton,
        existing.keyboardInput, existing.startup, existing.onHit,
        existing.onBlock, existing.recovery, existing.damage, existing.guard
      ].filter(x => x !== undefined && x !== null && x !== '-').length;
      
      const newDataCount = [
        move.input, move.inputGlyph, move.keyboardButton,
        move.keyboardInput, move.startup, move.onHit,
        move.onBlock, move.recovery, move.damage, move.guard
      ].filter(x => x !== undefined && x !== null && x !== '-').length;
      
      // Keep the one with more data, or if equal, keep the first one
      if (newDataCount > existingDataCount) {
        seen.set(key, move);
      }
    }
  }
  
  return Array.from(seen.values());
}

async function main() {
  const filePath = path.join(process.cwd(), 'frame-data.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  console.log('🔧 Fixing broken moves and removing duplicates...\n');
  
  let totalRemoved = 0;
  let totalDuplicatesRemoved = 0;
  
  data.champions = data.champions.map((champion: Champion) => {
    const beforeCount = champion.moves.length;
    
    // Remove broken moves
    const validMoves = champion.moves.filter(move => {
      if (isBrokenMoveName(move.name)) {
        console.log(`  ❌ ${champion.name}: Removing broken move "${move.name}"`);
        totalRemoved++;
        return false;
      }
      return true;
    });
    
    // Remove duplicates
    const uniqueMoves = removeDuplicates(validMoves);
    const duplicatesRemoved = validMoves.length - uniqueMoves.length;
    if (duplicatesRemoved > 0) {
      console.log(`  🔄 ${champion.name}: Removed ${duplicatesRemoved} duplicate moves`);
      totalDuplicatesRemoved += duplicatesRemoved;
    }
    
    const afterCount = uniqueMoves.length;
    if (beforeCount !== afterCount) {
      console.log(`  ✅ ${champion.name}: ${beforeCount} → ${afterCount} moves (removed ${beforeCount - afterCount})`);
    }
    
    return {
      ...champion,
      moves: uniqueMoves
    };
  });
  
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ Removed ${totalRemoved} broken moves`);
  console.log(`✅ Removed ${totalDuplicatesRemoved} duplicate moves`);
  console.log(`📊 Total champions: ${data.champions.length}`);
}

main().catch(console.error);
