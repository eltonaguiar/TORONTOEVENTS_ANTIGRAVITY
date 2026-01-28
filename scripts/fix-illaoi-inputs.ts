import * as fs from 'fs';
import * as path from 'path';

interface Move {
  name: string;
  input?: string;
  [key: string]: any;
}

interface Champion {
  name: string;
  moves: Move[];
}

async function main() {
  const filePath = path.join(process.cwd(), 'frame-data.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  const illaoi = data.champions.find((c: Champion) => c.name === 'Illaoi');
  if (!illaoi) {
    console.log('❌ Illaoi not found');
    return;
  }
  
  console.log('🔧 Fixing Illaoi input fields...\n');
  
  let fixed = 0;
  illaoi.moves.forEach((move: Move) => {
    // Fix moves where input is "Damage: X" or similar
    if (move.input && (move.input.startsWith('Damage:') || move.input.includes('Damage:'))) {
      // Use the move name as input if it's FGC notation
      if (move.name.match(/^[0-9j][LMH]|^[0-9j]\.[LMH]|^[0-9j]S[12]/)) {
        move.input = move.name;
        fixed++;
        console.log(`  ✅ ${move.name}: Fixed input from "${move.input}" to "${move.name}"`);
      } else if (move.name.includes('Throw')) {
        move.input = move.name.includes('Forward') ? '4T' : move.name.includes('Back') ? '6T' : 'j.T';
        fixed++;
        console.log(`  ✅ ${move.name}: Set input to "${move.input}"`);
      } else {
        // For special moves, try to infer from name
        const specialInputs: { [key: string]: string } = {
          'Tag Launcher': '5T',
          'Tentacle Smash': '236S1',
          'Riptide': '214S1',
          'Tidal Swing': '236S2',
          'Prayer in Stagnation': '22S1',
          'Prayer of Motion': '22S2',
          'Serpent\'s Tongue': '623S1',
          'Guiding Hand': '236S1',
          'Harsh Lesson': '214S2',
          'From the Depths': '236S1',
          'Faith in Motion': '214S1',
          'Crashing Waves': '236S1+S2',
          'Wrath of Nagakabouros': '236S1+S2',
          'Test of Spirit': 'S1+S2',
          'Guiding Hand Assist': '5T',
          'Tentacle Smash Assist': '236S1',
          'Wrath of Nagakabouros Assist': '236S1+S2'
        };
        
        if (specialInputs[move.name]) {
          move.input = specialInputs[move.name];
          fixed++;
          console.log(`  ✅ ${move.name}: Set input to "${move.input}"`);
        }
      }
    }
  });
  
  if (fixed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`\n✅ Fixed ${fixed} input fields for Illaoi`);
  } else {
    console.log('\n✅ No input fields needed fixing');
  }
}

main().catch(console.error);
