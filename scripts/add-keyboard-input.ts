import * as fs from 'fs';
import * as path from 'path';

interface Move {
  name: string;
  input?: string;
  inputGlyph?: string;
  keyboardButton?: string;
  keyboardInput?: string; // New field for keyboard key notation
  [key: string]: any;
}

// 2XKO Default Keyboard Controls (based on standard fighting game keyboard layouts)
// Common defaults:
// - Light (L): Usually J or U
// - Medium (M): Usually I or K  
// - Heavy (H): Usually O or L
// - Special 1 (S1): Usually M
// - Special 2 (S2): Usually Comma (,)
// - Parry: Usually U
// - Tag: Usually Space or T
// - Directions: WASD or Arrow Keys

// 2XKO Default Keyboard Layout (from official controls)
const keyboardMapping: { [key: string]: string } = {
  // Buttons
  'L': 'J',           // Light
  'M': 'K',           // Medium  
  'H': 'L',           // Heavy
  'S1': 'M',          // Special 1
  'S2': ',',          // Special 2 (Comma)
  'T': '.',           // Tag (Period)
  'P': 'U',           // Parry
  'THROW': 'I',       // Throw
  
  // Directions (WASD layout)
  '1': 'S+A',         // Down-Back (S + A)
  '2': 'S',           // Down
  '3': 'S+D',         // Down-Forward (S + D)
  '4': 'A',           // Back
  '5': '',            // Neutral (no direction)
  '6': 'D',           // Forward
  '7': 'W+A',         // Up-Back (W + A)
  '8': 'W',           // Up
  '9': 'W+D',         // Up-Forward (W + D)
  
  // Jump notation
  'j.': 'W+',         // Jump prefix
};

