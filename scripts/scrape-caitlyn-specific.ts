import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface Move {
  name: string;
  input?: string;
  inputGlyph?: string;
  keyboardButton?: string;
  startup?: number | string;
  active?: number | string;
  recovery?: number | string;
  onHit?: number | string;
  onBlock?: number | string;
  damage?: number | string;
  guard?: string;
  type?: string;
}

function parseFrameValue(value: string): number | string {
  if (!value || value.trim() === '-' || value.trim() === '' || value.trim() === '—') return '-';
  // Handle ranges like "26 - 32" or "27-52"
  const rangeMatch = value.match(/(\d+)\s*[-~]\s*(\d+)/);
  if (rangeMatch) {
    return value.trim(); // Keep range as string
  }
  const cleaned = value.trim().replace(/[^\d+-]/g, '');
  const num = parseInt(cleaned);
  return isNaN(num) ? value.trim() : num;
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

async function scrapeCaitlyn() {
  console.log('🎮 Scraping Caitlyn frame data from wiki.play2xko.com...\n');
  
  const url = 'https://wiki.play2xko.com/en-us/Caitlyn';
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://wiki.play2xko.com/',
        'Cache-Control': 'no-cache'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const moves: Move[] = [];
    
    console.log('📊 Searching for frame data tables...\n');

    // Find all tables and check if they contain frame data
    $('table').each((tableIdx, table) => {
      const rows = $(table).find('tr');
      if (rows.length < 2) return;

      // Get headers
      const headers: string[] = [];
      $(rows[0]).find('th, td').each((_, cell) => {
        headers.push($(cell).text().trim().toLowerCase());
      });

      // Check if this is a frame data table
      const headerText = headers.join(' ');
      const hasFrameData = headerText.includes('startup') || 
                          headerText.includes('on-block') || 
                          headerText.includes('on-hit') ||
                          headerText.includes('recovery') ||
                          headerText.includes('active');
      
      if (!hasFrameData) return;

      console.log(`  Found frame data table ${tableIdx + 1} with ${rows.length - 1} moves`);

      // Find column indices
      const startupCol = headers.findIndex(h => h.includes('startup'));
      const activeCol = headers.findIndex(h => h.includes('active'));
      const recoveryCol = headers.findIndex(h => h.includes('recovery'));
      const onBlockCol = headers.findIndex(h => h.includes('on-block') || h.includes('on block'));
      const onHitCol = headers.findIndex(h => h.includes('on-hit') || h.includes('on hit'));
      const damageCol = headers.findIndex(h => h.includes('damage'));
      const guardCol = headers.findIndex(h => h.includes('guard'));

      // Get move name from heading before table
      let moveNameFromHeading = '';
      $(table).prevAll('h3, h4, h5').first().each((_, heading) => {
        const headingText = $(heading).text().trim();
        // Remove common suffixes like "edit | edit source"
        const cleanHeading = headingText.split('[')[0].trim();
        if (cleanHeading && cleanHeading.length < 50) {
          moveNameFromHeading = cleanHeading;
        }
      });

      // Process data rows
      rows.slice(1).each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length === 0) return;

        // Use heading name or first cell as move name
        const moveName = moveNameFromHeading || $(cells[0]).text().trim();
        if (!moveName || moveName === '') return;

        // Extract input from move name
        let inputNotation = '';
        let keyboardButton = '';
        
        // Try to extract FGC notation from move name
        const fgcMatch = moveName.match(/(\d+[LMH]|[0-9]+S[12]|S[12]|T|2T|4T|6S[12]|j\.[0-9]+[LMH]|4H|Bridge Kick)/i);
        if (fgcMatch) {
          inputNotation = fgcMatch[1];
          keyboardButton = getKeyboardButtonFromInput(inputNotation);
        }

        const move: Move = {
          name: moveName,
          input: inputNotation || undefined,
          inputGlyph: inputNotation ? generateInputGlyph(inputNotation) : undefined,
          keyboardButton: keyboardButton || undefined,
          startup: startupCol !== -1 ? parseFrameValue($(cells[startupCol]).text()) : undefined,
          active: activeCol !== -1 ? parseFrameValue($(cells[activeCol]).text()) : undefined,
          recovery: recoveryCol !== -1 ? parseFrameValue($(cells[recoveryCol]).text()) : undefined,
          onHit: onHitCol !== -1 ? parseFrameValue($(cells[onHitCol]).text()) : undefined,
          onBlock: onBlockCol !== -1 ? parseFrameValue($(cells[onBlockCol]).text()) : undefined,
          damage: damageCol !== -1 ? parseFrameValue($(cells[damageCol]).text()) : undefined,
          guard: guardCol !== -1 ? $(cells[guardCol]).text().trim() : undefined
        };

        // Determine move type from name or context
        const nameLower = moveName.toLowerCase();
        if (nameLower.match(/^[0-9][lmh]/) || nameLower.includes('normal') || nameLower.includes('standing') || nameLower.includes('crouching') || nameLower.includes('jumping')) {
          move.type = 'normal';
        } else if (nameLower.includes('super') || nameLower.includes('ult') || nameLower.includes('ultimate')) {
          move.type = 'super';
        } else if (nameLower.includes('throw') || nameLower.includes('tag launcher')) {
          move.type = 'special';
        } else {
          move.type = 'special';
        }

        moves.push(move);
        console.log(`    ✅ ${moveName}: ${move.startup}f startup, ${move.onBlock} on block`);
      });
    });

    if (moves.length === 0) {
      console.log('❌ No frame data found');
      return null;
    }

    console.log(`\n✅ Found ${moves.length} moves for Caitlyn`);
    return {
      name: 'Caitlyn',
      moves
    };
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function main() {
  const champion = await scrapeCaitlyn();
  if (!champion) {
    process.exit(1);
  }

  // Read existing frame data
  const frameDataPath = path.join(process.cwd(), 'frame-data.json');
  let existingData: any = { champions: [] };
  if (fs.existsSync(frameDataPath)) {
    existingData = JSON.parse(fs.readFileSync(frameDataPath, 'utf-8'));
  }

  // Remove existing Caitlyn if present
  existingData.champions = existingData.champions.filter((c: any) => c.name !== 'Caitlyn');
  
  // Add new Caitlyn data
  existingData.champions.push(champion);
  existingData.lastUpdated = new Date().toISOString();
  existingData.source = '2XKO Wiki (https://wiki.play2xko.com/en-us/)';

  fs.writeFileSync(frameDataPath, JSON.stringify(existingData, null, 2));
  console.log(`\n✅ Frame data updated: ${existingData.champions.length} champions, ${existingData.champions.reduce((sum: number, c: any) => sum + (c.moves?.length || 0), 0)} total moves`);
}

main().catch(console.error);
