import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

const ALL_CHAMPIONS = [
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
];

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

function parseFrameValue(value: string): number | string {
  if (!value || value.trim() === '-' || value.trim() === '' || value.trim() === '—') return '-';
  const rangeMatch = value.match(/(\d+)\s*[-~]\s*(\d+)/);
  if (rangeMatch) {
    return value.trim();
  }
  const cleaned = value.trim().replace(/[^\d+-]/g, '');
  const num = parseInt(cleaned);
  return isNaN(num) ? value.trim() : num;
}

async function scrapeChampionWithBrowser(championName: string): Promise<Champion | null> {
  console.log(`\n🎮 Scraping ${championName}...`);
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = `https://wiki.play2xko.com/en-us/${championName}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 5000 }).catch(() => {});
    
    const html = await page.content();
    const $ = cheerio.load(html);
    
    const moves: Move[] = [];
    
    // Find all frame data tables
    $('table').each((tableIdx, table) => {
      const rows = $(table).find('tr');
      if (rows.length < 2) return;

      const headers: string[] = [];
      $(rows[0]).find('th, td').each((_, cell) => {
        headers.push($(cell).text().trim().toLowerCase());
      });

      const headerText = headers.join(' ');
      const hasFrameData = headerText.includes('startup') || 
                          headerText.includes('on-block') || 
                          headerText.includes('on-hit') ||
                          headerText.includes('recovery') ||
                          headerText.includes('active');
      
      if (!hasFrameData) return;

      const startupCol = headers.findIndex(h => h.includes('startup'));
      const activeCol = headers.findIndex(h => h.includes('active'));
      const recoveryCol = headers.findIndex(h => h.includes('recovery'));
      const onBlockCol = headers.findIndex(h => h.includes('on-block') || h.includes('on block'));
      const onHitCol = headers.findIndex(h => h.includes('on-hit') || h.includes('on hit'));
      const damageCol = headers.findIndex(h => h.includes('damage'));
      const guardCol = headers.findIndex(h => h.includes('guard'));
      const inputCol = headers.findIndex(h => h.includes('input') || h.includes('notation') || h.includes('command') || h.includes('move'));

      // Get section context for move type
      const sectionContext = $(table).prevAll('h2, h3').first().text().toLowerCase();
      
      // Get move name from heading before table
      let moveNameFromHeading = '';
      $(table).prevAll('h2, h3, h4, h5').slice(0, 10).each((_, heading) => {
        const headingText = $(heading).text().trim();
        const cleanHeading = headingText.split('[')[0].trim();
        const lowerHeading = cleanHeading.toLowerCase();
        if (cleanHeading && cleanHeading.length < 50 && cleanHeading.length > 0 &&
            !lowerHeading.includes('moves[edit') &&
            !lowerHeading.includes('mechanics[edit') &&
            !lowerHeading.includes('specials[edit') &&
            !lowerHeading.includes('supers[edit') &&
            !lowerHeading.includes('ultimate[edit') &&
            !lowerHeading.includes('assists[edit') &&
            !lowerHeading.includes('standing normals') &&
            !lowerHeading.includes('crouching normals') &&
            !lowerHeading.includes('jumping normals') &&
            !lowerHeading.includes('universal mechanics') &&
            !lowerHeading.includes('contents') &&
            !lowerHeading.includes('navigation') &&
            !lowerHeading.includes('trivia') &&
            !lowerHeading.includes('gallery') &&
            !lowerHeading.includes('references')) {
          // Check if it looks like a move name
          if (/[a-zA-Z]/.test(cleanHeading) || /^[0-9]+[LMH]/.test(cleanHeading) || /^j\./.test(cleanHeading) || /^[0-9]+S[12]/.test(cleanHeading)) {
            moveNameFromHeading = cleanHeading;
            return false;
          }
        }
      });

      rows.slice(1).each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length === 0) return;

        // Try to get move name from input column first, then heading, then first cell
        let moveName = '';
        let input = '';
        
        if (inputCol !== -1 && inputCol < cells.length) {
          const inputText = $(cells[inputCol]).text().trim();
          if (inputText && inputText !== '-' && !/^\d+(\s*[+\-]\s*\d+)*$/.test(inputText)) {
            input = inputText;
            moveName = inputText;
          }
        }
        
        if (!moveName) {
          moveName = moveNameFromHeading;
        }
        
        if (!moveName) {
          const firstCellText = $(cells[0]).text().trim();
          // Skip if first cell is just damage or empty
          if (firstCellText && firstCellText !== '-' && !/^\d+(\s*[+\-]\s*\d+)*$/.test(firstCellText)) {
            moveName = firstCellText;
            if (!input) input = firstCellText;
          }
        }
        
        // Skip if no valid move name
        if (!moveName || moveName === '' || moveName === '-') return;
        
        // Skip if move name is just a number (damage value)
        if (/^\d+(\s*[+\-]\s*\d+)*$/.test(moveName.trim())) {
          return;
        }
        
        // Skip broken move names
        if (/^\d+[x×]\d+/.test(moveName.trim()) || /\d+[x×]\d+\+\d+[x×]\d+/.test(moveName.trim())) {
          return;
        }

        const move: Move = {
          name: moveName,
          input: input || undefined,
          startup: startupCol !== -1 && startupCol < cells.length ? parseFrameValue($(cells[startupCol]).text()) : undefined,
          active: activeCol !== -1 && activeCol < cells.length ? parseFrameValue($(cells[activeCol]).text()) : undefined,
          recovery: recoveryCol !== -1 && recoveryCol < cells.length ? parseFrameValue($(cells[recoveryCol]).text()) : undefined,
          onHit: onHitCol !== -1 && onHitCol < cells.length ? parseFrameValue($(cells[onHitCol]).text()) : undefined,
          onBlock: onBlockCol !== -1 && onBlockCol < cells.length ? parseFrameValue($(cells[onBlockCol]).text()) : undefined,
          damage: damageCol !== -1 && damageCol < cells.length ? parseFrameValue($(cells[damageCol]).text()) : undefined,
          guard: guardCol !== -1 && guardCol < cells.length ? $(cells[guardCol]).text().trim() : undefined
        };

        // Only add if we have at least startup or onBlock (essential frame data)
        if (move.startup === undefined && move.onBlock === undefined) {
          return; // Skip moves with no frame data
        }

        // Better move type detection
        const nameLower = moveName.toLowerCase();
        
        if (nameLower.match(/^[0-9][lmh]/) || nameLower.match(/^j\.[0-9]?[lmh]/) || 
            sectionContext.includes('normal') || sectionContext.includes('standing') ||
            sectionContext.includes('crouching') || sectionContext.includes('jumping')) {
          move.type = 'normal';
        } else if (nameLower.includes('super') || nameLower.includes('ult') || 
                   sectionContext.includes('super') || sectionContext.includes('ultimate')) {
          move.type = 'super';
        } else if (nameLower.includes('throw') || nameLower.includes('tag launcher') ||
                   nameLower.includes('assist') || sectionContext.includes('mechanics') ||
                   sectionContext.includes('assist')) {
          move.type = 'special';
        } else {
          move.type = 'special';
        }

        moves.push(move);
      });
    });

    await browser.close();

    if (moves.length === 0) {
      console.log(`  ❌ No frame data found for ${championName}`);
      return null;
    }

    // Remove duplicates
    const uniqueMoves: Move[] = [];
    const seen = new Set<string>();
    for (const move of moves) {
      const key = move.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMoves.push(move);
      }
    }

    console.log(`  ✅ Found ${uniqueMoves.length} unique moves for ${championName}`);
    const withData = uniqueMoves.filter(m => m.startup !== undefined || m.onBlock !== undefined).length;
    console.log(`     ${withData} moves have frame data`);
    
    return {
      name: championName,
      moves: uniqueMoves
    };
  } catch (error: any) {
    console.error(`  ❌ Error scraping ${championName}:`, error.message);
    await browser.close();
    return null;
  }
}

async function main() {
  console.log('🚀 Re-scraping all champions for complete frame data...\n');
  
  const frameDataPath = path.join(process.cwd(), 'frame-data.json');
  const data = JSON.parse(fs.readFileSync(frameDataPath, 'utf-8'));
  
  // Clear existing champions to start fresh
  data.champions = [];
  
  for (const championName of ALL_CHAMPIONS) {
    const champion = await scrapeChampionWithBrowser(championName);
    if (champion) {
      data.champions.push(champion);
    }
    await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
  }

  data.lastUpdated = new Date().toISOString();
  data.source = '2XKO Wiki (https://wiki.play2xko.com/en-us/)';

  fs.writeFileSync(frameDataPath, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ Frame data updated!`);
  console.log(`📊 Total champions: ${data.champions.length}`);
  console.log(`📊 Total moves: ${data.champions.reduce((sum: number, c: any) => sum + (c.moves?.length || 0), 0)}`);
}

main().catch(console.error);
