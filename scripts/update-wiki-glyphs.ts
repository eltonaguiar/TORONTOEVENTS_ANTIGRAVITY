import * as fs from 'fs';
import * as path from 'path';

interface Move {
  name: string;
  input?: string;
  inputGlyph?: string;
  keyboardButton?: string;
  [key: string]: any;
}

// Wiki uses specific notation formats:
// - "5L" → "5NeutralL" or just shows "5L" with neutral position
// - "2L" → "2 Down L" 
// - "6S1" → "6 Forward S1"
// - "4S1" → "4 Back S1"
// - "j.L" → "j.JumpingL" or "Air Light"
// Direction glyphs: ← → ↑ ↓ ↖ ↗ ↙ ↘ (Unicode arrows)

function generateWikiStyleGlyph(input: string): string {
  if (!input) return '';
  
  // Wiki-style directional mapping
  const directionMap: { [key: string]: { glyph: string; name: string } } = {
    '1': { glyph: '↙', name: 'Down-Back' },
    '2': { glyph: '↓', name: 'Down' },
    '3': { glyph: '↘', name: 'Down-Forward' },
    '4': { glyph: '←', name: 'Back' },
    '5': { glyph: '', name: 'Neutral' }, // No glyph for neutral
    '6': { glyph: '→', name: 'Forward' },
    '7': { glyph: '↖', name: 'Up-Back' },
    '8': { glyph: '↑', name: 'Up' },
    '9': { glyph: '↗', name: 'Up-Forward' }
  };
  
  // Button mapping
  const buttonMap: { [key: string]: string } = {
    'L': 'Light',
    'M': 'Medium',
    'H': 'Heavy',
    'S1': 'Special 1',
    'S2': 'Special 2',
    'T': 'Tag'
  };
  
  // Parse input notation
  // Patterns: "5L", "2M", "6S1", "4S2", "j.L", "j.2H", "5S1~6S1", etc.
  
  // Handle jump moves
  if (input.startsWith('j.')) {
    const jumpMatch = input.match(/^j\.([0-9]?)([LMH]|S[12]|T)$/i);
    if (jumpMatch) {
      const direction = jumpMatch[1] || '5';
      const button = jumpMatch[2].toUpperCase();
      const dirInfo = directionMap[direction] || { glyph: '', name: '' };
      const buttonName = buttonMap[button] || button;
      
      if (direction === '5') {
        return `j.${buttonName}`;
      } else {
        return `j.${dirInfo.glyph} ${buttonName}`;
      }
    }
    return input;
  }
  
  // Handle charge moves like "5[H]"
  if (input.includes('[') && input.includes(']')) {
    const chargeMatch = input.match(/^([0-9]?)(\[([LMH]|S[12])\])$/i);
    if (chargeMatch) {
      const direction = chargeMatch[1] || '5';
      const button = chargeMatch[3].toUpperCase();
      const dirInfo = directionMap[direction] || { glyph: '', name: '' };
      const buttonName = buttonMap[button] || button;
      
      if (direction === '5') {
        return `[${buttonName}]`;
      } else {
        return `${dirInfo.glyph}[${buttonName}]`;
      }
    }
  }
  
  // Handle chain moves like "5S1~6S1"
  if (input.includes('~')) {
    const parts = input.split('~');
    const glyphParts = parts.map(part => generateWikiStyleGlyph(part.trim()));
    return glyphParts.join(' ~ ');
  }
  
  // Handle compound inputs like "5(M+H)"
  if (input.includes('(') && input.includes(')')) {
    const compoundMatch = input.match(/^([0-9]?)\(([^)]+)\)$/i);
    if (compoundMatch) {
      const direction = compoundMatch[1] || '5';
      const buttons = compoundMatch[2];
      const dirInfo = directionMap[direction] || { glyph: '', name: '' };
      
      // Parse button combinations like "M+H" or "S1+S2"
      const buttonParts = buttons.split(/[+\/]/).map(b => {
        const btn = b.trim().toUpperCase();
        return buttonMap[btn] || btn;
      });
      
      const buttonStr = buttonParts.join('+');
      
      if (direction === '5') {
        return buttonStr;
      } else {
        return `${dirInfo.glyph} ${buttonStr}`;
      }
    }
  }
  
  // Standard notation: "5L", "2M", "6S1", etc.
  const standardMatch = input.match(/^([0-9]?)([LMH]|S[12]|T)$/i);
  if (standardMatch) {
    const direction = standardMatch[1] || '5';
    const button = standardMatch[2].toUpperCase();
    const dirInfo = directionMap[direction] || { glyph: '', name: '' };
    const buttonName = buttonMap[button] || button;
    
    // For neutral (5), just show button name
    if (direction === '5') {
      return buttonName;
    } else {
      // For directional, show glyph + button
      return `${dirInfo.glyph} ${buttonName}`;
    }
  }
  
  // Fallback: return as-is
  return input;
}

function updateFrameDataGlyphs() {
  const frameDataPath = path.join(process.cwd(), 'frame-data.json');
  
  if (!fs.existsSync(frameDataPath)) {
    console.error('frame-data.json not found');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(frameDataPath, 'utf-8'));
  
  let updated = 0;
  
  data.champions.forEach((champion: any) => {
    champion.moves.forEach((move: Move) => {
      if (move.input) {
        const newGlyph = generateWikiStyleGlyph(move.input);
        if (newGlyph !== move.inputGlyph) {
          move.inputGlyph = newGlyph;
          updated++;
        }
      }
    });
  });
  
  fs.writeFileSync(frameDataPath, JSON.stringify(data, null, 2));
  console.log(`✅ Updated ${updated} input glyphs to match wiki style`);
  console.log(`📊 Total champions: ${data.champions.length}`);
}

updateFrameDataGlyphs();