function convertToKeyboardInput(input: string): string {
  if (!input) return '';
  
  // Handle jump moves (j.L, j.2H, etc.)
  if (input.startsWith('j.')) {
    const jumpMatch = input.match(/^j\.([0-9]?)([LMH]|S[12]|T)$/i);
    if (jumpMatch) {
      const direction = jumpMatch[1] || '5';
      const button = jumpMatch[2].toUpperCase();
      const dirKey = keyboardMapping[direction] || '';
      const buttonKey = keyboardMapping[button] || button;
      
      if (direction === '5') {
        return `W + ${buttonKey}`;
      } else {
        return `W + ${dirKey} + ${buttonKey}`;
      }
    }
    // Handle j.5S2, j.4S2, etc.
    const jumpMatch2 = input.match(/^j\.([0-9]?)(S[12])$/i);
    if (jumpMatch2) {
      const direction = jumpMatch2[1] || '5';
      const button = jumpMatch2[2].toUpperCase();
      const dirKey = keyboardMapping[direction] || '';
      const buttonKey = keyboardMapping[button] || button;
      
      if (direction === '5') {
        return `W + ${buttonKey}`;
      } else {
        return `W + ${dirKey} + ${buttonKey}`;
      }
    }
  }
  
  // Handle charge moves like "5[H]"
  if (input.includes('[') && input.includes(']')) {
    const chargeMatch = input.match(/^([0-9]?)(\[([LMH]|S[12])\])$/i);
    if (chargeMatch) {
      const direction = chargeMatch[1] || '5';
      const button = chargeMatch[3].toUpperCase();
      const dirKey = keyboardMapping[direction] || '';
      const buttonKey = keyboardMapping[button] || button;
      
      if (direction === '5') {
        return `Hold ${buttonKey}`;
      } else {
        return `Hold ${dirKey} + ${buttonKey}`;
      }
    }
  }
  
  // Handle chain moves like "5S1~6S1"
  if (input.includes('~')) {
    const parts = input.split('~');
    const keyboardParts = parts.map(part => convertToKeyboardInput(part.trim()));
    return keyboardParts.join(' → ');
  }
  
  // Handle compound inputs like "5(M+H)" or "S1+L/M/H"
  if (input.includes('(') && input.includes(')')) {
    const compoundMatch = input.match(/^([0-9]?)\(([^)]+)\)$/i);
    if (compoundMatch) {
      const direction = compoundMatch[1] || '5';
      const buttons = compoundMatch[2];
      const dirKey = keyboardMapping[direction] || '';
      
      // Parse button combinations like "M+H" or "S1+S2"
      const buttonParts = buttons.split(/[+\/]/).map(b => {
        const btn = b.trim().toUpperCase();
        return keyboardMapping[btn] || btn;
      });
      
      const buttonStr = buttonParts.join(' + ');
      
      if (direction === '5') {
        return buttonStr;
      } else {
        return `${dirKey} + ${buttonStr}`;
      }
    }
    
    // Handle "S1+L/M/H" format
    const superMatch = input.match(/^(S[12])\+([^)]+)$/i);
    if (superMatch) {
      const special = superMatch[1].toUpperCase();
      const buttons = superMatch[2];
      const specialKey = keyboardMapping[special] || special;
      
      const buttonParts = buttons.split(/[+\/]/).map(b => {
        const btn = b.trim().toUpperCase();
        return keyboardMapping[btn] || btn;
      });
      
      return `${specialKey} + ${buttonParts.join(' / ')}`;
    }
  }
  
  // Handle "S1+S2" for Ultimate
  if (input.includes('+') && !input.includes('(')) {
    const parts = input.split('+');
    const keyboardParts = parts.map(part => {
      const btn = part.trim().toUpperCase();
      return keyboardMapping[btn] || btn;
    });
    return keyboardParts.join(' + ');
  }
  
  // Handle standalone "1" or "2" as S1/S2 (common shorthand)
  if (input === '1' || input === 'S1') {
    return keyboardMapping['S1'];
  }
  if (input === '2' || input === 'S2') {
    return keyboardMapping['S2'];
  }
  
  // Standard notation: "5L", "2M", "6S1", etc.
  const standardMatch = input.match(/^([0-9]?)([LMH]|S[12]|T)$/i);
  if (standardMatch) {
    const direction = standardMatch[1] || '5';
    const button = standardMatch[2].toUpperCase();
    const dirKey = keyboardMapping[direction] || '';
    const buttonKey = keyboardMapping[button] || button;
    
    // For neutral (5), just show button
    if (direction === '5') {
      return buttonKey;
    } else {
      // For directional, show direction + button
      return `${dirKey} + ${buttonKey}`;
    }
  }
  
  // Handle "6S1" format (direction + S1/S2)
  const dirSpecialMatch = input.match(/^([0-9])(S[12])$/i);
  if (dirSpecialMatch) {
    const direction = dirSpecialMatch[1];
    const special = dirSpecialMatch[2].toUpperCase();
    const dirKey = keyboardMapping[direction] || '';
    const specialKey = keyboardMapping[special] || special;
    return `${dirKey} + ${specialKey}`;
  }
  
  // Handle moves like "6S1~L/M/H"
  const chainMatch = input.match(/^([0-9]?)(S[12])~([LMH]\/[LMH]\/[LMH])$/i);
  if (chainMatch) {
    const direction = chainMatch[1] || '5';
    const special = chainMatch[2].toUpperCase();
    const buttons = chainMatch[3];
    const dirKey = keyboardMapping[direction] || '';
    const specialKey = keyboardMapping[special] || special;
    
    const buttonParts = buttons.split('/').map(b => {
      const btn = b.trim().toUpperCase();
      return keyboardMapping[btn] || btn;
    });
    
    if (direction === '5') {
      return `${specialKey} → ${buttonParts.join(' / ')}`;
    } else {
      return `${dirKey} + ${specialKey} → ${buttonParts.join(' / ')}`;
    }
  }
  
  // Fallback: return as-is
  return input;
}

function addKeyboardInputToMoves() {
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
        const newKeyboardInput = convertToKeyboardInput(move.input);
        if (newKeyboardInput && newKeyboardInput !== move.keyboardInput) {
          move.keyboardInput = newKeyboardInput;
          updated++;
        }
      }
    });
  });
  
  fs.writeFileSync(frameDataPath, JSON.stringify(data, null, 2));
  console.log(`✅ Added keyboard input notation to ${updated} moves`);
  console.log(`📊 Total champions: ${data.champions.length}`);
  console.log(`\nKeyboard Layout:`);
  console.log(`  Light (L): J`);
  console.log(`  Medium (M): K`);
  console.log(`  Heavy (H): L`);
  console.log(`  Special 1 (S1): M`);
  console.log(`  Special 2 (S2): , (Comma)`);
  console.log(`  Tag (T): . (Period)`);
  console.log(`  Parry: U`);
  console.log(`  Throw: I`);
  console.log(`  Directions: WASD (W=Up, A=Back, S=Down, D=Forward)`);
}

addKeyboardInputToMoves();
