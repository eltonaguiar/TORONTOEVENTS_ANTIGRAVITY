import * as fs from 'fs';
import * as path from 'path';

interface Move {
  name: string;
  input?: string;
  inputGlyph?: string;
  keyboardButton?: string;
  startup?: number | string;
  onHit?: number | string;
  onBlock?: number | string;
  recovery?: number | string;
  damage?: number | string;
  guard?: string;
  type?: string;
}

function getKeyboardButtonFromInput(input: string): string {
  if (!input) return '';
  
  const buttonMatch = input.match(/([LMH]|S[12]|T)$/i);
  if (buttonMatch) {
    const btn = buttonMatch[1].toUpperCase();
    const mapping: { [key: string]: string } = {
      'L': 'Light',
      'M': 'Medium',
      'H': 'Heavy',
      'S1': 'Special 1',
      'S2': 'Special 2',
      'T': 'Tag'
    };
    return mapping[btn] || btn;
  }
  return '';
}

function generateInputGlyph(input: string): string {
  const glyphs: { [key: string]: string } = {
    '1': '↙', '2': '↓', '3': '↘',
    '4': '←', '5': '', '6': '→',
    '7': '↖', '8': '↑', '9': '↗'
  };
  
  const match = input.match(/^([1-9]?)([LMH]|S[12]|T|j\.([0-9]+[LMH]))/i);
  if (match) {
    const direction = match[1] || '5';
    const button = match[2] || match[3] || '';
    const directionGlyph = glyphs[direction] || '';
    const buttonGlyph = button.replace(/L/i, 'L').replace(/M/i, 'M').replace(/H/i, 'H')
                              .replace(/S1/i, 'S1').replace(/S2/i, 'S2').replace(/T/i, 'T');
    
    if (match[0].startsWith('j.')) {
      return `j.${directionGlyph}${buttonGlyph}`;
    }
    return directionGlyph ? `${directionGlyph} ${buttonGlyph}` : buttonGlyph;
  }
  
  return input;
}

function extractInputFromName(name: string): string {
  // Try to extract FGC notation from move name
  const fgcMatch = name.match(/^([0-9]+[LMH]|[0-9]+S[12]|S[12]|T|2T|4T|6S[12]|j\.[0-9]+[LMH])/i);
  return fgcMatch ? fgcMatch[1] : '';
}

function addInputDataToMoves(moves: Move[]): Move[] {
  return moves.map(move => {
    // If input data already exists, keep it
    if (move.input || move.inputGlyph || move.keyboardButton) {
      return move;
    }
    
    // Try to extract from name
    const input = extractInputFromName(move.name);
    
    if (input) {
      return {
        ...move,
        input,
        inputGlyph: generateInputGlyph(input),
        keyboardButton: getKeyboardButtonFromInput(input)
      };
    }
    
    // Try to infer from move name patterns
    const nameLower = move.name.toLowerCase();
    if (nameLower.includes('light') || nameLower.match(/\bl\b/)) {
      return {
        ...move,
        keyboardButton: 'Light'
      };
    }
    if (nameLower.includes('medium') || nameLower.match(/\bm\b/)) {
      return {
        ...move,
        keyboardButton: 'Medium'
      };
    }
    if (nameLower.includes('heavy') || nameLower.match(/\bh\b/)) {
      return {
        ...move,
        keyboardButton: 'Heavy'
      };
    }
    if (nameLower.includes('special 1') || nameLower.includes('s1')) {
      return {
        ...move,
        keyboardButton: 'Special 1'
      };
    }
    if (nameLower.includes('special 2') || nameLower.includes('s2')) {
      return {
        ...move,
        keyboardButton: 'Special 2'
      };
    }
    
    return move;
  });
}

async function main() {
  const filePath = path.join(process.cwd(), 'frame-data.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  data.champions = data.champions.map((champion: { name: string; moves: Move[] }) => ({
    ...champion,
    moves: addInputDataToMoves(champion.moves)
  }));
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log('✅ Added input data to all moves');
  console.log(`📊 Updated ${data.champions.length} champions`);
}

main().catch(console.error);
