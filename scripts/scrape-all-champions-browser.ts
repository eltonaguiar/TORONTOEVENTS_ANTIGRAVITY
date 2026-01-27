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
    
    // Wait for tables to load
    await page.waitForSelector('table', { timeout: 5000 }).catch(() => {});
    
    // Get page HTML
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

      // Get move name from heading before table - check multiple heading levels
      let moveNameFromHeading = '';
      $(table).prevAll('h2, h3, h4, h5').each((_, heading) => {
        const headingText = $(heading).text().trim();
        const cleanHeading = headingText.split('[')[0].trim();
        // Skip section headings like "Normal Moves", "Specials", etc.
        if (cleanHeading && cleanHeading.length < 50 && 
            !cleanHeading.toLowerCase().includes('moves') &&
            !cleanHeading.toLowerCase().includes('mechanics') &&
            !cleanHeading.toLowerCase().includes('specials') &&
            !cleanHeading.toLowerCase().includes('supers') &&
            !cleanHeading.toLowerCase().includes('ultimate') &&
            !cleanHeading.toLowerCase().includes('assists') &&
            !cleanHeading.toLowerCase().includes('standing') &&
            !cleanHeading.toLowerCase().includes('crouching') &&
            !cleanHeading.toLowerCase().includes('jumping') &&
            !cleanHeading.toLowerCase().includes('universal')) {
          moveNameFromHeading = cleanHeading;
          return false; // Stop at first valid move name heading
        }
      });

      rows.slice(1).each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length === 0) return;

        // For tables where first column is Damage, use heading as move name
        // Otherwise try first cell
        let moveName = moveNameFromHeading;
        if (!moveName) {
          const firstCellText = $(cells[0]).text().trim();
          // If first cell is just numbers (damage), skip it and use heading
          if (!/^\d+(\s*[+\-]\s*\d+)*$/.test(firstCellText)) {
            moveName = firstCellText;
          }
        }
        
        if (!moveName || moveName === '') return;
        
        // Skip if move name is just a number (damage value)
        if (/^\d+(\s*[+\-]\s*\d+)*$/.test(moveName.trim())) {
          return;
        }

        const move: Move = {
          name: moveName,
          startup: startupCol !== -1 ? parseFrameValue($(cells[startupCol]).text()) : undefined,
          active: activeCol !== -1 ? parseFrameValue($(cells[activeCol]).text()) : undefined,
          recovery: recoveryCol !== -1 ? parseFrameValue($(cells[recoveryCol]).text()) : undefined,
          onHit: onHitCol !== -1 ? parseFrameValue($(cells[onHitCol]).text()) : undefined,
          onBlock: onBlockCol !== -1 ? parseFrameValue($(cells[onBlockCol]).text()) : undefined,
          damage: damageCol !== -1 ? parseFrameValue($(cells[damageCol]).text()) : undefined,
          guard: guardCol !== -1 ? $(cells[guardCol]).text().trim() : undefined
        };

        // Better move type detection based on context and name
        const nameLower = moveName.toLowerCase();
        const sectionContext = $(table).prevAll('h2, h3').first().text().toLowerCase();
        
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
          // Default to special for moves that aren't clearly normals or supers
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

    console.log(`  ✅ Found ${moves.length} moves for ${championName}`);
    return {
      name: championName,
      moves
    };
  } catch (error: any) {
    console.error(`  ❌ Error scraping ${championName}:`, error.message);
    await browser.close();
    return null;
  }
}

async function main() {
  console.log('🚀 Starting browser-based scraping for all 12 champions...\n');
  
  const frameDataPath = path.join(process.cwd(), 'frame-data.json');
  let existingData: any = { champions: [] };
  if (fs.existsSync(frameDataPath)) {
    existingData = JSON.parse(fs.readFileSync(frameDataPath, 'utf-8'));
  }

  const existingChampions = new Set(existingData.champions.map((c: any) => c.name));
  const championsToScrape = ALL_CHAMPIONS.filter(c => !existingChampions.has(c));
  
  console.log(`📊 Existing champions: ${existingData.champions.length}`);
  console.log(`📊 Champions to scrape: ${championsToScrape.length}\n`);

  for (const championName of championsToScrape) {
    const champion = await scrapeChampionWithBrowser(championName);
    if (champion) {
      existingData.champions.push(champion);
    }
    await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
  }

  existingData.lastUpdated = new Date().toISOString();
  existingData.source = '2XKO Wiki (https://wiki.play2xko.com/en-us/)';

  fs.writeFileSync(frameDataPath, JSON.stringify(existingData, null, 2));
  
  console.log(`\n✅ Frame data updated!`);
  console.log(`📊 Total champions: ${existingData.champions.length}`);
  console.log(`📊 Total moves: ${existingData.champions.reduce((sum: number, c: any) => sum + (c.moves?.length || 0), 0)}`);
}

main().catch(console.error);
