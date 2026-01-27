import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface Move {
  name: string;
  input?: string; // FGC notation (e.g., "5L", "2M", "S1", "6S1")
  inputGlyph?: string; // Visual glyph representation
  keyboardButton?: string; // Keyboard button name (e.g., "Light", "Medium", "Special 1")
  startup?: number | string;
  onHit?: number | string;
  onBlock?: number | string;
  recovery?: number | string;
  damage?: number | string;
  guard?: string;
  type?: string;
}

interface Champion {
  name: string;
  moves: Move[];
}

const CHAMPIONS = [
  'Ahri',
  'Blitzcrank',
  'Braum',
  'Caitlyn',
  'Darius',
  'Ekko',
  'Illaoi',
  'Jinx',
  'Teemo',
  'Vi',
  'Warwick',
  'Yasuo',
  'Vi',
  'Jinx',
  'Darius',
  'Blitzcrank',
  'Teemo',
  'Warwick',
  'Caitlyn'
];

function parseFrameValue(value: string): number | string {
  if (!value || value.trim() === '-' || value.trim() === '') return '-';
  const cleaned = value.trim().replace(/[^\d+-]/g, '');
  const num = parseInt(cleaned);
  return isNaN(num) ? value.trim() : num;
}

function generateInputGlyph(input: string): string {
  // Convert FGC notation to visual glyph representation
  // Format: direction + button (e.g., "5L" → "→ L", "2M" → "↓ M", "6S1" → "→ S1")
  const glyphs: { [key: string]: string } = {
    '1': '↙', '2': '↓', '3': '↘',
    '4': '←', '5': '', '6': '→',
    '7': '↖', '8': '↑', '9': '↗'
  };
  
  // Match direction + button
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

async function scrapeChampionFrameData(championName: string): Promise<Champion | null> {
  // Try multiple URL patterns - correct domain is wiki.play2xko.com
  // Frame data is often on the main champion page, not a separate Frame_Data page
  const urls = [
    `https://wiki.play2xko.com/en-us/${championName}`, // Main page (has frame data tables)
    `https://wiki.play2xko.com/en-us/${championName}/Frame_Data`, // Dedicated frame data page
    `https://2xko.wiki/w/${championName}/Frame_Data`,
    `https://2xko.wiki/w/${championName}`
  ];
  
  let $: cheerio.CheerioAPI | null = null;
  let successfulUrl = '';
  let allMoves: Move[] = [];

  // Try each URL and collect data from all that have content
  for (const url of urls) {
    try {
      console.log(`  Trying: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://wiki.play2xko.com/',
          'Cache-Control': 'no-cache'
        },
        timeout: 15000,
        maxRedirects: 5
      });

      $ = cheerio.load(response.data);
      
      // Quick check if page has frame data indicators
      const bodyText = $.text().toLowerCase();
      const hasFrameData = bodyText.includes('startup') || bodyText.includes('on hit') || 
                          bodyText.includes('on block') || bodyText.includes('frame') ||
                          $('table').length > 0;
      
      if (hasFrameData) {
        successfulUrl = url;
        console.log(`  ✅ Found content at: ${url}`);
        
        // Extract moves from this page
        const pageMoves = extractMovesFromPage($, championName);
        if (pageMoves.length > 0) {
          allMoves = [...allMoves, ...pageMoves];
          console.log(`  📊 Extracted ${pageMoves.length} moves from this page`);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        continue; // Try next URL
      }
      console.log(`  ⚠️ Error: ${error.message}`);
      continue;
    }
  }

  if (allMoves.length === 0 && $) {
    // If we loaded a page but found no moves, try one more time with the last loaded page
    const pageMoves = extractMovesFromPage($, championName);
    allMoves = pageMoves;
  }

  if (allMoves.length === 0) {
    console.log(`  ❌ No frame data found for ${championName}`);
    return null;
  }

  // Remove duplicates based on move name
  const uniqueMoves = Array.from(
    new Map(allMoves.map(m => [m.name, m])).values()
  );

  console.log(`  ✅ Found ${uniqueMoves.length} unique moves for ${championName}`);
  return {
    name: championName,
    moves: uniqueMoves
  };
}

function extractMovesFromPage($: cheerio.CheerioAPI, championName: string): Move[] {
  const moves: Move[] = [];

  // First, try to extract from move list sections with frame data in text
  $('h2, h3, h4').each((_, heading) => {
    const headingText = $(heading).text().trim();
    if (headingText.includes('Normals') || headingText.includes('Specials') || headingText.includes('Supers')) {
      // Look for move lists under this heading
      let currentSection = $(heading).nextUntil('h2, h3, h4');
      currentSection.find('ul li, p').each((_, item) => {
        const text = $(item).text();
        // Look for move notation patterns like "5L", "2M", "S1", etc.
        const moveMatch = text.match(/^([0-9]+[LMH]|[0-9]+S[12]|S[12]|T|2T|4T)\s*[:\-]?\s*(.+?)(?:\s*[:\-]|$)/);
        if (moveMatch) {
          const moveName = moveMatch[1].trim();
          const description = moveMatch[2] || text;
          
          // Try to extract frame data from description
          const frameMatches = description.match(/(\d+)\s*(?:frame|f|startup|hit|block)/gi);
          if (frameMatches || description.length > 10) {
            // Create move entry - we'll try to get actual frame data from tables
            moves.push({
              name: moveName,
              type: headingText.toLowerCase().includes('normal') ? 'normal' : 
                    headingText.toLowerCase().includes('super') ? 'super' : 'special'
            });
          }
        }
      });
    }
  });

  // Look for frame data tables - be more aggressive
  // wiki.play2xko.com has tables with columns: Damage, Guard, Startup, Active, Recovery, On-Block, On-Hit, Meter-Gain, Cancel, Invuln
  $('table.wikitable, table, .wikitable table, .frame-data table').each((_, table) => {
      const rows = $(table).find('tr');
      if (rows.length < 2) return; // Need at least header + data row

      // Get headers to understand column structure
      const headers: string[] = [];
      $(rows[0]).find('th, td').each((_, cell) => {
        const text = $(cell).text().trim().toLowerCase();
        headers.push(text);
      });

      // Check if this looks like a frame data table
      const headerText = headers.join(' ');
      const isFrameDataTable = headerText.includes('startup') || 
                               headerText.includes('on-block') || 
                               headerText.includes('on-hit') ||
                               headerText.includes('recovery') ||
                               headerText.includes('active');
      
      if (!isFrameDataTable && headers.length < 5) {
        return; // Skip non-frame-data tables
      }

      // Find which columns contain what data - more flexible matching
      // wiki.play2xko.com uses: Damage, Guard, Startup, Active, Recovery, On-Block, On-Hit, Meter-Gain, Cancel, Invuln
      // Move name is usually in the first column or in a heading before the table
      const moveCol = headers.findIndex(h => 
        h.includes('move') || h.includes('input') || h.includes('command') || 
        h.includes('notation') || h === '' || (h.length < 5 && !h.includes('risk') && !h.includes('damage'))
      );
      const inputCol = headers.findIndex(h => h.includes('input'));
      const startupCol = headers.findIndex(h => 
        h.includes('startup') || h.includes('start') || (h.includes('frame') && !h.includes('active'))
      );
      const activeCol = headers.findIndex(h => 
        h.includes('active') || (h.includes('hitbox') && h.includes('duration'))
      );
      const onHitCol = headers.findIndex(h => 
        (h.includes('hit') && (h.includes('on') || h.includes('advantage'))) || 
        (h.includes('on-hit') || h.includes('on hit'))
      );
      const onBlockCol = headers.findIndex(h => 
        h.includes('block') && (h.includes('on') || h.includes('advantage') || h.includes('frame')) ||
        h.includes('on-block') || h.includes('on block')
      );
      const recoveryCol = headers.findIndex(h => 
        h.includes('recovery') || (h.includes('vulnerable') && h.includes('frame'))
      );
      const damageCol = headers.findIndex(h => 
        h.includes('damage') || h.includes('dmg')
      );
      const guardCol = headers.findIndex(h => 
        h.includes('guard') || h.includes('block type') || h.includes('property')
      );
      const notesCol = headers.findIndex(h => h.includes('note'));

      // For wiki.play2xko.com, move name is often in the table heading (h3/h4) before the table
      // Or in the first column if it's a move name column
      let moveNameFromContext = '';
      $(table).prevAll('h3, h4, h5').first().each((_, heading) => {
        const headingText = $(heading).text().trim();
        // Check if heading looks like a move name (e.g., "5L", "2M", "Rocket Grab")
        if (headingText.match(/^([0-9]+[LMH]|[0-9]+S[12]|S[12]|j\.[0-9]+[LMH]|[A-Za-z\s]+)$/)) {
          moveNameFromContext = headingText;
        }
      });

      // More lenient - if we have startup/active/recovery/on-block, it's a frame data table
      const hasFrameData = startupCol !== -1 || activeCol !== -1 || recoveryCol !== -1 || onBlockCol !== -1;
      if (!hasFrameData) {
        return; // Probably not a frame data table
      }

      // Process data rows
      rows.slice(1).each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length === 0) return;

        // Get move name - prefer from context (heading), then from move column, then from first cell
        let moveName = moveNameFromContext;
        if (!moveName && moveCol !== -1) {
          moveName = $(cells[moveCol]).text().trim();
        }
        if (!moveName && cells.length > 0) {
          moveName = $(cells[0]).text().trim();
        }
        if (!moveName || moveName === '') return;
        
        // Clean up move name (remove extra whitespace, normalize)
        moveName = moveName.replace(/\s+/g, ' ').trim();

        // Extract input notation from input column or move name
        let inputNotation = '';
        let keyboardButton = '';
        
        if (inputCol !== -1) {
          const inputText = $(cells[inputCol]).text().trim();
          // Extract FGC notation (e.g., "5L", "2M", "S1")
          const fgcMatch = inputText.match(/(\d+[LMH]|[0-9]+S[12]|S[12]|T|2T|4T|6S[12]|j\.[0-9]+[LMH])/i);
          if (fgcMatch) {
            inputNotation = fgcMatch[1];
          }
          
          // Extract keyboard button names
          const buttonMatch = inputText.match(/(Light|Medium|Heavy|Special\s*[12]|L|M|H|S[12])/i);
          if (buttonMatch) {
            keyboardButton = buttonMatch[1];
            // Normalize button names
            keyboardButton = keyboardButton.replace(/Special\s*1/i, 'Special 1')
                                           .replace(/Special\s*2/i, 'Special 2')
                                           .replace(/^L$/i, 'Light')
                                           .replace(/^M$/i, 'Medium')
                                           .replace(/^H$/i, 'Heavy');
          }
        }
        
        // If no input column, try to extract from move name
        if (!inputNotation && moveName.match(/^[0-9]+[LMH]|[0-9]+S[12]|S[12]|T|2T|4T/i)) {
          inputNotation = moveName;
        }

        const move: Move = {
          name: moveName,
          input: inputNotation || undefined,
          keyboardButton: keyboardButton || undefined,
          startup: startupCol !== -1 ? parseFrameValue($(cells[startupCol]).text()) : undefined,
          onHit: onHitCol !== -1 ? parseFrameValue($(cells[onHitCol]).text()) : undefined,
          onBlock: onBlockCol !== -1 ? parseFrameValue($(cells[onBlockCol]).text()) : undefined,
          recovery: recoveryCol !== -1 ? parseFrameValue($(cells[recoveryCol]).text()) : undefined,
          damage: damageCol !== -1 ? parseFrameValue($(cells[damageCol]).text()) : undefined,
          guard: guardCol !== -1 ? $(cells[guardCol]).text().trim() : undefined
        };
        
        // Generate input glyph if we have input notation
        if (inputNotation) {
          move.inputGlyph = generateInputGlyph(inputNotation);
        }
        
        // Add active frames if available
        if (activeCol !== -1) {
          const activeValue = $(cells[activeCol]).text().trim();
          if (activeValue && activeValue !== '-' && activeValue !== '') {
            (move as any).active = parseFrameValue(activeValue);
          }
        }
        
        // Add notes if available
        if (notesCol !== -1) {
          const notesValue = $(cells[notesCol]).text().trim();
          if (notesValue && notesValue !== '-' && notesValue !== '') {
            (move as any).notes = notesValue;
          }
        }

        // Determine move type from name or context
        const nameLower = moveName.toLowerCase();
        if (nameLower.match(/^[0-9][lmh]/) || nameLower.includes('light') || nameLower.includes('medium') || nameLower.includes('heavy')) {
          move.type = 'normal';
        } else if (nameLower.includes('super') || nameLower.includes('ult') || nameLower.includes('level')) {
          move.type = 'super';
        } else {
          move.type = 'special';
        }

        moves.push(move);
      });
    });

  return moves;
}

async function main() {
  console.log('🎮 Scraping 2XKO Frame Data from Wiki...\n');

  const champions: Champion[] = [];

  for (const championName of CHAMPIONS) {
    const champion = await scrapeChampionFrameData(championName);
    if (champion) {
      champions.push(champion);
    }
    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  if (champions.length === 0) {
    console.log('\n❌ No frame data collected. Check wiki URLs and table structure.');
    process.exit(1);
  }

  const output = {
    champions,
    lastUpdated: new Date().toISOString(),
    source: '2XKO Wiki (https://2xko.wiki)'
  };

  // Save to file
  const outputPath = path.join(process.cwd(), 'frame-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Frame data saved to: ${outputPath}`);
  console.log(`📊 Total champions: ${champions.length}`);
  console.log(`📊 Total moves: ${champions.reduce((sum, c) => sum + c.moves.length, 0)}`);

  return output;
}

main().catch(console.error);
